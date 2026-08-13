package com.paperflow.admin.service;

import com.paperflow.admin.dto.AdminRole;
import com.paperflow.admin.dto.OriginalFileImportBatchDto;
import com.paperflow.admin.dto.OriginalFileImportItemDto;
import com.paperflow.admin.dto.OriginalFileImportItemPage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;
import java.util.concurrent.Executor;

@Service
public class OriginalFileImportService {
    private static final Set<String> REQUIRED_COLUMNS = Set.of("source_id", "year", "file_name", "file_path", "paper_title", "authors");
    private static final Set<String> ALLOWED_COLUMNS = Set.of("source_id", "year", "paper_title", "authors", "doi", "url", "provider", "file_name", "file_path", "file_type", "file_size");
    private static final List<String> TYPES = List.of("HTML", "XML", "PDF");

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaction;
    private final Path dataRoot;
    private final long maxZipBytes;
    private final long maxExtractedBytes;
    private final int maxFiles;
    private final long partBytes;
    private final Executor executor;

    public OriginalFileImportService(
            JdbcTemplate jdbc,
            TransactionTemplate transaction,
            @Value("${paperflow.api.data-root:data}") String dataRoot,
            @Value("${paperflow.api.import-max-zip-bytes:5368709120}") long maxZipBytes,
            @Value("${paperflow.api.import-max-extracted-bytes:10737418240}") long maxExtractedBytes,
            @Value("${paperflow.api.import-max-files:10000}") int maxFiles,
            @Value("${paperflow.api.import-part-bytes:33554432}") long partBytes,
            @Qualifier("originalFileImportExecutor") Executor executor) {
        this.jdbc = jdbc;
        this.transaction = transaction;
        this.dataRoot = Path.of(dataRoot).toAbsolutePath().normalize();
        this.maxZipBytes = maxZipBytes;
        this.maxExtractedBytes = maxExtractedBytes;
        this.maxFiles = maxFiles;
        this.partBytes = partBytes;
        this.executor = executor;
    }

    public OriginalFileImportBatchDto create(AdminUserPrincipal actor, String uploadName) {
        requireWrite(actor);
        String id = UUID.randomUUID().toString().replace("-", "");
        Path root = staging(id);
        try {
            Files.createDirectories(root.resolve("parts"));
            jdbc.update(
                    "INSERT INTO original_file_import_batch(batch_id, upload_name, upload_path, upload_size, status, created_by) VALUES (?, ?, ?, 0, 'UPLOADING', ?)",
                    id, safeUploadName(uploadName), root.resolve("upload.zip").toString(), actor.id());
            return get(actor, id);
        } catch (IOException exc) {
            deleteTree(root);
            throw storageError();
        }
    }

    public void uploadPart(AdminUserPrincipal actor, String batchId, int partNo, MultipartFile part, String expectedSha256) {
        requireWrite(actor);
        if (partNo < 0 || part == null || part.isEmpty() || part.getSize() > partBytes) {
            throw new ApiException(HttpStatus.BAD_REQUEST, com.paperflow.admin.dto.ErrorCode.VALIDATION_ERROR, "Invalid upload part");
        }
        requireStatus(batchId, "UPLOADING");
        try {
            if (expectedSha256 != null && !expectedSha256.isBlank()) {
                String actual;
                try { actual = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(part.getBytes())); }
                catch (java.security.NoSuchAlgorithmException exc) { throw new IllegalStateException(exc); }
                if (!actual.equalsIgnoreCase(expectedSha256)) throw new ApiException(HttpStatus.BAD_REQUEST, com.paperflow.admin.dto.ErrorCode.VALIDATION_ERROR, "Upload part checksum mismatch");
            }
            Path target = staging(batchId).resolve("parts").resolve(String.format(Locale.ROOT, "%08d.part", partNo));
            Files.createDirectories(target.getParent());
            part.transferTo(target);
        } catch (IOException exc) {
            throw storageError();
        }
    }

    public OriginalFileImportBatchDto complete(AdminUserPrincipal actor, String batchId) {
        requireWrite(actor);
        requireStatus(batchId, "UPLOADING");
        Path root = staging(batchId);
        Path zip = root.resolve("upload.zip");
        try {
            List<Path> parts;
            try (var stream = Files.list(root.resolve("parts"))) {
                parts = stream.filter(path -> path.getFileName().toString().endsWith(".part")).sorted().toList();
            }
            if (parts.isEmpty() || !parts.get(0).getFileName().toString().startsWith("00000000")) {
                throw new ApiException(HttpStatus.BAD_REQUEST, com.paperflow.admin.dto.ErrorCode.VALIDATION_ERROR, "Upload parts are incomplete");
            }
            try (OutputStream output = Files.newOutputStream(zip)) {
                long total = 0;
                for (int index = 0; index < parts.size(); index++) {
                    String expected = String.format(Locale.ROOT, "%08d.part", index);
                    if (!parts.get(index).getFileName().toString().equals(expected)) {
                        throw new ApiException(HttpStatus.BAD_REQUEST, com.paperflow.admin.dto.ErrorCode.VALIDATION_ERROR, "Upload parts are incomplete");
                    }
                    total += Files.size(parts.get(index));
                    if (total > maxZipBytes) throw tooLarge();
                    Files.copy(parts.get(index), output);
                }
            }
            long size = Files.size(zip);
            if (size > maxZipBytes) throw tooLarge();
            String sha = sha256(zip);
            jdbc.update("UPDATE original_file_import_batch SET upload_size=?, upload_sha256=?, status='VALIDATING', updated_at=now() WHERE batch_id=?", size, sha, batchId);
            executor.execute(() -> {
                try { validateZip(batchId, zip, root.resolve("extracted")); }
                catch (ApiException exc) { jdbc.update("UPDATE original_file_import_batch SET status='FAILED', error_summary=?, updated_at=now() WHERE batch_id=?", exc.getMessage(), batchId); }
                catch (IOException exc) { jdbc.update("UPDATE original_file_import_batch SET status='FAILED', error_summary=?, updated_at=now() WHERE batch_id=?", "Cannot inspect ZIP", batchId); }
            });
            return get(actor, batchId);
        } catch (ApiException exc) {
            jdbc.update("UPDATE original_file_import_batch SET status='FAILED', error_summary=?, updated_at=now() WHERE batch_id=?", exc.getMessage(), batchId);
            throw exc;
        } catch (IOException exc) {
            jdbc.update("UPDATE original_file_import_batch SET status='FAILED', error_summary=?, updated_at=now() WHERE batch_id=?", "Cannot assemble ZIP", batchId);
            throw storageError();
        }
    }

    public OriginalFileImportBatchDto confirm(AdminUserPrincipal actor, String batchId) {
        requireWrite(actor);
        requireStatus(batchId, "READY");
        jdbc.update("UPDATE original_file_import_batch SET status='IMPORTING', confirmed_by=?, confirmed_at=now(), updated_at=now() WHERE batch_id=?", actor.id(), batchId);
        executor.execute(() -> {
            try {
                importItems(batchId, actor);
            } catch (RuntimeException exc) {
                jdbc.update("UPDATE original_file_import_batch SET status='FAILED', error_summary=?, updated_at=now() WHERE batch_id=? AND status='IMPORTING'", exc.getMessage(), batchId);
            }
        });
        return get(actor, batchId);
    }

    private void importItems(String batchId, AdminUserPrincipal actor) {
        List<Item> items = jdbc.query("SELECT * FROM original_file_import_item WHERE batch_id=? AND status='VALID' ORDER BY row_number", itemMapper(), batchId);
        for (Item item : items) {
            if (!"IMPORTING".equals(jdbc.queryForObject("SELECT status FROM original_file_import_batch WHERE batch_id=?", String.class, batchId))) return;
            try {
                Boolean skipped = transaction.execute(status -> importItem(batchId, item, actor));
                jdbc.update("UPDATE original_file_import_item SET status=?, imported_at=CASE WHEN ? THEN NULL ELSE now() END WHERE batch_id=? AND row_number=?", Boolean.TRUE.equals(skipped) ? "SKIPPED" : "SUCCESS", Boolean.TRUE.equals(skipped), batchId, item.rowNumber());
            } catch (ApiException exc) {
                jdbc.update("UPDATE original_file_import_item SET status='FAILED', error_code=?, error_message=? WHERE batch_id=? AND row_number=?", exc.getClass().getSimpleName(), exc.getMessage(), batchId, item.rowNumber());
            } catch (RuntimeException exc) {
                jdbc.update("UPDATE original_file_import_item SET status='FAILED', error_code='IMPORT_FAILED', error_message=? WHERE batch_id=? AND row_number=?", exc.getMessage(), batchId, item.rowNumber());
            }
        }
        long failed = count(batchId, "FAILED");
        long success = count(batchId, "SUCCESS");
        long skipped = count(batchId, "SKIPPED");
        String status = failed > 0 ? (success > 0 ? "PARTIAL_SUCCESS" : "FAILED") : "SUCCESS";
        jdbc.update("UPDATE original_file_import_batch SET status=?, success_rows=?, skipped_rows=?, failed_rows=?, updated_at=now() WHERE batch_id=? AND status='IMPORTING'", status, success, skipped, failed, batchId);
    }

    public OriginalFileImportBatchDto cancel(AdminUserPrincipal actor, String batchId) {
        requireWrite(actor);
        String status = jdbc.queryForObject("SELECT status FROM original_file_import_batch WHERE batch_id=?", String.class, batchId);
        if (!Set.of("UPLOADING", "VALIDATING", "READY", "IMPORTING").contains(status)) throw conflict("Batch cannot be cancelled");
        jdbc.update("UPDATE original_file_import_batch SET status='CANCELLED', updated_at=now() WHERE batch_id=?", batchId);
        if (!"IMPORTING".equals(status)) deleteTree(staging(batchId));
        return get(actor, batchId);
    }

    public OriginalFileImportBatchDto get(AdminUserPrincipal actor, String batchId) {
        requireRead(actor);
        try {
            return jdbc.queryForObject("SELECT * FROM original_file_import_batch WHERE batch_id=?", batchMapper(), batchId);
        } catch (EmptyResultDataAccessException exc) {
            throw new NotFoundException(com.paperflow.admin.dto.ErrorCode.ORIGINAL_FILE_NOT_FOUND, "Import batch not found");
        }
    }

    public OriginalFileImportItemPage items(AdminUserPrincipal actor, String batchId, int page, int size) {
        requireRead(actor);
        int safeSize = Math.min(Math.max(size, 1), 200);
        int safePage = Math.max(page, 1);
        long total = jdbc.queryForObject("SELECT COUNT(*) FROM original_file_import_item WHERE batch_id=?", Long.class, batchId);
        List<OriginalFileImportItemDto> list = jdbc.query(
                "SELECT row_number,file_id,source_id,file_path,status,error_code,error_message,warning_message,imported_at FROM original_file_import_item WHERE batch_id=? ORDER BY row_number LIMIT ? OFFSET ?",
                (rs, n) -> new OriginalFileImportItemDto(rs.getInt(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5), rs.getString(6), rs.getString(7), rs.getString(8), rs.getObject(9, OffsetDateTime.class)),
                batchId, safeSize, (safePage - 1) * safeSize);
        return new OriginalFileImportItemPage(list, safePage, safeSize, total);
    }

    public List<OriginalFileImportItemDto> errors(AdminUserPrincipal actor, String batchId) {
        requireRead(actor);
        return jdbc.query(
                "SELECT row_number,file_id,source_id,file_path,status,error_code,error_message,warning_message,imported_at FROM original_file_import_item WHERE batch_id=? AND status='FAILED' ORDER BY row_number",
                (rs, n) -> new OriginalFileImportItemDto(rs.getInt(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5), rs.getString(6), rs.getString(7), rs.getString(8), rs.getObject(9, OffsetDateTime.class)),
                batchId);
    }

    public List<OriginalFileImportBatchDto> list(AdminUserPrincipal actor, int page, int size) {
        requireRead(actor);
        int safeSize = Math.min(Math.max(size, 1), 100);
        int safePage = Math.max(page, 1);
        return jdbc.query("SELECT * FROM original_file_import_batch ORDER BY created_at DESC LIMIT ? OFFSET ?", batchMapper(), safeSize, (safePage - 1) * safeSize);
    }

    @Scheduled(fixedDelayString = "${paperflow.api.import-cleanup-delay-ms:21600000}")
    public void cleanupExpiredBatches() {
        List<String> ids = jdbc.queryForList(
                "SELECT batch_id FROM original_file_import_batch WHERE (status='UPLOADING' AND updated_at < now() - interval '24 hours') OR (status IN ('READY','VALIDATING') AND updated_at < now() - interval '7 days')",
                String.class);
        for (String id : ids) {
            jdbc.update("UPDATE original_file_import_batch SET status='EXPIRED', updated_at=now() WHERE batch_id=?", id);
            deleteTree(staging(id));
        }
        List<String> completed = jdbc.queryForList(
                "SELECT batch_id FROM original_file_import_batch WHERE status IN ('SUCCESS','PARTIAL_SUCCESS','FAILED','CANCELLED') AND updated_at < now() - interval '7 days'",
                String.class);
        completed.forEach(id -> deleteTree(staging(id)));
    }

    private void validateZip(String batchId, Path zip, Path extracted) throws IOException {
        deleteTree(extracted);
        Files.createDirectories(extracted);
        Path csv = null;
        Set<String> fileEntries = new HashSet<>();
        AtomicLong extractedBytes = new AtomicLong();
        int entryCount = 0;
        try (ZipInputStream input = new ZipInputStream(Files.newInputStream(zip))) {
            ZipEntry entry;
            while ((entry = input.getNextEntry()) != null) {
                if (++entryCount > maxFiles) throw tooManyFiles();
                String name = entry.getName().replace('\\', '/');
                if (entry.isDirectory()) continue;
                Path relative = Path.of(name).normalize();
                if (relative.isAbsolute() || name.startsWith("/") || name.contains("..") || !relative.toString().replace('\\', '/').equals(name)) throw invalidZip("Invalid ZIP path");
                Path target = extracted.resolve(relative).normalize();
                if (!target.startsWith(extracted)) throw invalidZip("Invalid ZIP path");
                Files.createDirectories(target.getParent());
                try (OutputStream output = Files.newOutputStream(target)) {
                    byte[] buffer = new byte[8192];
                    int read;
                    while ((read = input.read(buffer)) >= 0) {
                        extractedBytes.addAndGet(read);
                        if (extractedBytes.get() > maxExtractedBytes) throw tooLarge();
                        output.write(buffer, 0, read);
                    }
                }
                if (name.startsWith("openalex/csv/") && name.toLowerCase(Locale.ROOT).endsWith(".csv")) {
                    if (csv != null) throw invalidZip("ZIP must contain one CSV");
                    csv = target;
                } else if (name.startsWith("openalex/original/")) {
                    fileEntries.add(name);
                } else {
                    throw invalidZip("Unsupported ZIP entry");
                }
            }
        }
        if (csv == null) throw invalidZip("CSV is missing");
        parseCsv(batchId, csv, extracted, fileEntries);
    }

    private void parseCsv(String batchId, Path csv, Path extracted, Set<String> fileEntries) throws IOException {
        jdbc.update("DELETE FROM original_file_import_item WHERE batch_id=?", batchId);
        Set<String> referenced = new HashSet<>();
        Set<String> identities = new HashSet<>();
        int total = 0;
        int valid = 0;
        byte[] csvBytes = Files.readAllBytes(csv);
        int csvOffset = csvBytes.length >= 3 && (csvBytes[0] & 0xff) == 0xef && (csvBytes[1] & 0xff) == 0xbb && (csvBytes[2] & 0xff) == 0xbf ? 3 : 0;
        try (CSVParser parser = CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true).setIgnoreEmptyLines(true).setTrim(true).build().parse(new java.io.StringReader(new String(csvBytes, csvOffset, csvBytes.length - csvOffset, StandardCharsets.UTF_8)))) {
            Set<String> headers = parser.getHeaderMap().keySet();
            if (!headers.containsAll(REQUIRED_COLUMNS)) throw invalidZip("CSV required columns are missing");
            if (!ALLOWED_COLUMNS.containsAll(headers)) throw invalidZip("CSV contains unknown columns");
            for (CSVRecord record : parser) {
                total++;
                CsvRow row = readRow(record);
                String error = validateRow(row, extracted, fileEntries, referenced);
                if (error == null) {
                    String identity = row.fileId + ":" + row.detectedType();
                    if (!identities.add(identity)) error = "DUPLICATE_SAME_TYPE";
                }
                if (error == null) valid++;
                insertItem(batchId, (int) record.getRecordNumber(), row, error);
            }
        }
        Set<String> orphans = new HashSet<>(fileEntries);
        orphans.removeAll(referenced);
        for (String orphan : orphans) {
            total++;
            insertItem(batchId, total, new CsvRow(null, null, null, null, null, null, null, null, null, null, orphan, null), "UNREFERENCED_FILE");
        }
        jdbc.update("UPDATE original_file_import_batch SET total_rows=?, valid_rows=?, failed_rows=?, status='READY', updated_at=now() WHERE batch_id=?", total, valid, total - valid, batchId);
    }

    private CsvRow readRow(CSVRecord r) {
        String source = value(r, "source_id");
        String name = value(r, "file_name");
        String path = value(r, "file_path");
        String type = value(r, "file_type");
        Long size = null;
        try { if (!value(r, "file_size").isBlank()) size = Long.valueOf(value(r, "file_size")); } catch (NumberFormatException ignored) { }
        return new CsvRow(source, value(r, "year"), value(r, "paper_title"), value(r, "authors"), value(r, "doi"), value(r, "url"), value(r, "provider"), name, path, type, null, size);
    }

    private String validateRow(CsvRow row, Path extracted, Set<String> entries, Set<String> referenced) {
        if (blank(row.sourceId()) || blank(row.fileName()) || blank(row.filePath()) || blank(row.title()) || blank(row.authors())) return "REQUIRED_FIELD_MISSING";
        if (!row.authors().contains(";")) return "AUTHORS_FORMAT_INVALID";
        if (!row.fileName().equals(Path.of(row.filePath()).getFileName().toString()) || !row.filePath().startsWith("openalex/original/")) return "PATH_MISMATCH";
        String[] parts = row.filePath().split("/");
        if (parts.length < 4 || !parts[2].equals(row.sourceId())) return "SOURCE_PATH_MISMATCH";
        if (!entries.contains(row.filePath())) return "FILE_NOT_FOUND";
        if (!sourceExists(row.sourceId())) return "SOURCE_NOT_FOUND";
        Integer year = nullableInt(row.year());
        if (year == null) return "YEAR_INVALID";
        row.fileId = fileId(row.fileName());
        String expectedFileId = PaperMetadata.fileId(row.sourceId(), year, row.title(), row.authors());
        if (!expectedFileId.equals(fileId(row.fileName()))) return "FILE_ID_MISMATCH";
        Path actual = extracted.resolve(row.filePath());
        row.detectedType = detectType(actual);
        row.actualSize = actualSize(actual);
        if (row.detectedType == null) return "UNSUPPORTED_FILE_TYPE";
        List<String> warnings = new ArrayList<>();
        if (!blank(row.suppliedType()) && !row.detectedType.equals(row.suppliedType().toUpperCase(Locale.ROOT))) warnings.add("FILE_TYPE_MISMATCH");
        if (row.suppliedSize() != null && row.suppliedSize() != row.actualSize) warnings.add("FILE_SIZE_MISMATCH");
        row.warning = warnings.isEmpty() ? null : String.join(",", warnings);
        if (year < 1000 || year > java.time.Year.now().getValue() + 1) return "YEAR_INVALID";
        referenced.add(row.filePath());
        return null;
    }

    private void insertItem(String batchId, int rowNumber, CsvRow row, String error) {
        jdbc.update(
                "INSERT INTO original_file_import_item(batch_id,row_number,file_id,file_path,file_name,source_id,year,paper_title,authors,doi,url,provider,file_type,file_size,status,error_code,error_message,warning_message) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                batchId, rowNumber, row.fileId, row.filePath, row.fileName, row.sourceId, nullableInt(row.year), row.title, row.authors, normalizeDoi(row.doi), blankToNull(row.url), blankToNull(row.provider), row.detectedType, row.actualSize, error == null ? "VALID" : "FAILED", error, error == null ? null : error, row.warning);
    }

    private boolean importItem(String batchId, Item item, AdminUserPrincipal actor) {
        Path source = extracted(batchId).resolve(item.filePath()).normalize();
        if (!Files.exists(source)) throw new ApiException(HttpStatus.CONFLICT, com.paperflow.admin.dto.ErrorCode.PAPER_STORAGE_CONFLICT, "Staged file is missing");
        Existing existing = findExisting(item.fileId());
        if (existing != null && existing.deleted()) throw new ApiException(HttpStatus.CONFLICT, com.paperflow.admin.dto.ErrorCode.PAPER_IN_TRASH, "File is in trash");
        if (existing != null && priority(item.fileType()) <= priority(existing.type())) {
            jdbc.update("UPDATE original_file_import_item SET status='SKIPPED' WHERE batch_id=? AND row_number=?", batchId, item.rowNumber());
            return true;
        }
        Path target = dataRoot.resolve(item.filePath()).normalize();
        try {
            Files.createDirectories(target.getParent());
            Files.copy(source, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException exc) { throw storageError(); }
        if (existing == null) {
            jdbc.update("INSERT INTO original_file(file_id,source_id,year,paper_title,authors,doi,url,provider,original_file_name,original_file_path,original_file_type,file_size,created_at,created_by,updated_at,updated_by,record_version,current_version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,now(),?,now(),?,0,1)", item.fileId(), item.sourceId(), item.year(), item.title(), item.authors(), item.doi(), item.url(), item.provider(), item.fileName(), item.filePath(), item.fileType(), item.fileSize(), actor.id(), actor.id());
            jdbc.update("INSERT INTO original_file_job(file_id,flag_match,matched_work_id,flag_text,flag_block,flag_vector) VALUES (?,0,NULL,?,0,0)", item.fileId(), "PDF".equals(item.fileType()) ? 0 : -2);
            jdbc.update("INSERT INTO original_file_version(file_id,version_no,file_name,file_path,file_type,file_size,uploaded_by,is_current) VALUES (?,1,?,?,?,?,?,true)", item.fileId(), item.fileName(), item.filePath(), item.fileType(), item.fileSize(), actor.id());
        } else {
            int next = jdbc.queryForObject("SELECT COALESCE(MAX(version_no),0)+1 FROM original_file_version WHERE file_id=?", Integer.class, item.fileId());
            jdbc.update("UPDATE original_file_version SET is_current=false WHERE file_id=? AND is_current=true", item.fileId());
            jdbc.update("INSERT INTO original_file_version(file_id,version_no,file_name,file_path,file_type,file_size,uploaded_by,is_current) VALUES (?,?,?,?,?,?,?,true)", item.fileId(), next, item.fileName(), item.filePath(), item.fileType(), item.fileSize(), actor.id());
            jdbc.update("UPDATE original_file SET original_file_name=?,original_file_path=?,original_file_type=?,file_size=?,updated_at=now(),updated_by=?,record_version=record_version+1 WHERE file_id=?", item.fileName(), item.filePath(), item.fileType(), item.fileSize(), actor.id(), item.fileId());
        }
        return false;
    }

    private Existing findExisting(String fileId) {
        try { return jdbc.queryForObject("SELECT original_file_type, deleted_at FROM original_file WHERE file_id=?", (rs, n) -> new Existing(rs.getString(1), rs.getObject(2) != null), fileId); }
        catch (EmptyResultDataAccessException exc) { return null; }
    }

    private boolean sourceExists(String sourceId) { Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM source WHERE source_id=?", Integer.class, sourceId); return count != null && count > 0; }
    private int priority(String type) { return TYPES.indexOf(type); }
    private String detectType(Path path) {
        try (InputStream input = Files.newInputStream(path)) {
            byte[] prefix = input.readNBytes(1024);
            if (prefix.length >= 5 && prefix[0] == '%' && prefix[1] == 'P' && prefix[2] == 'D' && prefix[3] == 'F' && prefix[4] == '-') return "PDF";
            String start = new String(prefix, StandardCharsets.UTF_8).replace("\uFEFF", "").stripLeading().toLowerCase(Locale.ROOT);
            if (start.startsWith("<?xml") || start.startsWith("<article") || start.startsWith("<document")) return "XML";
            if (start.startsWith("<!doctype html") || start.startsWith("<html")) return "HTML";
            return null;
        } catch (IOException exc) { return null; }
    }
    private String fileId(String name) { int dot = name.lastIndexOf('.'); return dot > 0 ? name.substring(0, dot) : name; }
    private String value(CSVRecord r, String key) { return r.isMapped(key) ? r.get(key).trim() : ""; }
    private Integer nullableInt(String value) { try { return blank(value) ? null : Integer.valueOf(value); } catch (NumberFormatException exc) { return null; } }
    private long actualSize(Path path) { try { return path == null ? 0 : Files.size(path); } catch (IOException exc) { return 0; } }
    private String normalizeDoi(String value) { String v = blankToNull(value); if (v == null) return null; v = v.toLowerCase(Locale.ROOT); for (String prefix : List.of("https://doi.org/", "http://dx.doi.org/", "doi:")) if (v.startsWith(prefix)) v = v.substring(prefix.length()).trim(); return blankToNull(v); }
    private String blankToNull(String value) { return blank(value) ? null : value.trim(); }
    private boolean blank(String value) { return value == null || value.isBlank(); }
    private Path staging(String id) { return dataRoot.resolve(".import-staging").resolve(id).normalize(); }
    private Path extracted(String id) { return staging(id).resolve("extracted"); }
    private void requireRead(AdminUserPrincipal actor) { if (actor == null) throw new ApiException(HttpStatus.FORBIDDEN, com.paperflow.admin.dto.ErrorCode.FORBIDDEN, "Forbidden"); }
    private void requireWrite(AdminUserPrincipal actor) { requireRead(actor); if (actor.role() == AdminRole.USER) throw new ApiException(HttpStatus.FORBIDDEN, com.paperflow.admin.dto.ErrorCode.FORBIDDEN, "Forbidden"); }
    private void requireStatus(String id, String expected) { String status = jdbc.queryForObject("SELECT status FROM original_file_import_batch WHERE batch_id=?", String.class, id); if (!expected.equals(status)) throw conflict("Batch is not " + expected); }
    private ApiException conflict(String message) { return new ApiException(HttpStatus.CONFLICT, com.paperflow.admin.dto.ErrorCode.PAPER_STORAGE_CONFLICT, message); }
    private ApiException storageError() { return new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, com.paperflow.admin.dto.ErrorCode.PAPER_STORAGE_CONFLICT, "Cannot access import storage"); }
    private ApiException tooLarge() { return new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, com.paperflow.admin.dto.ErrorCode.PAPER_FILE_TOO_LARGE, "Import archive is too large"); }
    private ApiException tooManyFiles() { return new ApiException(HttpStatus.BAD_REQUEST, com.paperflow.admin.dto.ErrorCode.VALIDATION_ERROR, "Too many files"); }
    private ApiException invalidZip(String message) { return new ApiException(HttpStatus.BAD_REQUEST, com.paperflow.admin.dto.ErrorCode.VALIDATION_ERROR, message); }
    private String safeUploadName(String value) { return value == null || value.isBlank() ? "batch.zip" : Path.of(value).getFileName().toString(); }
    private long count(String batchId, String status) { Long value = jdbc.queryForObject("SELECT COUNT(*) FROM original_file_import_item WHERE batch_id=? AND status=?", Long.class, batchId, status); return value == null ? 0 : value; }
    private String sha256(Path path) throws IOException { try { MessageDigest digest = MessageDigest.getInstance("SHA-256"); try (InputStream input = Files.newInputStream(path)) { input.transferTo(new java.io.OutputStream() { public void write(int b) { digest.update((byte) b); } public void write(byte[] b, int o, int l) { digest.update(b, o, l); } }); } return HexFormat.of().formatHex(digest.digest()); } catch (Exception exc) { throw new IOException(exc); } }
    private RowMapper<OriginalFileImportBatchDto> batchMapper() { return (rs, n) -> new OriginalFileImportBatchDto(rs.getString("batch_id"), rs.getString("upload_name"), rs.getLong("upload_size"), rs.getString("upload_sha256"), rs.getString("status"), rs.getInt("total_rows"), rs.getInt("valid_rows"), rs.getInt("success_rows"), rs.getInt("skipped_rows"), rs.getInt("failed_rows"), rs.getString("error_summary"), rs.getObject("created_at", OffsetDateTime.class), rs.getObject("confirmed_at", OffsetDateTime.class)); }
    private RowMapper<Item> itemMapper() { return (rs, n) -> new Item(rs.getInt("row_number"), rs.getString("file_id"), rs.getString("file_path"), rs.getString("file_name"), rs.getString("source_id"), rs.getObject("year", Integer.class), rs.getString("paper_title"), rs.getString("authors"), rs.getString("doi"), rs.getString("url"), rs.getString("provider"), rs.getString("file_type"), rs.getLong("file_size")); }
    private void insertNoop() {}
    private void deleteTree(Path path) { if (path == null || !Files.exists(path)) return; try (var paths = Files.walk(path)) { paths.sorted(Comparator.reverseOrder()).forEach(item -> { try { Files.deleteIfExists(item); } catch (IOException ignored) {} }); } catch (IOException ignored) {} }

    private static final class CsvRow {
        private final String sourceId, year, title, authors, doi, url, provider, fileName, filePath, suppliedType, orphanPath; private final Long suppliedSize; private String fileId, detectedType, warning; private long actualSize;
        CsvRow(String sourceId, String year, String title, String authors, String doi, String url, String provider, String fileName, String filePath, String suppliedType, String orphanPath, Long suppliedSize) { this.sourceId=sourceId; this.year=year == null ? "" : year; this.title=title; this.authors=authors; this.doi=doi; this.url=url; this.provider=provider; this.fileName=fileName; this.filePath=filePath; this.suppliedType=suppliedType; this.orphanPath=orphanPath; this.suppliedSize=suppliedSize; }
        String sourceId(){return sourceId;} String year(){return year;} String title(){return title;} String authors(){return authors;} String doi(){return doi;} String url(){return url;} String provider(){return provider;} String fileName(){return fileName;} String filePath(){return filePath;} String detectedType(){return detectedType;}
        String suppliedType(){return suppliedType;} Long suppliedSize(){return suppliedSize;}
    }
    private record Existing(String type, boolean deleted) {}
    private record Item(int rowNumber, String fileId, String filePath, String fileName, String sourceId, Integer year, String title, String authors, String doi, String url, String provider, String fileType, long fileSize) {}
}
