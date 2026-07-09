package com.paperflow.admin.service;

import com.paperflow.admin.controller.RequestIds;
import com.paperflow.admin.config.PaperflowApiProperties;
import com.paperflow.admin.dto.AdminAuditLogDto;
import com.paperflow.admin.dto.AdminAuditLogPage;
import com.paperflow.admin.dto.AdminRole;
import com.paperflow.admin.dto.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AdminAuditLogService {
    private final JdbcTemplate jdbcTemplate;
    private final PaperflowApiProperties properties;

    public AdminAuditLogService(JdbcTemplate jdbcTemplate, PaperflowApiProperties properties) {
        this.jdbcTemplate = jdbcTemplate;
        this.properties = properties;
    }

    public void success(
            AdminUserPrincipal actor,
            String action,
            String targetType,
            String targetId,
            HttpServletRequest request,
            String message) {
        record(actor, null, action, targetType, targetId, "SUCCESS", request, message);
    }

    public void failure(
            AdminUserPrincipal actor,
            String fallbackUsername,
            String action,
            String targetType,
            String targetId,
            HttpServletRequest request,
            String message) {
        record(actor, fallbackUsername, action, targetType, targetId, "FAILURE", request, message);
    }

    public AdminAuditLogPage list(
            AdminUserPrincipal principal,
            String actorUsername,
            String action,
            String targetType,
            String result,
            String requestId,
            OffsetDateTime createdFrom,
            OffsetDateTime createdTo,
            Integer page,
            Integer size) {
        if (principal.role() != AdminRole.SUPER_ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN, "Forbidden");
        }
        PageRequest request = PageRequest.of(page, size, properties.defaultPageSize(), properties.maxPageSize());
        List<Object> params = params(actorUsername, action, targetType, result, requestId, createdFrom, createdTo);
        String where = where(actorUsername, action, targetType, result, requestId, createdFrom, createdTo);
        Long total = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM admin_audit_log" + where, Long.class, params.toArray());
        List<Object> listParams = new ArrayList<>(params);
        listParams.add(request.size());
        listParams.add(request.offset());
        return new AdminAuditLogPage(
                jdbcTemplate.query(
                        "SELECT * FROM admin_audit_log"
                                + where
                                + " ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?",
                        this::mapRow,
                        listParams.toArray()),
                request.page(),
                request.size(),
                total == null ? 0 : total);
    }

    private void record(
            AdminUserPrincipal actor,
            String fallbackUsername,
            String action,
            String targetType,
            String targetId,
            String result,
            HttpServletRequest request,
            String message) {
        jdbcTemplate.update(
                """
                INSERT INTO admin_audit_log
                    (actor_id, actor_username, action, target_type, target_id, result,
                     request_id, remote_addr, user_agent, message)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                actor == null ? null : actor.id(),
                actor == null ? fallbackUsername : actor.username(),
                action,
                targetType,
                targetId,
                result,
                RequestIds.get(request),
                request.getRemoteAddr(),
                request.getHeader("User-Agent"),
                message);
    }

    private String where(
            String actorUsername,
            String action,
            String targetType,
            String result,
            String requestId,
            OffsetDateTime createdFrom,
            OffsetDateTime createdTo) {
        List<String> clauses = new ArrayList<>();
        if (hasText(actorUsername)) {
            clauses.add("LOWER(actor_username) LIKE CONCAT('%', LOWER(?), '%')");
        }
        if (hasText(action)) {
            clauses.add("action = ?");
        }
        if (hasText(targetType)) {
            clauses.add("target_type = ?");
        }
        if (hasText(result)) {
            clauses.add("result = ?");
        }
        if (hasText(requestId)) {
            clauses.add("request_id = ?");
        }
        if (createdFrom != null) {
            clauses.add("created_at >= ?");
        }
        if (createdTo != null) {
            clauses.add("created_at <= ?");
        }
        return clauses.isEmpty() ? "" : " WHERE " + String.join(" AND ", clauses);
    }

    private List<Object> params(
            String actorUsername,
            String action,
            String targetType,
            String result,
            String requestId,
            OffsetDateTime createdFrom,
            OffsetDateTime createdTo) {
        List<Object> params = new ArrayList<>();
        if (hasText(actorUsername)) {
            params.add(actorUsername.trim());
        }
        if (hasText(action)) {
            params.add(action.trim());
        }
        if (hasText(targetType)) {
            params.add(targetType.trim());
        }
        if (hasText(result)) {
            params.add(result.trim());
        }
        if (hasText(requestId)) {
            params.add(requestId.trim());
        }
        if (createdFrom != null) {
            params.add(createdFrom);
        }
        if (createdTo != null) {
            params.add(createdTo);
        }
        return params;
    }

    private AdminAuditLogDto mapRow(ResultSet rs, int rowNum) throws SQLException {
        return new AdminAuditLogDto(
                rs.getLong("id"),
                rs.getObject("actor_id", Long.class),
                rs.getString("actor_username"),
                rs.getString("action"),
                rs.getString("target_type"),
                rs.getString("target_id"),
                rs.getString("result"),
                rs.getString("request_id"),
                rs.getString("remote_addr"),
                rs.getString("user_agent"),
                rs.getString("message"),
                rs.getObject("created_at", OffsetDateTime.class));
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
