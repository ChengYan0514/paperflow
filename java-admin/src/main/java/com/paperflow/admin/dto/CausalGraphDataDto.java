package com.paperflow.admin.dto;

import java.util.List;

public record CausalGraphDataDto(List<CausalGraphNodeDto> nodes, List<CausalGraphEdgeDto> edges) {}
