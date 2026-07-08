package com.paperflow.admin.service;

import com.paperflow.admin.dto.AdminRole;

public record AdminUserPrincipal(Long id, String username, String displayName, AdminRole role) {}
