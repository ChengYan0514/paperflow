package com.paperflow.admin.dto;

import jakarta.validation.constraints.PositiveOrZero;

public record PaperVersionActionRequest(@PositiveOrZero long recordVersion) {}
