package com.paperflow.admin.dto;

public record CausalFieldRelationDto(
        String cause,
        String effect,
        long claimRecordCount,
        long paperCount,
        long methodCount,
        long globalClaimRecordCount) {}
