package com.paperflow.admin.dto;

import java.util.List;

public record OpenAlexJournalImportTaskPage(
        List<OpenAlexJournalImportTaskDto> items, int page, int size, long total) {}
