package com.paperflow.admin.dto;

public record CausalFieldItemDto(
        String subfield,
        String topic,
        long claimRecordCount,
        long paperCount,
        long variableCount) {}
