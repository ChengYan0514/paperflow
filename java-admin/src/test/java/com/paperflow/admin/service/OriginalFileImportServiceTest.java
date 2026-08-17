package com.paperflow.admin.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class OriginalFileImportServiceTest {
    @Test
    void acceptsExtensionlessCsvFileNameForAnOriginalFilePath() {
        assertTrue(OriginalFileImportService.isCsvFileNameForPath(
                "2ef0b6e50957a7be15060b5c5264599c8c1deed447082d6379261fd3c2d600cd",
                "openalex/original/S181171746/2ef0b6e50957a7be15060b5c5264599c8c1deed447082d6379261fd3c2d600cd.pdf"));
    }

    @Test
    void rejectsCsvFileNameWithAnExtensionOrADifferentStem() {
        String path = "openalex/original/S181171746/file-id.pdf";

        assertFalse(OriginalFileImportService.isCsvFileNameForPath("file-id.pdf", path));
        assertFalse(OriginalFileImportService.isCsvFileNameForPath("other-file", path));
    }
}
