package com.paperflow.admin.dto;

import jakarta.validation.constraints.Size;

public record UpdateAdminUserRequest(@Size(max = 100) String displayName, AdminRole role, Boolean enabled) {}
