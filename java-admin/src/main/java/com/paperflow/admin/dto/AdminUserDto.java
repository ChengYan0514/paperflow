package com.paperflow.admin.dto;

import java.time.OffsetDateTime;

public record AdminUserDto(
        Long id,
        String username,
        String displayName,
        AdminRole role,
        boolean enabled,
        OffsetDateTime lastLoginAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
