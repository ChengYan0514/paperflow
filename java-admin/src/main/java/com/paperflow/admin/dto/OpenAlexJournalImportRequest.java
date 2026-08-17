package com.paperflow.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OpenAlexJournalImportRequest(
        @NotBlank @Size(max = 255) String sourceId,
        Integer yearFrom,
        Integer yearTo) {}
