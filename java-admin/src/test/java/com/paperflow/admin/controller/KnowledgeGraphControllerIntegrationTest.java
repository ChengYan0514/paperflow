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
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(classes = PaperflowAdminApplication.class)
@AutoConfigureMockMvc
@WithMockUser(username = "admin", roles = "ADMIN")
@Sql(statements = {
    "DROP TABLE IF EXISTS work_topic",
    "DROP TABLE IF EXISTS paper_claim_table",
    "DROP TABLE IF EXISTS claim_table",
    "CREATE TABLE claim_table (claim_id bigint PRIMARY KEY, cause_standard varchar(255), effect_standard varchar(255))",
    "CREATE TABLE paper_claim_table (record_id bigint PRIMARY KEY, claim_id bigint, paper_id varchar(255), causal_inference_method varchar(255), sign_of_impact varchar(255))",
    "CREATE TABLE work_topic (work_id varchar(255), subfield_name varchar(255), topic_name varchar(255))",
    "INSERT INTO claim_table (claim_id, cause_standard, effect_standard) VALUES (1, 'Education', 'Income')",
    "INSERT INTO paper_claim_table (record_id, claim_id, paper_id, causal_inference_method, sign_of_impact) VALUES (1, 1, 'W1', 'DID', 'positive')",
    "INSERT INTO paper_claim_table (record_id, claim_id, paper_id, causal_inference_method, sign_of_impact) VALUES (2, 1, 'W2', 'DID', 'positive')",
    "INSERT INTO paper_claim_table (record_id, claim_id, paper_id, causal_inference_method, sign_of_impact) VALUES (3, 1, 'W3', 'DID', 'positive')"
})
class KnowledgeGraphControllerIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

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
}
