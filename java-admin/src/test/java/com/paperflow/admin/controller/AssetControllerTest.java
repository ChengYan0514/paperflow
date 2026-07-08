package com.paperflow.admin.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.paperflow.admin.PaperflowAdminApplication;
import com.paperflow.admin.service.AssetService;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
        classes = PaperflowAdminApplication.class,
        properties = "paperflow.api.data-root=/tmp/paperflow-admin-asset-test")
@AutoConfigureMockMvc
class AssetControllerTest {
    private static final Path DATA_ROOT = Path.of("/tmp/paperflow-admin-asset-test");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AssetService assetService;

    @Test
    void streamsAssetUnderDataRoot() throws Exception {
        Files.createDirectories(DATA_ROOT.resolve("openalex/original/S1"));
        Files.writeString(DATA_ROOT.resolve("openalex/original/S1/F1.xml"), "<root/>");
        assertThat(assetService.resolveAsset("openalex/original/S1/F1.xml").toFile()).isFile();

        mockMvc.perform(get("/api/assets/openalex/original/S1/F1.xml"))
                .andExpect(status().isOk())
                .andExpect(content().string("<root/>"));
    }

    @Test
    void rejectsPathTraversal() throws Exception {
        mockMvc.perform(get("/api/assets/../secret.txt"))
                .andExpect(status().isBadRequest());
    }
}
