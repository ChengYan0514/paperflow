package com.paperflow.admin.dto;

public record CausalGlobalRelationDto(
        String cause,
        String effect,
        long claimRecordCount,
        long paperCount,
        long methodCount) {}
