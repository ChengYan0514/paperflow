package com.paperflow.admin.controller;

import com.paperflow.admin.dto.BlockPage;
import com.paperflow.admin.dto.MatchedFileDto;
import com.paperflow.admin.dto.OriginalFilePage;
import com.paperflow.admin.service.AdminService;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/original-files")
public class OriginalFileController {
    private final AdminService service;

    public OriginalFileController(AdminService service) {
        this.service = service;
    }

    @GetMapping
    public OriginalFilePage listOriginalFiles(
            @RequestParam(required = false) @Pattern(regexp = "^S.+") String sourceId,
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

    @GetMapping("/{fileId}")
    public MatchedFileDto getOriginalFile(@PathVariable String fileId) {
        return service.getOriginalFile(fileId);
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
