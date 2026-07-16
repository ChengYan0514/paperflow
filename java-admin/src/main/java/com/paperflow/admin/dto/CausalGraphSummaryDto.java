package com.paperflow.admin.dto;

import java.util.List;

public record CausalGraphSummaryDto(
        CausalGraphOverviewDto overview,
        List<String> subfields,
        List<String> methods,
        CausalDatasetVersionDto datasetVersion) {}
