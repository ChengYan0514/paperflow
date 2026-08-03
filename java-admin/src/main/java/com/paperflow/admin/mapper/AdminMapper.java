package com.paperflow.admin.mapper;

import com.paperflow.admin.model.AuthorRow;
import com.paperflow.admin.model.BlockRow;
import com.paperflow.admin.model.MatchedFileRow;
import com.paperflow.admin.model.SourceBriefRow;
import com.paperflow.admin.model.SourceRow;
import com.paperflow.admin.model.TaskStatusSourceRow;
import com.paperflow.admin.model.TaskStatusTotalsRow;
import com.paperflow.admin.model.TextFileRow;
import com.paperflow.admin.model.WorkRow;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface AdminMapper {
    long countSources(
            @Param("sourceId") String sourceId,
            @Param("sourceName") String sourceName,
            @Param("provider") String provider,
            @Param("hasOriginalFiles") Boolean hasOriginalFiles,
            @Param("hasFailures") Boolean hasFailures);

    List<SourceRow> listSources(
            @Param("sourceId") String sourceId,
            @Param("sourceName") String sourceName,
            @Param("provider") String provider,
            @Param("hasOriginalFiles") Boolean hasOriginalFiles,
            @Param("hasFailures") Boolean hasFailures,
            @Param("sort") String sort,
            @Param("limit") int limit,
            @Param("offset") int offset);

    SourceRow findSource(@Param("sourceId") String sourceId);

    TaskStatusTotalsRow findTaskStatusTotals();

    List<TaskStatusSourceRow> listTaskStatusSources();

    long countWorks(
            @Param("sourceId") String sourceId,
            @Param("workId") String workId,
            @Param("sourceName") String sourceName,
            @Param("authorName") String authorName,
            @Param("title") String title,
            @Param("doi") String doi,
            @Param("yearFrom") Integer yearFrom,
            @Param("yearTo") Integer yearTo,
            @Param("processingStatus") String processingStatus,
            @Param("type") String type,
            @Param("language") String language,
            @Param("matchedFileId") String matchedFileId);

    List<WorkRow> listWorks(
            @Param("sourceId") String sourceId,
            @Param("workId") String workId,
            @Param("sourceName") String sourceName,
            @Param("authorName") String authorName,
            @Param("title") String title,
            @Param("doi") String doi,
            @Param("yearFrom") Integer yearFrom,
            @Param("yearTo") Integer yearTo,
            @Param("processingStatus") String processingStatus,
            @Param("type") String type,
            @Param("language") String language,
            @Param("matchedFileId") String matchedFileId,
            @Param("sort") String sort,
            @Param("limit") int limit,
            @Param("offset") int offset);

    WorkRow findWork(@Param("workId") String workId);

    List<SourceBriefRow> findWorkSources(@Param("workId") String workId);

    List<AuthorRow> findWorkAuthors(@Param("workId") String workId);

    MatchedFileRow findMatchedFile(@Param("workId") String workId);

    List<TextFileRow> findTextFiles(@Param("fileId") String fileId);

    String findParsedDirectory(@Param("fileId") String fileId);

    long countOriginalFiles(
            @Param("sourceId") String sourceId,
            @Param("q") String q,
            @Param("fileId") String fileId,
            @Param("sourceName") String sourceName,
            @Param("provider") String provider,
            @Param("matchedWorkId") String matchedWorkId,
            @Param("flagMatch") Integer flagMatch,
            @Param("flagText") Integer flagText,
            @Param("flagBlock") Integer flagBlock,
            @Param("originalFileType") String originalFileType,
            @Param("yearFrom") Integer yearFrom,
            @Param("yearTo") Integer yearTo);

    List<MatchedFileRow> listOriginalFiles(
            @Param("sourceId") String sourceId,
            @Param("q") String q,
            @Param("fileId") String fileId,
            @Param("sourceName") String sourceName,
            @Param("provider") String provider,
            @Param("matchedWorkId") String matchedWorkId,
            @Param("flagMatch") Integer flagMatch,
            @Param("flagText") Integer flagText,
            @Param("flagBlock") Integer flagBlock,
            @Param("originalFileType") String originalFileType,
            @Param("yearFrom") Integer yearFrom,
            @Param("yearTo") Integer yearTo,
            @Param("sort") String sort,
            @Param("limit") int limit,
            @Param("offset") int offset);

    MatchedFileRow findOriginalFile(@Param("fileId") String fileId);

    long countWorkBlocks(@Param("workId") String workId, @Param("includeDiscarded") boolean includeDiscarded);

    List<BlockRow> listWorkBlocks(
            @Param("workId") String workId,
            @Param("includeDiscarded") boolean includeDiscarded,
            @Param("limit") int limit,
            @Param("offset") int offset);

    long countOriginalFileBlocks(@Param("fileId") String fileId, @Param("includeDiscarded") boolean includeDiscarded);

    List<BlockRow> listOriginalFileBlocks(
            @Param("fileId") String fileId,
            @Param("includeDiscarded") boolean includeDiscarded,
            @Param("limit") int limit,
            @Param("offset") int offset);
}
