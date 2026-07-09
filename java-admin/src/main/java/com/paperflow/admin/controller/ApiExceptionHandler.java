package com.paperflow.admin.controller;

import com.paperflow.admin.dto.ErrorResponse;
import com.paperflow.admin.dto.ErrorCode;
import com.paperflow.admin.service.ApiException;
import com.paperflow.admin.service.NotFoundException;
import com.paperflow.admin.service.RecentErrorService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);
    private final RecentErrorService recentErrors;

    public ApiExceptionHandler(RecentErrorService recentErrors) {
        this.recentErrors = recentErrors;
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> api(ApiException exc, HttpServletRequest request) {
        return ResponseEntity.status(exc.status())
                .body(new ErrorResponse(exc.code(), exc.getMessage(), RequestIds.get(request)));
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorResponse> notFound(NotFoundException exc, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse(exc.code(), exc.getMessage(), RequestIds.get(request)));
    }

    @ExceptionHandler({
        ConstraintViolationException.class,
        MethodArgumentNotValidException.class,
        MethodArgumentTypeMismatchException.class,
        HttpMessageNotReadableException.class,
        IllegalArgumentException.class
    })
    public ResponseEntity<ErrorResponse> badRequest(Exception exc, HttpServletRequest request) {
        return ResponseEntity.badRequest()
                .body(new ErrorResponse(ErrorCode.VALIDATION_ERROR, "Invalid request", RequestIds.get(request)));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> internal(Exception exc, HttpServletRequest request) {
        String requestId = RequestIds.get(request);
        recentErrors.record(requestId, request.getMethod(), request.getRequestURI(), exc.getMessage());
        log.error(
                "Unhandled API exception requestId={} method={} path={}",
                requestId,
                request.getMethod(),
                request.getRequestURI(),
                exc);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse(ErrorCode.INTERNAL_ERROR, "Internal server error", requestId));
    }

}
