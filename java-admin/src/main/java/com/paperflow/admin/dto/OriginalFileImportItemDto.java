package com.paperflow.admin.dto;

import java.time.OffsetDateTime;

public record OriginalFileImportItemDto(
        int rowNumber,
        String fileId,
        String sourceId,
        String filePath,
        String status,
        String errorCode,
        String errorMessage,
        String warningMessage,
        OffsetDateTime importedAt) {}
