package com.paperflow.admin.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import com.paperflow.admin.dto.CausalGraphSummaryDto;
import com.paperflow.admin.mapper.KnowledgeGraphMapper;
import com.paperflow.admin.model.CausalOverviewRow;
import java.util.List;
import org.junit.jupiter.api.Test;

class KnowledgeGraphServiceTest {
    @Test
    void summaryUsesOverviewWithoutLoadingGraphEdges() {
        KnowledgeGraphMapper mapper = mock(KnowledgeGraphMapper.class);
        CausalOverviewRow row = new CausalOverviewRow();
        row.setTotalClaimRecords(100);
        row.setTotalStandardClaims(50);
        row.setTotalPapers(40);
        row.setTotalNodes(30);
        row.setTotalEdges(50);
        row.setGraphNodes(20);
        row.setGraphEdges(10);
        when(mapper.findOverview(3)).thenReturn(row);
        when(mapper.listSubfields()).thenReturn(List.of("Economics"));
        when(mapper.listMethods()).thenReturn(List.of("DID"));

        CausalGraphSummaryDto summary = new KnowledgeGraphService(mapper).summary();

        assertThat(summary.overview().graphNodes()).isEqualTo(20);
        assertThat(summary.overview().graphEdges()).isEqualTo(10);
        assertThat(summary.subfields()).containsExactly("Economics");
        assertThat(summary.methods()).containsExactly("DID");
        verify(mapper).findOverview(3);
        verify(mapper).listSubfields();
        verify(mapper).listMethods();
        verifyNoMoreInteractions(mapper);
    }
}
