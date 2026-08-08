package com.paperflow.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

public record PaperPurgeRequest(@NotBlank String confirmation, @PositiveOrZero long recordVersion) {}
