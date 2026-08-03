package com.paperflow.admin.dto;

import java.util.List;

public record PaperDetail(
        PaperOriginalFile originalFile,
        PaperTaskStatus taskStatus,
        OpenAlexMetadata openAlex,
        List<TextFileDto> textFiles,
        CausalPaperSummaryDto causalSummary) {}
