package com.paperflow.admin.dto;

public record CausalGraphOverviewDto(
        long totalClaimRecords,
        long totalStandardClaims,
        long totalPapers,
        long totalNodes,
        long totalEdges,
        long graphNodes,
        long graphEdges,
        int graphMinRepetition) {}
