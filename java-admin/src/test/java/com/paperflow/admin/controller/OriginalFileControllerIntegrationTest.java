package com.paperflow.admin.controller;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
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
    "DROP TABLE IF EXISTS text_file",
    "DROP TABLE IF EXISTS block_reference",
    "DROP TABLE IF EXISTS block_footnote",
    "DROP TABLE IF EXISTS block_equation",
    "DROP TABLE IF EXISTS block_table",
    "DROP TABLE IF EXISTS block_image",
    "DROP TABLE IF EXISTS block",
    "DROP TABLE IF EXISTS original_file_job",
    "DROP TABLE IF EXISTS original_file",
    "DROP TABLE IF EXISTS source",
    "CREATE TABLE source (source_id varchar(255) PRIMARY KEY, source_name varchar(1000), provider varchar(1000))",
    "CREATE TABLE original_file (file_id varchar(255) PRIMARY KEY, source_id varchar(255), year int, paper_title varchar(2000), authors varchar(2000), doi varchar(500), url varchar(2000), provider varchar(255), original_file_name varchar(255), original_file_path varchar(1000), original_file_type varchar(10), file_size bigint)",
    "CREATE TABLE original_file_job (file_id varchar(255) PRIMARY KEY, flag_match int, matched_work_id varchar(255), flag_text int, flag_block int)",
    "CREATE TABLE text_file (file_id varchar(255), file_type varchar(10), file_name varchar(255), file_path varchar(1000), file_size bigint)",
    "CREATE TABLE block (block_id varchar(32) PRIMARY KEY, file_id varchar(255), block_type varchar(50), block_text text, pdf_page int, pdf_bbox json, block_seq int, parent_title_block_id varchar(32), title_level int)",
    "CREATE TABLE block_image (block_id varchar(32) PRIMARY KEY, image_path varchar(1000), image_caption text, image_footnote text)",
    "CREATE TABLE block_table (block_id varchar(32) PRIMARY KEY, image_path varchar(1000), table_caption text, table_footnote text)",
    "CREATE TABLE block_equation (block_id varchar(32) PRIMARY KEY, image_path text, format varchar(20))",
    "CREATE TABLE block_footnote (block_id varchar(32) PRIMARY KEY, footnote_label varchar(50), footnote_text text)",
    "CREATE TABLE block_reference (block_id varchar(32), reference_seq int, reference_text text)",
    "INSERT INTO source (source_id, source_name, provider) VALUES ('S1', 'Source One', 'Publisher A')",
    "INSERT INTO source (source_id, source_name, provider) VALUES ('S2', 'Source Two', 'Publisher B')",
    "INSERT INTO original_file (file_id, source_id, year, paper_title, authors, doi, url, provider, original_file_name, original_file_path, original_file_type, file_size) VALUES ('F1', 'S1', 2024, 'Alpha File', 'Ada;Bob', '10.1000/one', 'https://example.test/one', 'springer', 'F1.pdf', 'openalex/original/S1/F1.pdf', 'PDF', 100)",
    "INSERT INTO original_file (file_id, source_id, year, paper_title, authors, doi, url, provider, original_file_name, original_file_path, original_file_type, file_size) VALUES ('F2', 'S1', 2023, 'Beta File', 'Cyd', '10.1000/two', NULL, 'springer', 'F2.xml', 'openalex/original/S1/F2.xml', 'XML', 80)",
    "INSERT INTO original_file (file_id, source_id, year, paper_title, authors, doi, url, provider, original_file_name, original_file_path, original_file_type, file_size) VALUES ('F3', 'S2', 2022, 'Gamma File', 'Dee', NULL, NULL, 'elsevier', 'F3.pdf', 'openalex/original/S2/F3.pdf', 'PDF', 120)",
    "INSERT INTO original_file_job (file_id, flag_match, matched_work_id, flag_text, flag_block) VALUES ('F1', 1, 'W1', 2, 1)",
    "INSERT INTO original_file_job (file_id, flag_match, matched_work_id, flag_text, flag_block) VALUES ('F2', 0, NULL, -2, 0)",
    "INSERT INTO original_file_job (file_id, flag_match, matched_work_id, flag_text, flag_block) VALUES ('F3', -1, NULL, -1, -1)",
    "INSERT INTO text_file (file_id, file_type, file_name, file_path, file_size) VALUES ('F1', 'JSON', 'F1.json', 'openalex/parsed/S1/F1/F1.json', 200)",
    "INSERT INTO text_file (file_id, file_type, file_name, file_path, file_size) VALUES ('F1', 'MD', 'F1.md', 'openalex/parsed/S1/F1/F1.md', 120)",
    "INSERT INTO text_file (file_id, file_type, file_name, file_path, file_size) VALUES ('F2', 'JSON', 'F2.json', 'openalex/parsed/S1/F2/F2.json', 90)",
    "INSERT INTO block (block_id, file_id, block_type, block_text, pdf_page, pdf_bbox, block_seq, parent_title_block_id, title_level) VALUES ('B21', 'F2', 'title', 'XML title', 0, NULL, 0, NULL, 0)",
    "INSERT INTO block (block_id, file_id, block_type, block_text, pdf_page, pdf_bbox, block_seq, parent_title_block_id, title_level) VALUES ('B22', 'F2', 'text', 'XML body', 0, NULL, 1, 'B21', NULL)"
})
class OriginalFileControllerIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void listsOriginalFilesWithFilters() throws Exception {
        mockMvc.perform(get("/api/original-files")
                        .param("sourceId", "S1")
                        .param("flagText", "-2")
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(10))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].fileId").value("F2"))
                .andExpect(jsonPath("$.items[0].sourceId").value("S1"))
                .andExpect(jsonPath("$.items[0].sourceName").value("Source One"))
                .andExpect(jsonPath("$.items[0].flagText").value(-2))
                .andExpect(jsonPath("$.items[0].textFiles").isArray());
    }

    @Test
    void filtersOriginalFilesByMatchedWorkId() throws Exception {
        mockMvc.perform(get("/api/original-files").param("matchedWorkId", "W1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].fileId").value("F1"))
                .andExpect(jsonPath("$.items[0].matchedWorkId").value("W1"));
    }

    @Test
    void filtersOriginalFilesByManagementFieldsAndRanges() throws Exception {
        mockMvc.perform(get("/api/original-files")
                        .param("fileId", "F3")
                        .param("sourceName", "two")
                        .param("provider", "ELSEVIER")
                        .param("originalFileType", "pdf")
                        .param("yearFrom", "2022")
                        .param("yearTo", "2022"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].fileId").value("F3"));

        mockMvc.perform(get("/api/original-files").param("yearFrom", "2024").param("yearTo", "2023"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void sortsOriginalFilesByWhitelistedSortsAndRejectsUnknownSort() throws Exception {
        mockMvc.perform(get("/api/original-files").param("sort", "yearDesc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].fileId").value("F1"))
                .andExpect(jsonPath("$.items[1].fileId").value("F2"))
                .andExpect(jsonPath("$.items[2].fileId").value("F3"));

        mockMvc.perform(get("/api/original-files").param("sort", "fileSizeAsc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].fileId").value("F2"))
                .andExpect(jsonPath("$.items[1].fileId").value("F1"))
                .andExpect(jsonPath("$.items[2].fileId").value("F3"));

        mockMvc.perform(get("/api/original-files").param("sort", "providerAsc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].fileId").value("F3"));

        mockMvc.perform(get("/api/original-files").param("sort", "textStatusIssueFirst"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].fileId").value("F3"));

        mockMvc.perform(get("/api/original-files").param("sort", "fileIdDesc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void returnsOriginalFileDetailWithTextFiles() throws Exception {
        mockMvc.perform(get("/api/original-files/F1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fileId").value("F1"))
                .andExpect(jsonPath("$.originalFilePath").value("openalex/original/S1/F1.pdf"))
                .andExpect(jsonPath("$.originalFileUrl").value("/api/assets/openalex/original/S1/F1.pdf"))
                .andExpect(jsonPath("$.flagMatch").value(1))
                .andExpect(jsonPath("$.flagText").value(2))
                .andExpect(jsonPath("$.flagBlock").value(1))
                .andExpect(jsonPath("$.textFiles[0].fileType").value("JSON"))
                .andExpect(jsonPath("$.textFiles[1].fileType").value("MD"));
    }

    @Test
    void listsOriginalFileBlocksForParsedXmlFiles() throws Exception {
        mockMvc.perform(get("/api/original-files/F2/blocks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.items[0].blockText").value("XML title"))
                .andExpect(jsonPath("$.items[1].blockText").value("XML body"));
    }

    @Test
    void returnsOriginalFileNotFound() throws Exception {
        mockMvc.perform(get("/api/original-files/missing"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ORIGINAL_FILE_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("Original File not found"));
    }

    @Test
    void rejectsInvalidFlagFilter() throws Exception {
        mockMvc.perform(get("/api/original-files").param("flagText", "99"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void exportsFilteredOriginalFilesAsCsvWithChineseFlagLabels() throws Exception {
        mockMvc.perform(get("/api/original-files/export").param("flagText", "-2"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("text/csv;charset=UTF-8"))
                .andExpect(content().string(containsString("原始文件ID,原始文件名,论文标题")))
                .andExpect(content().string(containsString("F2,F2.xml,Beta File")))
                .andExpect(content().string(containsString("不支持解析")));
    }
}
