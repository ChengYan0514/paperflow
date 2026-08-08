package com.paperflow.admin.service;

import com.paperflow.admin.config.PaperflowApiProperties;
import com.paperflow.admin.dto.ErrorCode;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PaperFileService {
    record StagedFile(Path path, String type, String extension, long size) {}

    private final Path dataRoot;
    private final long maxBytes;

    PaperFileService(PaperflowApiProperties properties) {
        this.dataRoot = Path.of(properties.dataRoot()).toAbsolutePath().normalize();
        this.maxBytes = properties.uploadMaxBytes();
    }

    StagedFile stage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, ErrorCode.INVALID_PAPER_FILE, "Paper file is required");
        }
        if (file.getSize() > maxBytes) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, ErrorCode.PAPER_FILE_TOO_LARGE, "Paper file is too large");
        }
        String extension = extension(file.getOriginalFilename());
        String type = extension.toUpperCase(Locale.ROOT);
        Path directory = resolve(".upload-tmp/" + UUID.randomUUID());
        Path staged = directory.resolve("upload." + extension);
        try {
            Files.createDirectories(directory);
            try (InputStream input = file.getInputStream()) {
                Files.copy(input, staged, StandardCopyOption.REPLACE_EXISTING);
            }
            validateContent(staged, type, file.getContentType());
            return new StagedFile(staged, type, extension, Files.size(staged));
        } catch (ApiException exc) {
            deleteTree(directory);
            throw exc;
        } catch (IOException exc) {
            deleteTree(directory);
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.PAPER_STORAGE_CONFLICT, "Cannot stage paper file");
        }
    }

    StagedFile stageCopy(String sourceRelative, String type) {
        String extension = type.toLowerCase(Locale.ROOT);
        Path directory = resolve(".upload-tmp/" + UUID.randomUUID());
        Path staged = directory.resolve("upload." + extension);
        try {
            Files.createDirectories(directory);
            Files.copy(resolve(sourceRelative), staged);
            return new StagedFile(staged, type, extension, Files.size(staged));
        } catch (IOException exc) {
            deleteTree(directory);
            throw new ApiException(HttpStatus.CONFLICT, ErrorCode.PAPER_STORAGE_CONFLICT, "Cannot stage file version");
        }
    }

    String currentPath(String sourceId, String fileId, String extension) {
        return "openalex/original/" + safeSegment(sourceId) + "/" + fileId + "." + extension;
    }

    String archivePath(String fileId, int version, String extension) {
        return "paperflow/archive/" + fileId + "/" + version + "." + extension;
    }

    String trashPath(String fileId, int version, String extension) {
        return "paperflow/trash/" + fileId + "/" + version + "." + extension;
    }

    void moveStaged(StagedFile staged, String targetRelative) {
        move(staged.path(), resolve(targetRelative));
        deleteTree(staged.path().getParent());
    }

    void moveRelative(String sourceRelative, String targetRelative) {
        move(resolve(sourceRelative), resolve(targetRelative));
    }

    void deleteRelativeTree(String relative) {
        deleteTree(resolve(relative));
    }

    void deleteRelativeTreeStrict(String relative) throws IOException {
        Path root = resolve(relative);
        if (!Files.exists(root)) return;
        try (var paths = Files.walk(root)) {
            for (Path item : paths.sorted(java.util.Comparator.reverseOrder()).toList()) {
                Files.deleteIfExists(item);
            }
        }
    }

    void cleanup(StagedFile staged) {
        if (staged != null) deleteTree(staged.path().getParent());
    }

    private void move(Path source, Path target) {
        if (Files.exists(target)) {
            throw new ApiException(HttpStatus.CONFLICT, ErrorCode.PAPER_STORAGE_CONFLICT, "Target file already exists");
        }
        try {
            Files.createDirectories(target.getParent());
            Files.move(source, target, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException atomicFailure) {
            try {
                Files.move(source, target);
            } catch (IOException exc) {
                throw new ApiException(HttpStatus.CONFLICT, ErrorCode.PAPER_STORAGE_CONFLICT, "Cannot move paper file");
            }
        }
    }

    private Path resolve(String relative) {
        Path path = dataRoot.resolve(relative).normalize();
        if (!path.startsWith(dataRoot)) throw new IllegalArgumentException("Invalid storage path");
        return path;
    }

    private String safeSegment(String value) {
        if (value == null || !value.matches("[A-Za-z0-9._-]+")) throw new IllegalArgumentException("Invalid path segment");
        return value;
    }

    private String extension(String filename) {
        if (filename == null) throw invalidType();
        int dot = filename.lastIndexOf('.');
        if (dot < 0) throw invalidType();
        String extension = filename.substring(dot + 1).toLowerCase(Locale.ROOT);
        if (!extension.equals("pdf") && !extension.equals("xml") && !extension.equals("html")) throw invalidType();
        return extension;
    }

    private void validateContent(Path path, String type, String mime) throws IOException {
        byte[] prefix = new byte[512];
        int length;
        try (InputStream input = Files.newInputStream(path)) {
            length = Math.max(0, input.read(prefix));
        }
        String start = new String(prefix, 0, length, java.nio.charset.StandardCharsets.UTF_8).stripLeading().toLowerCase(Locale.ROOT);
        boolean valid = switch (type) {
            case "PDF" -> length >= 5 && prefix[0] == '%' && prefix[1] == 'P' && prefix[2] == 'D' && prefix[3] == 'F' && prefix[4] == '-';
            case "XML" -> start.startsWith("<?xml") || start.startsWith("<article") || start.startsWith("<document");
            case "HTML" -> start.startsWith("<!doctype html") || start.startsWith("<html");
            default -> false;
        };
        if (!valid || !validMime(type, mime)) throw invalidType();
    }

    private boolean validMime(String type, String mime) {
        if (mime == null || mime.isBlank() || mime.equals("application/octet-stream")) return true;
        String value = mime.toLowerCase(Locale.ROOT);
        return switch (type) {
            case "PDF" -> value.equals("application/pdf");
            case "XML" -> value.contains("xml") || value.startsWith("text/plain");
            case "HTML" -> value.equals("text/html") || value.startsWith("text/plain");
            default -> false;
        };
    }

    private ApiException invalidType() {
        return new ApiException(HttpStatus.BAD_REQUEST, ErrorCode.INVALID_PAPER_FILE, "Only PDF, XML and HTML are supported");
    }

    private void deleteTree(Path path) {
        if (path == null || !Files.exists(path)) return;
        try (var paths = Files.walk(path)) {
            paths.sorted(java.util.Comparator.reverseOrder()).forEach(item -> {
                try { Files.deleteIfExists(item); } catch (IOException ignored) { }
            });
        } catch (IOException ignored) { }
    }
}
