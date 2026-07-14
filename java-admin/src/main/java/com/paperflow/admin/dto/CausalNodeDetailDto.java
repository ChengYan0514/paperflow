package com.paperflow.admin.dto;

import java.util.List;
import java.util.Map;

public record CausalNodeDetailDto(
        CausalGraphNodeDto node,
        Map<String, Long> subfieldCounts,
        Map<String, Long> yearCounts,
        long totalClaims,
        List<CausalGraphEdgeDto> outgoing,
        List<CausalGraphEdgeDto> incoming) {}
