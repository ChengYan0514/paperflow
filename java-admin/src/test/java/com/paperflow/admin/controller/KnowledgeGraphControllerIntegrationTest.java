package com.paperflow.admin.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.paperflow.admin.PaperflowAdminApplication;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cache.CacheManager;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(classes = PaperflowAdminApplication.class)
@AutoConfigureMockMvc
@WithMockUser(username = "admin", roles = "ADMIN")
@Sql(statements = {
    "DROP TABLE IF EXISTS work_topic",
    "DROP TABLE IF EXISTS paper_claim_table",
    "DROP TABLE IF EXISTS claim_table",
    "DROP TABLE IF EXISTS stw_label",
    "CREATE TABLE claim_table (claim_id bigint PRIMARY KEY, cause_standard varchar(255), effect_standard varchar(255))",
    "CREATE TABLE paper_claim_table (record_id bigint PRIMARY KEY, claim_id bigint, paper_id varchar(255), causal_inference_method varchar(255), sign_of_impact varchar(255))",
    "CREATE TABLE work_topic (work_id varchar(255), subfield_name varchar(255), topic_name varchar(255))",
    "CREATE TABLE stw_label (id varchar(255), label_en varchar(255))",
    "INSERT INTO claim_table (claim_id, cause_standard, effect_standard) VALUES (1, 'Education', 'Income')",
    "INSERT INTO paper_claim_table (record_id, claim_id, paper_id, causal_inference_method, sign_of_impact) VALUES (1, 1, 'W1', 'DID', 'positive')",
    "INSERT INTO paper_claim_table (record_id, claim_id, paper_id, causal_inference_method, sign_of_impact) VALUES (2, 1, 'W2', 'DID', 'positive')",
    "INSERT INTO paper_claim_table (record_id, claim_id, paper_id, causal_inference_method, sign_of_impact) VALUES (3, 1, 'W3', 'DID', 'positive')",
    "INSERT INTO stw_label (id, label_en) VALUES ('1', 'Consumer surplus')",
    "INSERT INTO stw_label (id, label_en) VALUES ('2', 'Consumer tax')",
    "INSERT INTO stw_label (id, label_en) VALUES ('3', 'Consumption')",
    "INSERT INTO stw_label (id, label_en) VALUES ('4', 'Consumption')",
    "INSERT INTO stw_label (id, label_en) VALUES ('5', 'Energy consumption')"
})
class KnowledgeGraphControllerIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private CacheManager cacheManager;

    @BeforeEach
    void clearCaches() {
        cacheManager.getCacheNames().forEach(name -> cacheManager.getCache(name).clear());
    }

    @Test
    void defaultGraphKeepsItsFirstResultAfterCausalDataChanges() throws Exception {
        insertGraphRecords(1, 4, 17);

        mockMvc.perform(get("/api/knowledge/causal-graph/graph")
                        .param("minRecordCount", "20")
                        .param("minDiversity", "5")
                        .param("maxNodes", "300")
                        .param("maxEdges", "500"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nodes.length()").value(2))
                .andExpect(jsonPath("$.edges.length()").value(1))
                .andExpect(jsonPath("$.edges[0].source").value("Education"));

        jdbcTemplate.update("INSERT INTO claim_table (claim_id, cause_standard, effect_standard) VALUES (2, 'Health', 'Income')");
        insertGraphRecords(2, 21, 21);

        mockMvc.perform(get("/api/knowledge/causal-graph/graph")
                        .param("minRecordCount", "20")
                        .param("minDiversity", "5")
                        .param("maxNodes", "300")
                        .param("maxEdges", "500"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nodes.length()").value(2))
                .andExpect(jsonPath("$.edges.length()").value(1))
                .andExpect(jsonPath("$.edges[0].source").value("Education"));
    }

    @Test
    void filteredGraphReadsCausalDataAfterTheDefaultGraphIsCached() throws Exception {
        insertGraphRecords(1, 4, 17);
        mockMvc.perform(get("/api/knowledge/causal-graph/graph")
                        .param("minRecordCount", "20")
                        .param("minDiversity", "5")
                        .param("maxNodes", "300")
                        .param("maxEdges", "500"))
                .andExpect(status().isOk());

        jdbcTemplate.update("INSERT INTO claim_table (claim_id, cause_standard, effect_standard) VALUES (2, 'Health', 'Income')");
        insertGraphRecords(2, 21, 21);

        mockMvc.perform(get("/api/knowledge/causal-graph/graph")
                        .param("minRecordCount", "21")
                        .param("minDiversity", "5")
                        .param("maxNodes", "300")
                        .param("maxEdges", "500"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nodes.length()").value(2))
                .andExpect(jsonPath("$.edges.length()").value(1))
                .andExpect(jsonPath("$.edges[0].source").value("Health"));
    }

    @Test
    void fieldsReturnTheCompleteFieldAuditItems() throws Exception {
        jdbcTemplate.update("INSERT INTO work_topic (work_id, subfield_name, topic_name) VALUES ('W1', 'Economics', 'Labor')");
        jdbcTemplate.update("INSERT INTO work_topic (work_id, subfield_name, topic_name) VALUES ('W2', 'Economics', 'Labor')");
        jdbcTemplate.update("INSERT INTO work_topic (work_id, subfield_name, topic_name) VALUES ('W3', 'Sociology', 'Networks')");

        mockMvc.perform(get("/api/knowledge/causal-graph/fields"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].subfield").value("Economics"))
                .andExpect(jsonPath("$.items[0].topic").value("Labor"))
                .andExpect(jsonPath("$.items[0].claimRecordCount").value(2))
                .andExpect(jsonPath("$.items[0].paperCount").value(2))
                .andExpect(jsonPath("$.items[0].variableCount").value(2))
                .andExpect(jsonPath("$.insights.topRelations[0].cause").value("Education"))
                .andExpect(jsonPath("$.insights.topRelations[0].effect").value("Income"))
                .andExpect(jsonPath("$.insights.topRelations[0].claimRecordCount").value(3))
                .andExpect(jsonPath("$.insights.topVariables[0].name").value("Education"))
                .andExpect(jsonPath("$.insights.topVariables[0].count").value(3))
                .andExpect(jsonPath("$.insights.methodCounts[0].name").value("DID"))
                .andExpect(jsonPath("$.insights.methodCounts[0].count").value(3));
    }

    @Test
    void fieldsReturnGlobalInsightsForUntaggedRecords() throws Exception {
        mockMvc.perform(get("/api/knowledge/causal-graph/fields"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].subfield").value("未标注"))
                .andExpect(jsonPath("$.insights.topRelations[0].claimRecordCount").value(3))
                .andExpect(jsonPath("$.insights.topVariables[0].count").value(3))
                .andExpect(jsonPath("$.insights.methodCounts[0].count").value(3));
    }

    @Test
    void graphReturnsTheEligibleEdgeWithAccurateCounts() throws Exception {
        mockMvc.perform(get("/api/knowledge/causal-graph/graph")
                        .param("maxNodes", "2")
                        .param("maxEdges", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nodes.length()").value(2))
                .andExpect(jsonPath("$.edges.length()").value(1))
                .andExpect(jsonPath("$.edges[0].source").value("Education"))
                .andExpect(jsonPath("$.edges[0].target").value("Income"))
                .andExpect(jsonPath("$.edges[0].recordCount").value(3))
                .andExpect(jsonPath("$.edges[0].paperCount").value(3))
                .andExpect(jsonPath("$.edges[0].signBreakdown.positive").value(3));
    }

    @Test
    void termSearchUsesDistinctStwLabelsWithPrefixPriorityAndLimit() throws Exception {
        mockMvc.perform(get("/api/knowledge/causal-graph/search/terms")
                        .param("q", "CONSU")
                        .param("limit", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0]").value("Consumer surplus"))
                .andExpect(jsonPath("$[1]").value("Consumer tax"))
                .andExpect(jsonPath("$[2]").value("Consumption"));
    }

    @Test
    void termSearchRejectsBlankQuery() throws Exception {
        mockMvc.perform(get("/api/knowledge/causal-graph/search/terms").param("q", " "))
                .andExpect(status().isBadRequest());
    }

    private void insertGraphRecords(long claimId, int firstRecordId, int count) {
        List<String> methods = List.of("DID", "RDD", "IV", "RCT", "Matching");
        for (int recordId = firstRecordId; recordId < firstRecordId + count; recordId++) {
            jdbcTemplate.update(
                    "INSERT INTO paper_claim_table (record_id, claim_id, paper_id, causal_inference_method, sign_of_impact) VALUES (?, ?, ?, ?, 'positive')",
                    recordId,
                    claimId,
                    "W" + recordId,
                    methods.get((recordId - firstRecordId) % methods.size()));
        }
    }
}
