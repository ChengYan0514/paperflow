package com.paperflow.admin.dto;

import java.util.List;

public record CausalEdgeDetailDto(
        CausalGraphEdgeDto edge,
        CausalEdgeStatsDto stats,
        List<CausalClaimDto> claims) {}
