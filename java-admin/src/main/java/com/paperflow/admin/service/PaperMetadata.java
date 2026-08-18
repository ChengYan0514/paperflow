package com.paperflow.admin.service;

import java.text.Normalizer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;

record PaperMetadata(String sourceId, int year, String title, List<String> authors, String doi, String url, String provider) {
    static PaperMetadata normalize(
            String sourceId, int year, String title, List<String> authors, String doi, String url) {
        return normalize(sourceId, year, title, authors, doi, url, null);
    }

    static PaperMetadata normalize(
            String sourceId, int year, String title, List<String> authors, String doi, String url, String provider) {
        String normalizedSource = canonical(sourceId);
        String normalizedTitle = display(title);
        List<String> normalizedAuthors = authors == null
                ? List.of()
                : authors.stream().map(PaperMetadata::display).filter(value -> !value.isBlank()).toList();
        if (normalizedSource.isBlank() || normalizedTitle.isBlank() || normalizedAuthors.isEmpty()) {
            throw new IllegalArgumentException("Missing paper metadata");
        }
        return new PaperMetadata(
                normalizedSource.toUpperCase(Locale.ROOT), year, normalizedTitle, normalizedAuthors,
                normalizeDoi(doi), blankToNull(url), blankToNull(provider));
    }

    String authorsText() {
        return String.join(";", authors);
    }

    String fingerprintInput() {
        return fingerprintInput(sourceId, year, title, authorsText());
    }

    static String fingerprintInput(String sourceId, int year, String title, String authorsText) {
        return canonical(sourceId) + "\n" + year + "\n" + canonical(title) + "\n"
                + java.util.Arrays.stream(authorsText == null ? new String[0] : authorsText.split(";", -1))
                        .map(PaperMetadata::canonical).reduce((a, b) -> a + ";" + b).orElse("");
    }

    static String fileId(String sourceId, int year, String title, String authorsText) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(fingerprintInput(sourceId, year, title, authorsText).getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exc) {
            throw new IllegalStateException(exc);
        }
    }

    private static String display(String value) {
        if (value == null) return "";
        return Normalizer.normalize(value, Normalizer.Form.NFKC).trim().replaceAll("\\s+", " ");
    }

    private static String canonical(String value) {
        return display(value).toLowerCase(Locale.ROOT);
    }

    private static String normalizeDoi(String value) {
        String normalized = blankToNull(value);
        if (normalized == null) return null;
        normalized = normalized.toLowerCase(Locale.ROOT);
        for (String prefix : List.of("https://doi.org/", "http://dx.doi.org/", "doi:")) {
            if (normalized.startsWith(prefix)) normalized = normalized.substring(prefix.length()).trim();
        }
        return blankToNull(normalized);
    }

    private static String blankToNull(String value) {
        if (value == null) return null;
        String normalized = display(value);
        return normalized.isBlank() ? null : normalized;
    }
}
