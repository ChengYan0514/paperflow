package com.paperflow.admin.controller;

import com.paperflow.admin.dto.AdminRole;
import com.paperflow.admin.dto.AdminRoleInfo;
import com.paperflow.admin.dto.ErrorCode;
import com.paperflow.admin.service.AdminUserPrincipal;
import com.paperflow.admin.service.ApiException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin-roles")
public class AdminRoleController {
    @GetMapping
    public List<AdminRoleInfo> roles(@AuthenticationPrincipal AdminUserPrincipal principal) {
        if (principal.role() != AdminRole.SUPER_ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN, "Forbidden");
        }
        return List.of(
                new AdminRoleInfo(AdminRole.SUPER_ADMIN, "Full system administration"),
                new AdminRoleInfo(AdminRole.ADMIN, "Manage users with USER role"),
                new AdminRoleInfo(AdminRole.USER, "Read-only admin access"));
    }
}
