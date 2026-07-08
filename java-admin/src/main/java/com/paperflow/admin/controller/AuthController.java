package com.paperflow.admin.controller;

import com.paperflow.admin.dto.AuthUser;
import com.paperflow.admin.dto.ChangePasswordRequest;
import com.paperflow.admin.dto.LoginRequest;
import com.paperflow.admin.service.AdminUserPrincipal;
import com.paperflow.admin.service.AdminUserService;
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

    public AuthController(AdminUserService adminUsers) {
        this.adminUsers = adminUsers;
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
        AuthUser user = adminUsers.login(requestBody.username(), requestBody.password());
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                adminUsers.principal(user),
                null,
                java.util.List.of(new SimpleGrantedAuthority("ROLE_" + user.role().name())));
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        HttpSession session = request.getSession(true);
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);
        return user;
    }

    @GetMapping("/me")
    public AuthUser me(@AuthenticationPrincipal AdminUserPrincipal principal) {
        return adminUsers.currentUser(principal);
    }

    @PostMapping("/change-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(
            @AuthenticationPrincipal AdminUserPrincipal principal, @Valid @RequestBody ChangePasswordRequest request) {
        adminUsers.changePassword(principal, request.oldPassword(), request.newPassword());
    }
}
