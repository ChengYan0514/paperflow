package com.paperflow.admin.dto;

import java.time.OffsetDateTime;

public record AdminAuditLogDto(
        Long id,
        Long actorId,
        String actorUsername,
        String action,
        String targetType,
        String targetId,
        String result,
        String requestId,
        String remoteAddr,
        String userAgent,
        String message,
        OffsetDateTime createdAt) {}
