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
    "DROP TABLE IF EXISTS block",
    "DROP TABLE IF EXISTS original_file_job",
    "DROP TABLE IF EXISTS original_file",
    "DROP TABLE IF EXISTS work_source",
    "DROP TABLE IF EXISTS work",
    "DROP TABLE IF EXISTS source",
    "CREATE TABLE source (source_id varchar(255) PRIMARY KEY, source_name varchar(1000), provider varchar(1000))",
    "CREATE TABLE work (work_id varchar(255) PRIMARY KEY)",
    "CREATE TABLE work_source (work_id varchar(255), source_id varchar(255))",
    "CREATE TABLE original_file (file_id varchar(255) PRIMARY KEY, source_id varchar(255), deleted_at timestamp with time zone)",
    "CREATE TABLE original_file_job (file_id varchar(255) PRIMARY KEY, flag_match int, matched_work_id varchar(255), flag_text int, flag_block int)",
    "CREATE TABLE block (block_id varchar(32) PRIMARY KEY, file_id varchar(255), block_type varchar(50), block_text text, pdf_page int, pdf_bbox json, block_seq int, parent_title_block_id varchar(32), title_level int)",
    "INSERT INTO source (source_id, source_name, provider) VALUES ('S1', 'Source One', 'Publisher A')",
    "INSERT INTO source (source_id, source_name, provider) VALUES ('S2', 'Source Two', 'Publisher B')",
    "INSERT INTO work (work_id) VALUES ('W1')",
    "INSERT INTO work (work_id) VALUES ('W2')",
    "INSERT INTO work (work_id) VALUES ('W3')",
    "INSERT INTO work_source (work_id, source_id) VALUES ('W1', 'S1')",
    "INSERT INTO work_source (work_id, source_id) VALUES ('W2', 'S1')",
    "INSERT INTO work_source (work_id, source_id) VALUES ('W3', 'S2')",
    "INSERT INTO original_file (file_id, source_id) VALUES ('F1', 'S1')",
    "INSERT INTO original_file (file_id, source_id) VALUES ('F2', 'S1')",
    "INSERT INTO original_file (file_id, source_id) VALUES ('F3', 'S1')",
    "INSERT INTO original_file (file_id, source_id) VALUES ('F4', 'S2')",
    "INSERT INTO original_file_job (file_id, flag_match, matched_work_id, flag_text, flag_block) VALUES ('F1', 1, 'W1', 2, 1)",
    "INSERT INTO original_file_job (file_id, flag_match, matched_work_id, flag_text, flag_block) VALUES ('F2', 1, 'W2', 2, 0)",
    "INSERT INTO original_file_job (file_id, flag_match, matched_work_id, flag_text, flag_block) VALUES ('F3', 0, NULL, -1, 0)",
    "INSERT INTO original_file_job (file_id, flag_match, matched_work_id, flag_text, flag_block) VALUES ('F4', 0, NULL, 0, 0)",
    "INSERT INTO block (block_id, file_id, block_type, block_text, pdf_page, pdf_bbox, block_seq, parent_title_block_id, title_level) VALUES ('B1', 'F1', 'text', 'ready', 0, NULL, 0, NULL, NULL)"
})
class TaskStatusControllerIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void returnsTaskStatusTotalsAndPerSourceProgress() throws Exception {
        mockMvc.perform(get("/api/task-status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totals.sourceCount").value(2))
                .andExpect(jsonPath("$.totals.workCount").value(3))
                .andExpect(jsonPath("$.totals.originalFileCount").value(4))
                .andExpect(jsonPath("$.totals.matchedWorkCount").value(2))
                .andExpect(jsonPath("$.totals.parsedFileCount").value(2))
                .andExpect(jsonPath("$.totals.blockImportedFileCount").value(1))
                .andExpect(jsonPath("$.sources[0].sourceId").value("S1"))
                .andExpect(jsonPath("$.sources[0].sourceName").value("Source One"))
                .andExpect(jsonPath("$.sources[0].workCount").value(2))
                .andExpect(jsonPath("$.sources[0].originalFileCount").value(3))
                .andExpect(jsonPath("$.sources[0].matchedWorkCount").value(2))
                .andExpect(jsonPath("$.sources[0].parsedFileCount").value(2))
                .andExpect(jsonPath("$.sources[0].blockImportedFileCount").value(1))
                .andExpect(jsonPath("$.sources[1].sourceId").value("S2"))
                .andExpect(jsonPath("$.sources[1].workCount").value(1))
                .andExpect(jsonPath("$.sources[1].originalFileCount").value(1))
                .andExpect(jsonPath("$.sources[1].matchedWorkCount").value(0))
                .andExpect(jsonPath("$.sources[1].parsedFileCount").value(0))
                .andExpect(jsonPath("$.sources[1].blockImportedFileCount").value(0));
    }
}
