package com.paperflow.admin.controller;

import com.paperflow.admin.dto.BlockPage;
import com.paperflow.admin.dto.MatchedFileDto;
import com.paperflow.admin.dto.OriginalFilePage;
import com.paperflow.admin.dto.PaperDetail;
import com.paperflow.admin.dto.PaperCreateMetadata;
import com.paperflow.admin.dto.PaperDeleteRequest;
import com.paperflow.admin.dto.PaperFileVersionDto;
import com.paperflow.admin.dto.PaperMutationResponse;
import com.paperflow.admin.dto.PaperPurgeRequest;
import com.paperflow.admin.dto.PaperUpdateRequest;
import com.paperflow.admin.dto.PaperVersionActionRequest;
import com.paperflow.admin.dto.TrashedPaperDto;
import com.paperflow.admin.service.AdminAuditLogService;
import com.paperflow.admin.service.AdminUserPrincipal;
import com.paperflow.admin.service.AdminService;
import com.paperflow.admin.service.PaperWriteService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Validated
@RestController
@RequestMapping("/api/papers")
public class PaperController {
    private final AdminService service;
    private final PaperWriteService writes;
    private final AdminAuditLogService auditLogs;

    public PaperController(AdminService service, PaperWriteService writes, AdminAuditLogService auditLogs) {
        this.service = service;
        this.writes = writes;
        this.auditLogs = auditLogs;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PaperMutationResponse create(
            @AuthenticationPrincipal AdminUserPrincipal principal,
            @Valid @RequestPart("metadata") PaperCreateMetadata metadata,
            @RequestPart("file") MultipartFile file,
            HttpServletRequest request) {
        PaperMutationResponse result = writes.create(principal, metadata, file);
        auditLogs.success(principal, "PAPER_CREATE", "PAPER", result.fileId(), request, "创建论文");
        return result;
    }

    @GetMapping
    public OriginalFilePage listOriginalFiles(
            @RequestParam(required = false) @Pattern(regexp = "^S.+") String sourceId,
            @RequestParam(required = false) @Size(max = 500) String q,
            @RequestParam(required = false) String fileId,
            @RequestParam(required = false) @Size(max = 200) String sourceName,
            @RequestParam(required = false) @Size(max = 200) String provider,
            @RequestParam(required = false) @Pattern(regexp = "^W.+") String matchedWorkId,
            @RequestParam(required = false) Integer flagMatch,
            @RequestParam(required = false) Integer flagText,
            @RequestParam(required = false) Integer flagBlock,
            @RequestParam(required = false) String originalFileType,
            @RequestParam(required = false) Integer yearFrom,
            @RequestParam(required = false) Integer yearTo,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        return service.listOriginalFiles(
                sourceId,
                q,
                fileId,
                sourceName,
                provider,
                matchedWorkId,
                flagMatch,
                flagText,
                flagBlock,
                originalFileType,
                yearFrom,
                yearTo,
                sort,
                page,
                size);
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportOriginalFiles(
            @RequestParam(required = false) @Pattern(regexp = "^S.+") String sourceId,
            @RequestParam(required = false) @Size(max = 500) String q,
            @RequestParam(required = false) String fileId,
            @RequestParam(required = false) @Size(max = 200) String sourceName,
            @RequestParam(required = false) @Size(max = 200) String provider,
            @RequestParam(required = false) @Pattern(regexp = "^W.+") String matchedWorkId,
            @RequestParam(required = false) Integer flagMatch,
            @RequestParam(required = false) Integer flagText,
            @RequestParam(required = false) Integer flagBlock,
            @RequestParam(required = false) String originalFileType,
            @RequestParam(required = false) Integer yearFrom,
            @RequestParam(required = false) Integer yearTo,
            @RequestParam(required = false) String sort) {
        return CsvResponses.attachment(
                "papers.csv",
                service.exportOriginalFiles(
                        sourceId,
                        q,
                        fileId,
                        sourceName,
                        provider,
                        matchedWorkId,
                        flagMatch,
                        flagText,
                        flagBlock,
                        originalFileType,
                        yearFrom,
                        yearTo,
                        sort));
    }

    @GetMapping("/{fileId}")
    public PaperDetail getPaper(@PathVariable String fileId) {
        writes.requireReadable(fileId);
        return service.getPaper(fileId);
    }

    @PutMapping("/{fileId}")
    public PaperMutationResponse update(
            @AuthenticationPrincipal AdminUserPrincipal principal,
            @PathVariable String fileId,
            @Valid @RequestBody PaperUpdateRequest body,
            HttpServletRequest request) {
        PaperMutationResponse result = writes.update(principal, fileId, body);
        auditLogs.success(principal, "PAPER_UPDATE", "PAPER", fileId, request, "更新论文元数据");
        return result;
    }

    @DeleteMapping("/{fileId}")
    public PaperMutationResponse delete(
            @AuthenticationPrincipal AdminUserPrincipal principal,
            @PathVariable String fileId,
            @Valid @RequestBody PaperDeleteRequest body,
            HttpServletRequest request) {
        PaperMutationResponse result = writes.softDelete(principal, fileId, body.recordVersion(), body.reason());
        auditLogs.success(principal, "PAPER_SOFT_DELETE", "PAPER", fileId, request, "删除论文");
        return result;
    }

    @GetMapping("/trash")
    public List<TrashedPaperDto> trash(
            @AuthenticationPrincipal AdminUserPrincipal principal,
            @RequestParam(required = false) @Size(max = 500) String q) {
        if (principal == null || principal.role() == com.paperflow.admin.dto.AdminRole.USER) {
            throw new com.paperflow.admin.service.ApiException(
                    HttpStatus.FORBIDDEN, com.paperflow.admin.dto.ErrorCode.FORBIDDEN, "Forbidden");
        }
        return writes.trash(q);
    }

    @PostMapping("/{fileId}/restore")
    public PaperMutationResponse restore(
            @AuthenticationPrincipal AdminUserPrincipal principal,
            @PathVariable String fileId,
            @Valid @RequestBody PaperVersionActionRequest body,
            HttpServletRequest request) {
        PaperMutationResponse result = writes.restore(principal, fileId, body.recordVersion());
        auditLogs.success(principal, "PAPER_RESTORE", "PAPER", fileId, request, "恢复论文");
        return result;
    }

    @PostMapping("/{fileId}/purge")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void purge(
            @AuthenticationPrincipal AdminUserPrincipal principal,
            @PathVariable String fileId,
            @Valid @RequestBody PaperPurgeRequest body,
            HttpServletRequest request) {
        writes.purge(principal, fileId, body.recordVersion(), body.confirmation());
        auditLogs.success(principal, "PAPER_PURGE", "PAPER", fileId, request, "永久删除论文");
    }

    @GetMapping("/{fileId}/versions")
    public List<PaperFileVersionDto> versions(@PathVariable String fileId) {
        return writes.versions(fileId);
    }

    @PostMapping("/{fileId}/versions")
    public PaperMutationResponse replaceFile(
            @AuthenticationPrincipal AdminUserPrincipal principal,
            @PathVariable String fileId,
            @RequestParam long recordVersion,
            @RequestPart("file") MultipartFile file,
            HttpServletRequest request) {
        PaperMutationResponse result = writes.replaceFile(principal, fileId, recordVersion, file);
        auditLogs.success(principal, "PAPER_FILE_REPLACE", "PAPER", fileId, request, "替换论文全文");
        return result;
    }

    @PostMapping("/{fileId}/versions/{versionNo}/restore")
    public PaperMutationResponse restoreVersion(
            @AuthenticationPrincipal AdminUserPrincipal principal,
            @PathVariable String fileId,
            @PathVariable int versionNo,
            @Valid @RequestBody PaperVersionActionRequest body,
            HttpServletRequest request) {
        PaperMutationResponse result = writes.restoreVersion(principal, fileId, versionNo, body.recordVersion());
        auditLogs.success(principal, "PAPER_VERSION_RESTORE", "PAPER", fileId, request, "恢复论文全文版本");
        return result;
    }

    @GetMapping("/{fileId}/blocks")
    public BlockPage listOriginalFileBlocks(
            @PathVariable String fileId,
            @RequestParam(required = false) Boolean includeDiscarded,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        return service.listOriginalFileBlocks(fileId, includeDiscarded, page, size);
    }
}
