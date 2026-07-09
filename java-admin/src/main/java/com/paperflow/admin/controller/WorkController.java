package com.paperflow.admin.controller;

import com.paperflow.admin.dto.BlockDto;
import com.paperflow.admin.dto.BlockPage;
import com.paperflow.admin.dto.ProcessingStatus;
import com.paperflow.admin.dto.WorkDetail;
import com.paperflow.admin.dto.WorkListItem;
import com.paperflow.admin.dto.WorkPage;
import com.paperflow.admin.service.AdminService;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/works")
public class WorkController {
    private final AdminService service;

    public WorkController(AdminService service) {
        this.service = service;
    }

    @GetMapping
    public WorkPage searchWorks(
            @RequestParam(required = false) @Pattern(regexp = "^S.+") String sourceId,
            @RequestParam(required = false) @Pattern(regexp = "^W.+") String workId,
            @RequestParam(required = false) @Size(max = 200) String sourceName,
            @RequestParam(required = false) @Size(max = 200) String authorName,
            @RequestParam(required = false) @Size(max = 200) String title,
            @RequestParam(required = false) @Size(max = 500) String doi,
            @RequestParam(required = false) Integer yearFrom,
            @RequestParam(required = false) Integer yearTo,
            @RequestParam(required = false) ProcessingStatus processingStatus,
            @RequestParam(required = false) @Size(max = 100) String type,
            @RequestParam(required = false) @Size(max = 100) String language,
            @RequestParam(required = false) String matchedFileId,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        return service.searchWorks(
                sourceId,
                workId,
                sourceName,
                authorName,
                title,
                doi,
                yearFrom,
                yearTo,
                processingStatus,
                type,
                language,
                matchedFileId,
                sort,
                page,
                size);
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportWorks(
            @RequestParam(required = false) @Pattern(regexp = "^S.+") String sourceId,
            @RequestParam(required = false) @Pattern(regexp = "^W.+") String workId,
            @RequestParam(required = false) @Size(max = 200) String sourceName,
            @RequestParam(required = false) @Size(max = 200) String authorName,
            @RequestParam(required = false) @Size(max = 200) String title,
            @RequestParam(required = false) @Size(max = 500) String doi,
            @RequestParam(required = false) Integer yearFrom,
            @RequestParam(required = false) Integer yearTo,
            @RequestParam(required = false) ProcessingStatus processingStatus,
            @RequestParam(required = false) @Size(max = 100) String type,
            @RequestParam(required = false) @Size(max = 100) String language,
            @RequestParam(required = false) String matchedFileId,
            @RequestParam(required = false) String sort) {
        return CsvResponses.attachment(
                "works.csv",
                service.exportWorks(
                        sourceId,
                        workId,
                        sourceName,
                        authorName,
                        title,
                        doi,
                        yearFrom,
                        yearTo,
                        processingStatus,
                        type,
                        language,
                        matchedFileId,
                        sort));
    }

    @GetMapping("/{workId}")
    public WorkDetail getWork(@PathVariable @Pattern(regexp = "^W.+") String workId) {
        return service.getWork(workId);
    }

    @GetMapping("/{workId}/blocks")
    public BlockPage listWorkBlocks(
            @PathVariable @Pattern(regexp = "^W.+") String workId,
            @RequestParam(required = false) Boolean includeDiscarded,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        return service.listWorkBlocks(workId, includeDiscarded, page, size);
    }
}
