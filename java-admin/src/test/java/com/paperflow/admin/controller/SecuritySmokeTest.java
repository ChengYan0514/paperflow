package com.paperflow.admin.controller;

import static org.hamcrest.Matchers.blankOrNullString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.paperflow.admin.PaperflowAdminApplication;
import com.paperflow.admin.mapper.AdminMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(classes = PaperflowAdminApplication.class)
@AutoConfigureMockMvc
@Sql(statements = {
    AdminAuthTestSupport.DROP_ADMIN_USER_TABLE,
    AdminAuthTestSupport.CREATE_ADMIN_USER_TABLE
})
class SecuritySmokeTest {
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AdminMapper adminMapper;

    @Test
    void apiRequiresLoginWithJsonError() throws Exception {
        mockMvc.perform(get("/api/task-status"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.message").value("Unauthorized"))
                .andExpect(jsonPath("$.requestId", not(blankOrNullString())));
    }

    @Test
    void csrfTokenIsAvailableBeforeLogin() throws Exception {
        mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("XSRF-TOKEN"));
    }

    @Test
    void loginPostCannotBypassCsrf() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void loginPostWithCsrfReachesAuthenticationFlow() throws Exception {
        MvcResult csrf = mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isOk())
                .andReturn();
        Cookie token = csrf.getResponse().getCookie("XSRF-TOKEN");

        mockMvc.perform(post("/api/auth/login")
                        .cookie(token)
                        .header("X-XSRF-TOKEN", token.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {"username":"missing","password":"wrong-password"}
                        """))
                .andExpect(status().isUnauthorized());
    }
}
