package com.paperflow.admin.model;

public class CausalPaperSummaryRow {
    private String workId;
    private long claimRecordCount;
    private long standardClaimCount;
    private long variableCount;

    public String getWorkId() {
        return workId;
    }

    public void setWorkId(String workId) {
        this.workId = workId;
    }

    public long getClaimRecordCount() {
        return claimRecordCount;
    }

    public void setClaimRecordCount(long claimRecordCount) {
        this.claimRecordCount = claimRecordCount;
    }

    public long getStandardClaimCount() {
        return standardClaimCount;
    }

    public void setStandardClaimCount(long standardClaimCount) {
        this.standardClaimCount = standardClaimCount;
    }

    public long getVariableCount() {
        return variableCount;
    }

    public void setVariableCount(long variableCount) {
        this.variableCount = variableCount;
    }
}
