package com.paperflow.admin.dto;

public record TaskStatusSource(
        String sourceId,
        String sourceName,
        String provider,
        long workCount,
        long originalFileCount,
        long matchedWorkCount,
        long parsedFileCount,
        long blockImportedFileCount) {
}
