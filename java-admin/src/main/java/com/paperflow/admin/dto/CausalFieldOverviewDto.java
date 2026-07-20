package com.paperflow.admin.dto;

import java.util.List;
import java.util.Map;

public record CausalFieldOverviewDto(
        List<String> subfields,
        List<String> topics,
        Map<String, Map<String, Long>> matrix,
        Map<String, CausalSubfieldDetailDto> details) {}
