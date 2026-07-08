package com.paperflow.admin.model;

public class TaskStatusSourceRow {
    private String sourceId;
    private String sourceName;
    private String provider;
    private long workCount;
    private long originalFileCount;
    private long matchedWorkCount;
    private long parsedFileCount;
    private long blockImportedFileCount;

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

    public long getMatchedWorkCount() {
        return matchedWorkCount;
    }

    public void setMatchedWorkCount(long matchedWorkCount) {
        this.matchedWorkCount = matchedWorkCount;
    }

    public long getParsedFileCount() {
        return parsedFileCount;
    }

    public void setParsedFileCount(long parsedFileCount) {
        this.parsedFileCount = parsedFileCount;
    }

    public long getBlockImportedFileCount() {
        return blockImportedFileCount;
    }

    public void setBlockImportedFileCount(long blockImportedFileCount) {
        this.blockImportedFileCount = blockImportedFileCount;
    }
}
