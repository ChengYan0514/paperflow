package com.paperflow.admin.dto;

import java.util.List;

public record PaperBatchDeleteResponse(List<PaperMutationResponse> items) {}
