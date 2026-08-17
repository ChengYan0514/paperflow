package com.paperflow.admin.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.paperflow.admin.config.PaperflowApiProperties;
import com.paperflow.admin.dto.AdminRole;
import com.paperflow.admin.dto.ErrorCode;
import com.paperflow.admin.dto.OpenAlexJournalImportResult;
import com.paperflow.admin.dto.OpenAlexJournalImportTaskDto;
import com.paperflow.admin.dto.OpenAlexJournalImportTaskPage;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class OpenAlexJournalImportService {
    private final JdbcTemplate jdbcTemplate;
    private final OpenAlexSourceSearchService sources;
    private final PaperflowApiProperties properties;
    private final ObjectMapper objectMapper;

    public OpenAlexJournalImportService(
            JdbcTemplate jdbcTemplate,
            OpenAlexSourceSearchService sources,
            PaperflowApiProperties properties,
            ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.sources = sources;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public OpenAlexJournalImportTaskDto create(
            AdminUserPrincipal principal, String sourceId, Integer yearFrom, Integer yearTo) {
        requireOperator(principal);
        String normalizedSourceId = normalizeSourceId(sourceId);
        validateYearRange(yearFrom, yearTo);
        sources.requireAuthoritative(normalizedSourceId);
        String taskId = UUID.randomUUID().toString();
        try {
            jdbcTemplate.update(
                    """
                    INSERT INTO openalex_journal_import_task
                        (task_id, source_id, year_from, year_to, status, created_by)
                    VALUES (?, ?, ?, ?, 'QUEUED', ?)
                    """,
                    taskId, normalizedSourceId, yearFrom, yearTo, principal.id());
        } catch (DataIntegrityViolationException exc) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    ErrorCode.OPENALEX_JOURNAL_IMPORT_CONFLICT,
                    "An active Source import already exists for this Source");
        }
        return get(taskId);
    }

    public OpenAlexJournalImportTaskDto retry(AdminUserPrincipal principal, String taskId) {
        requireOperator(principal);
        OpenAlexJournalImportTaskDto original = get(taskId);
        if (!"FAILED".equals(original.status())) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    ErrorCode.OPENALEX_JOURNAL_IMPORT_CONFLICT,
                    "Only failed Source imports can be retried");
        }
        String retryId = UUID.randomUUID().toString();
        sources.requireAuthoritative(original.sourceId());
        try {
            jdbcTemplate.update(
                    """
                    INSERT INTO openalex_journal_import_task
                        (task_id, source_id, year_from, year_to, status, created_by, retry_of_task_id)
                    VALUES (?, ?, ?, ?, 'QUEUED', ?, ?)
                    """,
                    retryId, original.sourceId(), original.yearFrom(), original.yearTo(), principal.id(), taskId);
        } catch (DataIntegrityViolationException exc) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    ErrorCode.OPENALEX_JOURNAL_IMPORT_CONFLICT,
                    "An active Source import already exists for this Source");
        }
        return get(retryId);
    }

    public OpenAlexJournalImportTaskDto get(String taskId) {
        try {
            return jdbcTemplate.queryForObject(
                    selectById(), this::mapTask, taskId);
        } catch (EmptyResultDataAccessException exc) {
            throw new ApiException(
                    HttpStatus.NOT_FOUND,
                    ErrorCode.OPENALEX_JOURNAL_IMPORT_NOT_FOUND,
                    "OpenAlex Source import task not found");
        }
    }

    public OpenAlexJournalImportTaskPage list(
            String sourceId, String status, Integer page, Integer size) {
        PageRequest request = PageRequest.of(page, size, properties.defaultPageSize(), properties.maxPageSize());
        List<Object> params = new ArrayList<>();
        List<String> clauses = new ArrayList<>();
        if (sourceId != null && !sourceId.isBlank()) {
            clauses.add("source_id = ?");
            params.add(normalizeSourceId(sourceId));
        }
        if (status != null && !status.isBlank()) {
            if (!List.of("QUEUED", "RUNNING", "SUCCEEDED", "FAILED").contains(status)) {
                throw new IllegalArgumentException("Invalid status");
            }
            clauses.add("status = ?");
            params.add(status);
        }
        String where = clauses.isEmpty() ? "" : " WHERE " + String.join(" AND ", clauses);
        Long total = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM openalex_journal_import_task" + where, Long.class, params.toArray());
        List<Object> listParams = new ArrayList<>(params);
        listParams.add(request.size());
        listParams.add(request.offset());
        return new OpenAlexJournalImportTaskPage(
                jdbcTemplate.query(
                        selectColumns() + where + " ORDER BY created_at DESC, task_id DESC LIMIT ? OFFSET ?",
                        this::mapTask,
                        listParams.toArray()),
                request.page(), request.size(), total == null ? 0 : total);
    }

    private void requireOperator(AdminUserPrincipal principal) {
        if (principal == null || (principal.role() != AdminRole.ADMIN && principal.role() != AdminRole.SUPER_ADMIN)) {
            throw new ApiException(HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN, "Forbidden");
        }
    }

    private String normalizeSourceId(String sourceId) {
        if (sourceId == null || !sourceId.trim().matches("S.+")) {
            throw new IllegalArgumentException("Invalid OpenAlex Source ID");
        }
        return sourceId.trim();
    }

    private void validateYearRange(Integer yearFrom, Integer yearTo) {
        if ((yearFrom != null && yearFrom < 1000) || (yearTo != null && yearTo < 1000)
                || (yearFrom != null && yearTo != null && yearFrom > yearTo)) {
            throw new IllegalArgumentException("Invalid publication year range");
        }
    }

    private String selectById() {
        return selectColumns() + " WHERE task_id = ?";
    }

    private String selectColumns() {
        return """
                SELECT task_id, source_id, year_from, year_to, status, retry_of_task_id, attempt_count,
                       progress_current, progress_total, progress_message, CAST(result AS varchar) AS result,
                       error_code, error_message, created_at, started_at, finished_at
                FROM openalex_journal_import_task
                """;
    }

    private OpenAlexJournalImportTaskDto mapTask(ResultSet rs, int rowNum) throws SQLException {
        return new OpenAlexJournalImportTaskDto(
                rs.getString("task_id"), rs.getString("source_id"),
                rs.getObject("year_from", Integer.class), rs.getObject("year_to", Integer.class),
                rs.getString("status"), rs.getString("retry_of_task_id"), rs.getInt("attempt_count"),
                rs.getInt("progress_current"), rs.getInt("progress_total"), rs.getString("progress_message"),
                readResult(rs.getString("result")), rs.getString("error_code"), rs.getString("error_message"),
                rs.getObject("created_at", OffsetDateTime.class), rs.getObject("started_at", OffsetDateTime.class),
                rs.getObject("finished_at", OffsetDateTime.class));
    }

    private OpenAlexJournalImportResult readResult(String result) {
        if (result == null || result.isBlank()) return null;
        try {
            return objectMapper.readValue(result, OpenAlexJournalImportResult.class);
        } catch (Exception exc) {
            return null;
        }
    }
}
