package com.paperflow.admin.controller;

import com.paperflow.admin.dto.OriginalFileImportBatchDto;
import com.paperflow.admin.dto.OriginalFileImportItemPage;
import com.paperflow.admin.service.AdminUserPrincipal;
import com.paperflow.admin.service.AdminAuditLogService;
import com.paperflow.admin.service.OriginalFileImportService;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/original-file-imports")
public class OriginalFileImportController {
    private final OriginalFileImportService imports;
    private final AdminAuditLogService auditLogs;

    public OriginalFileImportController(OriginalFileImportService imports, AdminAuditLogService auditLogs) {
        this.imports = imports;
        this.auditLogs = auditLogs;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OriginalFileImportBatchDto create(
            @AuthenticationPrincipal AdminUserPrincipal principal,
            @RequestParam(required = false) String uploadName,
            HttpServletRequest request) {
        OriginalFileImportBatchDto result = imports.create(principal, uploadName);
        auditLogs.success(principal, "ORIGINAL_FILE_IMPORT_CREATE", "IMPORT_BATCH", result.batchId(), request, "创建全文批量导入批次");
        return result;
    }

    @PutMapping("/{batchId}/parts/{partNo}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void part(
            @AuthenticationPrincipal AdminUserPrincipal principal,
            @PathVariable String batchId,
            @PathVariable int partNo,
            @RequestPart("part") MultipartFile part,
            @RequestHeader(value = "X-Part-SHA256", required = false) String partSha256) {
        imports.uploadPart(principal, batchId, partNo, part, partSha256);
    }

    @PostMapping("/{batchId}/complete")
    public OriginalFileImportBatchDto complete(@AuthenticationPrincipal AdminUserPrincipal principal, @PathVariable String batchId) {
        return imports.complete(principal, batchId);
    }

    @PostMapping("/{batchId}/confirm")
    public OriginalFileImportBatchDto confirm(@AuthenticationPrincipal AdminUserPrincipal principal, @PathVariable String batchId, HttpServletRequest request) {
        OriginalFileImportBatchDto result = imports.confirm(principal, batchId);
        auditLogs.success(principal, "ORIGINAL_FILE_IMPORT_CONFIRM", "IMPORT_BATCH", batchId, request, "确认全文批量导入");
        return result;
    }

    @PostMapping("/{batchId}/cancel")
    public OriginalFileImportBatchDto cancel(@AuthenticationPrincipal AdminUserPrincipal principal, @PathVariable String batchId, HttpServletRequest request) {
        OriginalFileImportBatchDto result = imports.cancel(principal, batchId);
        auditLogs.success(principal, "ORIGINAL_FILE_IMPORT_CANCEL", "IMPORT_BATCH", batchId, request, "取消全文批量导入");
        return result;
    }

    @GetMapping("/{batchId}")
    public OriginalFileImportBatchDto get(@AuthenticationPrincipal AdminUserPrincipal principal, @PathVariable String batchId) {
        return imports.get(principal, batchId);
    }

    @GetMapping("/{batchId}/items")
    public OriginalFileImportItemPage items(
            @AuthenticationPrincipal AdminUserPrincipal principal,
            @PathVariable String batchId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int size) {
        return imports.items(principal, batchId, page, size);
    }

    @GetMapping
    public List<OriginalFileImportBatchDto> list(
            @AuthenticationPrincipal AdminUserPrincipal principal,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int size) {
        return imports.list(principal, page, size);
    }

    @GetMapping("/{batchId}/errors.csv")
    public ResponseEntity<byte[]> errors(@AuthenticationPrincipal AdminUserPrincipal principal, @PathVariable String batchId) {
        List<com.paperflow.admin.dto.OriginalFileImportItemDto> page = imports.errors(principal, batchId);
        StringBuilder csv = new StringBuilder("row_number,file_id,source_id,file_path,status,error_code,error_message\n");
        page.forEach(item -> csv.append(item.rowNumber()).append(',').append(cell(item.fileId())).append(',').append(cell(item.sourceId())).append(',').append(cell(item.filePath())).append(',').append(cell(item.status())).append(',').append(cell(item.errorCode())).append(',').append(cell(item.errorMessage())).append('\n'));
        return ResponseEntity.ok().header("Content-Disposition", "attachment; filename=import-errors.csv").header("Content-Type", "text/csv;charset=UTF-8").body(("\uFEFF" + csv).getBytes(StandardCharsets.UTF_8));
    }

    private String cell(String value) {
        if (value == null) return "";
        return '"' + value.replace("\"", "\"\"") + '"';
    }

}
