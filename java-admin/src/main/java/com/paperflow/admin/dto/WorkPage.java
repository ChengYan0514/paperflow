package com.paperflow.admin.dto;

import java.util.List;

public record WorkPage(List<WorkListItem> items, int page, int size, long total) {
}
