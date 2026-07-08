package com.paperflow.admin.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;

public record BlockDto(
        String blockId,
        String fileId,
        String blockType,
        String blockText,
        Integer pdfPage,
        JsonNode pdfBbox,
        Integer blockSeq,
        String parentTitleBlockId,
        Integer titleLevel,
        String imagePath,
        String imageUrl,
        String imageCaption,
        String imageFootnote,
        String tableImagePath,
        String tableImageUrl,
        String tableCaption,
        String tableFootnote,
        String equationImagePath,
        String equationImageUrl,
        String equationFormat,
        String footnoteLabel,
        String footnoteText,
        List<String> references) {
}
