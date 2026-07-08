package com.paperflow.admin.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.paperflow.admin.config.PaperflowApiProperties;
import com.paperflow.admin.dto.AuthorDto;
import com.paperflow.admin.dto.BlockPage;
import com.paperflow.admin.dto.BlockDto;
import com.paperflow.admin.dto.ErrorCode;
import com.paperflow.admin.dto.MatchedFileDto;
import com.paperflow.admin.dto.OriginalFilePage;
import com.paperflow.admin.dto.ProcessingStatus;
import com.paperflow.admin.dto.SourcePage;
import com.paperflow.admin.dto.SourceBrief;
import com.paperflow.admin.dto.SourceStats;
import com.paperflow.admin.dto.SourceSummary;
import com.paperflow.admin.dto.TaskStatusResponse;
import com.paperflow.admin.dto.TaskStatusSource;
import com.paperflow.admin.dto.TaskStatusTotals;
import com.paperflow.admin.dto.TextFileDto;
import com.paperflow.admin.dto.WorkDetail;
import com.paperflow.admin.dto.WorkListItem;
import com.paperflow.admin.dto.WorkMetadata;
import com.paperflow.admin.dto.WorkPage;
import com.paperflow.admin.mapper.AdminMapper;
import com.paperflow.admin.model.AuthorRow;
import com.paperflow.admin.model.BlockRow;
import com.paperflow.admin.model.MatchedFileRow;
import com.paperflow.admin.model.SourceBriefRow;
import com.paperflow.admin.model.SourceRow;
import com.paperflow.admin.model.TaskStatusSourceRow;
import com.paperflow.admin.model.TaskStatusTotalsRow;
import com.paperflow.admin.model.TextFileRow;
import com.paperflow.admin.model.WorkRow;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AdminService {
    private final AdminMapper mapper;
    private final PaperflowApiProperties properties;
    private final ObjectMapper objectMapper;
    private final AssetService assetService;

    public AdminService(
            AdminMapper mapper,
            PaperflowApiProperties properties,
            ObjectMapper objectMapper,
            AssetService assetService) {
        this.mapper = mapper;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.assetService = assetService;
    }

    public SourcePage listSources(
            String sourceId,
            String sourceName,
            String provider,
            Boolean hasOriginalFiles,
            Boolean hasFailures,
            String sort,
            Integer page,
            Integer size) {
        PageRequest request = PageRequest.of(page, size, properties.defaultPageSize(), properties.maxPageSize());
        String normalizedSort = sourceSort(sort);
        return new SourcePage(
                mapper.listSources(
                                blankToNull(sourceId),
                                blankToNull(sourceName),
                                blankToNull(provider),
                                hasOriginalFiles,
                                hasFailures,
                                normalizedSort,
                                request.size(),
                                request.offset())
                        .stream()
                        .map(this::toSourceSummary)
                        .toList(),
                request.page(),
                request.size(),
                mapper.countSources(
                        blankToNull(sourceId),
                        blankToNull(sourceName),
                        blankToNull(provider),
                        hasOriginalFiles,
                        hasFailures));
    }

    public SourceSummary getSource(String sourceId) {
        SourceRow row = mapper.findSource(sourceId);
        if (row == null) {
            throw new NotFoundException(ErrorCode.SOURCE_NOT_FOUND, "Source not found");
        }
        return toSourceSummary(row);
    }

    public TaskStatusResponse getTaskStatus() {
        return new TaskStatusResponse(
                toTaskStatusTotals(mapper.findTaskStatusTotals()),
                mapper.listTaskStatusSources().stream().map(this::toTaskStatusSource).toList());
    }

    public WorkPage searchWorks(
            String sourceId,
            String workId,
            String sourceName,
            String authorName,
            String title,
            String doi,
            Integer yearFrom,
            Integer yearTo,
            ProcessingStatus processingStatus,
            String type,
            String language,
            String matchedFileId,
            String sort,
            Integer page,
            Integer size) {
        if (yearFrom != null && yearTo != null && yearFrom > yearTo) {
            throw new IllegalArgumentException("Invalid request");
        }
        PageRequest request = PageRequest.of(page, size, properties.defaultPageSize(), properties.maxPageSize());
        String normalizedTitle = blankToNull(title);
        String normalizedDoi = normalizeDoi(doi);
        String status = processingStatus == null ? null : processingStatus.name();
        String normalizedSort = workSort(sort);
        return new WorkPage(
                mapper.listWorks(
                                sourceId,
                                blankToNull(workId),
                                blankToNull(sourceName),
                                blankToNull(authorName),
                                normalizedTitle,
                                normalizedDoi,
                                yearFrom,
                                yearTo,
                                status,
                                blankToNull(type),
                                blankToNull(language),
                                blankToNull(matchedFileId),
                                normalizedSort,
                                request.size(),
                                request.offset())
                        .stream()
                        .map(this::toWorkListItem)
                        .toList(),
                request.page(),
                request.size(),
                mapper.countWorks(
                        sourceId,
                        blankToNull(workId),
                        blankToNull(sourceName),
                        blankToNull(authorName),
                        normalizedTitle,
                        normalizedDoi,
                        yearFrom,
                        yearTo,
                        status,
                        blankToNull(type),
                        blankToNull(language),
                        blankToNull(matchedFileId)));
    }

    public WorkDetail getWork(String workId) {
        WorkRow work = requireWork(workId);
        MatchedFileRow matchedFile = mapper.findMatchedFile(workId);
        return new WorkDetail(
                toWorkMetadata(work),
                mapper.findWorkSources(workId).stream().map(this::toSourceBrief).toList(),
                mapper.findWorkAuthors(workId).stream().map(this::toAuthor).toList(),
                toMatchedFile(matchedFile),
                deriveStatus(matchedFile));
    }

    public OriginalFilePage listOriginalFiles(
            String sourceId,
            String fileId,
            String sourceName,
            String provider,
            String matchedWorkId,
            Integer flagMatch,
            Integer flagText,
            Integer flagBlock,
            String originalFileType,
            Integer yearFrom,
            Integer yearTo,
            String sort,
            Integer page,
            Integer size) {
        if (yearFrom != null && yearTo != null && yearFrom > yearTo) {
            throw new IllegalArgumentException("Invalid request");
        }
        validateFlag(flagMatch, -1, 0, 1);
        validateFlag(flagText, -2, -1, 0, 1, 2);
        validateFlag(flagBlock, -1, 0, 1);
        PageRequest request = PageRequest.of(page, size, properties.defaultPageSize(), properties.maxPageSize());
        String normalizedSort = originalFileSort(sort);
        return new OriginalFilePage(
                mapper.listOriginalFiles(
                                sourceId,
                                blankToNull(fileId),
                                blankToNull(sourceName),
                                blankToNull(provider),
                                matchedWorkId,
                                flagMatch,
                                flagText,
                                flagBlock,
                                blankToNull(originalFileType),
                                yearFrom,
                                yearTo,
                                normalizedSort,
                                request.size(),
                                request.offset())
                        .stream()
                        .map(this::toMatchedFile)
                        .toList(),
                request.page(),
                request.size(),
                mapper.countOriginalFiles(
                        sourceId,
                        blankToNull(fileId),
                        blankToNull(sourceName),
                        blankToNull(provider),
                        matchedWorkId,
                        flagMatch,
                        flagText,
                        flagBlock,
                        blankToNull(originalFileType),
                        yearFrom,
                        yearTo));
    }

    public MatchedFileDto getOriginalFile(String fileId) {
        MatchedFileRow row = mapper.findOriginalFile(fileId);
        if (row == null) {
            throw new NotFoundException(ErrorCode.ORIGINAL_FILE_NOT_FOUND, "Original File not found");
        }
        return toMatchedFile(row);
    }

    public BlockPage listWorkBlocks(String workId, Boolean includeDiscarded, Integer page, Integer size) {
        requireWork(workId);
        PageRequest request =
                PageRequest.of(page, size, properties.defaultBlockPageSize(), properties.maxBlockPageSize());
        boolean resolvedIncludeDiscarded = Boolean.TRUE.equals(includeDiscarded);
        return new BlockPage(
                mapper.listWorkBlocks(workId, resolvedIncludeDiscarded, request.size(), request.offset()).stream()
                        .map(this::toBlock)
                        .toList(),
                request.page(),
                request.size(),
                mapper.countWorkBlocks(workId, resolvedIncludeDiscarded));
    }

    public BlockPage listOriginalFileBlocks(String fileId, Boolean includeDiscarded, Integer page, Integer size) {
        if (mapper.findOriginalFile(fileId) == null) {
            throw new NotFoundException(ErrorCode.ORIGINAL_FILE_NOT_FOUND, "Original File not found");
        }
        PageRequest request =
                PageRequest.of(page, size, properties.defaultBlockPageSize(), properties.maxBlockPageSize());
        boolean resolvedIncludeDiscarded = Boolean.TRUE.equals(includeDiscarded);
        return new BlockPage(
                mapper.listOriginalFileBlocks(fileId, resolvedIncludeDiscarded, request.size(), request.offset())
                        .stream()
                        .map(this::toBlock)
                        .toList(),
                request.page(),
                request.size(),
                mapper.countOriginalFileBlocks(fileId, resolvedIncludeDiscarded));
    }

    ProcessingStatus deriveStatus(MatchedFileRow row) {
        if (row == null) {
            return ProcessingStatus.NO_MATCHED_FILE;
        }
        Integer flagText = row.getFlagText();
        Integer flagBlock = row.getFlagBlock();
        if (Integer.valueOf(-2).equals(flagText)) {
            return ProcessingStatus.UNSUPPORTED_TEXT_INPUT;
        }
        if (Integer.valueOf(-1).equals(flagText)) {
            return ProcessingStatus.PARSE_FAILED;
        }
        if (Integer.valueOf(1).equals(flagText)) {
            return ProcessingStatus.PARSING;
        }
        if (Integer.valueOf(2).equals(flagText) && Integer.valueOf(-1).equals(flagBlock)) {
            return ProcessingStatus.BLOCK_FAILED;
        }
        if (Integer.valueOf(2).equals(flagText) && Integer.valueOf(1).equals(flagBlock)) {
            return ProcessingStatus.READY;
        }
        if (Integer.valueOf(2).equals(flagText) && Integer.valueOf(0).equals(flagBlock)) {
            return ProcessingStatus.PARSED;
        }
        return ProcessingStatus.MATCHED;
    }

    private WorkRow requireWork(String workId) {
        WorkRow work = mapper.findWork(workId);
        if (work == null) {
            throw new NotFoundException(ErrorCode.WORK_NOT_FOUND, "Work not found");
        }
        return work;
    }

    private SourceSummary toSourceSummary(SourceRow row) {
        return new SourceSummary(
                row.getSourceId(),
                row.getSourceName(),
                row.getProvider(),
                new SourceStats(
                        row.getWorkCount(),
                        row.getOriginalFileCount(),
                        row.getMatchedFileCount(),
                        row.getParsedFileCount(),
                        row.getReadyFileCount(),
                        row.getParseFailedFileCount(),
                        row.getBlockFailedFileCount(),
                        row.getUnsupportedFileCount()));
    }

    private TaskStatusTotals toTaskStatusTotals(TaskStatusTotalsRow row) {
        return new TaskStatusTotals(
                row.getSourceCount(),
                row.getWorkCount(),
                row.getOriginalFileCount(),
                row.getMatchedWorkCount(),
                row.getParsedFileCount(),
                row.getBlockImportedFileCount());
    }

    private TaskStatusSource toTaskStatusSource(TaskStatusSourceRow row) {
        return new TaskStatusSource(
                row.getSourceId(),
                row.getSourceName(),
                row.getProvider(),
                row.getWorkCount(),
                row.getOriginalFileCount(),
                row.getMatchedWorkCount(),
                row.getParsedFileCount(),
                row.getBlockImportedFileCount());
    }

    private WorkListItem toWorkListItem(WorkRow row) {
        return new WorkListItem(
                row.getWorkId(),
                row.getTitle(),
                row.getDoi(),
                row.getPublicationYear(),
                row.getPublicationDate(),
                row.getType(),
                row.getLanguage(),
                splitSourceIds(row.getSourceIds()),
                deriveStatus(toMatchedStatusRow(row)),
                row.getMatchedFileId(),
                row.getFlagMatch(),
                row.getFlagText(),
                row.getFlagBlock());
    }

    private WorkMetadata toWorkMetadata(WorkRow row) {
        return new WorkMetadata(
                row.getWorkId(),
                row.getTitle(),
                row.getDoi(),
                row.getPublicationYear(),
                row.getPublicationDate(),
                row.getType(),
                row.getLanguage());
    }

    private SourceBrief toSourceBrief(SourceBriefRow row) {
        return new SourceBrief(row.getSourceId(), row.getSourceName(), row.getProvider());
    }

    private AuthorDto toAuthor(AuthorRow row) {
        return new AuthorDto(row.getAuthorId(), row.getAuthorName(), row.getAuthorPosition());
    }

    private MatchedFileDto toMatchedFile(MatchedFileRow row) {
        if (row == null) {
            return null;
        }
        return new MatchedFileDto(
                row.getFileId(),
                row.getSourceId(),
                row.getYear(),
                row.getPaperTitle(),
                row.getAuthors(),
                row.getDoi(),
                row.getUrl(),
                row.getProvider(),
                row.getOriginalFileName(),
                row.getOriginalFilePath(),
                assetService.assetUrl(row.getOriginalFilePath()),
                row.getOriginalFileType(),
                row.getFileSize(),
                row.getFlagMatch(),
                row.getMatchedWorkId(),
                row.getFlagText(),
                row.getFlagBlock(),
                mapper.findTextFiles(row.getFileId()).stream().map(this::toTextFile).toList());
    }

    private TextFileDto toTextFile(TextFileRow row) {
        return new TextFileDto(
                row.getFileId(),
                row.getFileType(),
                row.getFileName(),
                row.getFilePath(),
                assetService.assetUrl(row.getFilePath()),
                row.getFileSize());
    }

    private BlockDto toBlock(BlockRow row) {
        return new BlockDto(
                row.getBlockId(),
                row.getFileId(),
                row.getBlockType(),
                row.getBlockText(),
                row.getPdfPage(),
                readJson(row.getPdfBboxJson()),
                row.getBlockSeq(),
                row.getParentTitleBlockId(),
                row.getTitleLevel(),
                row.getImagePath(),
                assetService.parsedAssetUrl(row.getImagePath(), row.getParsedDirectory()),
                row.getImageCaption(),
                row.getImageFootnote(),
                row.getTableImagePath(),
                assetService.parsedAssetUrl(row.getTableImagePath(), row.getParsedDirectory()),
                row.getTableCaption(),
                row.getTableFootnote(),
                row.getEquationImagePath(),
                assetService.parsedAssetUrl(row.getEquationImagePath(), row.getParsedDirectory()),
                row.getEquationFormat(),
                row.getFootnoteLabel(),
                row.getFootnoteText(),
                readReferences(row.getReferencesText()));
    }

    private MatchedFileRow toMatchedStatusRow(WorkRow row) {
        if (row.getMatchedFileId() == null) {
            return null;
        }
        MatchedFileRow matched = new MatchedFileRow();
        matched.setFlagText(row.getFlagText());
        matched.setFlagBlock(row.getFlagBlock());
        return matched;
    }

    private JsonNode readJson(String value) {
        if (value == null) {
            return null;
        }
        try {
            JsonNode node = objectMapper.readTree(value);
            if (node.isTextual()) {
                return objectMapper.readTree(node.asText());
            }
            return node;
        } catch (JsonProcessingException exc) {
            throw new IllegalStateException("Invalid database JSON", exc);
        }
    }

    private List<String> readReferences(String value) {
        if (value == null) {
            return List.of();
        }
        return value.lines().toList();
    }

    private List<String> splitSourceIds(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return List.of(value.split(","));
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String sourceSort(String value) {
        String sort = blankToNull(value);
        if (sort == null) {
            return "sourceIdAsc";
        }
        return switch (sort) {
            case "sourceIdAsc", "workCountDesc", "failureCountDesc" -> sort;
            default -> throw new IllegalArgumentException("Invalid request");
        };
    }

    private String workSort(String value) {
        String sort = blankToNull(value);
        if (sort == null) {
            return "publicationYearDesc";
        }
        return switch (sort) {
            case "publicationYearDesc",
                    "publicationYearAsc",
                    "titleAsc",
                    "statusIssueFirst",
                    "statusReadyFirst" -> sort;
            default -> throw new IllegalArgumentException("Invalid request");
        };
    }

    private String originalFileSort(String value) {
        String sort = blankToNull(value);
        if (sort == null) {
            return "sourceIdAsc";
        }
        return switch (sort) {
            case "sourceIdAsc", "yearDesc", "fileSizeAsc", "providerAsc", "textStatusIssueFirst" -> sort;
            default -> throw new IllegalArgumentException("Invalid request");
        };
    }

    private String normalizeDoi(String value) {
        String doi = blankToNull(value);
        if (doi == null) {
            return null;
        }
        doi = doi.toLowerCase();
        if (doi.startsWith("https://doi.org/")) {
            return doi.substring("https://doi.org/".length());
        }
        if (doi.startsWith("http://dx.doi.org/")) {
            return doi.substring("http://dx.doi.org/".length());
        }
        return doi;
    }

    private void validateFlag(Integer value, int... allowed) {
        if (value == null) {
            return;
        }
        for (int allowedValue : allowed) {
            if (value == allowedValue) {
                return;
            }
        }
        throw new IllegalArgumentException("Invalid request");
    }
}
