package com.paperflow.admin.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.paperflow.admin.PaperflowAdminApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(classes = PaperflowAdminApplication.class)
@AutoConfigureMockMvc
@Sql(statements = {
    "DROP TABLE IF EXISTS original_file_job",
    "DROP TABLE IF EXISTS original_file",
    "DROP TABLE IF EXISTS work_source",
    "DROP TABLE IF EXISTS work",
    "DROP TABLE IF EXISTS source",
    "CREATE TABLE source (source_id varchar(255) PRIMARY KEY, source_name varchar(1000), provider varchar(1000))",
    "CREATE TABLE work (work_id varchar(255) PRIMARY KEY)",
    "CREATE TABLE work_source (work_id varchar(255), source_id varchar(255))",
    "CREATE TABLE original_file (file_id varchar(255) PRIMARY KEY, source_id varchar(255))",
    "CREATE TABLE original_file_job (file_id varchar(255) PRIMARY KEY, flag_match int, matched_work_id varchar(255), flag_text int, flag_block int)",
    "INSERT INTO source (source_id, source_name, provider) VALUES ('S1', 'Source One', 'Publisher A')",
    "INSERT INTO source (source_id, source_name, provider) VALUES ('S2', 'Source Two', 'Publisher B')",
    "INSERT INTO source (source_id, source_name, provider) VALUES ('S30', 'Archive Three', 'Provider Match')",
    "INSERT INTO work (work_id) VALUES ('W1')",
    "INSERT INTO work (work_id) VALUES ('W2')",
    "INSERT INTO work (work_id) VALUES ('W3')",
    "INSERT INTO work_source (work_id, source_id) VALUES ('W1', 'S1')",
    "INSERT INTO work_source (work_id, source_id) VALUES ('W2', 'S1')",
    "INSERT INTO work_source (work_id, source_id) VALUES ('W3', 'S2')",
    "INSERT INTO original_file (file_id, source_id) VALUES ('F1', 'S1')",
    "INSERT INTO original_file (file_id, source_id) VALUES ('F2', 'S1')",
    "INSERT INTO original_file (file_id, source_id) VALUES ('F3', 'S1')",
    "INSERT INTO original_file (file_id, source_id) VALUES ('F4', 'S1')",
    "INSERT INTO original_file (file_id, source_id) VALUES ('F5', 'S1')",
    "INSERT INTO original_file (file_id, source_id) VALUES ('F6', 'S2')",
    "INSERT INTO original_file_job (file_id, flag_match, matched_work_id, flag_text, flag_block) VALUES ('F1', 1, 'W1', 2, 1)",
    "INSERT INTO original_file_job (file_id, flag_match, matched_work_id, flag_text, flag_block) VALUES ('F2', 1, 'W2', 2, -1)",
    "INSERT INTO original_file_job (file_id, flag_match, matched_work_id, flag_text, flag_block) VALUES ('F3', 0, NULL, -1, 0)",
    "INSERT INTO original_file_job (file_id, flag_match, matched_work_id, flag_text, flag_block) VALUES ('F4', 0, NULL, -2, 0)",
    "INSERT INTO original_file_job (file_id, flag_match, matched_work_id, flag_text, flag_block) VALUES ('F5', 0, NULL, 0, 0)",
    "INSERT INTO original_file_job (file_id, flag_match, matched_work_id, flag_text, flag_block) VALUES ('F6', 0, NULL, 0, 0)"
})
class SourceControllerIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void listsSourcesWithDatabaseBackedStats() throws Exception {
        mockMvc.perform(get("/api/sources").param("page", "1").param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(1))
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.items[0].sourceId").value("S1"))
                .andExpect(jsonPath("$.items[0].sourceName").value("Source One"))
                .andExpect(jsonPath("$.items[0].provider").value("Publisher A"))
                .andExpect(jsonPath("$.items[0].stats.workCount").value(2))
                .andExpect(jsonPath("$.items[0].stats.originalFileCount").value(5))
                .andExpect(jsonPath("$.items[0].stats.matchedFileCount").value(2))
                .andExpect(jsonPath("$.items[0].stats.parsedFileCount").value(2))
                .andExpect(jsonPath("$.items[0].stats.readyFileCount").value(1))
                .andExpect(jsonPath("$.items[0].stats.parseFailedFileCount").value(1))
                .andExpect(jsonPath("$.items[0].stats.blockFailedFileCount").value(1))
                .andExpect(jsonPath("$.items[0].stats.unsupportedFileCount").value(1));
    }

    @Test
    void returnsOneSourceWithDatabaseBackedStats() throws Exception {
        mockMvc.perform(get("/api/sources/S1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sourceId").value("S1"))
                .andExpect(jsonPath("$.stats.workCount").value(2))
                .andExpect(jsonPath("$.stats.originalFileCount").value(5))
                .andExpect(jsonPath("$.stats.readyFileCount").value(1));
    }

    @Test
    void filtersSourcesBySourceFieldsAndFailures() throws Exception {
        mockMvc.perform(get("/api/sources")
                        .param("provider", "match")
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].sourceId").value("S30"));

        mockMvc.perform(get("/api/sources")
                        .param("sourceId", "s")
                        .param("sourceName", "one")
                        .param("hasFailures", "true")
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].sourceId").value("S1"));
    }

    @Test
    void sortsSourcesByWhitelistedSortsAndRejectsUnknownSort() throws Exception {
        mockMvc.perform(get("/api/sources")
                        .param("sort", "failureCountDesc")
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].sourceId").value("S1"));

        mockMvc.perform(get("/api/sources")
                        .param("sort", "workCountDesc")
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].sourceId").value("S1"))
                .andExpect(jsonPath("$.items[1].sourceId").value("S2"))
                .andExpect(jsonPath("$.items[2].sourceId").value("S30"));

        mockMvc.perform(get("/api/sources").param("sort", "providerAsc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }
}
