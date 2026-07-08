package com.paperflow.admin.dto;

public enum ProcessingStatus {
    NO_MATCHED_FILE,
    MATCHED,
    PARSING,
    PARSE_FAILED,
    UNSUPPORTED_TEXT_INPUT,
    PARSED,
    BLOCK_FAILED,
    READY
}
