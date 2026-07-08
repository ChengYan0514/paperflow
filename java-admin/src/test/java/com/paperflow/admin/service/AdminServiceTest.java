package com.paperflow.admin.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.paperflow.admin.config.PaperflowApiProperties;
import com.paperflow.admin.dto.ProcessingStatus;
import com.paperflow.admin.mapper.AdminMapper;
import com.paperflow.admin.model.MatchedFileRow;
import org.junit.jupiter.api.Test;

class AdminServiceTest {
    private static final PaperflowApiProperties PROPERTIES = new PaperflowApiProperties(20, 100, 100, 500, "data");

    private final AdminService service =
            new AdminService(
                    mock(AdminMapper.class),
                    PROPERTIES,
                    new ObjectMapper(),
                    new AssetService(PROPERTIES));

    @Test
    void derivesProcessingStatusFromMatchedJobFlags() {
        assertThat(service.deriveStatus(null)).isEqualTo(ProcessingStatus.NO_MATCHED_FILE);
        assertThat(status(-2, 0)).isEqualTo(ProcessingStatus.UNSUPPORTED_TEXT_INPUT);
        assertThat(status(-1, 0)).isEqualTo(ProcessingStatus.PARSE_FAILED);
        assertThat(status(1, 0)).isEqualTo(ProcessingStatus.PARSING);
        assertThat(status(2, -1)).isEqualTo(ProcessingStatus.BLOCK_FAILED);
        assertThat(status(2, 1)).isEqualTo(ProcessingStatus.READY);
        assertThat(status(2, 0)).isEqualTo(ProcessingStatus.PARSED);
        assertThat(status(0, 0)).isEqualTo(ProcessingStatus.MATCHED);
    }

    private ProcessingStatus status(int flagText, int flagBlock) {
        MatchedFileRow row = new MatchedFileRow();
        row.setFlagText(flagText);
        row.setFlagBlock(flagBlock);
        return service.deriveStatus(row);
    }
}
