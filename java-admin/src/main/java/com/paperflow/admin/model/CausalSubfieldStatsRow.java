package com.paperflow.admin.model;

public class CausalSubfieldStatsRow {
    private String subfield;
    private long paperCount;
    private long claimRecordCount;
    private long standardClaimCount;
    private long variableCount;

    public String getSubfield() {
        return subfield;
    }

    public void setSubfield(String subfield) {
        this.subfield = subfield;
    }

    public long getPaperCount() {
        return paperCount;
    }

    public void setPaperCount(long paperCount) {
        this.paperCount = paperCount;
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
