package com.paperflow.admin.dto;

import java.util.Map;

public record CausalGraphEdgeDto(
        Long claimId,
        String source,
        String target,
        long recordCount,
        long paperCount,
        long diversity,
        double disagreement,
        String dominantSign,
        String dominantSignCategory,
        Map<String, Long> signBreakdown) {}
