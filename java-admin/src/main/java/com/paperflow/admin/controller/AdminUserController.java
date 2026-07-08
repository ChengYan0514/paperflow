package com.paperflow.admin.controller;

import com.paperflow.admin.dto.CreateAdminUserRequest;
import com.paperflow.admin.dto.AdminUserDto;
import com.paperflow.admin.dto.ResetPasswordRequest;
import com.paperflow.admin.dto.UpdateAdminUserRequest;
import com.paperflow.admin.service.AdminUserPrincipal;
import com.paperflow.admin.service.AdminUserService;
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

    public AdminUserController(AdminUserService adminUsers) {
        this.adminUsers = adminUsers;
    }

    @GetMapping
    public List<AdminUserDto> listUsers(@AuthenticationPrincipal AdminUserPrincipal principal) {
        return adminUsers.listUsers(principal);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminUserDto createUser(
            @AuthenticationPrincipal AdminUserPrincipal principal, @Valid @RequestBody CreateAdminUserRequest request) {
        return adminUsers.createUser(
                principal,
                request.username(),
                request.password(),
                request.displayName(),
                request.role(),
                request.enabled());
    }

    @PatchMapping("/{id}")
    public AdminUserDto updateUser(
            @AuthenticationPrincipal AdminUserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody UpdateAdminUserRequest request) {
        return adminUsers.updateUser(principal, id, request.displayName(), request.role(), request.enabled());
    }

    @PostMapping("/{id}/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(
            @AuthenticationPrincipal AdminUserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody ResetPasswordRequest request) {
        adminUsers.resetPassword(principal, id, request.newPassword());
    }
}
