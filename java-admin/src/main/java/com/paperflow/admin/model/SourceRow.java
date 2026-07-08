package com.paperflow.admin.model;

public class SourceRow {
    private String sourceId;
    private String sourceName;
    private String provider;
    private long workCount;
    private long originalFileCount;
    private long matchedFileCount;
    private long parsedFileCount;
    private long readyFileCount;
    private long parseFailedFileCount;
    private long blockFailedFileCount;
    private long unsupportedFileCount;

    public String getSourceId() {
        return sourceId;
    }

    public void setSourceId(String sourceId) {
        this.sourceId = sourceId;
    }

    public String getSourceName() {
        return sourceName;
    }

    public void setSourceName(String sourceName) {
        this.sourceName = sourceName;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public long getWorkCount() {
        return workCount;
    }

    public void setWorkCount(long workCount) {
        this.workCount = workCount;
    }

    public long getOriginalFileCount() {
        return originalFileCount;
    }

    public void setOriginalFileCount(long originalFileCount) {
        this.originalFileCount = originalFileCount;
    }

    public long getMatchedFileCount() {
        return matchedFileCount;
    }

    public void setMatchedFileCount(long matchedFileCount) {
        this.matchedFileCount = matchedFileCount;
    }

    public long getParsedFileCount() {
        return parsedFileCount;
    }

    public void setParsedFileCount(long parsedFileCount) {
        this.parsedFileCount = parsedFileCount;
    }

    public long getReadyFileCount() {
        return readyFileCount;
    }

    public void setReadyFileCount(long readyFileCount) {
        this.readyFileCount = readyFileCount;
    }

    public long getParseFailedFileCount() {
        return parseFailedFileCount;
    }

    public void setParseFailedFileCount(long parseFailedFileCount) {
        this.parseFailedFileCount = parseFailedFileCount;
    }

    public long getBlockFailedFileCount() {
        return blockFailedFileCount;
    }

    public void setBlockFailedFileCount(long blockFailedFileCount) {
        this.blockFailedFileCount = blockFailedFileCount;
    }

    public long getUnsupportedFileCount() {
        return unsupportedFileCount;
    }

    public void setUnsupportedFileCount(long unsupportedFileCount) {
        this.unsupportedFileCount = unsupportedFileCount;
    }
}
