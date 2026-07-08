package com.paperflow.admin.dto;

import java.util.List;

public record WorkDetail(
        WorkMetadata work,
        List<SourceBrief> sources,
        List<AuthorDto> authors,
        MatchedFileDto matchedFile,
        ProcessingStatus processingStatus) {
}
