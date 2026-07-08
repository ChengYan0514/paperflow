package com.paperflow.admin.dto;

public record SourceStats(
        long workCount,
        long originalFileCount,
        long matchedFileCount,
        long parsedFileCount,
        long readyFileCount,
        long parseFailedFileCount,
        long blockFailedFileCount,
        long unsupportedFileCount) {
}
