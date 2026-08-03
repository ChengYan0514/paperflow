package com.paperflow.admin.dto;

import java.util.List;

public record OpenAlexMetadata(
        String workId,
        String title,
        String doi,
        Integer publicationYear,
        String publicationDate,
        String type,
        String language,
        List<SourceBrief> sources,
        List<AuthorDto> authors) {}
