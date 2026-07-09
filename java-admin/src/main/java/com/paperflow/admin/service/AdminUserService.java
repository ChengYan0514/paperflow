package com.paperflow.admin.service;

import com.paperflow.admin.dto.AdminRole;
import com.paperflow.admin.dto.AdminUserDto;
import com.paperflow.admin.dto.AuthUser;
import com.paperflow.admin.dto.ErrorCode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminUserService {
    private static final String LOGIN_FAILED_MESSAGE = "Username or password is incorrect";

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;

    public AdminUserService(JdbcTemplate jdbcTemplate, PasswordEncoder passwordEncoder) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public AuthUser login(String username, String password) {
        AdminUserRow user = findByNormalizedUsername(normalizeUsername(username));
        if (user == null || !user.enabled() || !passwordEncoder.matches(password, user.passwordHash())) {
            throw unauthorized();
        }
        jdbcTemplate.update("UPDATE admin_user SET last_login_at = now(), updated_at = updated_at WHERE id = ?", user.id());
        return toAuthUser(requireUser(user.id()));
    }

    public AuthUser currentUser(AdminUserPrincipal principal) {
        return toAuthUser(requireUser(principal.id()));
    }

    @Transactional
    public void changePassword(AdminUserPrincipal principal, String oldPassword, String newPassword) {
        AdminUserRow user = requireUser(principal.id());
        if (!passwordEncoder.matches(oldPassword, user.passwordHash())) {
            throw unauthorized();
        }
        jdbcTemplate.update(
                "UPDATE admin_user SET password_hash = ?, updated_at = now() WHERE id = ?",
                passwordEncoder.encode(newPassword),
                user.id());
    }

    public List<AdminUserDto> listUsers(AdminUserPrincipal principal) {
        requireUserManager(principal);
        return jdbcTemplate
                .query(
                        """
                        SELECT id, username, username_normalized, password_hash, display_name, role, enabled,
                               last_login_at, created_at, updated_at
                        FROM admin_user
                        ORDER BY created_at DESC, id DESC
                        """,
                        this::mapRow)
                .stream()
                .map(this::toAdminUser)
                .toList();
    }

    @Transactional
    public AdminUserDto createUser(
            AdminUserPrincipal principal,
            String username,
            String password,
            String displayName,
            AdminRole role,
            Boolean enabled) {
        requireCanManageRole(principal, role);
        String trimmedUsername = username.trim();
        String normalizedUsername = normalizeUsername(username);
        if (findByNormalizedUsername(normalizedUsername) != null) {
            throw new ApiException(HttpStatus.CONFLICT, ErrorCode.ADMIN_USER_CONFLICT, "Admin User conflict");
        }
        jdbcTemplate.update(
                """
                INSERT INTO admin_user
                    (username, username_normalized, password_hash, display_name, role, enabled)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                trimmedUsername,
                normalizedUsername,
                passwordEncoder.encode(password),
                blankToNull(displayName),
                role.name(),
                enabled == null || enabled);
        return toAdminUser(findByNormalizedUsername(normalizedUsername));
    }

    @Transactional
    public AdminUserDto updateUser(
            AdminUserPrincipal principal, Long id, String displayName, AdminRole role, Boolean enabled) {
        requireUserManager(principal);
        AdminUserRow user = requireExistingUser(id);
        requireCanManageRole(principal, user.role());
        AdminRole nextRole = role == null ? user.role() : role;
        requireCanManageRole(principal, nextRole);
        boolean nextEnabled = enabled == null ? user.enabled() : enabled;
        ensureUserCanChange(principal, user, nextRole, nextEnabled);
        jdbcTemplate.update(
                """
                UPDATE admin_user
                SET display_name = ?, role = ?, enabled = ?, updated_at = now()
                WHERE id = ?
                """,
                displayName == null ? user.displayName() : blankToNull(displayName),
                nextRole.name(),
                nextEnabled,
                id);
        return toAdminUser(requireExistingUser(id));
    }

    @Transactional
    public void resetPassword(AdminUserPrincipal principal, Long id, String newPassword) {
        requireUserManager(principal);
        AdminUserRow user = requireExistingUser(id);
        requireCanManageRole(principal, user.role());
        jdbcTemplate.update(
                "UPDATE admin_user SET password_hash = ?, updated_at = now() WHERE id = ?",
                passwordEncoder.encode(newPassword),
                id);
    }

    public AdminUserPrincipal principal(AuthUser user) {
        return new AdminUserPrincipal(user.id(), user.username(), user.displayName(), user.role());
    }

    private AdminUserRow requireUser(Long id) {
        AdminUserRow user = findById(id);
        if (user == null || !user.enabled()) {
            throw unauthorized();
        }
        return user;
    }

    private AdminUserRow requireExistingUser(Long id) {
        AdminUserRow user = findById(id);
        if (user == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, ErrorCode.ADMIN_USER_NOT_FOUND, "Admin User not found");
        }
        return user;
    }

    private AdminUserRow findById(Long id) {
        List<AdminUserRow> users = jdbcTemplate.query(
                """
                SELECT id, username, username_normalized, password_hash, display_name, role, enabled,
                       last_login_at, created_at, updated_at
                FROM admin_user
                WHERE id = ?
                """,
                this::mapRow,
                id);
        return users.isEmpty() ? null : users.get(0);
    }

    private AdminUserRow findByNormalizedUsername(String usernameNormalized) {
        List<AdminUserRow> users = jdbcTemplate.query(
                """
                SELECT id, username, username_normalized, password_hash, display_name, role, enabled,
                       last_login_at, created_at, updated_at
                FROM admin_user
                WHERE username_normalized = ?
                """,
                this::mapRow,
                usernameNormalized);
        return users.isEmpty() ? null : users.get(0);
    }

    private AdminUserRow mapRow(ResultSet rs, int rowNum) throws SQLException {
        return new AdminUserRow(
                rs.getLong("id"),
                rs.getString("username"),
                rs.getString("username_normalized"),
                rs.getString("password_hash"),
                rs.getString("display_name"),
                AdminRole.valueOf(rs.getString("role")),
                rs.getBoolean("enabled"),
                rs.getObject("last_login_at", OffsetDateTime.class),
                rs.getObject("created_at", OffsetDateTime.class),
                rs.getObject("updated_at", OffsetDateTime.class));
    }

    private AuthUser toAuthUser(AdminUserRow user) {
        return new AuthUser(user.id(), user.username(), user.displayName(), user.role());
    }

    private AdminUserDto toAdminUser(AdminUserRow user) {
        return new AdminUserDto(
                user.id(),
                user.username(),
                user.displayName(),
                user.role(),
                user.enabled(),
                user.lastLoginAt(),
                user.createdAt(),
                user.updatedAt());
    }

    private void requireUserManager(AdminUserPrincipal principal) {
        if (principal.role() == AdminRole.USER) {
            throw new ApiException(HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN, "Forbidden");
        }
    }

    private void requireCanManageRole(AdminUserPrincipal principal, AdminRole role) {
        requireUserManager(principal);
        if (principal.role() == AdminRole.ADMIN && role != AdminRole.USER) {
            throw new ApiException(HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN, "Forbidden");
        }
    }

    private ApiException unauthorized() {
        return new ApiException(HttpStatus.UNAUTHORIZED, ErrorCode.UNAUTHORIZED, LOGIN_FAILED_MESSAGE);
    }

    private void ensureUserCanChange(
            AdminUserPrincipal principal, AdminUserRow user, AdminRole nextRole, boolean nextEnabled) {
        boolean removingEnabledSuperAdmin = user.enabled()
                && user.role() == AdminRole.SUPER_ADMIN
                && (!nextEnabled || nextRole != AdminRole.SUPER_ADMIN);
        if (principal.id().equals(user.id()) && (!nextEnabled || nextRole != user.role())) {
            throw adminUserConflict();
        }
        if (removingEnabledSuperAdmin && enabledSuperAdminCount() <= 1) {
            throw adminUserConflict();
        }
    }

    private Integer enabledSuperAdminCount() {
        return jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM admin_user WHERE enabled = TRUE AND role = 'SUPER_ADMIN'", Integer.class);
    }

    private ApiException adminUserConflict() {
        return new ApiException(HttpStatus.CONFLICT, ErrorCode.ADMIN_USER_CONFLICT, "Admin User conflict");
    }

    private String normalizeUsername(String username) {
        return username.trim().toLowerCase(Locale.ROOT);
    }

    private String blankToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }
}
