package com.paperflow.admin.dto;

public record TextFileDto(
        String fileId,
        String fileType,
        String fileName,
        String filePath,
        String fileUrl,
        Long fileSize) {
}
