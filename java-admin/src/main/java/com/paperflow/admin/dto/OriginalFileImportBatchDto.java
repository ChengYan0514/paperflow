package com.paperflow.admin.dto;

import java.time.OffsetDateTime;

public record OriginalFileImportBatchDto(
        String batchId,
        String uploadName,
        long uploadSize,
        String uploadSha256,
        String status,
        int totalRows,
        int validRows,
        int successRows,
        int skippedRows,
        int failedRows,
        String errorSummary,
        OffsetDateTime createdAt,
        OffsetDateTime confirmedAt) {}
