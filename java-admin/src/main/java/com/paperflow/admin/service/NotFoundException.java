package com.paperflow.admin.service;

import com.paperflow.admin.dto.ErrorCode;

public class NotFoundException extends RuntimeException {
    private final ErrorCode code;

    public NotFoundException(ErrorCode code, String message) {
        super(message);
        this.code = code;
    }

    public ErrorCode code() {
        return code;
    }
}
