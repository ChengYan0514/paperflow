package com.paperflow.admin.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record ServiceStatusResponse(
        String status,
        String version,
        OffsetDateTime checkedAt,
        ServiceCheck backend,
        ServiceCheck database,
        ServiceCheck dataRoot,
        ServiceCheck disk,
        List<RecentErrorDto> recentErrors) {}
