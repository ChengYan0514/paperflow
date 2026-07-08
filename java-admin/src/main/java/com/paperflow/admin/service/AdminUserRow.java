package com.paperflow.admin.service;

import com.paperflow.admin.dto.AdminRole;
import java.time.OffsetDateTime;

record AdminUserRow(
        Long id,
        String username,
        String usernameNormalized,
        String passwordHash,
        String displayName,
        AdminRole role,
        boolean enabled,
        OffsetDateTime lastLoginAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
