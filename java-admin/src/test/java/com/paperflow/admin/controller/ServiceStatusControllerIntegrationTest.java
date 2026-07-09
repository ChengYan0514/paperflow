package com.paperflow.admin.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.paperflow.admin.PaperflowAdminApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(classes = PaperflowAdminApplication.class)
@AutoConfigureMockMvc
@WithMockUser(username = "admin", roles = "ADMIN")
class ServiceStatusControllerIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void returnsRealServiceStatusForSignedInUsers() throws Exception {
        mockMvc.perform(get("/api/service-status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").exists())
                .andExpect(jsonPath("$.version").value("0.1.0"))
                .andExpect(jsonPath("$.backend.ok").value(true))
                .andExpect(jsonPath("$.database.ok").value(true))
                .andExpect(jsonPath("$.dataRoot.name").value("数据目录"))
                .andExpect(jsonPath("$.disk.name").value("磁盘空间"))
                .andExpect(jsonPath("$.recentErrors").isArray());
    }
}
