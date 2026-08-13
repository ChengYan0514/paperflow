package com.paperflow.admin.dto;

import java.util.List;

public record OriginalFileImportItemPage(List<OriginalFileImportItemDto> items, int page, int size, long total) {}
