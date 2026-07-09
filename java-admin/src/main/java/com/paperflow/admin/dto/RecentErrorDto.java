package com.paperflow.admin.dto;

import java.time.OffsetDateTime;

public record RecentErrorDto(String requestId, String method, String path, String message, OffsetDateTime createdAt) {}
