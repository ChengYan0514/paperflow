package com.paperflow.admin.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.paperflow.admin.PaperflowAdminApplication;
import com.paperflow.admin.mapper.OpenAlexSourceMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(classes = PaperflowAdminApplication.class)
@AutoConfigureMockMvc
@Sql(statements = {
    "DROP TABLE IF EXISTS openalex_journal_import_task",
    "DROP TABLE IF EXISTS openalex_source_search",
    "DROP TABLE IF EXISTS sources",
    AdminAuthTestSupport.DROP_ADMIN_USER_TABLE,
    AdminAuthTestSupport.CREATE_ADMIN_USER_TABLE,
    "CREATE TABLE sources (id varchar(255) PRIMARY KEY, issn_l varchar(32), issn varchar, display_name varchar(1000), publisher varchar(1000), works_count int, cited_by_count int, is_oa boolean, is_in_doaj boolean, homepage_url varchar(2000), updated_date timestamp)",
    "CREATE TABLE openalex_source_search (source_id varchar(255) PRIMARY KEY, display_name varchar(1000) NOT NULL, publisher varchar(1000), issn_l varchar(32), issn varchar, works_count int, cited_by_count int, is_oa boolean, is_in_doaj boolean, homepage_url varchar(2000), source_updated_at timestamp, synced_at timestamp with time zone NOT NULL DEFAULT now())",
    "CREATE TABLE openalex_journal_import_task (task_id varchar(64) PRIMARY KEY, source_id varchar(255) NOT NULL, year_from int, year_to int, status varchar(16) NOT NULL, created_by bigint, retry_of_task_id varchar(64), worker_id varchar(255), lease_expires_at timestamp with time zone, last_heartbeat_at timestamp with time zone, attempt_count int NOT NULL DEFAULT 0, progress_current int NOT NULL DEFAULT 0, progress_total int NOT NULL DEFAULT 0, progress_message varchar(1000), result varchar, error_code varchar(80), error_message varchar(2000), created_at timestamp with time zone NOT NULL DEFAULT now(), started_at timestamp with time zone, finished_at timestamp with time zone)",
    "CREATE UNIQUE INDEX uq_openalex_journal_import_task_active_source ON openalex_journal_import_task(source_id, status)",
    "INSERT INTO sources (id, display_name) VALUES ('S1', 'Source One')",
    "INSERT INTO sources (id, display_name) VALUES ('S2', 'Source Two')",
    "INSERT INTO admin_user (username, username_normalized, password_hash, display_name, role, enabled) VALUES ('admin', 'admin', '" + AdminAuthTestSupport.ADMIN_PASSWORD_HASH + "', 'Admin', 'ADMIN', TRUE)",
    "INSERT INTO admin_user (username, username_normalized, password_hash, display_name, role, enabled) VALUES ('super', 'super', '" + AdminAuthTestSupport.ADMIN_PASSWORD_HASH + "', 'Super', 'SUPER_ADMIN', TRUE)",
    "INSERT INTO admin_user (username, username_normalized, password_hash, display_name, role, enabled) VALUES ('reader', 'reader', '" + AdminAuthTestSupport.OLD_PASSWORD_HASH + "', 'Reader', 'USER', TRUE)"
})
class OpenAlexJournalImportControllerIntegrationTest extends AdminAuthTestSupport {
    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private OpenAlexSourceMapper openAlexSourceMapper;
    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void queuesJournalImportAndListsIt() throws Exception {
        LoginSession login = login(mockMvc, "admin", "correct-password-1");

        mockMvc.perform(post("/api/openalex/journal-imports")
                        .session(login.session())
                        .cookie(login.csrfCookie())
                        .header("X-XSRF-TOKEN", login.csrfCookie().getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sourceId\":\"S1\",\"yearFrom\":2020,\"yearTo\":2024}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sourceId").value("S1"))
                .andExpect(jsonPath("$.status").value("QUEUED"))
                .andExpect(jsonPath("$.yearFrom").value(2020));

        mockMvc.perform(get("/api/openalex/journal-imports").session(login.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].sourceId").value("S1"));
    }

    @Test
    void acceptsAnyExistingSourceAndRejectsDuplicateActiveImport() throws Exception {
        LoginSession login = login(mockMvc, "admin", "correct-password-1");
        var request = post("/api/openalex/journal-imports")
                .session(login.session())
                .cookie(login.csrfCookie())
                .header("X-XSRF-TOKEN", login.csrfCookie().getValue())
                .contentType(MediaType.APPLICATION_JSON);

        mockMvc.perform(request.content("{\"sourceId\":\"S2\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sourceId").value("S2"));

        mockMvc.perform(request.content("{\"sourceId\":\"S1\"}")).andExpect(status().isCreated());
        mockMvc.perform(request.content("{\"sourceId\":\"S1\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("OPENALEX_JOURNAL_IMPORT_CONFLICT"));
    }

    @Test
    void preventsReaderFromCreatingJournalImport() throws Exception {
        LoginSession login = login(mockMvc, "reader", "old-password-1");
        mockMvc.perform(post("/api/openalex/journal-imports")
                        .session(login.session())
                        .cookie(login.csrfCookie())
                        .header("X-XSRF-TOKEN", login.csrfCookie().getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sourceId\":\"S1\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void readsAllSourcesWhenOpenAlexSchemaHasNoTypeColumn() {
        org.junit.jupiter.api.Assertions.assertEquals(2, openAlexSourceMapper.listBatch(10, 0).size());
    }

    @Test
    void searchesTheRestoredSourceSnapshot() throws Exception {
        jdbcTemplate.update(
                "INSERT INTO openalex_source_search (source_id, display_name, issn) VALUES (?, ?, ?)",
                "S137773608", "Nature", "[\"0028-0836\"]");
        LoginSession login = login(mockMvc, "admin", "correct-password-1");

        mockMvc.perform(get("/api/openalex/source-search").param("q", "nature").session(login.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].sourceId").value("S137773608"))
                .andExpect(jsonPath("$[0].displayName").value("Nature"));
    }
}
