package com.paperflow.admin.controller;

import com.paperflow.admin.dto.ErrorResponse;
import com.paperflow.admin.dto.ErrorCode;
import com.paperflow.admin.service.NotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorResponse> notFound(NotFoundException exc, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse(exc.code(), exc.getMessage(), requestId(request)));
    }

    @ExceptionHandler({
        ConstraintViolationException.class,
        MethodArgumentNotValidException.class,
        MethodArgumentTypeMismatchException.class,
        IllegalArgumentException.class
    })
    public ResponseEntity<ErrorResponse> badRequest(Exception exc, HttpServletRequest request) {
        return ResponseEntity.badRequest()
                .body(new ErrorResponse(ErrorCode.VALIDATION_ERROR, "Invalid request", requestId(request)));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> internal(Exception exc, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse(ErrorCode.INTERNAL_ERROR, "Internal server error", requestId(request)));
    }

    private String requestId(HttpServletRequest request) {
        Object existing = request.getAttribute("paperflowRequestId");
        if (existing instanceof String requestId) {
            return requestId;
        }
        String requestId = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        request.setAttribute("paperflowRequestId", requestId);
        return requestId;
    }
}
