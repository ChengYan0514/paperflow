package com.paperflow.admin.dto;

public record AuthUser(Long id, String username, String displayName, AdminRole role) {}
