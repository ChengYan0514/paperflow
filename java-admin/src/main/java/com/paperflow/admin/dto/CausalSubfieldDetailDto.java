package com.paperflow.admin.dto;

import java.util.List;

public record CausalSubfieldDetailDto(
        long paperCount,
        long claimRecordCount,
        long standardClaimCount,
        long variableCount,
        List<CausalMethodCountDto> methodCounts,
        List<CausalVariableCountDto> topVariables,
        List<CausalFieldRelationDto> topRelations) {}
