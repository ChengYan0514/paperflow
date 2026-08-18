package com.paperflow.admin.controller;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.paperflow.admin.PaperflowAdminApplication;
import com.paperflow.admin.dto.AdminRole;
import com.paperflow.admin.mapper.OpenAlexSourceMapper;
import com.paperflow.admin.model.OpenAlexSourceRow;
import com.paperflow.admin.service.AdminUserPrincipal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
        classes = PaperflowAdminApplication.class,
        properties = "paperflow.api.data-root=target/test-data/paper-write")
@AutoConfigureMockMvc
@Sql(statements = {
    "DROP TABLE IF EXISTS original_file_version",
    "DROP TABLE IF EXISTS original_file_job",
    "DROP TABLE IF EXISTS original_file",
    "DROP TABLE IF EXISTS source",
    "CREATE TABLE source (source_id varchar(255) PRIMARY KEY, source_name varchar(1000), provider varchar(1000), flag_collect smallint not null)",
    "CREATE TABLE original_file (file_id varchar(255) PRIMARY KEY, source_id varchar(255) NOT NULL, year int, paper_title varchar(2000), authors varchar(2000), doi varchar(500), url varchar(2000), provider varchar(255), original_file_name varchar(255), original_file_path varchar(1000), original_file_type varchar(10), file_size bigint, created_at timestamp with time zone, created_by bigint, updated_at timestamp with time zone, updated_by bigint, deleted_at timestamp with time zone, deleted_by bigint, delete_reason varchar(500), record_version bigint default 0, current_version int default 1)",
    "CREATE TABLE original_file_job (file_id varchar(255) PRIMARY KEY, flag_match smallint, matched_work_id varchar(255), flag_text smallint, flag_block smallint, flag_vector smallint)",
    "CREATE TABLE original_file_version (file_id varchar(255), version_no int, file_name varchar(255), file_path varchar(1000), file_type varchar(10), file_size bigint, uploaded_by bigint, uploaded_at timestamp with time zone default now(), is_current boolean, PRIMARY KEY(file_id, version_no))"
})
class PaperWriteControllerIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired JdbcTemplate jdbcTemplate;
    @MockBean OpenAlexSourceMapper openAlexSourceMapper;

    @BeforeEach
    void prepare() throws Exception {
        Path root = Path.of("target/test-data/paper-write");
        if (Files.exists(root)) {
            try (var paths = Files.walk(root)) {
                paths.sorted(java.util.Comparator.reverseOrder()).forEach(path -> {
                    try { Files.deleteIfExists(path); } catch (Exception ignored) { }
                });
            }
        }
        OpenAlexSourceRow source = new OpenAlexSourceRow();
        source.setSourceId("S123");
        source.setDisplayName("Journal of Tests");
        source.setPublisher("Test Publisher");
        source.setIssn("[]");
        when(openAlexSourceMapper.findById("S123")).thenReturn(source);
    }

    @Test
    void createsSinglePaperFileAndRejectsDuplicateMetadata() throws Exception {
        MockMultipartFile metadata = new MockMultipartFile(
                "metadata", "", "application/json",
                """
                {"sourceId":"S123","year":2024,"paperTitle":"A Test Paper","authors":["Alice","Bob"],"doi":"10.1/TEST"}
                """.getBytes());
        MockMultipartFile file = new MockMultipartFile(
                "file", "user-name.pdf", "application/pdf", "%PDF-1.7\ntest".getBytes());

        String fileId = "38f763c526f4293f8d6ee2f253e9f5d9fb70f809720d7cd077b5656843a0ebd3";
        mockMvc.perform(multipart("/api/papers")
                        .file(metadata).file(file).with(csrf()).with(authentication(authToken())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fileId").value(fileId))
                .andExpect(jsonPath("$.recordVersion").value(0));

        assertEquals(1, jdbcTemplate.queryForObject("SELECT COUNT(*) FROM original_file", Integer.class));
        assertEquals(fileId + ".pdf", jdbcTemplate.queryForObject(
                "SELECT original_file_name FROM original_file WHERE file_id=?", String.class, fileId));
        assertEquals("Test Publisher", jdbcTemplate.queryForObject(
                "SELECT provider FROM original_file WHERE file_id=?", String.class, fileId));
        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT flag_text FROM original_file_job WHERE file_id=?", Integer.class, fileId));
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM original_file_version WHERE file_id=?", Integer.class, fileId));

        mockMvc.perform(multipart("/api/papers")
                        .file(metadata).file(file).with(csrf()).with(authentication(authToken())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PAPER_ALREADY_EXISTS"));
    }

    @Test
    void preservesExplicitProviderInsteadOfInheritingSourceProvider() throws Exception {
        MockMultipartFile metadata = new MockMultipartFile(
                "metadata", "", "application/json",
                """
                {"sourceId":"S123","year":2024,"paperTitle":"Explicit Provider Paper","authors":["Alice"],"provider":"Custom Provider"}
                """.getBytes());
        MockMultipartFile file = new MockMultipartFile(
                "file", "explicit.pdf", "application/pdf", "%PDF-1.7\ntest".getBytes());

        mockMvc.perform(multipart("/api/papers")
                        .file(metadata).file(file).with(csrf()).with(authentication(authToken())))
                .andExpect(status().isCreated());

        assertEquals("Custom Provider", jdbcTemplate.queryForObject(
                "SELECT provider FROM original_file WHERE paper_title=?", String.class, "Explicit Provider Paper"));
    }

    @Test
    void reportsThatDirectlyRequestedSoftDeletedPaperIsInTrash() throws Exception {
        jdbcTemplate.update(
                "INSERT INTO original_file (file_id, source_id, original_file_name, original_file_path, original_file_type, file_size, deleted_at) VALUES ('deleted-paper', 'S123', 'deleted-paper.pdf', 'paperflow/trash/deleted-paper/1.pdf', 'PDF', 10, now())");
        jdbcTemplate.update(
                "INSERT INTO original_file_job (file_id, flag_match, flag_text, flag_block, flag_vector) VALUES ('deleted-paper', 0, 0, 0, 0)");

        mockMvc.perform(get("/api/papers/deleted-paper").with(authentication(authToken())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PAPER_IN_TRASH"));
    }

    @Test
    void rejectsCreateWithoutFileAsBadRequest() throws Exception {
        MockMultipartFile metadata = new MockMultipartFile(
                "metadata", "", "application/json",
                """
                {"sourceId":"S123","year":2024,"paperTitle":"Missing File","authors":["Alice"]}
                """.getBytes());

        mockMvc.perform(multipart("/api/papers")
                        .file(metadata).with(csrf()).with(authentication(authToken())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void softDeletesSelectedPapersAtomically() throws Exception {
        seedPaper("F1", 0);
        seedPaper("F2", 0);

        mockMvc.perform(delete("/api/papers/batch")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"papers":[
                                  {"fileId":"F1","recordVersion":0},
                                  {"fileId":"F2","recordVersion":0}
                                ],"reason":"重复导入"}
                                """)
                        .with(csrf()).with(authentication(authToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].fileId").value("F1"))
                .andExpect(jsonPath("$.items[1].recordVersion").value(1));

        assertEquals(2, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM original_file WHERE deleted_at IS NOT NULL", Integer.class));
        assertEquals("重复导入", jdbcTemplate.queryForObject(
                "SELECT delete_reason FROM original_file WHERE file_id='F1'", String.class));
        assertEquals(2, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM admin_audit_log WHERE action='PAPER_SOFT_DELETE'", Integer.class));
        assertEquals(true, Files.exists(Path.of("target/test-data/paper-write/paperflow/trash/F1/1.pdf")));
    }

    @Test
    void rejectsInvalidBatchWithoutDeletingAnyPaper() throws Exception {
        seedPaper("F1", 0);
        seedPaper("F2", 0);

        mockMvc.perform(delete("/api/papers/batch")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"papers":[
                                  {"fileId":"F1","recordVersion":0},
                                  {"fileId":"F2","recordVersion":1}
                                ]}
                                """)
                        .with(csrf()).with(authentication(authToken())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PAPER_VERSION_CONFLICT"));

        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM original_file WHERE deleted_at IS NOT NULL", Integer.class));
        assertEquals(true, Files.exists(Path.of("target/test-data/paper-write/paperflow/original/S123/F1.pdf")));
    }

    private void seedPaper(String fileId, long recordVersion) throws Exception {
        String path = "paperflow/original/S123/" + fileId + ".pdf";
        Path fullPath = Path.of("target/test-data/paper-write").resolve(path);
        Files.createDirectories(fullPath.getParent());
        Files.writeString(fullPath, "%PDF-1.7\ntest");
        jdbcTemplate.update(
                "INSERT INTO original_file (file_id, source_id, original_file_name, original_file_path, original_file_type, file_size, record_version, current_version) VALUES (?, 'S123', ?, ?, 'PDF', 10, ?, 1)",
                fileId, fileId + ".pdf", path, recordVersion);
        jdbcTemplate.update(
                "INSERT INTO original_file_job (file_id, flag_match, flag_text, flag_block, flag_vector) VALUES (?, 0, 0, 0, 0)",
                fileId);
        jdbcTemplate.update(
                "INSERT INTO original_file_version (file_id, version_no, file_name, file_path, file_type, file_size, is_current) VALUES (?, 1, ?, ?, 'PDF', 10, true)",
                fileId, fileId + ".pdf", path);
    }

    private UsernamePasswordAuthenticationToken authToken() {
        AdminUserPrincipal principal = new AdminUserPrincipal(1L, "admin", "Admin", AdminRole.ADMIN);
        return new UsernamePasswordAuthenticationToken(
                principal, null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    }

    private static void assertEquals(Object expected, Object actual) {
        org.junit.jupiter.api.Assertions.assertEquals(expected, actual);
    }
}
