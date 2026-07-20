package com.paperflow.admin.model;

public class CausalFieldMethodRow {
    private String subfield;
    private String method;
    private long claimRecordCount;

    public String getSubfield() {
        return subfield;
    }

    public void setSubfield(String subfield) {
        this.subfield = subfield;
    }

    public String getMethod() {
        return method;
    }

    public void setMethod(String method) {
        this.method = method;
    }

    public long getClaimRecordCount() {
        return claimRecordCount;
    }

    public void setClaimRecordCount(long claimRecordCount) {
        this.claimRecordCount = claimRecordCount;
    }
}
