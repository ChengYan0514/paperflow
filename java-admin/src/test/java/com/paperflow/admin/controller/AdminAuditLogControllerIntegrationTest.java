package com.paperflow.admin.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.paperflow.admin.PaperflowAdminApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(classes = PaperflowAdminApplication.class)
@AutoConfigureMockMvc
@Sql(statements = {
    AdminAuthTestSupport.DROP_ADMIN_USER_TABLE,
    AdminAuthTestSupport.CREATE_ADMIN_USER_TABLE,
    "DELETE FROM admin_audit_log",
    "INSERT INTO admin_user (id, username, username_normalized, password_hash, display_name, role, enabled) "
            + "VALUES (1, 'Admin', 'admin', '"
            + AdminAuthTestSupport.ADMIN_PASSWORD_HASH
            + "', 'Root Admin', 'SUPER_ADMIN', TRUE)",
    "INSERT INTO admin_user (id, username, username_normalized, password_hash, display_name, role, enabled) "
            + "VALUES (2, 'User', 'user', '"
            + AdminAuthTestSupport.ADMIN_PASSWORD_HASH
            + "', 'Basic User', 'USER', TRUE)"
})
class AdminAuditLogControllerIntegrationTest extends AdminAuthTestSupport {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void recordsLoginEventsAndLetsSuperAdminQueryThem() throws Exception {
        LoginSession login = login(mockMvc, "admin", "correct-password-1");
        assertLoginFails(mockMvc, "missing", "wrong-password");

        mockMvc.perform(get("/api/admin-audit-logs")
                        .session(login.session())
                        .param("action", "LOGIN")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.items[0].action").value("LOGIN"))
                .andExpect(jsonPath("$.items[0].result").value("FAILURE"))
                .andExpect(jsonPath("$.items[1].result").value("SUCCESS"))
                .andExpect(jsonPath("$.items[1].actorUsername").value("Admin"));
    }

    @Test
    void onlySuperAdminCanQueryAuditLogs() throws Exception {
        LoginSession login = login(mockMvc, "user", "correct-password-1");

        mockMvc.perform(get("/api/admin-audit-logs").session(login.session()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }
}
