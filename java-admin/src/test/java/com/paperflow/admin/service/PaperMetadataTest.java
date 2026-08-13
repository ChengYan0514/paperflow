package com.paperflow.admin.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import org.junit.jupiter.api.Test;

class PaperMetadataTest {
    @Test
    void canonicalizesFingerprintFieldsButPreservesDisplayCapitalization() {
        PaperMetadata metadata = PaperMetadata.normalize(
                " s123 ", 2024, "  Economic   Growth ", List.of(" Alice  Smith ", "BOB"),
                "https://doi.org/10.1000/ABC", " https://example.test/paper ");

        assertEquals("S123", metadata.sourceId());
        assertEquals("Economic Growth", metadata.title());
        assertEquals("Alice Smith;BOB", metadata.authorsText());
        assertEquals("10.1000/abc", metadata.doi());
        assertEquals("s123\n2024\neconomic growth\nalice smith;bob", metadata.fingerprintInput());
        assertEquals("0b25942be034bdccafd3bd2a7d70487650c584a9eb76a94f0f410daed7723141",
                PaperMetadata.fileId("S123", 2024, "Example Title", "Author One;Author Two"));
        assertEquals(PaperMetadata.fileId("S123", 2024, "Economic Growth", "Alice Smith;BOB"),
                PaperMetadata.fileId(" s123 ", 2024, "  Economic   Growth ", " Alice  Smith ; BOB "));
    }
}
