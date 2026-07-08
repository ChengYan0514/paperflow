package com.paperflow.admin.service;

import com.paperflow.admin.config.PaperflowApiProperties;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import org.springframework.stereotype.Service;

@Service
public class AssetService {
    private final Path dataRoot;

    public AssetService(PaperflowApiProperties properties) {
        this.dataRoot = Path.of(properties.dataRoot()).toAbsolutePath().normalize();
    }

    public String assetUrl(String relativePath) {
        return "/api/assets/" + encodePath(relativePath);
    }

    public String parsedAssetUrl(String imagePath, String parsedDirectory) {
        if (imagePath == null || imagePath.isBlank()) {
            return null;
        }
        String path = imagePath;
        if (!path.startsWith("openalex/")) {
            if (parsedDirectory == null || parsedDirectory.isBlank()) {
                return null;
            }
            path = parsedDirectory + "/" + path;
        }
        return assetUrl(path);
    }

    public Path resolveAsset(String relativePath) {
        Path resolved = dataRoot.resolve(relativePath).normalize();
        if (!resolved.startsWith(dataRoot)) {
            throw new IllegalArgumentException("Invalid asset path");
        }
        return resolved;
    }

    private String encodePath(String path) {
        String normalized = path.replace('\\', '/');
        if (normalized.startsWith("/")) {
            throw new IllegalArgumentException("Invalid asset path");
        }
        StringBuilder encoded = new StringBuilder();
        for (String part : normalized.split("/")) {
            if (part.isBlank() || ".".equals(part) || "..".equals(part)) {
                throw new IllegalArgumentException("Invalid asset path");
            }
            if (!encoded.isEmpty()) {
                encoded.append('/');
            }
            encoded.append(URLEncoder.encode(part, StandardCharsets.UTF_8).replace("+", "%20"));
        }
        return encoded.toString();
    }
}
