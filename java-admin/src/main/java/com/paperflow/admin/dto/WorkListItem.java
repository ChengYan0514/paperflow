package com.paperflow.admin.dto;

import java.util.List;

public record WorkListItem(
        String workId,
        String title,
        String doi,
        Integer publicationYear,
        String publicationDate,
        String type,
        String language,
        List<String> sourceIds,
        ProcessingStatus processingStatus,
        String matchedFileId,
        Integer flagMatch,
        Integer flagText,
        Integer flagBlock) {
}
