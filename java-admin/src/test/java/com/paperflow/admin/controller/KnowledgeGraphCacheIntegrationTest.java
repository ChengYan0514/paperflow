package com.paperflow.admin.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.paperflow.admin.PaperflowAdminApplication;
import com.paperflow.admin.mapper.KnowledgeGraphMapper;
import com.paperflow.admin.model.CausalFieldRow;
import com.paperflow.admin.model.CausalOverviewRow;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.cache.CacheManager;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(classes = PaperflowAdminApplication.class)
@AutoConfigureMockMvc
@WithMockUser(username = "admin", roles = "ADMIN")
class KnowledgeGraphCacheIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CacheManager cacheManager;

    @MockBean
    private KnowledgeGraphMapper mapper;

    @BeforeEach
    void clearCaches() {
        cacheManager.getCacheNames().forEach(name -> cacheManager.getCache(name).clear());
    }

    @Test
    void summaryKeepsItsFirstResultAfterCausalDataChanges() throws Exception {
        when(mapper.findOverview(3)).thenReturn(overview(3));
        when(mapper.listSubfields()).thenReturn(List.of("Economics"));
        when(mapper.listMethods()).thenReturn(List.of("DID"));

        mockMvc.perform(get("/api/knowledge/causal-graph/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.overview.totalClaimRecords").value(3));

        when(mapper.findOverview(3)).thenReturn(overview(4));

        mockMvc.perform(get("/api/knowledge/causal-graph/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.overview.totalClaimRecords").value(3));
    }

    @Test
    void fieldsKeepTheirFirstResultAfterCausalDataChanges() throws Exception {
        when(mapper.listFields(200)).thenReturn(List.of(field("Economics")));

        mockMvc.perform(get("/api/knowledge/causal-graph/fields"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].subfield").value("Economics"));

        when(mapper.listFields(200)).thenReturn(List.of(field("Economics"), field("Public Health")));

        mockMvc.perform(get("/api/knowledge/causal-graph/fields"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].subfield").value("Economics"));
    }

    private CausalOverviewRow overview(long totalClaimRecords) {
        CausalOverviewRow row = new CausalOverviewRow();
        row.setTotalClaimRecords(totalClaimRecords);
        return row;
    }

    private CausalFieldRow field(String subfield) {
        CausalFieldRow row = new CausalFieldRow();
        row.setSubfield(subfield);
        return row;
    }
}
