package com.paperflow.admin.controller;

import com.paperflow.admin.service.AssetService;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.file.Path;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.HandlerMapping;

@RestController
public class AssetController {
    private final AssetService assetService;

    public AssetController(AssetService assetService) {
        this.assetService = assetService;
    }

    @GetMapping("/api/assets/**")
    public ResponseEntity<Resource> getAsset(HttpServletRequest request) {
        String path = (String) request.getAttribute(HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE);
        String relativePath = path.substring("/api/assets/".length());
        Path asset = assetService.resolveAsset(relativePath);
        if (!asset.toFile().isFile()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
                .contentType(MediaTypeFactory.getMediaType(asset.getFileName().toString())
                        .orElse(MediaType.APPLICATION_OCTET_STREAM))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(asset.getFileName().toString()).build().toString())
                .body(new FileSystemResource(asset));
    }
}
