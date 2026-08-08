package com.paperflow.admin.dto;

import java.time.OffsetDateTime;

public record PaperFileVersionDto(
        String fileId,
        int versionNo,
        String fileName,
        String fileUrl,
        String fileType,
        long fileSize,
        Long uploadedBy,
        OffsetDateTime uploadedAt,
        boolean current) {}
