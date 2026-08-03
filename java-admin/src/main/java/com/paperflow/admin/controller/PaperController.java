package com.paperflow.admin.controller;

import com.paperflow.admin.dto.BlockPage;
import com.paperflow.admin.dto.MatchedFileDto;
import com.paperflow.admin.dto.OriginalFilePage;
import com.paperflow.admin.dto.PaperDetail;
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
@RequestMapping("/api/papers")
public class PaperController {
    private final AdminService service;

    public PaperController(AdminService service) {
        this.service = service;
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
        return service.getPaper(fileId);
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
