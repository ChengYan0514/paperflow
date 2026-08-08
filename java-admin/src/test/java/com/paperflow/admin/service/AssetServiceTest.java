package com.paperflow.admin.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.paperflow.admin.config.PaperflowApiProperties;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class AssetServiceTest {
    @TempDir
    private Path dataRoot;

    @Test
    void resolvesRegisteredRelativePathInsideDataRoot() throws Exception {
        Files.createDirectories(dataRoot.resolve("openalex/original/S1"));
        Files.writeString(dataRoot.resolve("openalex/original/S1/F1.pdf"), "pdf");

        AssetService service = service();

        assertThat(service.assetUrl("openalex/original/S1/F1.pdf"))
                .isEqualTo("/api/assets/openalex/original/S1/F1.pdf");
        assertThat(service.resolveAsset("openalex/original/S1/F1.pdf"))
                .isEqualTo(dataRoot.resolve("openalex/original/S1/F1.pdf"));
    }

    @Test
    void resolvesParsedImagePathStoredRelativeToParsedFileDirectory() throws Exception {
        Files.createDirectories(dataRoot.resolve("openalex/parsed/S1/F1/images"));
        Files.writeString(dataRoot.resolve("openalex/parsed/S1/F1/images/fig.png"), "image");

        AssetService service = service();

        assertThat(service.parsedAssetUrl("images/fig.png", "openalex/parsed/S1/F1"))
                .isEqualTo("/api/assets/openalex/parsed/S1/F1/images/fig.png");
    }

    @Test
    void rejectsPathsEscapingDataRoot() {
        AssetService service = service();

        assertThatThrownBy(() -> service.resolveAsset("../secret.pdf"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private AssetService service() {
        return new AssetService(
                new PaperflowApiProperties(20, 100, 100, 500, dataRoot.toString(), 104_857_600L));
    }
}
