package com.paperflow.admin.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.List;

public record PaperUpdateRequest(
        @NotBlank @Size(max = 255) String sourceId,
        @Min(1000) @Max(3000) int year,
        @NotBlank @Size(max = 2000) String paperTitle,
        @NotEmpty @Size(max = 100) List<@NotBlank @Size(max = 500) String> authors,
        @Size(max = 500) String doi,
        @Size(max = 2000) String url,
        @PositiveOrZero long recordVersion) {}
