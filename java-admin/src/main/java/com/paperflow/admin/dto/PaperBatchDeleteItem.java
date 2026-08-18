package com.paperflow.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

public record PaperBatchDeleteItem(
        @NotBlank String fileId,
        @PositiveOrZero long recordVersion) {}
