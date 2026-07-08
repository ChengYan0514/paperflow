package com.paperflow.admin.dto;

public record TaskStatusTotals(
        long sourceCount,
        long workCount,
        long originalFileCount,
        long matchedWorkCount,
        long parsedFileCount,
        long blockImportedFileCount) {
}
