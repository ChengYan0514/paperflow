package com.paperflow.admin.service;

import com.paperflow.admin.dto.CausalClaimDto;
import com.paperflow.admin.dto.CausalDatasetVersionDto;
import com.paperflow.admin.dto.CausalEdgeDetailDto;
import com.paperflow.admin.dto.CausalEdgeStatsDto;
import com.paperflow.admin.dto.CausalFieldAnalysisDto;
import com.paperflow.admin.dto.CausalFieldItemDto;
import com.paperflow.admin.dto.CausalFieldOverviewDto;
import com.paperflow.admin.dto.CausalFieldRelationDto;
import com.paperflow.admin.dto.CausalMethodCountDto;
import com.paperflow.admin.dto.CausalVariableCountDto;
import com.paperflow.admin.dto.CausalGraphDataDto;
import com.paperflow.admin.dto.CausalGraphEdgeDto;
import com.paperflow.admin.dto.CausalGraphNodeDto;
import com.paperflow.admin.dto.CausalGraphOverviewDto;
import com.paperflow.admin.dto.CausalGraphSummaryDto;
import com.paperflow.admin.dto.CausalNodeDetailDto;
import com.paperflow.admin.dto.CausalNodeSearchResultDto;
import com.paperflow.admin.dto.CausalPaperDetailDto;
import com.paperflow.admin.dto.CausalPaperInfoDto;
import com.paperflow.admin.dto.CausalPaperSearchResultDto;
import com.paperflow.admin.dto.CausalPaperSummaryDto;
import com.paperflow.admin.dto.CausalSubfieldDetailDto;
import com.paperflow.admin.mapper.KnowledgeGraphMapper;
import com.paperflow.admin.model.CausalClaimRecord;
import com.paperflow.admin.model.CausalCountRow;
import com.paperflow.admin.model.CausalEdgeAggregateRow;
import com.paperflow.admin.model.CausalFieldMethodRow;
import com.paperflow.admin.model.CausalFieldRelationRow;
import com.paperflow.admin.model.CausalFieldVariableRow;
import com.paperflow.admin.model.CausalOverviewRow;
import com.paperflow.admin.model.CausalPaperSummaryRow;
import com.paperflow.admin.model.CausalSubfieldStatsRow;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class KnowledgeGraphService {
    private static final int DEFAULT_MIN_RECORD_COUNT = 3;
    private static final int DEFAULT_MIN_DIVERSITY = 1;
    private static final int DEFAULT_MAX_NODES = 300;
    private static final int DEFAULT_MAX_EDGES = 500;
    private static final int MAX_NODES = 1000;
    private static final int MAX_EDGES = 2000;
    private static final int DETAIL_CLAIM_LIMIT = 500;
    private static final int FIELD_OVERVIEW_LIMIT = 10;
    private static final int FIELD_METHOD_LIMIT = 10;
    private static final int FIELD_VARIABLE_LIMIT = 10;
    private static final int FIELD_RELATION_LIMIT = 8;

    private final KnowledgeGraphMapper mapper;

    public KnowledgeGraphService(KnowledgeGraphMapper mapper) {
        this.mapper = mapper;
    }

    @Cacheable(cacheNames = "causalGraphSummary", sync = true)
    public CausalGraphSummaryDto summary() {
        CausalOverviewRow row = mapper.findOverview(DEFAULT_MIN_RECORD_COUNT);
        return new CausalGraphSummaryDto(
                new CausalGraphOverviewDto(
                        row.getTotalClaimRecords(),
                        row.getTotalStandardClaims(),
                        row.getTotalPapers(),
                        row.getTotalNodes(),
                        row.getTotalEdges(),
                        row.getGraphNodes(),
                        row.getGraphEdges(),
                        DEFAULT_MIN_RECORD_COUNT),
                mapper.listSubfields(),
                mapper.listMethods(),
                new CausalDatasetVersionDto(LocalDate.now().toString(), null));
    }

    @Cacheable(
            cacheNames = "causalGraphDefault",
            key = "'default'",
            condition = "#p0 == 20 && #p1 == null && #p2 == 5 && (#p3 == null || #p3.isEmpty()) && (#p4 == null || #p4.isBlank()) && #p5 == 300 && #p6 == 500",
            sync = true)
    public CausalGraphDataDto graph(
            Integer minRecordCount,
            Integer minPaperCount,
            Integer minDiversity,
            List<String> subfields,
            String query,
            Integer maxNodes,
            Integer maxEdges) {
        int resolvedMaxEdges = clamp(maxEdges, DEFAULT_MAX_EDGES, 1, MAX_EDGES);
        int resolvedMaxNodes = clamp(maxNodes, DEFAULT_MAX_NODES, 1, MAX_NODES);
        List<CausalEdgeAggregateRow> edgeRows = mapper.listGraphEdges(
                clamp(minRecordCount, DEFAULT_MIN_RECORD_COUNT, 1, 1_000_000),
                minPaperCount == null || minPaperCount < 1 ? null : minPaperCount,
                clamp(minDiversity, DEFAULT_MIN_DIVERSITY, 1, 1_000),
                emptyToNull(subfields),
                blankToNull(query),
                resolvedMaxEdges);

        List<CausalGraphEdgeDto> edges = new ArrayList<>();
        LinkedHashMap<String, NodeAccumulator> nodes = new LinkedHashMap<>();
        for (CausalEdgeAggregateRow row : edgeRows) {
            if (!nodes.containsKey(row.getCauseStandard()) && nodes.size() >= resolvedMaxNodes) {
                continue;
            }
            if (!nodes.containsKey(row.getEffectStandard()) && nodes.size() + 1 >= resolvedMaxNodes) {
                continue;
            }
            edges.add(toEdge(row));
            nodes.computeIfAbsent(row.getCauseStandard(), NodeAccumulator::new).asCause += row.getRecordCount();
            nodes.computeIfAbsent(row.getEffectStandard(), NodeAccumulator::new).asEffect += row.getRecordCount();
        }
        return new CausalGraphDataDto(
                nodes.values().stream().map(NodeAccumulator::toNode).toList(),
                edges);
    }

    public List<CausalNodeSearchResultDto> searchNodes(String query, Integer limit) {
        return mapper.searchNodes(requireText(query), clamp(limit, 10, 1, 50)).stream()
                .map(row -> new CausalNodeSearchResultDto(row.getVariable(), row.getOccurrences()))
                .toList();
    }

    public List<String> searchTerms(String query, Integer limit) {
        return mapper.searchTerms(requireText(query), clamp(limit, 10, 1, 50));
    }

    public List<CausalPaperSearchResultDto> searchPapers(String query, Integer limit) {
        return mapper.searchPapers(requireText(query), clamp(limit, 10, 1, 50)).stream()
                .map(row -> new CausalPaperSearchResultDto(
                        row.getWorkId(),
                        row.getTitle(),
                        row.getPublicationYear(),
                        row.getSourceName(),
                        row.getClaimRecordCount()))
                .toList();
    }

    public CausalNodeDetailDto nodeDetail(String variable) {
        String resolvedVariable = requireText(variable);
        List<CausalGraphEdgeDto> outgoing = mapper.listOutgoingEdges(resolvedVariable, 100).stream()
                .map(this::toEdge)
                .toList();
        List<CausalGraphEdgeDto> incoming = mapper.listIncomingEdges(resolvedVariable, 100).stream()
                .map(this::toEdge)
                .toList();
        long asCause = outgoing.stream().mapToLong(CausalGraphEdgeDto::recordCount).sum();
        long asEffect = incoming.stream().mapToLong(CausalGraphEdgeDto::recordCount).sum();
        if (asCause + asEffect == 0) {
            throw new NotFoundException(com.paperflow.admin.dto.ErrorCode.VALIDATION_ERROR, "Variable not found");
        }
        Map<String, Long> subfieldCounts = countMap(mapper.listSubfieldCountsForVariable(resolvedVariable));
        Map<String, Long> yearCounts = countMap(mapper.listYearCountsForVariable(resolvedVariable));
        String dominantSubfield = subfieldCounts.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("未标注");
        CausalGraphNodeDto node = new CausalGraphNodeDto(
                resolvedVariable, resolvedVariable, asCause + asEffect, dominantSubfield, asCause, asEffect);
        return new CausalNodeDetailDto(node, subfieldCounts, yearCounts, asCause + asEffect, outgoing, incoming);
    }

    public CausalEdgeDetailDto edgeDetailByClaimId(long claimId) {
        CausalEdgeAggregateRow edge = mapper.findEdgeByClaimId(claimId);
        if (edge == null) {
            throw new NotFoundException(com.paperflow.admin.dto.ErrorCode.VALIDATION_ERROR, "Claim not found");
        }
        return edgeDetail(edge, mapper.listClaimsByClaimId(claimId, DETAIL_CLAIM_LIMIT));
    }

    public CausalEdgeDetailDto edgeDetailByCauseEffect(String cause, String effect) {
        CausalEdgeAggregateRow edge = mapper.findEdgeByCauseEffect(requireText(cause), requireText(effect));
        if (edge == null) {
            throw new NotFoundException(com.paperflow.admin.dto.ErrorCode.VALIDATION_ERROR, "Relation not found");
        }
        return edgeDetail(edge, mapper.listClaimsByCauseEffect(cause, effect, DETAIL_CLAIM_LIMIT));
    }

    public CausalPaperDetailDto paperDetail(String workId) {
        List<CausalClaimDto> claims = mapper.listClaimsByWorkId(requireText(workId)).stream()
                .map(this::toClaim)
                .toList();
        CausalPaperInfoDto paper;
        if (claims.isEmpty()) {
            paper = new CausalPaperInfoDto(workId, null, null, null, null, null, null);
        } else {
            CausalClaimDto first = claims.get(0);
            paper = new CausalPaperInfoDto(
                    first.workId(),
                    first.title(),
                    first.publicationYear(),
                    first.sourceId(),
                    first.sourceName(),
                    first.topicName(),
                    first.subfieldName());
        }
        return new CausalPaperDetailDto(paper, claims, buildPaperGraph(claims));
    }

    public CausalPaperSummaryDto paperSummary(String workId) {
        CausalPaperSummaryRow row = mapper.findPaperSummary(requireText(workId));
        long claimCount = row == null ? 0 : row.getClaimRecordCount();
        return new CausalPaperSummaryDto(
                workId,
                claimCount,
                row == null ? 0 : row.getStandardClaimCount(),
                row == null ? 0 : row.getVariableCount(),
                claimCount > 0);
    }

    @Cacheable(cacheNames = "causalGraphFields", sync = true)
    public CausalFieldAnalysisDto fields() {
        List<CausalFieldItemDto> items = mapper.listFields(200).stream()
                .map(row -> new CausalFieldItemDto(
                        row.getSubfield(),
                        row.getTopic(),
                        row.getClaimRecordCount(),
                        row.getPaperCount(),
                        row.getVariableCount()))
                .toList();
        List<String> subfields = mapper.listTopSubfields(FIELD_OVERVIEW_LIMIT).stream()
                .map(CausalCountRow::getName)
                .toList();
        List<String> topics = mapper.listTopTopics(FIELD_OVERVIEW_LIMIT).stream()
                .map(CausalCountRow::getName)
                .toList();
        Map<String, Map<String, Long>> matrix = emptyMatrix(subfields, topics);
        if (!subfields.isEmpty() && !topics.isEmpty()) {
            mapper.listFieldHeatmap(subfields, topics).forEach(row -> matrix
                    .get(row.getSubfield())
                    .put(row.getTopic(), row.getClaimRecordCount()));
        }
        Map<String, CausalSubfieldDetailDto> details = new LinkedHashMap<>();
        if (!subfields.isEmpty()) {
            Map<String, List<CausalFieldMethodRow>> methodsBySubfield = new LinkedHashMap<>();
            for (CausalFieldMethodRow row : mapper.listSubfieldMethodCounts(subfields)) {
                methodsBySubfield.computeIfAbsent(row.getSubfield(), ignored -> new ArrayList<>()).add(row);
            }
            Map<String, List<CausalFieldVariableRow>> variablesBySubfield = new LinkedHashMap<>();
            for (CausalFieldVariableRow row : mapper.listSubfieldVariableCounts(subfields)) {
                variablesBySubfield.computeIfAbsent(row.getSubfield(), ignored -> new ArrayList<>()).add(row);
            }
            Map<String, List<CausalFieldRelationRow>> relationsBySubfield = new LinkedHashMap<>();
            for (CausalFieldRelationRow row : mapper.listSubfieldRelations(subfields)) {
                relationsBySubfield.computeIfAbsent(row.getSubfield(), ignored -> new ArrayList<>()).add(row);
            }
            for (CausalSubfieldStatsRow row : mapper.listSubfieldStats(subfields)) {
                details.put(row.getSubfield(), new CausalSubfieldDetailDto(
                        row.getPaperCount(),
                        row.getClaimRecordCount(),
                        row.getStandardClaimCount(),
                        variablesBySubfield.getOrDefault(row.getSubfield(), List.of()).size(),
                        summarizeMethods(methodsBySubfield.getOrDefault(row.getSubfield(), List.of())),
                        summarizeVariables(variablesBySubfield.getOrDefault(row.getSubfield(), List.of())),
                        summarizeRelations(relationsBySubfield.getOrDefault(row.getSubfield(), List.of()))));
            }
        }
        return new CausalFieldAnalysisDto(items, new CausalFieldOverviewDto(subfields, topics, matrix, details));
    }

    private Map<String, Map<String, Long>> emptyMatrix(List<String> subfields, List<String> topics) {
        Map<String, Map<String, Long>> matrix = new LinkedHashMap<>();
        for (String subfield : subfields) {
            Map<String, Long> row = new LinkedHashMap<>();
            for (String topic : topics) {
                row.put(topic, 0L);
            }
            matrix.put(subfield, row);
        }
        return matrix;
    }

    private List<CausalMethodCountDto> summarizeMethods(List<CausalFieldMethodRow> rows) {
        List<CausalMethodCountDto> methods = rows.stream()
                .limit(FIELD_METHOD_LIMIT)
                .map(row -> new CausalMethodCountDto(row.getMethod(), row.getClaimRecordCount()))
                .collect(java.util.stream.Collectors.toCollection(ArrayList::new));
        long otherCount = rows.stream()
                .skip(FIELD_METHOD_LIMIT)
                .mapToLong(CausalFieldMethodRow::getClaimRecordCount)
                .sum();
        if (otherCount > 0) {
            methods.add(new CausalMethodCountDto("其他", otherCount));
        }
        return methods;
    }

    private List<CausalVariableCountDto> summarizeVariables(List<CausalFieldVariableRow> rows) {
        return rows.stream()
                .limit(FIELD_VARIABLE_LIMIT)
                .map(row -> new CausalVariableCountDto(row.getVariable(), row.getClaimRecordCount()))
                .toList();
    }

    private List<CausalFieldRelationDto> summarizeRelations(List<CausalFieldRelationRow> rows) {
        return rows.stream()
                .limit(FIELD_RELATION_LIMIT)
                .map(row -> new CausalFieldRelationDto(
                        row.getCause(),
                        row.getEffect(),
                        row.getClaimRecordCount(),
                        row.getPaperCount(),
                        row.getMethodCount(),
                        row.getGlobalClaimRecordCount()))
                .toList();
    }

    private CausalEdgeDetailDto edgeDetail(CausalEdgeAggregateRow edge, List<CausalClaimRecord> claimRows) {
        CausalGraphEdgeDto edgeDto = toEdge(edge);
        CausalEdgeStatsDto stats = new CausalEdgeStatsDto(
                edge.getSubfieldCount(),
                edge.getTopicCount(),
                edge.getYearMin() == null || edge.getYearMax() == null ? 0 : edge.getYearMax() - edge.getYearMin(),
                splitMethods(edge.getMethodsText()));
        return new CausalEdgeDetailDto(edgeDto, stats, claimRows.stream().map(this::toClaim).toList());
    }

    private CausalGraphDataDto buildPaperGraph(List<CausalClaimDto> claims) {
        Map<String, NodeAccumulator> nodeMap = new LinkedHashMap<>();
        Map<Long, PaperEdgeAccumulator> edgeMap = new LinkedHashMap<>();
        for (CausalClaimDto claim : claims) {
            nodeMap.computeIfAbsent(claim.causeStandard(), NodeAccumulator::new).asCause++;
            nodeMap.computeIfAbsent(claim.effectStandard(), NodeAccumulator::new).asEffect++;
            PaperEdgeAccumulator edge = edgeMap.computeIfAbsent(
                    claim.claimId(),
                    ignored -> new PaperEdgeAccumulator(claim.claimId(), claim.causeStandard(), claim.effectStandard()));
            edge.recordCount++;
            edge.paperCount = 1;
            if (claim.causalInferenceMethod() != null && !claim.causalInferenceMethod().isBlank()) {
                edge.methods.add(claim.causalInferenceMethod());
            }
            edge.signCounts.merge(signCategory(claim.signOfImpact()), 1L, Long::sum);
        }
        List<CausalGraphEdgeDto> edges = edgeMap.values().stream().map(PaperEdgeAccumulator::toEdge).toList();
        List<CausalGraphNodeDto> nodes = nodeMap.values().stream().map(NodeAccumulator::toNode).toList();
        return new CausalGraphDataDto(nodes, edges);
    }

    private CausalGraphEdgeDto toEdge(CausalEdgeAggregateRow row) {
        Map<String, Long> breakdown = new LinkedHashMap<>();
        breakdown.put("positive", row.getPositiveCount());
        breakdown.put("negative", row.getNegativeCount());
        breakdown.put("null", row.getNullCount());
        breakdown.put("mixed", row.getMixedCount());
        String dominantCategory = dominantCategory(breakdown);
        long dominantCount = breakdown.getOrDefault(dominantCategory, 0L);
        double disagreement = row.getRecordCount() == 0 ? 0 : 1.0 - ((double) dominantCount / row.getRecordCount());
        return new CausalGraphEdgeDto(
                row.getClaimId(),
                row.getCauseStandard(),
                row.getEffectStandard(),
                row.getRecordCount(),
                row.getPaperCount(),
                row.getDiversity(),
                disagreement,
                dominantCategory,
                dominantCategory,
                breakdown);
    }

    private CausalClaimDto toClaim(CausalClaimRecord row) {
        return new CausalClaimDto(
                row.getRecordId(),
                row.getWorkId(),
                row.getTitle(),
                row.getPublicationYear(),
                row.getSourceId(),
                row.getSourceName(),
                row.getTopicName(),
                row.getSubfieldName(),
                row.getClaimId(),
                row.getClaim(),
                row.getCause(),
                row.getEffect(),
                row.getCauseStandard(),
                row.getEffectStandard(),
                row.getSignOfImpact(),
                signCategory(row.getSignOfImpact()),
                row.getTypeOfRelationship(),
                row.getCausalInferenceMethod(),
                row.getEvidenceMethodOtherDescription(),
                row.getIsMainContribution(),
                row.getLevelOfTentativeness(),
                row.getSourcesOfExogenousVariation(),
                row.getStatisticalSignificance(),
                row.getCauseScore(),
                row.getEffectScore(),
                row.getEvidence());
    }

    private Map<String, Long> countMap(List<CausalCountRow> rows) {
        Map<String, Long> map = new LinkedHashMap<>();
        for (CausalCountRow row : rows) {
            map.put(row.getName(), row.getCount());
        }
        return map;
    }

    private int clamp(Integer value, int defaultValue, int min, int max) {
        int resolved = value == null ? defaultValue : value;
        if (resolved < min) {
            return min;
        }
        return Math.min(resolved, max);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String requireText(String value) {
        String text = blankToNull(value);
        if (text == null || text.length() > 255) {
            throw new IllegalArgumentException("Invalid request");
        }
        return text;
    }

    private List<String> emptyToNull(List<String> values) {
        if (values == null) {
            return null;
        }
        List<String> filtered = values.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .toList();
        return filtered.isEmpty() ? null : filtered;
    }

    private String signCategory(String sign) {
        if ("positive".equals(sign)) {
            return "positive";
        }
        if ("negative".equals(sign)) {
            return "negative";
        }
        if ("null_efffect".equals(sign) || "null".equals(sign)) {
            return "null";
        }
        return "mixed";
    }

    private String dominantCategory(Map<String, Long> counts) {
        return counts.entrySet().stream()
                .max(Comparator.<Map.Entry<String, Long>>comparingLong(Map.Entry::getValue)
                        .thenComparing(Map.Entry::getKey))
                .map(Map.Entry::getKey)
                .orElse("mixed");
    }

    private List<String> splitMethods(String methodsText) {
        if (methodsText == null || methodsText.isBlank()) {
            return List.of();
        }
        return List.of(methodsText.split("\\|\\|")).stream()
                .filter(value -> !value.isBlank())
                .sorted()
                .toList();
    }

    private static class NodeAccumulator {
        private final String id;
        private long asCause;
        private long asEffect;

        NodeAccumulator(String id) {
            this.id = id;
        }

        CausalGraphNodeDto toNode() {
            return new CausalGraphNodeDto(id, id, asCause + asEffect, "未标注", asCause, asEffect);
        }
    }

    private class PaperEdgeAccumulator {
        private final Long claimId;
        private final String source;
        private final String target;
        private long recordCount;
        private long paperCount;
        private final Set<String> methods = new LinkedHashSet<>();
        private final Map<String, Long> signCounts = new LinkedHashMap<>();

        PaperEdgeAccumulator(Long claimId, String source, String target) {
            this.claimId = claimId;
            this.source = source;
            this.target = target;
            signCounts.put("positive", 0L);
            signCounts.put("negative", 0L);
            signCounts.put("null", 0L);
            signCounts.put("mixed", 0L);
        }

        CausalGraphEdgeDto toEdge() {
            String dominant = dominantCategory(signCounts);
            long dominantCount = signCounts.getOrDefault(dominant, 0L);
            double disagreement = recordCount == 0 ? 0 : 1.0 - ((double) dominantCount / recordCount);
            return new CausalGraphEdgeDto(
                    claimId,
                    source,
                    target,
                    recordCount,
                    paperCount,
                    methods.size(),
                    disagreement,
                    dominant,
                    dominant,
                    signCounts);
        }
    }
}
