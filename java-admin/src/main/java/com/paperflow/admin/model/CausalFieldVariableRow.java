package com.paperflow.admin.model;

public class CausalFieldVariableRow {
    private String subfield;
    private String variable;
    private long claimRecordCount;

    public String getSubfield() {
        return subfield;
    }

    public void setSubfield(String subfield) {
        this.subfield = subfield;
    }

    public String getVariable() {
        return variable;
    }

    public void setVariable(String variable) {
        this.variable = variable;
    }

    public long getClaimRecordCount() {
        return claimRecordCount;
    }

    public void setClaimRecordCount(long claimRecordCount) {
        this.claimRecordCount = claimRecordCount;
    }
}
