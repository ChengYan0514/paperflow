package com.paperflow.admin.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record PaperBatchDeleteRequest(
        @NotEmpty @Size(max = 100) List<@Valid PaperBatchDeleteItem> papers,
        @Size(max = 500) String reason) {}
