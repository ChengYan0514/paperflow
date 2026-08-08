package com.paperflow.admin.controller;

import com.paperflow.admin.dto.OpenAlexSourceDto;
import com.paperflow.admin.dto.OpenAlexSourceSyncResult;
import com.paperflow.admin.service.AdminAuditLogService;
import com.paperflow.admin.service.AdminUserPrincipal;
import com.paperflow.admin.service.OpenAlexSourceSearchService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/openalex/source-search")
public class OpenAlexSourceController {
    private final OpenAlexSourceSearchService service;
    private final AdminAuditLogService auditLogs;

    public OpenAlexSourceController(OpenAlexSourceSearchService service, AdminAuditLogService auditLogs) {
        this.service = service;
        this.auditLogs = auditLogs;
    }

    @GetMapping
    public List<OpenAlexSourceDto> search(
            @RequestParam @Size(max = 200) String q,
            @RequestParam(required = false) @Min(1) @Max(20) Integer limit) {
        return service.search(q, limit);
    }

    @GetMapping("/{sourceId}")
    public OpenAlexSourceDto get(@PathVariable String sourceId) {
        return service.requireAuthoritative(sourceId);
    }

    @PostMapping("/sync")
    public OpenAlexSourceSyncResult sync(
            @AuthenticationPrincipal AdminUserPrincipal principal, HttpServletRequest request) {
        long count = service.syncAll(principal);
        auditLogs.success(principal, "OPENALEX_SOURCE_SYNC", "SOURCE_SEARCH", null, request, "同步来源 " + count + " 条");
        return new OpenAlexSourceSyncResult(count);
    }
}
