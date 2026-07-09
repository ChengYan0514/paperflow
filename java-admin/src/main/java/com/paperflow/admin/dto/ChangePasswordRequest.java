package com.paperflow.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank @Size(max = 200) String oldPassword, @NotBlank @Size(min = 5, max = 200) String newPassword) {}
