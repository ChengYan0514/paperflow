package com.paperflow.admin.controller;

import com.paperflow.admin.dto.AuthUser;
import com.paperflow.admin.dto.ChangePasswordRequest;
import com.paperflow.admin.dto.LoginRequest;
import com.paperflow.admin.service.AdminAuditLogService;
import com.paperflow.admin.service.AdminUserPrincipal;
import com.paperflow.admin.service.AdminUserService;
import com.paperflow.admin.service.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AdminUserService adminUsers;
    private final AdminAuditLogService auditLogs;

    public AuthController(AdminUserService adminUsers, AdminAuditLogService auditLogs) {
        this.adminUsers = adminUsers;
        this.auditLogs = auditLogs;
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken csrfToken) {
        return Map.of(
                "token", csrfToken.getToken(),
                "headerName", csrfToken.getHeaderName(),
                "parameterName", csrfToken.getParameterName());
    }

    @PostMapping("/login")
    public AuthUser login(@Valid @RequestBody LoginRequest requestBody, HttpServletRequest request) {
        AuthUser user;
        try {
            user = adminUsers.login(requestBody.username(), requestBody.password());
        } catch (ApiException exc) {
            auditLogs.failure(null, requestBody.username(), "LOGIN", "AUTH", null, request, "登录失败");
            throw exc;
        }
        AdminUserPrincipal principal = adminUsers.principal(user);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                principal,
                null,
                java.util.List.of(new SimpleGrantedAuthority("ROLE_" + user.role().name())));
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        HttpSession session = request.getSession(true);
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);
        auditLogs.success(principal, "LOGIN", "AUTH", String.valueOf(user.id()), request, "登录成功");
        return user;
    }

    @GetMapping("/me")
    public AuthUser me(@AuthenticationPrincipal AdminUserPrincipal principal) {
        return adminUsers.currentUser(principal);
    }

    @PostMapping("/change-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(
            @AuthenticationPrincipal AdminUserPrincipal principal,
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletRequest servletRequest) {
        try {
            adminUsers.changePassword(principal, request.oldPassword(), request.newPassword());
            auditLogs.success(
                    principal, "CHANGE_PASSWORD", "ADMIN_USER", String.valueOf(principal.id()), servletRequest, "修改密码");
        } catch (ApiException exc) {
            auditLogs.failure(
                    principal, null, "CHANGE_PASSWORD", "ADMIN_USER", String.valueOf(principal.id()), servletRequest, "修改密码失败");
            throw exc;
        }
    }
}
