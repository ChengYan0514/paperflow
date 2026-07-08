package com.paperflow.admin.config;

import jakarta.validation.constraints.Min;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "paperflow.api")
public record PaperflowApiProperties(
        @Min(1) int defaultPageSize,
        @Min(1) int maxPageSize,
        @Min(1) int defaultBlockPageSize,
        @Min(1) int maxBlockPageSize,
        String dataRoot) {
}
