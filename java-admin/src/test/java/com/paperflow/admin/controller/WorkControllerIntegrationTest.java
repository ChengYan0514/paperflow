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
    "DROP TABLE IF EXISTS block_reference",
    "DROP TABLE IF EXISTS block_footnote",
    "DROP TABLE IF EXISTS block_equation",
    "DROP TABLE IF EXISTS block_table",
    "DROP TABLE IF EXISTS block_image",
    "DROP TABLE IF EXISTS block",
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
    "CREATE TABLE block (block_id varchar(32) PRIMARY KEY, file_id varchar(255), block_type varchar(50), block_text text, pdf_page int, pdf_bbox json, block_seq int, parent_title_block_id varchar(32), title_level int)",
    "CREATE TABLE block_image (block_id varchar(32) PRIMARY KEY, image_path varchar(1000), image_caption text, image_footnote text)",
    "CREATE TABLE block_table (block_id varchar(32) PRIMARY KEY, image_path varchar(1000), table_caption text, table_footnote text)",
    "CREATE TABLE block_equation (block_id varchar(32) PRIMARY KEY, image_path text, format varchar(20))",
    "CREATE TABLE block_footnote (block_id varchar(32) PRIMARY KEY, footnote_label varchar(50), footnote_text text)",
    "CREATE TABLE block_reference (block_id varchar(32), reference_seq int, reference_text text)",
    "INSERT INTO source (source_id, source_name, provider) VALUES ('S1', 'Source One', 'Publisher A')",
    "INSERT INTO source (source_id, source_name, provider) VALUES ('S2', 'Source Two', 'Publisher B')",
    "INSERT INTO work (work_id, doi, title, publication_year, publication_date, type, language) VALUES ('W1', '10.1000/one', 'Alpha Work', 2024, '2024-01-01', 'article', 'en')",
    "INSERT INTO work (work_id, doi, title, publication_year, publication_date, type, language) VALUES ('W2', '10.1000/two', 'Beta Work', 2023, '2023-01-01', 'article', 'en')",
    "INSERT INTO work (work_id, doi, title, publication_year, publication_date, type, language) VALUES ('W3', '10.1000/three', 'Gamma Work', NULL, NULL, 'review', 'zh')",
    "INSERT INTO work_source (work_id, source_id) VALUES ('W1', 'S1')",
    "INSERT INTO work_source (work_id, source_id) VALUES ('W1', 'S2')",
    "INSERT INTO work_source (work_id, source_id) VALUES ('W2', 'S1')",
    "INSERT INTO work_source (work_id, source_id) VALUES ('W3', 'S2')",
    "INSERT INTO work_author (work_id, author_id, author_name, author_position) VALUES ('W1', 'A1', 'Ada', 'first')",
    "INSERT INTO work_author (work_id, author_id, author_name, author_position) VALUES ('W1', 'A2', 'Bob', 'last')",
    "INSERT INTO work_author (work_id, author_id, author_name, author_position) VALUES ('W2', 'A3', 'Cara', 'first')",
    "INSERT INTO original_file (file_id, source_id, year, paper_title, authors, doi, url, provider, original_file_name, original_file_path, original_file_type, file_size) VALUES ('F1', 'S1', 2024, 'Alpha File', 'Ada;Bob', '10.1000/one', 'https://example.test/one', 'springer', 'F1.pdf', 'openalex/original/S1/F1.pdf', 'PDF', 100)",
    "INSERT INTO original_file (file_id, source_id, year, paper_title, authors, doi, url, provider, original_file_name, original_file_path, original_file_type, file_size) VALUES ('F2', 'S1', 2023, 'Beta File', 'Cara', '10.1000/two', 'https://example.test/two', 'springer', 'F2.pdf', 'openalex/original/S1/F2.pdf', 'PDF', 90)",
    "INSERT INTO original_file_job (file_id, flag_match, matched_work_id, flag_text, flag_block) VALUES ('F1', 1, 'W1', 2, 1)",
    "INSERT INTO original_file_job (file_id, flag_match, matched_work_id, flag_text, flag_block) VALUES ('F2', 1, 'W2', -1, 0)",
    "INSERT INTO text_file (file_id, file_type, file_name, file_path, file_size) VALUES ('F1', 'JSON', 'F1.json', 'openalex/parsed/S1/F1/F1.json', 200)",
    "INSERT INTO text_file (file_id, file_type, file_name, file_path, file_size) VALUES ('F1', 'MD', 'F1.md', 'openalex/parsed/S1/F1/F1.md', 120)",
    "INSERT INTO block (block_id, file_id, block_type, block_text, pdf_page, pdf_bbox, block_seq, parent_title_block_id, title_level) VALUES ('B1', 'F1', 'text', 'Intro text', 0, '{\"x\":1,\"y\":2}', 0, NULL, NULL)",
    "INSERT INTO block (block_id, file_id, block_type, block_text, pdf_page, pdf_bbox, block_seq, parent_title_block_id, title_level) VALUES ('B2', 'F1', 'image', NULL, 1, NULL, 1, NULL, NULL)",
    "INSERT INTO block (block_id, file_id, block_type, block_text, pdf_page, pdf_bbox, block_seq, parent_title_block_id, title_level) VALUES ('B3', 'F1', 'discarded', 'Discarded text', 2, NULL, 2, NULL, NULL)",
    "INSERT INTO block_image (block_id, image_path, image_caption, image_footnote) VALUES ('B2', 'openalex/parsed/S1/F1/images/1.png', 'Figure 1', 'Image footnote')",
    "INSERT INTO block_reference (block_id, reference_seq, reference_text) VALUES ('B1', 0, 'Ref A')",
    "INSERT INTO block_reference (block_id, reference_seq, reference_text) VALUES ('B1', 1, 'Ref B')"
})
class WorkControllerIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void listsWorksWithDatabaseBackedStatusAndSources() throws Exception {
        mockMvc.perform(get("/api/works").param("page", "1").param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(2))
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.items[0].workId").value("W1"))
                .andExpect(jsonPath("$.items[0].sourceIds[0]").value("S1"))
                .andExpect(jsonPath("$.items[0].sourceIds[1]").value("S2"))
                .andExpect(jsonPath("$.items[0].sourceNames").value("Source One, Source Two"))
                .andExpect(jsonPath("$.items[0].sources[0].sourceName").value("Source One"))
                .andExpect(jsonPath("$.items[0].sources[1].sourceName").value("Source Two"))
                .andExpect(jsonPath("$.items[0].processingStatus").value("READY"))
                .andExpect(jsonPath("$.items[0].matchedFileId").value("F1"))
                .andExpect(jsonPath("$.items[1].workId").value("W2"))
                .andExpect(jsonPath("$.items[1].processingStatus").value("PARSE_FAILED"));
    }

    @Test
    void filtersWorksBySourceAndProcessingStatus() throws Exception {
        mockMvc.perform(get("/api/works")
                        .param("sourceId", "S1")
                        .param("processingStatus", "NO_MATCHED_FILE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void parsedFilterIncludesReadyWorks() throws Exception {
        mockMvc.perform(get("/api/works").param("sourceId", "S1").param("processingStatus", "PARSED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].workId").value("W1"))
                .andExpect(jsonPath("$.items[0].processingStatus").value("READY"));
    }

    @Test
    void matchedFilterIncludesReadyWorks() throws Exception {
        mockMvc.perform(get("/api/works").param("sourceId", "S1").param("processingStatus", "MATCHED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.items[0].workId").value("W1"))
                .andExpect(jsonPath("$.items[0].processingStatus").value("READY"));
    }

    @Test
    void filtersWorksByManagementFieldsAndNormalizesDoiUrl() throws Exception {
        mockMvc.perform(get("/api/works")
                        .param("workId", "W2")
                        .param("sourceName", "one")
                        .param("authorName", "cara")
                        .param("type", "ARTICLE")
                        .param("language", "EN")
                        .param("matchedFileId", "F2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].workId").value("W2"));

        mockMvc.perform(get("/api/works").param("doi", " https://doi.org/10.1000/TWO "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].workId").value("W2"));
    }

    @Test
    void sortsWorksByWhitelistedSortsAndRejectsUnknownSort() throws Exception {
        mockMvc.perform(get("/api/works").param("sort", "publicationYearAsc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].workId").value("W2"))
                .andExpect(jsonPath("$.items[1].workId").value("W1"))
                .andExpect(jsonPath("$.items[2].workId").value("W3"));

        mockMvc.perform(get("/api/works").param("sort", "titleAsc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].workId").value("W1"))
                .andExpect(jsonPath("$.items[1].workId").value("W2"))
                .andExpect(jsonPath("$.items[2].workId").value("W3"));

        mockMvc.perform(get("/api/works").param("sort", "workIdAsc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].workId").value("W1"))
                .andExpect(jsonPath("$.items[1].workId").value("W2"))
                .andExpect(jsonPath("$.items[2].workId").value("W3"));

        mockMvc.perform(get("/api/works").param("sort", "statusIssueFirst"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].workId").value("W2"));

        mockMvc.perform(get("/api/works").param("sort", "statusReadyFirst"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].workId").value("W1"));

        mockMvc.perform(get("/api/works").param("sort", "unknownSort"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void returnsWorkDetailWithMatchedFileAndTextFiles() throws Exception {
        mockMvc.perform(get("/api/works/W1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.work.workId").value("W1"))
                .andExpect(jsonPath("$.work.title").value("Alpha Work"))
                .andExpect(jsonPath("$.sources[0].sourceId").value("S1"))
                .andExpect(jsonPath("$.sources[1].sourceId").value("S2"))
                .andExpect(jsonPath("$.authors[0].authorId").value("A1"))
                .andExpect(jsonPath("$.authors[1].authorId").value("A2"))
                .andExpect(jsonPath("$.matchedFile.fileId").value("F1"))
                .andExpect(jsonPath("$.matchedFile.originalFilePath").value("openalex/original/S1/F1.pdf"))
                .andExpect(jsonPath("$.matchedFile.originalFileUrl").value("/api/assets/openalex/original/S1/F1.pdf"))
                .andExpect(jsonPath("$.matchedFile.flagText").value(2))
                .andExpect(jsonPath("$.matchedFile.flagBlock").value(1))
                .andExpect(jsonPath("$.matchedFile.textFiles[0].fileType").value("JSON"))
                .andExpect(jsonPath("$.matchedFile.textFiles[1].fileType").value("MD"))
                .andExpect(jsonPath("$.processingStatus").value("READY"));
    }

    @Test
    void listsWorkBlocksWithDatabaseBackedExtensions() throws Exception {
        mockMvc.perform(get("/api/works/W1/blocks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(100))
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.items[0].blockId").value("B1"))
                .andExpect(jsonPath("$.items[0].blockText").value("Intro text"))
                .andExpect(jsonPath("$.items[0].pdfBbox.x").value(1))
                .andExpect(jsonPath("$.items[0].references[0]").value("Ref A"))
                .andExpect(jsonPath("$.items[0].references[1]").value("Ref B"))
                .andExpect(jsonPath("$.items[1].blockId").value("B2"))
                .andExpect(jsonPath("$.items[1].imagePath").value("openalex/parsed/S1/F1/images/1.png"))
                .andExpect(jsonPath("$.items[1].imageUrl").value("/api/assets/openalex/parsed/S1/F1/images/1.png"))
                .andExpect(jsonPath("$.items[1].imageCaption").value("Figure 1"));
    }

    @Test
    void includesDiscardedWorkBlocksWhenRequested() throws Exception {
        mockMvc.perform(get("/api/works/W1/blocks").param("includeDiscarded", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.items[2].blockId").value("B3"))
                .andExpect(jsonPath("$.items[2].blockType").value("discarded"));
    }

    @Test
    void exportsFilteredWorksAsCsvWithChineseStatus() throws Exception {
        mockMvc.perform(get("/api/works/export").param("processingStatus", "PARSE_FAILED"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("text/csv;charset=UTF-8"))
                .andExpect(content().string(containsString("论文ID,标题,DOI")))
                .andExpect(content().string(containsString("W2,Beta Work,10.1000/two")))
                .andExpect(content().string(containsString("解析失败")));
    }
}
