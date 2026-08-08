package com.paperflow.admin.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.paperflow.admin.dto.AdminRole;
import com.paperflow.admin.dto.ErrorCode;
import com.paperflow.admin.dto.OpenAlexSourceDto;
import com.paperflow.admin.mapper.OpenAlexSourceMapper;
import com.paperflow.admin.model.OpenAlexSourceRow;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OpenAlexSourceSearchService {
    private static final int BATCH_SIZE = 5_000;
    private final OpenAlexSourceMapper openAlexMapper;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public OpenAlexSourceSearchService(
            OpenAlexSourceMapper openAlexMapper, JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.openAlexMapper = openAlexMapper;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<OpenAlexSourceDto> search(String query, Integer limit) {
        String q = query == null ? "" : query.trim();
        int boundedLimit = limit == null ? 20 : Math.max(1, Math.min(limit, 20));
        if (q.length() < 2 && !q.matches("(?i)^S\\d+$")) {
            return List.of();
        }
        String like = "%" + q.toLowerCase() + "%";
        return jdbcTemplate.query(
                """
                SELECT source_id, display_name, publisher, issn_l, CAST(issn AS varchar) AS issn,
                       works_count, cited_by_count, is_oa, is_in_doaj, homepage_url
                FROM openalex_source_search
                WHERE lower(source_id) = lower(?) OR lower(COALESCE(issn_l, '')) = lower(?)
                   OR lower(display_name) LIKE ? OR lower(COALESCE(publisher, '')) LIKE ?
                   OR lower(CAST(issn AS varchar)) LIKE ?
                ORDER BY CASE
                    WHEN lower(source_id) = lower(?) THEN 0
                    WHEN lower(COALESCE(issn_l, '')) = lower(?) THEN 1
                    ELSE 2 END,
                    works_count DESC NULLS LAST, display_name ASC
                LIMIT ?
                """,
                this::mapDto,
                q, q, like, like, like, q, q, boundedLimit);
    }

    public OpenAlexSourceDto requireAuthoritative(String sourceId) {
        OpenAlexSourceRow row = openAlexMapper.findById(sourceId);
        if (row == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, ErrorCode.SOURCE_NOT_FOUND, "OpenAlex Source not found");
        }
        return toDto(row);
    }

    public long syncAll(AdminUserPrincipal principal) {
        if (principal == null || principal.role() != AdminRole.SUPER_ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN, "Forbidden");
        }
        long offset = 0;
        while (true) {
            List<OpenAlexSourceRow> batch = openAlexMapper.listBatch(BATCH_SIZE, offset);
            if (batch.isEmpty()) {
                return offset;
            }
            upsert(batch);
            offset += batch.size();
            if (batch.size() < BATCH_SIZE) {
                return offset;
            }
        }
    }

    private void upsert(List<OpenAlexSourceRow> rows) {
        jdbcTemplate.batchUpdate(
                """
                INSERT INTO openalex_source_search
                    (source_id, display_name, publisher, issn_l, issn, works_count, cited_by_count,
                     is_oa, is_in_doaj, homepage_url, source_updated_at, synced_at)
                VALUES (?, ?, ?, ?, CAST(? AS jsonb), ?, ?, ?, ?, ?, ?, now())
                ON CONFLICT (source_id) DO UPDATE SET
                    display_name=excluded.display_name, publisher=excluded.publisher,
                    issn_l=excluded.issn_l, issn=excluded.issn,
                    works_count=excluded.works_count, cited_by_count=excluded.cited_by_count,
                    is_oa=excluded.is_oa, is_in_doaj=excluded.is_in_doaj,
                    homepage_url=excluded.homepage_url, source_updated_at=excluded.source_updated_at,
                    synced_at=now()
                """,
                rows,
                rows.size(),
                (ps, row) -> {
                    ps.setString(1, row.getSourceId());
                    ps.setString(2, row.getDisplayName());
                    ps.setString(3, row.getPublisher());
                    ps.setString(4, row.getIssnL());
                    ps.setString(5, row.getIssn() == null ? "null" : row.getIssn());
                    ps.setObject(6, row.getWorksCount());
                    ps.setObject(7, row.getCitedByCount());
                    ps.setObject(8, row.getOa());
                    ps.setObject(9, row.getInDoaj());
                    ps.setString(10, row.getHomepageUrl());
                    ps.setObject(11, row.getUpdatedDate());
                });
    }

    private OpenAlexSourceDto mapDto(ResultSet rs, int rowNum) throws SQLException {
        return new OpenAlexSourceDto(
                rs.getString("source_id"), rs.getString("display_name"), rs.getString("publisher"),
                rs.getString("issn_l"), parseIssn(rs.getString("issn")),
                rs.getObject("works_count", Integer.class), rs.getObject("cited_by_count", Integer.class),
                rs.getObject("is_oa", Boolean.class), rs.getObject("is_in_doaj", Boolean.class),
                rs.getString("homepage_url"));
    }

    private OpenAlexSourceDto toDto(OpenAlexSourceRow row) {
        return new OpenAlexSourceDto(
                row.getSourceId(), row.getDisplayName(), row.getPublisher(), row.getIssnL(), parseIssn(row.getIssn()),
                row.getWorksCount(), row.getCitedByCount(), row.getOa(), row.getInDoaj(), row.getHomepageUrl());
    }

    private List<String> parseIssn(String json) {
        if (json == null || json.isBlank() || "null".equals(json)) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception ignored) {
            return List.of();
        }
    }
}
