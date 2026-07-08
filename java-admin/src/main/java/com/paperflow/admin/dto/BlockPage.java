package com.paperflow.admin.dto;

import java.util.List;

public record BlockPage(List<BlockDto> items, int page, int size, long total) {
}
