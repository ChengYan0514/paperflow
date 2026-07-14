package com.paperflow.admin.dto;

import java.util.List;

public record CausalEdgeStatsDto(
        long spreadSubfield,
        long spreadTopic,
        long spreadTime,
        List<String> methods) {}
