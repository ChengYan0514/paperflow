package com.paperflow.admin.dto;

public record OpenAlexJournalImportResult(
        long sourceCount,
        long workCount,
        long workSourceCount,
        long workAuthorCount,
        long workTopicCount,
        long matchResetCount) {}
