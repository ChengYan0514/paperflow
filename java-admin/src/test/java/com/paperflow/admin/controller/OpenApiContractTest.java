package com.paperflow.admin.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.paperflow.admin.PaperflowAdminApplication;
import com.paperflow.admin.mapper.AdminMapper;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.core.env.Environment;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(classes = PaperflowAdminApplication.class)
@AutoConfigureMockMvc
class OpenApiContractTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private Environment environment;

    @MockBean
    private AdminMapper adminMapper;

    @Test
    void servesDocsJavaApiYamlAsRuntimeOpenApiContract() throws Exception {
        String served = mockMvc.perform(get("/api.yaml"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8);

        String canonical = Files.readString(Path.of("..", "docs_java", "api.yaml"));
        assertThat(served).isEqualTo(canonical);
    }

    @Test
    void swaggerUiUsesRuntimeOpenApiContract() throws Exception {
        mockMvc.perform(get("/swagger-ui/index.html")).andExpect(status().isOk());
        assertThat(environment.getProperty("springdoc.swagger-ui.url")).isEqualTo("/api.yaml");
        assertThat(environment.getProperty("springdoc.enable-default-api-docs", Boolean.class)).isFalse();
    }

    @Test
    void v3ApiDocsServesSameRuntimeOpenApiContract() throws Exception {
        String served = mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8);

        String canonical = Files.readString(Path.of("..", "docs_java", "api.yaml"));
        assertThat(served).isEqualTo(canonical);
    }
}
