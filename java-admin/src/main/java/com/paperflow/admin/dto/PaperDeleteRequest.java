package com.paperflow.admin.dto;

import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record PaperDeleteRequest(@PositiveOrZero long recordVersion, @Size(max = 500) String reason) {}
