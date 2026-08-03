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
    "DROP TABLE IF EXISTS paper_claim_table",
    "DROP TABLE IF EXISTS claim_table",
    "DROP TABLE IF EXISTS text_file",
    "DROP TABLE IF EXISTS original_file_job",
    "DROP TABLE IF EXISTS original_file",
    "DROP TABLE IF EXISTS work_author",
    "DROP TABLE IF EXISTS work_source",
    "DROP TABLE IF EXISTS work",
    "DROP TABLE IF EXISTS source",
    "CREATE TABLE source (source_id varchar(255) PRIMARY KEY, source_name varchar(1000), provider varchar(1000))",
    "CREATE TABLE work (work_id varchar(255) PRIMARY KEY, doi varchar(1000), title varchar(1000), publication_year int, publication_date varchar(255), type varchar(255), language varchar(255))",
    "CREATE TABLE work_source (work_id varchar(255), source_id varchar(255))",
    "CREATE TABLE work_author (work_id varchar(255), author_id varchar(255), author_name varchar(255), author_position varchar(32))",
    "CREATE TABLE original_file (file_id varchar(255) PRIMARY KEY, source_id varchar(255), year int, paper_title varchar(2000), authors varchar(2000), doi varchar(500), url varchar(2000), provider varchar(255), original_file_name varchar(255), original_file_path varchar(1000), original_file_type varchar(10), file_size bigint)",
    "CREATE TABLE original_file_job (file_id varchar(255) PRIMARY KEY, flag_match int, matched_work_id varchar(255), flag_text int, flag_block int)",
    "CREATE TABLE text_file (file_id varchar(255), file_type varchar(10), file_name varchar(255), file_path varchar(1000), file_size bigint)",
    "CREATE TABLE claim_table (claim_id bigint PRIMARY KEY, cause_standard varchar(255), effect_standard varchar(255))",
    "CREATE TABLE paper_claim_table (record_id bigint PRIMARY KEY, paper_id varchar(255), claim_id bigint)",
    "INSERT INTO source (source_id, source_name, provider) VALUES ('S1', 'Source One', 'Publisher A')",
    "INSERT INTO source (source_id, source_name, provider) VALUES ('S2', 'Source Two', 'Publisher B')",
    "INSERT INTO work (work_id, doi, title, publication_year, publication_date, type, language) VALUES ('W1', '10.1000/one', 'Alpha Work', 2024, '2024-01-01', 'article', 'en')",
    "INSERT INTO work_source (work_id, source_id) VALUES ('W1', 'S1')",
    "INSERT INTO work_source (work_id, source_id) VALUES ('W1', 'S2')",
    "INSERT INTO work_author (work_id, author_id, author_name, author_position) VALUES ('W1', 'A1', 'Ada', 'first')",
    "INSERT INTO work_author (work_id, author_id, author_name, author_position) VALUES ('W1', 'A2', 'Bob', 'last')",
    "INSERT INTO original_file (file_id, source_id, year, paper_title, authors, doi, url, provider, original_file_name, original_file_path, original_file_type, file_size) VALUES ('F1', 'S1', 2024, 'Alpha File', 'Ada;Bob', '10.1000/one', 'https://example.test/one', 'springer', 'F1.pdf', 'openalex/original/S1/F1.pdf', 'PDF', 100)",
    "INSERT INTO original_file_job (file_id, flag_match, matched_work_id, flag_text, flag_block) VALUES ('F1', 1, 'W1', 2, 1)",
    "INSERT INTO text_file (file_id, file_type, file_name, file_path, file_size) VALUES ('F1', 'JSON', 'F1.json', 'openalex/parsed/S1/F1/F1.json', 200)",
    "INSERT INTO claim_table (claim_id, cause_standard, effect_standard) VALUES (1, 'Income', 'Health')",
    "INSERT INTO paper_claim_table (record_id, paper_id, claim_id) VALUES (1, 'W1', 1)"
})
class PaperDetailIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void returnsPaperDetailGroupedByOriginalFileJobAndOpenAlexMetadata() throws Exception {
        mockMvc.perform(get("/api/papers/F1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.originalFile.fileId").value("F1"))
                .andExpect(jsonPath("$.originalFile.paperTitle").value("Alpha File"))
                .andExpect(jsonPath("$.originalFile.originalFileUrl")
                        .value("/api/assets/openalex/original/S1/F1.pdf"))
                .andExpect(jsonPath("$.taskStatus.flagMatch").value(1))
                .andExpect(jsonPath("$.taskStatus.flagText").value(2))
                .andExpect(jsonPath("$.taskStatus.flagBlock").value(1))
                .andExpect(jsonPath("$.openAlex.workId").value("W1"))
                .andExpect(jsonPath("$.openAlex.title").value("Alpha Work"))
                .andExpect(jsonPath("$.openAlex.sources[1].sourceName").value("Source Two"))
                .andExpect(jsonPath("$.openAlex.authors[0].authorId").value("A1"))
                .andExpect(jsonPath("$.textFiles[0].fileType").value("JSON"))
                .andExpect(jsonPath("$.causalSummary.workId").value("W1"))
                .andExpect(jsonPath("$.causalSummary.claimRecordCount").value(1))
                .andExpect(jsonPath("$.causalSummary.variableCount").value(2))
                .andExpect(jsonPath("$.causalSummary.hasCausalClaims").value(true));
    }
}
