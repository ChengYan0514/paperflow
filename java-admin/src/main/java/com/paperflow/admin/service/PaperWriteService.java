package com.paperflow.admin.service;

import com.paperflow.admin.dto.AdminRole;
import com.paperflow.admin.dto.ErrorCode;
import com.paperflow.admin.dto.OpenAlexSourceDto;
import com.paperflow.admin.dto.PaperBatchDeleteItem;
import com.paperflow.admin.dto.PaperCreateMetadata;
import com.paperflow.admin.dto.PaperFileVersionDto;
import com.paperflow.admin.dto.PaperMutationResponse;
import com.paperflow.admin.dto.PaperUpdateRequest;
import com.paperflow.admin.dto.TrashedPaperDto;
import java.io.IOException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.HashSet;
import java.util.Set;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PaperWriteService {
    private final JdbcTemplate jdbcTemplate;
    private final OpenAlexSourceSearchService sources;
    private final PaperFileService files;
    private final AssetService assets;

    public PaperWriteService(
            JdbcTemplate jdbcTemplate,
            OpenAlexSourceSearchService sources,
            PaperFileService files,
            AssetService assets) {
        this.jdbcTemplate = jdbcTemplate;
        this.sources = sources;
        this.files = files;
        this.assets = assets;
    }

    @Transactional
    public PaperMutationResponse create(
            AdminUserPrincipal actor, PaperCreateMetadata request, MultipartFile file) {
        requireActor(actor);
        PaperMetadata metadata = PaperMetadata.normalize(
                request.sourceId(), request.year(), request.paperTitle(), request.authors(), request.doi(), request.url());
        validateYear(metadata.year());
        OpenAlexSourceDto source = sources.requireAuthoritative(metadata.sourceId());
        String fileId = PaperMetadata.fileId(
                metadata.sourceId(), metadata.year(), metadata.title(), metadata.authorsText());
        ExistingState state = existingState(fileId);
        if (state != null) {
            ErrorCode code = state.deletedAt() == null ? ErrorCode.PAPER_ALREADY_EXISTS : ErrorCode.PAPER_IN_TRASH;
            throw new ApiException(HttpStatus.CONFLICT, code, "Paper already exists");
        }
        PaperFileService.StagedFile staged = files.stage(file);
        String fileName = fileId + "." + staged.extension();
        String filePath = files.currentPath(metadata.sourceId(), fileId, staged.extension());
        try {
            upsertLocalSource(source);
            jdbcTemplate.update(
                    """
                    INSERT INTO original_file
                        (file_id, source_id, year, paper_title, authors, doi, url, provider,
                         original_file_name, original_file_path, original_file_type, file_size,
                         created_at, created_by, updated_at, updated_by, record_version, current_version)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'manual-upload', ?, ?, ?, ?, now(), ?, now(), ?, 0, 1)
                    """,
                    fileId, metadata.sourceId(), metadata.year(), metadata.title(), metadata.authorsText(),
                    metadata.doi(), metadata.url(), fileName, filePath, staged.type(), staged.size(), actor.id(), actor.id());
            int textFlag = "PDF".equals(staged.type()) ? 0 : -2;
            jdbcTemplate.update(
                    "INSERT INTO original_file_job (file_id, flag_match, matched_work_id, flag_text, flag_block, flag_vector) VALUES (?, 0, NULL, ?, 0, 0)",
                    fileId, textFlag);
            jdbcTemplate.update(
                    """
                    INSERT INTO original_file_version
                        (file_id, version_no, file_name, file_path, file_type, file_size, uploaded_by, is_current)
                    VALUES (?, 1, ?, ?, ?, ?, ?, true)
                    """,
                    fileId, fileName, filePath, staged.type(), staged.size(), actor.id());
            files.moveStaged(staged, filePath);
            onRollback(() -> files.deleteRelativeTree(filePath));
            return new PaperMutationResponse(fileId, 0);
        } catch (DuplicateKeyException exc) {
            files.cleanup(staged);
            throw new ApiException(HttpStatus.CONFLICT, ErrorCode.PAPER_ALREADY_EXISTS, "Paper already exists");
        } catch (RuntimeException exc) {
            files.cleanup(staged);
            throw exc;
        }
    }

    @Transactional
    public PaperMutationResponse update(AdminUserPrincipal actor, String fileId, PaperUpdateRequest request) {
        requireActor(actor);
        PaperRow current = requireActive(fileId);
        PaperMetadata metadata = PaperMetadata.normalize(
                request.sourceId(), request.year(), request.paperTitle(), request.authors(), request.doi(), request.url());
        validateYear(metadata.year());
        if (current.flagMatch() == 1 && matchedFieldsChanged(current, metadata)) {
            throw new ApiException(HttpStatus.CONFLICT, ErrorCode.PAPER_MATCHED_FIELDS_LOCKED, "Matched paper metadata is locked");
        }
        String oldPath = current.filePath();
        String newPath = oldPath;
        boolean sourceChanged = !current.sourceId().equals(metadata.sourceId());
        if (sourceChanged) {
            OpenAlexSourceDto source = sources.requireAuthoritative(metadata.sourceId());
            upsertLocalSource(source);
            newPath = files.currentPath(metadata.sourceId(), fileId, extension(current.fileName()));
            files.moveRelative(oldPath, newPath);
        }
        int updated;
        try {
            updated = jdbcTemplate.update(
                """
                UPDATE original_file SET source_id=?, year=?, paper_title=?, authors=?, doi=?, url=?,
                    original_file_path=?, updated_at=now(), updated_by=?, record_version=record_version+1
                WHERE file_id=? AND deleted_at IS NULL AND record_version=?
                """,
                metadata.sourceId(), metadata.year(), metadata.title(), metadata.authorsText(), metadata.doi(),
                metadata.url(), newPath, actor.id(), fileId, request.recordVersion());
        } catch (RuntimeException exc) {
            if (sourceChanged) files.moveRelative(newPath, oldPath);
            throw exc;
        }
        if (updated == 0) {
            if (sourceChanged) files.moveRelative(newPath, oldPath);
            throw versionConflict();
        }
        String committedPath = newPath;
        if (sourceChanged) onRollback(() -> files.moveRelative(committedPath, oldPath));
        jdbcTemplate.update(
                "UPDATE original_file_version SET file_path=? WHERE file_id=? AND is_current=true",
                newPath, fileId);
        return new PaperMutationResponse(fileId, request.recordVersion() + 1);
    }

    @Transactional
    public PaperMutationResponse replaceFile(
            AdminUserPrincipal actor, String fileId, long expectedVersion, MultipartFile file) {
        requireActor(actor);
        return replaceStaged(actor, fileId, expectedVersion, files.stage(file));
    }

    private PaperMutationResponse replaceStaged(
            AdminUserPrincipal actor, String fileId, long expectedVersion, PaperFileService.StagedFile staged) {
        PaperRow current = requireActive(fileId);
        if (current.recordVersion() != expectedVersion) throw versionConflict();
        int nextVersion = current.currentVersion() + 1;
        String oldArchive = files.archivePath(fileId, current.currentVersion(), extension(current.fileName()));
        String newPath = files.currentPath(current.sourceId(), fileId, staged.extension());
        try {
            files.moveRelative(current.filePath(), oldArchive);
            try {
                files.moveStaged(staged, newPath);
            } catch (RuntimeException exc) {
                files.moveRelative(oldArchive, current.filePath());
                throw exc;
            }
            onRollback(() -> {
                files.deleteRelativeTree(newPath);
                files.moveRelative(oldArchive, current.filePath());
            });
            jdbcTemplate.update("UPDATE original_file_version SET is_current=false, file_path=? WHERE file_id=? AND is_current=true", oldArchive, fileId);
            jdbcTemplate.update(
                    """
                    INSERT INTO original_file_version
                        (file_id, version_no, file_name, file_path, file_type, file_size, uploaded_by, is_current)
                    VALUES (?, ?, ?, ?, ?, ?, ?, true)
                    """,
                    fileId, nextVersion, fileId + "." + staged.extension(), newPath, staged.type(), staged.size(), actor.id());
            int textFlag = "PDF".equals(staged.type()) ? 0 : -2;
            int updated = jdbcTemplate.update(
                    """
                    UPDATE original_file SET original_file_name=?, original_file_path=?, original_file_type=?,
                        file_size=?, current_version=?, updated_at=now(), updated_by=?, record_version=record_version+1
                    WHERE file_id=? AND deleted_at IS NULL AND record_version=?
                    """,
                    fileId + "." + staged.extension(), newPath, staged.type(), staged.size(), nextVersion,
                    actor.id(), fileId, expectedVersion);
            if (updated == 0) throw versionConflict();
            jdbcTemplate.update("DELETE FROM text_file WHERE file_id=?", fileId);
            jdbcTemplate.update("DELETE FROM block WHERE file_id=?", fileId);
            jdbcTemplate.update("UPDATE original_file_job SET flag_text=?, flag_block=0, flag_vector=0 WHERE file_id=?", textFlag, fileId);
            return new PaperMutationResponse(fileId, expectedVersion + 1);
        } catch (RuntimeException exc) {
            files.cleanup(staged);
            throw exc;
        }
    }

    @Transactional(readOnly = true)
    public List<PaperFileVersionDto> versions(String fileId) {
        requireAny(fileId);
        return jdbcTemplate.query(
                """
                SELECT file_id, version_no, file_name, file_path, file_type, file_size,
                       uploaded_by, uploaded_at, is_current
                FROM original_file_version WHERE file_id=? ORDER BY version_no DESC
                """,
                (rs, row) -> new PaperFileVersionDto(
                        rs.getString("file_id"), rs.getInt("version_no"), rs.getString("file_name"),
                        assets.assetUrl(rs.getString("file_path")), rs.getString("file_type"), rs.getLong("file_size"),
                        rs.getObject("uploaded_by", Long.class), rs.getObject("uploaded_at", OffsetDateTime.class),
                        rs.getBoolean("is_current")),
                fileId);
    }

    @Transactional(readOnly = true)
    public void requireReadable(String fileId) {
        requireActive(fileId);
    }

    @Transactional
    public PaperMutationResponse restoreVersion(
            AdminUserPrincipal actor, String fileId, int versionNo, long expectedVersion) {
        requireAdmin(actor);
        PaperRow current = requireActive(fileId);
        if (current.recordVersion() != expectedVersion) throw versionConflict();
        VersionRow source = jdbcTemplate.query(
                "SELECT version_no, file_path, file_type, file_size FROM original_file_version WHERE file_id=? AND version_no=?",
                rs -> rs.next() ? new VersionRow(rs.getInt(1), rs.getString(2), rs.getString(3), rs.getLong(4)) : null,
                fileId, versionNo);
        if (source == null) throw new NotFoundException(ErrorCode.PAPER_NOT_FOUND, "Paper file version not found");
        return replaceStaged(actor, fileId, expectedVersion, files.stageCopy(source.path(), source.type()));
    }

    @Transactional
    public PaperMutationResponse softDelete(
            AdminUserPrincipal actor, String fileId, long expectedVersion, String reason) {
        requireAdmin(actor);
        return softDeleteInternal(actor, fileId, expectedVersion, reason);
    }

    @Transactional
    public List<PaperMutationResponse> softDeleteBatch(
            AdminUserPrincipal actor, List<PaperBatchDeleteItem> papers, String reason) {
        requireAdmin(actor);
        Set<String> fileIds = new HashSet<>();
        for (PaperBatchDeleteItem paper : papers) {
            if (!fileIds.add(paper.fileId())) {
                throw new IllegalArgumentException("Duplicate paper in batch");
            }
            PaperRow current = requireActive(paper.fileId());
            if (current.recordVersion() != paper.recordVersion()) throw versionConflict();
        }
        return papers.stream()
                .map(paper -> softDeleteInternal(actor, paper.fileId(), paper.recordVersion(), reason))
                .toList();
    }

    private PaperMutationResponse softDeleteInternal(
            AdminUserPrincipal actor, String fileId, long expectedVersion, String reason) {
        PaperRow current = requireActive(fileId);
        if (current.recordVersion() != expectedVersion) throw versionConflict();
        List<PathMove> moves = new java.util.ArrayList<>();
        try {
            for (VersionPath version : versionPaths(fileId)) {
                String trash = files.trashPath(fileId, version.version(), extension(version.path()));
                files.moveRelative(version.path(), trash);
                moves.add(new PathMove(version.path(), trash));
                jdbcTemplate.update("UPDATE original_file_version SET file_path=? WHERE file_id=? AND version_no=?", trash, fileId, version.version());
                if (version.current()) jdbcTemplate.update("UPDATE original_file SET original_file_path=? WHERE file_id=?", trash, fileId);
            }
        } catch (RuntimeException exc) {
            reverseMoves(moves);
            throw exc;
        }
        int updated = jdbcTemplate.update(
                """
                UPDATE original_file SET deleted_at=now(), deleted_by=?, delete_reason=?,
                    updated_at=now(), updated_by=?, record_version=record_version+1
                WHERE file_id=? AND deleted_at IS NULL AND record_version=?
                """,
                actor.id(), blankToNull(reason), actor.id(), fileId, expectedVersion);
        if (updated == 0) {
            reverseMoves(moves);
            throw versionConflict();
        }
        onRollback(() -> reverseMoves(moves));
        return new PaperMutationResponse(fileId, expectedVersion + 1);
    }

    @Transactional
    public PaperMutationResponse restore(AdminUserPrincipal actor, String fileId, long expectedVersion) {
        requireAdmin(actor);
        PaperRow current = requireDeleted(fileId);
        if (current.recordVersion() != expectedVersion) throw versionConflict();
        List<PathMove> moves = new java.util.ArrayList<>();
        try {
            for (VersionPath version : versionPaths(fileId)) {
                String target = version.current()
                        ? files.currentPath(current.sourceId(), fileId, extension(version.path()))
                        : files.archivePath(fileId, version.version(), extension(version.path()));
                files.moveRelative(version.path(), target);
                moves.add(new PathMove(version.path(), target));
                jdbcTemplate.update("UPDATE original_file_version SET file_path=? WHERE file_id=? AND version_no=?", target, fileId, version.version());
                if (version.current()) jdbcTemplate.update("UPDATE original_file SET original_file_path=? WHERE file_id=?", target, fileId);
            }
        } catch (RuntimeException exc) {
            reverseMoves(moves);
            throw exc;
        }
        int updated = jdbcTemplate.update(
                """
                UPDATE original_file SET deleted_at=NULL, deleted_by=NULL, delete_reason=NULL,
                    updated_at=now(), updated_by=?, record_version=record_version+1
                WHERE file_id=? AND deleted_at IS NOT NULL AND record_version=?
                """,
                actor.id(), fileId, expectedVersion);
        if (updated == 0) {
            reverseMoves(moves);
            throw versionConflict();
        }
        onRollback(() -> reverseMoves(moves));
        return new PaperMutationResponse(fileId, expectedVersion + 1);
    }

    @Transactional
    public void purge(AdminUserPrincipal actor, String fileId, long expectedVersion, String confirmation) {
        requireSuperAdmin(actor);
        if (!"删除".equals(confirmation)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, ErrorCode.PURGE_CONFIRMATION_REQUIRED, "Type 删除 to confirm");
        }
        PaperRow current = requireDeleted(fileId);
        if (current.recordVersion() != expectedVersion) throw versionConflict();
        String operationId = java.util.UUID.randomUUID().toString();
        String trashPath = "paperflow/trash/" + fileId;
        String pendingPath = "paperflow/pending-delete/" + operationId + "/" + fileId;
        files.moveRelative(trashPath, pendingPath);
        try {
            jdbcTemplate.update(
                    """
                    INSERT INTO file_cleanup_operation
                        (operation_id, file_id, operation_type, status, staged_path, target_path)
                    VALUES (?, ?, 'PURGE', 'PENDING', ?, ?)
                    """,
                    operationId, fileId, trashPath, pendingPath);
            int deleted = jdbcTemplate.update(
                    "DELETE FROM original_file WHERE file_id=? AND deleted_at IS NOT NULL AND record_version=?",
                    fileId, expectedVersion);
            if (deleted == 0) throw versionConflict();
        } catch (RuntimeException exc) {
            files.moveRelative(pendingPath, trashPath);
            throw exc;
        }
        onCommit(() -> completePurgeCleanup(operationId, pendingPath));
        onRollback(() -> files.moveRelative(pendingPath, trashPath));
    }

    @Transactional(readOnly = true)
    public List<TrashedPaperDto> trash(String query) {
        String q = query == null ? "" : query.trim().toLowerCase();
        String like = "%" + q + "%";
        return jdbcTemplate.query(
                """
                SELECT f.file_id, f.source_id, s.source_name, f.year, f.paper_title, f.authors,
                       f.record_version, f.deleted_at, f.deleted_by, f.delete_reason
                FROM original_file f LEFT JOIN source s ON s.source_id=f.source_id
                WHERE f.deleted_at IS NOT NULL
                  AND (? = '' OR lower(f.file_id) LIKE ? OR lower(COALESCE(f.paper_title, '')) LIKE ?
                       OR lower(COALESCE(f.authors, '')) LIKE ? OR lower(f.source_id) LIKE ?)
                ORDER BY f.deleted_at DESC, f.file_id
                """,
                (rs, row) -> new TrashedPaperDto(
                        rs.getString("file_id"), rs.getString("source_id"), rs.getString("source_name"),
                        rs.getObject("year", Integer.class), rs.getString("paper_title"), rs.getString("authors"),
                        rs.getLong("record_version"), rs.getObject("deleted_at", OffsetDateTime.class),
                        rs.getObject("deleted_by", Long.class), rs.getString("delete_reason")),
                q, like, like, like, like);
    }

    private void upsertLocalSource(OpenAlexSourceDto source) {
        jdbcTemplate.update(
                """
                INSERT INTO source (source_id, source_name, provider, flag_collect)
                SELECT ?, ?, ?, 0
                WHERE NOT EXISTS (SELECT 1 FROM source WHERE source_id = ?)
                """,
                source.sourceId(), source.displayName(), source.publisher(), source.sourceId());
    }

    private ExistingState existingState(String fileId) {
        return jdbcTemplate.query(
                "SELECT deleted_at FROM original_file WHERE file_id=?",
                rs -> rs.next() ? new ExistingState(rs.getObject(1, OffsetDateTime.class)) : null,
                fileId);
    }

    private PaperRow requireActive(String fileId) {
        PaperRow row = find(fileId);
        if (row == null) throw new NotFoundException(ErrorCode.PAPER_NOT_FOUND, "Paper not found");
        if (row.deletedAt() != null) throw new ApiException(HttpStatus.CONFLICT, ErrorCode.PAPER_IN_TRASH, "Paper is in trash");
        return row;
    }

    private PaperRow requireDeleted(String fileId) {
        PaperRow row = find(fileId);
        if (row == null) throw new NotFoundException(ErrorCode.PAPER_NOT_FOUND, "Paper not found");
        if (row.deletedAt() == null) throw new ApiException(HttpStatus.CONFLICT, ErrorCode.PAPER_VERSION_CONFLICT, "Paper is not in trash");
        return row;
    }

    private void requireAny(String fileId) {
        if (find(fileId) == null) throw new NotFoundException(ErrorCode.PAPER_NOT_FOUND, "Paper not found");
    }

    private PaperRow find(String fileId) {
        return jdbcTemplate.query(
                """
                SELECT f.file_id, f.source_id, f.year, f.paper_title, f.authors, f.doi, f.url,
                       f.original_file_name, f.original_file_path, f.original_file_type, f.file_size,
                       f.record_version, f.current_version, f.deleted_at, j.flag_match
                FROM original_file f JOIN original_file_job j ON j.file_id=f.file_id WHERE f.file_id=?
                """,
                rs -> rs.next() ? mapPaper(rs) : null,
                fileId);
    }

    private PaperRow mapPaper(ResultSet rs) throws SQLException {
        return new PaperRow(
                rs.getString("file_id"), rs.getString("source_id"), rs.getInt("year"), rs.getString("paper_title"),
                rs.getString("authors"), rs.getString("doi"), rs.getString("url"), rs.getString("original_file_name"),
                rs.getString("original_file_path"), rs.getString("original_file_type"), rs.getLong("file_size"),
                rs.getLong("record_version"), rs.getInt("current_version"),
                rs.getObject("deleted_at", OffsetDateTime.class), rs.getInt("flag_match"));
    }

    private List<VersionPath> versionPaths(String fileId) {
        return jdbcTemplate.query(
                "SELECT version_no, file_path, is_current FROM original_file_version WHERE file_id=? ORDER BY version_no",
                (rs, row) -> new VersionPath(rs.getInt(1), rs.getString(2), rs.getBoolean(3)), fileId);
    }

    private boolean matchedFieldsChanged(PaperRow current, PaperMetadata next) {
        return !current.sourceId().equals(next.sourceId()) || current.year() != next.year()
                || !current.title().equals(next.title()) || !current.authors().equals(next.authorsText())
                || !java.util.Objects.equals(current.doi(), next.doi());
    }

    private void validateYear(int year) {
        int max = java.time.Year.now().getValue() + 1;
        if (year < 1000 || year > max) throw new IllegalArgumentException("Invalid publication year");
    }

    private String extension(String path) {
        int dot = path.lastIndexOf('.');
        if (dot < 0) throw new IllegalArgumentException("Missing file extension");
        return path.substring(dot + 1).toLowerCase();
    }

    private void requireActor(AdminUserPrincipal actor) {
        if (actor == null) throw new ApiException(HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN, "Forbidden");
    }

    private void requireAdmin(AdminUserPrincipal actor) {
        requireActor(actor);
        if (actor.role() == AdminRole.USER) throw new ApiException(HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN, "Forbidden");
    }

    private void requireSuperAdmin(AdminUserPrincipal actor) {
        requireActor(actor);
        if (actor.role() != AdminRole.SUPER_ADMIN) throw new ApiException(HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN, "Forbidden");
    }

    private ApiException versionConflict() {
        return new ApiException(HttpStatus.CONFLICT, ErrorCode.PAPER_VERSION_CONFLICT, "Paper changed; reload and retry");
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void reverseMoves(List<PathMove> moves) {
        for (int index = moves.size() - 1; index >= 0; index--) {
            PathMove move = moves.get(index);
            files.moveRelative(move.target(), move.source());
        }
    }

    private void onCommit(Runnable action) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) return;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { action.run(); }
        });
    }

    private void completePurgeCleanup(String operationId, String pendingPath) {
        try {
            files.deleteRelativeTreeStrict(pendingPath);
            jdbcTemplate.update(
                    "UPDATE file_cleanup_operation SET status='COMPLETE', attempt_count=attempt_count+1, updated_at=now() WHERE operation_id=?",
                    operationId);
        } catch (IOException | RuntimeException exc) {
            try {
                jdbcTemplate.update(
                        "UPDATE file_cleanup_operation SET status='FAILED', last_error=?, attempt_count=attempt_count+1, updated_at=now() WHERE operation_id=?",
                        exc.getMessage(), operationId);
            } catch (RuntimeException ignored) {
                // The existing PENDING row remains available for an operational retry.
            }
        }
    }

    private void onRollback(Runnable action) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) return;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCompletion(int status) {
                if (status == STATUS_ROLLED_BACK) action.run();
            }
        });
    }

    private record ExistingState(OffsetDateTime deletedAt) {}
    private record VersionRow(int version, String path, String type, long size) {}
    private record VersionPath(int version, String path, boolean current) {}
    private record PathMove(String source, String target) {}
    private record PaperRow(
            String fileId, String sourceId, int year, String title, String authors, String doi, String url,
            String fileName, String filePath, String fileType, long fileSize, long recordVersion,
            int currentVersion, OffsetDateTime deletedAt, int flagMatch) {}
}
