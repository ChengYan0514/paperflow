package com.paperflow.admin.dto;

public record SourceSummary(
        String sourceId,
        String sourceName,
        String provider,
        SourceStats stats) {
}
