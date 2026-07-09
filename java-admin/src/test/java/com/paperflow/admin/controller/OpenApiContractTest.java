package com.paperflow.admin.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.paperflow.admin.PaperflowAdminApplication;
import com.paperflow.admin.mapper.AdminMapper;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
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
    void openApiAndSwaggerRequireLogin() throws Exception {
        mockMvc.perform(get("/api.yaml")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/v3/api-docs")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/swagger-ui/index.html")).andExpect(status().isUnauthorized());
    }

    @Test
    void servesDocsJavaApiYamlAsRuntimeOpenApiContract() throws Exception {
        String served = mockMvc.perform(get("/api.yaml").with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8);

        String canonical = Files.readString(Path.of("..", "docs_java", "api.yaml"));
        assertThat(served).isEqualTo(canonical);
    }

    @Test
    void swaggerUiUsesRuntimeOpenApiContract() throws Exception {
        mockMvc.perform(get("/swagger-ui/index.html").with(user("admin").roles("ADMIN"))).andExpect(status().isOk());
        assertThat(environment.getProperty("springdoc.swagger-ui.url")).isEqualTo("/api.yaml");
        assertThat(environment.getProperty("springdoc.enable-default-api-docs", Boolean.class)).isFalse();
    }

    @Test
    void v3ApiDocsServesSameRuntimeOpenApiContract() throws Exception {
        String served = mockMvc.perform(get("/v3/api-docs").with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8);

        String canonical = Files.readString(Path.of("..", "docs_java", "api.yaml"));
        assertThat(served).isEqualTo(canonical);
    }

    @Test
    void adminRoleContractUsesThreeRolesAndFiveCharacterPasswords() throws Exception {
        Map<?, ?> api = new ObjectMapper(new YAMLFactory())
                .readValue(Files.readString(Path.of("..", "docs_java", "api.yaml")), Map.class);
        Map<?, ?> paths = (Map<?, ?>) api.get("paths");
        Map<?, ?> schemas = (Map<?, ?>) ((Map<?, ?>) api.get("components")).get("schemas");

        assertThat(paths.containsKey("/api/admin-roles")).isTrue();
        assertThat((List<Object>) ((Map<?, ?>) schemas.get("AdminRole")).get("enum"))
                .containsExactly("SUPER_ADMIN", "ADMIN", "USER");
        assertThat(Files.readString(Path.of("..", "docs_java", "api.yaml"))).doesNotContain("VIEWER");
        assertThat(passwordMinLength(schemas, "CreateAdminUserRequest", "password")).isEqualTo(5);
        assertThat(passwordMinLength(schemas, "ResetPasswordRequest", "newPassword")).isEqualTo(5);
        assertThat(passwordMinLength(schemas, "ChangePasswordRequest", "newPassword")).isEqualTo(5);
    }

    private Integer passwordMinLength(Map<?, ?> schemas, String schemaName, String propertyName) {
        Map<?, ?> schema = (Map<?, ?>) schemas.get(schemaName);
        Map<?, ?> properties = (Map<?, ?>) schema.get("properties");
        return (Integer) ((Map<?, ?>) properties.get(propertyName)).get("minLength");
    }
}
