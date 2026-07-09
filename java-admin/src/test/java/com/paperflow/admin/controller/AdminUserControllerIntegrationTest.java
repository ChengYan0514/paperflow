package com.paperflow.admin.controller;

import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
    "INSERT INTO admin_user (id, username, username_normalized, password_hash, display_name, role, enabled, created_at, updated_at) "
            + "VALUES (1, 'Admin', 'admin', '"
            + AdminAuthTestSupport.ADMIN_PASSWORD_HASH
            + "', 'Root Admin', 'SUPER_ADMIN', TRUE, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z')",
    "INSERT INTO admin_user (id, username, username_normalized, password_hash, display_name, role, enabled, last_login_at, created_at, updated_at) "
            + "VALUES (2, 'User', 'user', '"
            + AdminAuthTestSupport.OLD_PASSWORD_HASH
            + "', 'Basic User', 'USER', TRUE, '2024-01-03T00:00:00Z', '2024-01-02T00:00:00Z', '2024-01-02T00:00:00Z')",
    "INSERT INTO admin_user (id, username, username_normalized, password_hash, display_name, role, enabled, created_at, updated_at) "
            + "VALUES (3, 'SecondAdmin', 'secondadmin', '"
            + AdminAuthTestSupport.ADMIN_PASSWORD_HASH
            + "', 'Second Admin', 'ADMIN', TRUE, '2023-12-31T00:00:00Z', '2023-12-31T00:00:00Z')",
    "INSERT INTO admin_user (id, username, username_normalized, password_hash, display_name, role, enabled, created_at, updated_at) "
            + "VALUES (4, 'SecondRoot', 'secondroot', '"
            + AdminAuthTestSupport.ADMIN_PASSWORD_HASH
            + "', 'Second Root', 'SUPER_ADMIN', TRUE, '2023-12-30T00:00:00Z', '2023-12-30T00:00:00Z')",
    "ALTER TABLE admin_user ALTER COLUMN id RESTART WITH 5"
})
class AdminUserControllerIntegrationTest extends AdminAuthTestSupport {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void adminListsUsersNewestFirstWithoutPasswordHash() throws Exception {
        LoginSession login = login(mockMvc, "admin", "correct-password-1");

        mockMvc.perform(get("/api/admin-users").session(login.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").value("User"))
                .andExpect(jsonPath("$[0].displayName").value("Basic User"))
                .andExpect(jsonPath("$[0].role").value("USER"))
                .andExpect(jsonPath("$[0].enabled").value(true))
                .andExpect(jsonPath("$[0].lastLoginAt").value("2024-01-03T00:00:00Z"))
                .andExpect(jsonPath("$[0].createdAt").value("2024-01-02T00:00:00Z"))
                .andExpect(jsonPath("$[0].updatedAt").value("2024-01-02T00:00:00Z"))
                .andExpect(jsonPath("$[0]", not(hasKey("passwordHash"))))
                .andExpect(jsonPath("$[1].username").value("Admin"));
    }

    @Test
    void userCannotListUsers() throws Exception {
        LoginSession login = login(mockMvc, "user", "old-password-1");

        mockMvc.perform(get("/api/admin-users").session(login.session()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void adminCanOnlyManageUsers() throws Exception {
        LoginSession login = login(mockMvc, "secondadmin", "correct-password-1");
        Csrf csrf = csrf(mockMvc);

        mockMvc.perform(post("/api/admin-users")
                        .session(login.session())
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {"username":"ManagedUser","password":"12345","role":"USER"}
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("USER"));

        mockMvc.perform(post("/api/admin-users")
                        .session(login.session())
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {"username":"ManagedAdmin","password":"12345","role":"ADMIN"}
                        """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        patchUser(login, csrf, 2, """
                        {"enabled":false}
                        """)
                .andExpect(status().isOk());

        patchUser(login, csrf, 1, """
                        {"enabled":false}
                        """)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        mockMvc.perform(post("/api/admin-users/3/reset-password")
                        .session(login.session())
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {"newPassword":"12345"}
                        """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void onlySuperAdminCanReadRoleMatrix() throws Exception {
        LoginSession superAdmin = login(mockMvc, "admin", "correct-password-1");
        mockMvc.perform(get("/api/admin-roles").session(superAdmin.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].role").value("SUPER_ADMIN"))
                .andExpect(jsonPath("$[1].role").value("ADMIN"))
                .andExpect(jsonPath("$[2].role").value("USER"))
                .andExpect(jsonPath("$[0].description").isNotEmpty());

        LoginSession admin = login(mockMvc, "secondadmin", "correct-password-1");
        mockMvc.perform(get("/api/admin-roles").session(admin.session()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        LoginSession user = login(mockMvc, "user", "old-password-1");
        mockMvc.perform(get("/api/admin-roles").session(user.session()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void adminCreatesUserWithNormalizedUsernameAndTrimmedDisplayName() throws Exception {
        LoginSession login = login(mockMvc, "admin", "correct-password-1");
        Csrf csrf = csrf(mockMvc);

        mockMvc.perform(post("/api/admin-users")
                        .session(login.session())
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {"username":"New.User","password":"user-password-1","displayName":"   ","role":"USER"}
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("New.User"))
                .andExpect(jsonPath("$.displayName").doesNotExist())
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.enabled").value(true))
                .andExpect(jsonPath("$", not(hasKey("passwordHash"))));

        login(mockMvc, " new.user ", "user-password-1");
    }

    @Test
    void creatingAdminUserValidatesRoleAndUsernameConflict() throws Exception {
        LoginSession login = login(mockMvc, "admin", "correct-password-1");
        Csrf csrf = csrf(mockMvc);

        mockMvc.perform(post("/api/admin-users")
                        .session(login.session())
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {"username":"Another","password":"user-password-1","role":"admin"}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        mockMvc.perform(post("/api/admin-users")
                        .session(login.session())
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {"username":"admin","password":"user-password-1","role":"USER"}
                        """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ADMIN_USER_CONFLICT"));
    }

    @Test
    void adminUpdatesUserProfileRoleAndEnabledState() throws Exception {
        LoginSession login = login(mockMvc, "admin", "correct-password-1");
        Csrf csrf = csrf(mockMvc);

        mockMvc.perform(patch("/api/admin-users/2")
                        .session(login.session())
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {"displayName":"  Updated User  ","role":"ADMIN","enabled":false}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(2))
                .andExpect(jsonPath("$.username").value("User"))
                .andExpect(jsonPath("$.displayName").value("Updated User"))
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.enabled").value(false));
    }

    @Test
    void adminUserPatchPreservesOmittedFields() throws Exception {
        LoginSession login = login(mockMvc, "admin", "correct-password-1");
        Csrf csrf = csrf(mockMvc);

        patchUser(login, csrf, 2, """
                        {"role":"ADMIN"}
                        """)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Basic User"))
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.enabled").value(true));
    }

    @Test
    void updatingMissingAdminUserReturnsNotFound() throws Exception {
        LoginSession login = login(mockMvc, "admin", "correct-password-1");
        Csrf csrf = csrf(mockMvc);

        mockMvc.perform(patch("/api/admin-users/99")
                        .session(login.session())
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {"displayName":"Missing"}
                        """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ADMIN_USER_NOT_FOUND"));
    }

    @Test
    void adminUserUpdateProtectsSelfAndLastEnabledAdmin() throws Exception {
        LoginSession login = login(mockMvc, "admin", "correct-password-1");
        Csrf csrf = csrf(mockMvc);

        patchUser(login, csrf, 1, """
                        {"enabled":false}
                        """)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ADMIN_USER_CONFLICT"));

        patchUser(login, csrf, 1, """
                        {"role":"USER"}
                        """)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ADMIN_USER_CONFLICT"));

        patchUser(login, csrf, 4, """
                        {"enabled":false}
                        """)
                .andExpect(status().isOk());

        patchUser(login, csrf, 1, """
                        {"displayName":"Still Admin"}
                        """)
                .andExpect(status().isOk());

        patchUser(login, csrf, 1, """
                        {"role":"USER"}
                        """)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ADMIN_USER_CONFLICT"));
    }

    @Test
    void adminResetsAnotherAdminPassword() throws Exception {
        LoginSession login = login(mockMvc, "admin", "correct-password-1");
        Csrf csrf = csrf(mockMvc);

        mockMvc.perform(post("/api/admin-users/3/reset-password")
                        .session(login.session())
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {"newPassword":"reset-password-123"}
                        """))
                .andExpect(status().isNoContent());

        assertLoginFails(mockMvc, "secondadmin", "correct-password-1");
        login(mockMvc, "secondadmin", "reset-password-123");
        mockMvc.perform(get("/api/auth/me").session(login.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("Admin"));
    }

    @Test
    void resetPasswordValidatesNewPassword() throws Exception {
        LoginSession login = login(mockMvc, "admin", "correct-password-1");
        Csrf csrf = csrf(mockMvc);

        mockMvc.perform(post("/api/admin-users/2/reset-password")
                        .session(login.session())
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {"newPassword":"1234"}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        mockMvc.perform(post("/api/admin-users/2/reset-password")
                        .session(login.session())
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {"newPassword":"12345"}
                        """))
                .andExpect(status().isNoContent());

        login(mockMvc, "user", "12345");
    }

    @Test
    void createUserPasswordMinimumLengthIsFive() throws Exception {
        LoginSession login = login(mockMvc, "admin", "correct-password-1");
        Csrf csrf = csrf(mockMvc);

        mockMvc.perform(post("/api/admin-users")
                        .session(login.session())
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {"username":"ShortPass","password":"1234","role":"USER"}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        mockMvc.perform(post("/api/admin-users")
                        .session(login.session())
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {"username":"FivePass","password":"12345","role":"USER"}
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("FivePass"));
    }

    private org.springframework.test.web.servlet.ResultActions patchUser(
            LoginSession login, Csrf csrf, long id, String body) throws Exception {
        return mockMvc.perform(patch("/api/admin-users/{id}", id)
                .session(login.session())
                .cookie(csrf.cookie())
                .header("X-XSRF-TOKEN", csrf.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }
}
