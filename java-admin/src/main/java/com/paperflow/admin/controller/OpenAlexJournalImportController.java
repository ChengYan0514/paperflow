package com.paperflow.admin.controller;

import com.paperflow.admin.dto.OpenAlexJournalImportRequest;
import com.paperflow.admin.dto.OpenAlexJournalImportTaskDto;
import com.paperflow.admin.dto.OpenAlexJournalImportTaskPage;
import com.paperflow.admin.service.AdminAuditLogService;
import com.paperflow.admin.service.AdminUserPrincipal;
import com.paperflow.admin.service.OpenAlexJournalImportService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/openalex/journal-imports")
public class OpenAlexJournalImportController {
    private final OpenAlexJournalImportService imports;
    private final AdminAuditLogService auditLogs;

    public OpenAlexJournalImportController(OpenAlexJournalImportService imports, AdminAuditLogService auditLogs) {
        this.imports = imports;
        this.auditLogs = auditLogs;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OpenAlexJournalImportTaskDto create(
            @AuthenticationPrincipal AdminUserPrincipal principal,
            @Valid @RequestBody OpenAlexJournalImportRequest body,
            HttpServletRequest request) {
        OpenAlexJournalImportTaskDto task = imports.create(principal, body.sourceId(), body.yearFrom(), body.yearTo());
        auditLogs.success(principal, "OPENALEX_JOURNAL_IMPORT_CREATE", "OPENALEX_JOURNAL_IMPORT", task.taskId(), request,
                "创建来源元数据导入任务 " + task.sourceId());
        return task;
    }

    @GetMapping
    public OpenAlexJournalImportTaskPage list(
            @RequestParam(required = false) String sourceId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        return imports.list(sourceId, status, page, size);
    }

    @GetMapping("/{taskId}")
    public OpenAlexJournalImportTaskDto get(@PathVariable String taskId) {
        return imports.get(taskId);
    }

    @PostMapping("/{taskId}/retry")
    @ResponseStatus(HttpStatus.CREATED)
    public OpenAlexJournalImportTaskDto retry(
            @AuthenticationPrincipal AdminUserPrincipal principal,
            @PathVariable String taskId,
            HttpServletRequest request) {
        OpenAlexJournalImportTaskDto task = imports.retry(principal, taskId);
        auditLogs.success(principal, "OPENALEX_JOURNAL_IMPORT_RETRY", "OPENALEX_JOURNAL_IMPORT", task.taskId(), request,
                "重试来源元数据导入任务 " + task.sourceId());
        return task;
    }
}
