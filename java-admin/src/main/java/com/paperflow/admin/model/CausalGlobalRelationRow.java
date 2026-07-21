package com.paperflow.admin.model;

public class CausalGlobalRelationRow {
    private String cause;
    private String effect;
    private long claimRecordCount;
    private long paperCount;
    private long methodCount;

    public String getCause() { return cause; }
    public void setCause(String cause) { this.cause = cause; }
    public String getEffect() { return effect; }
    public void setEffect(String effect) { this.effect = effect; }
    public long getClaimRecordCount() { return claimRecordCount; }
    public void setClaimRecordCount(long claimRecordCount) { this.claimRecordCount = claimRecordCount; }
    public long getPaperCount() { return paperCount; }
    public void setPaperCount(long paperCount) { this.paperCount = paperCount; }
    public long getMethodCount() { return methodCount; }
    public void setMethodCount(long methodCount) { this.methodCount = methodCount; }
}
