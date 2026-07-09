package com.paperflow.admin.controller;

import com.paperflow.admin.dto.CreateAdminUserRequest;
import com.paperflow.admin.dto.AdminUserDto;
import com.paperflow.admin.dto.ResetPasswordRequest;
import com.paperflow.admin.dto.UpdateAdminUserRequest;
import com.paperflow.admin.service.AdminAuditLogService;
import com.paperflow.admin.service.AdminUserPrincipal;
import com.paperflow.admin.service.AdminUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin-users")
public class AdminUserController {
    private final AdminUserService adminUsers;
    private final AdminAuditLogService auditLogs;

    public AdminUserController(AdminUserService adminUsers, AdminAuditLogService auditLogs) {
        this.adminUsers = adminUsers;
        this.auditLogs = auditLogs;
    }

    @GetMapping
    public List<AdminUserDto> listUsers(@AuthenticationPrincipal AdminUserPrincipal principal) {
        return adminUsers.listUsers(principal);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminUserDto createUser(
            @AuthenticationPrincipal AdminUserPrincipal principal,
            @Valid @RequestBody CreateAdminUserRequest request,
            HttpServletRequest servletRequest) {
        try {
            AdminUserDto user = adminUsers.createUser(
                    principal,
                    request.username(),
                    request.password(),
                    request.displayName(),
                    request.role(),
                    request.enabled());
            auditLogs.success(
                    principal, "CREATE_ADMIN_USER", "ADMIN_USER", String.valueOf(user.id()), servletRequest, "创建用户");
            return user;
        } catch (RuntimeException exc) {
            auditLogs.failure(
                    principal, null, "CREATE_ADMIN_USER", "ADMIN_USER", request.username(), servletRequest, "创建用户失败");
            throw exc;
        }
    }

    @PatchMapping("/{id}")
    public AdminUserDto updateUser(
            @AuthenticationPrincipal AdminUserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody UpdateAdminUserRequest request,
            HttpServletRequest servletRequest) {
        try {
            AdminUserDto user = adminUsers.updateUser(principal, id, request.displayName(), request.role(), request.enabled());
            auditLogs.success(
                    principal, "UPDATE_ADMIN_USER", "ADMIN_USER", String.valueOf(user.id()), servletRequest, "更新用户");
            return user;
        } catch (RuntimeException exc) {
            auditLogs.failure(
                    principal, null, "UPDATE_ADMIN_USER", "ADMIN_USER", String.valueOf(id), servletRequest, "更新用户失败");
            throw exc;
        }
    }

    @PostMapping("/{id}/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(
            @AuthenticationPrincipal AdminUserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody ResetPasswordRequest request,
            HttpServletRequest servletRequest) {
        try {
            adminUsers.resetPassword(principal, id, request.newPassword());
            auditLogs.success(
                    principal, "RESET_PASSWORD", "ADMIN_USER", String.valueOf(id), servletRequest, "重置密码");
        } catch (RuntimeException exc) {
            auditLogs.failure(
                    principal, null, "RESET_PASSWORD", "ADMIN_USER", String.valueOf(id), servletRequest, "重置密码失败");
            throw exc;
        }
    }
}
