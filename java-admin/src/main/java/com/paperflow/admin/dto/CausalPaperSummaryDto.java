package com.paperflow.admin.dto;

public record CausalPaperSummaryDto(
        String workId,
        long claimRecordCount,
        long standardClaimCount,
        long variableCount,
        boolean hasCausalClaims) {}
