package com.paperflow.admin.model;

public class TaskStatusTotalsRow {
    private long sourceCount;
    private long workCount;
    private long originalFileCount;
    private long matchedWorkCount;
    private long parsedFileCount;
    private long blockImportedFileCount;

    public long getSourceCount() {
        return sourceCount;
    }

    public void setSourceCount(long sourceCount) {
        this.sourceCount = sourceCount;
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
