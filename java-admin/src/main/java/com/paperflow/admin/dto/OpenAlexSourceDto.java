package com.paperflow.admin.dto;

import java.util.List;

public record OpenAlexSourceDto(
        String sourceId,
        String displayName,
        String publisher,
        String issnL,
        List<String> issn,
        Integer worksCount,
        Integer citedByCount,
        Boolean isOa,
        Boolean isInDoaj,
        String homepageUrl) {}
