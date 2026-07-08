package com.paperflow.admin.dto;

public record WorkMetadata(
        String workId,
        String title,
        String doi,
        Integer publicationYear,
        String publicationDate,
        String type,
        String language) {
}
