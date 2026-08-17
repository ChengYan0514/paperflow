package com.paperflow.admin.dto;

import java.time.OffsetDateTime;

public record OpenAlexJournalImportTaskDto(
        String taskId,
        String sourceId,
        Integer yearFrom,
        Integer yearTo,
        String status,
        String retryOfTaskId,
        int attemptCount,
        int progressCurrent,
        int progressTotal,
        String progressMessage,
        OpenAlexJournalImportResult result,
        String errorCode,
        String errorMessage,
        OffsetDateTime createdAt,
        OffsetDateTime startedAt,
        OffsetDateTime finishedAt) {}
