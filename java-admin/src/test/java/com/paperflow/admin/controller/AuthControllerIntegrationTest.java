package com.paperflow.admin.controller;

import static org.hamcrest.Matchers.blankOrNullString;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.paperflow.admin.PaperflowAdminApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(classes = PaperflowAdminApplication.class)
@AutoConfigureMockMvc
@Sql(statements = {
    AdminAuthTestSupport.DROP_ADMIN_USER_TABLE,
    AdminAuthTestSupport.CREATE_ADMIN_USER_TABLE,
    "INSERT INTO admin_user (id, username, username_normalized, password_hash, display_name, role, enabled) "
            + "VALUES (1, 'Admin', 'admin', '"
            + AdminAuthTestSupport.ADMIN_PASSWORD_HASH
            + "', 'Root Admin', 'SUPER_ADMIN', TRUE)",
    "INSERT INTO admin_user (id, username, username_normalized, password_hash, display_name, role, enabled) "
            + "VALUES (2, 'Disabled', 'disabled', '"
            + AdminAuthTestSupport.ADMIN_PASSWORD_HASH
            + "', 'Disabled User', 'USER', FALSE)",
    "INSERT INTO admin_user (id, username, username_normalized, password_hash, display_name, role, enabled) "
            + "VALUES (3, 'User', 'user', '"
            + AdminAuthTestSupport.OLD_PASSWORD_HASH
            + "', 'Basic User', 'USER', TRUE)",
    "INSERT INTO admin_user (id, username, username_normalized, password_hash, display_name, role, enabled) "
            + "VALUES (4, 'Manager', 'manager', '"
            + AdminAuthTestSupport.ADMIN_PASSWORD_HASH
            + "', 'Admin User', 'ADMIN', TRUE)"
})
class AuthControllerIntegrationTest extends AdminAuthTestSupport {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void loginReturnsCurrentUserAndUpdatesLastLoginAt() throws Exception {
        LoginSession login = login(mockMvc, " admin ", "correct-password-1");

        mockMvc.perform(get("/api/auth/me").session(login.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.username").value("Admin"))
                .andExpect(jsonPath("$.displayName").value("Root Admin"))
                .andExpect(jsonPath("$.role").value("SUPER_ADMIN"))
                .andExpect(jsonPath("$", not(hasKey("enabled"))))
                .andExpect(jsonPath("$", not(hasKey("passwordHash"))))
                .andExpect(jsonPath("$", not(hasKey("lastLoginAt"))));

        LoginSession manager = login(mockMvc, "manager", "correct-password-1");
        mockMvc.perform(get("/api/admin-users").session(manager.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.username == 'Admin')].lastLoginAt[0]", not(blankOrNullString())));
    }

    @Test
    void loginReturnsAdminAndUserRoles() throws Exception {
        LoginSession admin = login(mockMvc, "manager", "correct-password-1");
        mockMvc.perform(get("/api/auth/me").session(admin.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"));

        LoginSession user = login(mockMvc, "user", "old-password-1");
        mockMvc.perform(get("/api/auth/me").session(user.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("USER"));
    }

    @Test
    void loginFailuresReturnSameUnauthorizedError() throws Exception {
        assertLoginFails("missing", "correct-password-1");
        assertLoginFails("admin", "wrong-password");
        assertLoginFails("disabled", "correct-password-1");
    }

    @Test
    void userCanChangeOwnPasswordAndKeepCurrentSession() throws Exception {
        LoginSession login = login(mockMvc, "user", "old-password-1");
        Csrf csrf = csrf(mockMvc);

        mockMvc.perform(post("/api/auth/change-password")
                        .session(login.session())
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {"oldPassword":"old-password-1","newPassword":"new-password-123"}
                        """))
                .andExpect(status().isNoContent());

        assertLoginFails("user", "old-password-1");
        login(mockMvc, "user", "new-password-123");
        mockMvc.perform(get("/api/auth/me").session(login.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("User"));
    }

    @Test
    void changePasswordRejectsWrongOldPasswordAndShortNewPassword() throws Exception {
        LoginSession login = login(mockMvc, "user", "old-password-1");
        Csrf csrf = csrf(mockMvc);

        mockMvc.perform(post("/api/auth/change-password")
                        .session(login.session())
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {"oldPassword":"wrong-password","newPassword":"new-password-123"}
                        """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

        mockMvc.perform(post("/api/auth/change-password")
                        .session(login.session())
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {"oldPassword":"old-password-1","newPassword":"1234"}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void changePasswordAcceptsFiveCharacterNewPassword() throws Exception {
        LoginSession login = login(mockMvc, "user", "old-password-1");
        Csrf csrf = csrf(mockMvc);

        mockMvc.perform(post("/api/auth/change-password")
                        .session(login.session())
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {"oldPassword":"old-password-1","newPassword":"12345"}
                        """))
                .andExpect(status().isNoContent());

        login(mockMvc, "user", "12345");
    }

    @Test
    void logoutInvalidatesCurrentSession() throws Exception {
        LoginSession login = login(mockMvc, "admin", "correct-password-1");
        Csrf csrf = csrf(mockMvc);

        mockMvc.perform(post("/api/auth/logout")
                        .session(login.session())
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/auth/me").session(login.session()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    private void assertLoginFails(String username, String password) throws Exception {
        Csrf csrf = csrf(mockMvc);

        mockMvc.perform(post("/api/auth/login")
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {"username":"%s","password":"%s"}
                        """
                                .formatted(username, password)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.message").value("Username or password is incorrect"))
                .andExpect(jsonPath("$.requestId", not(blankOrNullString())));
    }
}
