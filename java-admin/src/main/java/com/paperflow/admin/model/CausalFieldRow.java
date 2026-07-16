package com.paperflow.admin.model;

public class CausalFieldRow {
    private String subfield;
    private String topic;
    private long claimRecordCount;
    private long paperCount;
    private long variableCount;

    public String getSubfield() {
        return subfield;
    }

    public void setSubfield(String subfield) {
        this.subfield = subfield;
    }

    public String getTopic() {
        return topic;
    }

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public long getClaimRecordCount() {
        return claimRecordCount;
    }

    public void setClaimRecordCount(long claimRecordCount) {
        this.claimRecordCount = claimRecordCount;
    }

    public long getPaperCount() {
        return paperCount;
    }

    public void setPaperCount(long paperCount) {
        this.paperCount = paperCount;
    }

    public long getVariableCount() {
        return variableCount;
    }

    public void setVariableCount(long variableCount) {
        this.variableCount = variableCount;
    }
}
