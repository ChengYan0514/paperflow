package com.paperflow.admin.dto;

import java.time.OffsetDateTime;

public record TrashedPaperDto(
        String fileId,
        String sourceId,
        String sourceName,
        Integer year,
        String paperTitle,
        String authors,
        Long recordVersion,
        OffsetDateTime deletedAt,
        Long deletedBy,
        String deleteReason) {}
