package com.paperflow.admin.dto;

import java.util.List;

public record MatchedFileDto(
        String fileId,
        String sourceId,
        Integer year,
        String paperTitle,
        String authors,
        String doi,
        String url,
        String provider,
        String originalFileName,
        String originalFilePath,
        String originalFileUrl,
        String originalFileType,
        Long fileSize,
        Integer flagMatch,
        String matchedWorkId,
        Integer flagText,
        Integer flagBlock,
        List<TextFileDto> textFiles) {
}
