package com.paperflow.admin.dto;

import java.util.List;

public record CausalPaperDetailDto(
        CausalPaperInfoDto paper,
        List<CausalClaimDto> claims,
        CausalGraphDataDto paperGraph) {}
