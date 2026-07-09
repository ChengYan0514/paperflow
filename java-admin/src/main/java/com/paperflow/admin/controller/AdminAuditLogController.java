package com.paperflow.admin.controller;

import com.paperflow.admin.dto.AdminAuditLogPage;
import com.paperflow.admin.service.AdminAuditLogService;
import com.paperflow.admin.service.AdminUserPrincipal;
import java.time.OffsetDateTime;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin-audit-logs")
public class AdminAuditLogController {
    private final AdminAuditLogService service;

    public AdminAuditLogController(AdminAuditLogService service) {
        this.service = service;
    }

    @GetMapping
    public AdminAuditLogPage list(
            @AuthenticationPrincipal AdminUserPrincipal principal,
            @RequestParam(required = false) String actorUsername,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) String result,
            @RequestParam(required = false) String requestId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                    OffsetDateTime createdFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                    OffsetDateTime createdTo,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        return service.list(
                principal,
                actorUsername,
                action,
                targetType,
                result,
                requestId,
                createdFrom,
                createdTo,
                page,
                size);
    }
}
