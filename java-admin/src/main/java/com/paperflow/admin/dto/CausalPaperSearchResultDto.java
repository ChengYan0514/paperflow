package com.paperflow.admin.dto;

public record CausalPaperSearchResultDto(
        String workId,
        String title,
        Integer publicationYear,
        String sourceName,
        long claimRecordCount) {}
