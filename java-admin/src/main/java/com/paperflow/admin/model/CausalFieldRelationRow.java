package com.paperflow.admin.model;

public class CausalFieldRelationRow {
    private String subfield;
    private String cause;
    private String effect;
    private long claimRecordCount;
    private long paperCount;
    private long methodCount;
    private long globalClaimRecordCount;
    private long globalPaperCount;
    private long globalMethodCount;

    public String getSubfield() { return subfield; }
    public void setSubfield(String subfield) { this.subfield = subfield; }
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
    public long getGlobalClaimRecordCount() { return globalClaimRecordCount; }
    public void setGlobalClaimRecordCount(long globalClaimRecordCount) { this.globalClaimRecordCount = globalClaimRecordCount; }
    public long getGlobalPaperCount() { return globalPaperCount; }
    public void setGlobalPaperCount(long globalPaperCount) { this.globalPaperCount = globalPaperCount; }
    public long getGlobalMethodCount() { return globalMethodCount; }
    public void setGlobalMethodCount(long globalMethodCount) { this.globalMethodCount = globalMethodCount; }
}
