package com.paperflow.admin.controller;

import com.paperflow.admin.dto.CausalEdgeDetailDto;
import com.paperflow.admin.dto.CausalFieldAnalysisDto;
import com.paperflow.admin.dto.CausalGraphDataDto;
import com.paperflow.admin.dto.CausalGraphSummaryDto;
import com.paperflow.admin.dto.CausalNodeDetailDto;
import com.paperflow.admin.dto.CausalNodeSearchResultDto;
import com.paperflow.admin.dto.CausalPaperDetailDto;
import com.paperflow.admin.dto.CausalPaperSearchResultDto;
import com.paperflow.admin.dto.CausalPaperSummaryDto;
import com.paperflow.admin.service.KnowledgeGraphService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/knowledge/causal-graph")
public class KnowledgeGraphController {
    private final KnowledgeGraphService service;

    public KnowledgeGraphController(KnowledgeGraphService service) {
        this.service = service;
    }

    @GetMapping("/summary")
    public CausalGraphSummaryDto summary() {
        return service.summary();
    }

    @GetMapping("/graph")
    public CausalGraphDataDto graph(
            @RequestParam(required = false) @Min(1) Integer minRecordCount,
            @RequestParam(required = false) @Min(1) Integer minPaperCount,
            @RequestParam(required = false) @Min(1) Integer minDiversity,
            @RequestParam(required = false) List<@Size(max = 255) String> subfields,
            @RequestParam(required = false) @Size(max = 255) String query,
            @RequestParam(required = false) @Min(1) @Max(1000) Integer maxNodes,
            @RequestParam(required = false) @Min(1) @Max(2000) Integer maxEdges) {
        return service.graph(minRecordCount, minPaperCount, minDiversity, subfields, query, maxNodes, maxEdges);
    }

    @GetMapping("/search/nodes")
    public List<CausalNodeSearchResultDto> searchNodes(
            @RequestParam @Size(max = 255) String q,
            @RequestParam(required = false) @Min(1) @Max(50) Integer limit) {
        return service.searchNodes(q, limit);
    }

    @GetMapping("/search/terms")
    public List<String> searchTerms(
            @RequestParam @Size(max = 255) String q,
            @RequestParam(required = false) @Min(1) @Max(50) Integer limit) {
        return service.searchTerms(q, limit);
    }

    @GetMapping("/search/papers")
    public List<CausalPaperSearchResultDto> searchPapers(
            @RequestParam @Size(max = 255) String q,
            @RequestParam(required = false) @Min(1) @Max(50) Integer limit) {
        return service.searchPapers(q, limit);
    }

    @GetMapping("/nodes/{variable}")
    public CausalNodeDetailDto node(@PathVariable @Size(max = 255) String variable) {
        return service.nodeDetail(variable);
    }

    @GetMapping("/edges")
    public CausalEdgeDetailDto edge(
            @RequestParam @Size(max = 255) String cause,
            @RequestParam @Size(max = 255) String effect) {
        return service.edgeDetailByCauseEffect(cause, effect);
    }

    @GetMapping("/claims/{claimId}")
    public CausalEdgeDetailDto claim(@PathVariable @Min(1) long claimId) {
        return service.edgeDetailByClaimId(claimId);
    }

    @GetMapping("/papers/{workId}")
    public CausalPaperDetailDto paper(@PathVariable @Pattern(regexp = "^W.+") String workId) {
        return service.paperDetail(workId);
    }

    @GetMapping("/papers/{workId}/summary")
    public CausalPaperSummaryDto paperSummary(@PathVariable @Pattern(regexp = "^W.+") String workId) {
        return service.paperSummary(workId);
    }

    @GetMapping("/fields")
    public CausalFieldAnalysisDto fields() {
        return service.fields();
    }
}
