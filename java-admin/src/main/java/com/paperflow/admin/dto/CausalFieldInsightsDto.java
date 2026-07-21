package com.paperflow.admin.dto;

import java.util.List;

public record CausalFieldInsightsDto(
        List<CausalNamedCountDto> methodCounts,
        List<CausalNamedCountDto> topVariables,
        List<CausalGlobalRelationDto> topRelations) {}
