package com.paperflow.admin.mapper;

import com.paperflow.admin.model.CausalClaimRecord;
import com.paperflow.admin.model.CausalCountRow;
import com.paperflow.admin.model.CausalEdgeAggregateRow;
import com.paperflow.admin.model.CausalFieldRow;
import com.paperflow.admin.model.CausalNodeSearchRow;
import com.paperflow.admin.model.CausalOverviewRow;
import com.paperflow.admin.model.CausalPaperSearchRow;
import com.paperflow.admin.model.CausalPaperSummaryRow;
import java.util.List;
import org.apache.ibatis.annotations.Param;

@CausalMapper
public interface KnowledgeGraphMapper {
    CausalOverviewRow findOverview(@Param("minRecordCount") int minRecordCount);

    List<String> listSubfields();

    List<String> listMethods();

    List<CausalEdgeAggregateRow> listGraphEdges(
            @Param("minRecordCount") int minRecordCount,
            @Param("minPaperCount") Integer minPaperCount,
            @Param("minDiversity") int minDiversity,
            @Param("subfields") List<String> subfields,
            @Param("query") String query,
            @Param("limit") int limit);

    CausalEdgeAggregateRow findEdgeByClaimId(@Param("claimId") long claimId);

    CausalEdgeAggregateRow findEdgeByCauseEffect(@Param("cause") String cause, @Param("effect") String effect);

    List<CausalEdgeAggregateRow> listOutgoingEdges(@Param("variable") String variable, @Param("limit") int limit);

    List<CausalEdgeAggregateRow> listIncomingEdges(@Param("variable") String variable, @Param("limit") int limit);

    List<CausalCountRow> listSubfieldCountsForVariable(@Param("variable") String variable);

    List<CausalCountRow> listYearCountsForVariable(@Param("variable") String variable);

    List<CausalClaimRecord> listClaimsByClaimId(@Param("claimId") long claimId, @Param("limit") int limit);

    List<CausalClaimRecord> listClaimsByCauseEffect(
            @Param("cause") String cause,
            @Param("effect") String effect,
            @Param("limit") int limit);

    List<CausalClaimRecord> listClaimsByWorkId(@Param("workId") String workId);

    List<CausalNodeSearchRow> searchNodes(@Param("query") String query, @Param("limit") int limit);

    List<CausalPaperSearchRow> searchPapers(@Param("query") String query, @Param("limit") int limit);

    CausalPaperSummaryRow findPaperSummary(@Param("workId") String workId);

    List<CausalFieldRow> listFields(@Param("limit") int limit);
}
