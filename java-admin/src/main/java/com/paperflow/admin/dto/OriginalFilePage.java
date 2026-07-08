package com.paperflow.admin.dto;

import java.util.List;

public record OriginalFilePage(List<MatchedFileDto> items, int page, int size, long total) {
}
