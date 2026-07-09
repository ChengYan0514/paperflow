package com.paperflow.admin.dto;

import java.util.List;

public record AdminAuditLogPage(List<AdminAuditLogDto> items, int page, int size, long total) {}
