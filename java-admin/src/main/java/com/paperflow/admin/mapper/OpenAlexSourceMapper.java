package com.paperflow.admin.mapper;

import com.paperflow.admin.model.OpenAlexSourceRow;
import java.util.List;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@OpenAlexMapper
public interface OpenAlexSourceMapper {
    @Select("""
            SELECT id AS source_id, issn_l, CAST(issn AS varchar) AS issn,
                   display_name, publisher, works_count, cited_by_count,
                   is_oa AS oa, is_in_doaj AS in_doaj, homepage_url, updated_date
            FROM sources WHERE id = #{sourceId}
            """)
    OpenAlexSourceRow findById(@Param("sourceId") String sourceId);

    @Select("""
            SELECT id AS source_id, issn_l, CAST(issn AS varchar) AS issn,
                   display_name, publisher, works_count, cited_by_count,
                   is_oa AS oa, is_in_doaj AS in_doaj, homepage_url, updated_date
            FROM sources ORDER BY id LIMIT #{limit} OFFSET #{offset}
            """)
    List<OpenAlexSourceRow> listBatch(@Param("limit") int limit, @Param("offset") long offset);
}
