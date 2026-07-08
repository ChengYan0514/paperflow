package com.paperflow.admin.dto;

public record ErrorResponse(ErrorCode code, String message, String requestId) {
}
