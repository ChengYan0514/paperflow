package com.paperflow.admin.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;

import com.paperflow.admin.PaperflowAdminApplication;
import com.paperflow.admin.mapper.AdminMapper;
import com.paperflow.admin.model.SourceRow;
import com.paperflow.admin.model.WorkRow;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(classes = PaperflowAdminApplication.class)
@AutoConfigureMockMvc
class ApiValidationTest {
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AdminMapper adminMapper;

    @Test
    void rejectsInvalidWorkIdWithApiError() throws Exception {
        mockMvc.perform(get("/api/works/not-a-work"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("Invalid request"))
                .andExpect(jsonPath("$.requestId").isString());
    }

    @Test
    void returnsSourcePageDtoShape() throws Exception {
        SourceRow source = new SourceRow();
        source.setSourceId("S1");
        source.setSourceName("Source One");
        source.setProvider("Publisher");
        source.setWorkCount(3);
        source.setOriginalFileCount(2);
        source.setMatchedFileCount(1);
        source.setParsedFileCount(1);
        source.setReadyFileCount(1);
        source.setParseFailedFileCount(0);
        source.setBlockFailedFileCount(0);
        source.setUnsupportedFileCount(1);
        when(adminMapper.listSources(any(), any(), any(), any(), any(), any(), anyInt(), anyInt()))
                .thenReturn(List.of(source));
        when(adminMapper.countSources(any(), any(), any(), any(), any())).thenReturn(7L);

        mockMvc.perform(get("/api/sources").param("page", "2").param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(2))
                .andExpect(jsonPath("$.size").value(1))
                .andExpect(jsonPath("$.total").value(7))
                .andExpect(jsonPath("$.items[0].sourceId").value("S1"))
                .andExpect(jsonPath("$.items[0].stats.workCount").value(3))
                .andExpect(jsonPath("$.items[0].stats.unsupportedFileCount").value(1));
    }

    @Test
    void returnsSourceNotFoundErrorDto() throws Exception {
        mockMvc.perform(get("/api/sources/S404"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("SOURCE_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("Source not found"))
                .andExpect(jsonPath("$.requestId").isString());
    }

    @Test
    void returnsWorkPageWithProcessingStatusDto() throws Exception {
        WorkRow work = new WorkRow();
        work.setWorkId("W1");
        work.setTitle("A Work");
        work.setSourceIds("S1,S2");
        work.setMatchedFileId("F1");
        work.setFlagMatch(1);
        work.setFlagText(2);
        work.setFlagBlock(1);
        when(adminMapper.listWorks(
                        any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(),
                        anyInt(), anyInt()))
                .thenReturn(List.of(work));
        when(adminMapper.countWorks(
                        any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(1L);

        mockMvc.perform(get("/api/works"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].workId").value("W1"))
                .andExpect(jsonPath("$.items[0].sourceIds[0]").value("S1"))
                .andExpect(jsonPath("$.items[0].sourceIds[1]").value("S2"))
                .andExpect(jsonPath("$.items[0].processingStatus").value("READY"));
    }
}
