package com.paperflow.admin.dto;

public record PaperOriginalFile(
        String fileId,
        String sourceId,
        String sourceName,
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
        Long fileSize) {}
