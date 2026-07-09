package com.paperflow.admin.controller;

import com.paperflow.admin.dto.SourcePage;
import com.paperflow.admin.dto.SourceSummary;
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
@RequestMapping("/api/sources")
public class SourceController {
    private final AdminService service;

    public SourceController(AdminService service) {
        this.service = service;
    }

    @GetMapping
    public SourcePage listSources(
            @RequestParam(required = false) @Size(max = 200) String sourceId,
            @RequestParam(required = false) @Size(max = 200) String sourceName,
            @RequestParam(required = false) @Size(max = 200) String provider,
            @RequestParam(required = false) Boolean hasOriginalFiles,
            @RequestParam(required = false) Boolean hasFailures,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        return service.listSources(
                sourceId, sourceName, provider, hasOriginalFiles, hasFailures, sort, page, size);
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportSources(
            @RequestParam(required = false) @Size(max = 200) String sourceId,
            @RequestParam(required = false) @Size(max = 200) String sourceName,
            @RequestParam(required = false) @Size(max = 200) String provider,
            @RequestParam(required = false) Boolean hasOriginalFiles,
            @RequestParam(required = false) Boolean hasFailures,
            @RequestParam(required = false) String sort) {
        return CsvResponses.attachment(
                "sources.csv",
                service.exportSources(sourceId, sourceName, provider, hasOriginalFiles, hasFailures, sort));
    }

    @GetMapping("/{sourceId}")
    public SourceSummary getSource(@PathVariable @Pattern(regexp = "^S.+") String sourceId) {
        return service.getSource(sourceId);
    }
}
