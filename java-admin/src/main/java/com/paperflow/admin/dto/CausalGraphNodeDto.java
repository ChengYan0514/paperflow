package com.paperflow.admin.dto;

public record CausalGraphNodeDto(
        String id,
        String label,
        long occurrences,
        String dominantSubfield,
        long asCauseCount,
        long asEffectCount) {}
