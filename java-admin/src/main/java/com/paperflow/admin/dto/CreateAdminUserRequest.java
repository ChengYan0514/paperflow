package com.paperflow.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateAdminUserRequest(
        @NotBlank @Size(min = 3, max = 50) @Pattern(regexp = "^[A-Za-z0-9_.-]{3,50}$") String username,
        @NotBlank @Size(min = 12, max = 200) String password,
        @Size(max = 100) String displayName,
        @NotNull AdminRole role,
        Boolean enabled) {}
