package com.paperflow.admin.dto;

import java.util.List;

public record TaskStatusResponse(TaskStatusTotals totals, List<TaskStatusSource> sources) {
}
