package com.paperflow.admin.dto;

import java.util.List;

public record SourcePage(List<SourceSummary> items, int page, int size, long total) {
}
