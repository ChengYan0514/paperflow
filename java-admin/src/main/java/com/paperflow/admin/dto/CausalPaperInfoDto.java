package com.paperflow.admin.dto;

public record CausalPaperInfoDto(
        String workId,
        String title,
        Integer publicationYear,
        String sourceId,
        String sourceName,
        String topicName,
        String subfieldName) {}
