package com.paperflow.admin.model;

public class CausalEdgeAggregateRow {
    private Long claimId;
    private String causeStandard;
    private String effectStandard;
    private long recordCount;
    private long paperCount;
    private long diversity;
    private long positiveCount;
    private long negativeCount;
    private long nullCount;
    private long mixedCount;
    private long subfieldCount;
    private long topicCount;
    private Integer yearMin;
    private Integer yearMax;
    private String methodsText;

    public Long getClaimId() {
        return claimId;
    }

    public void setClaimId(Long claimId) {
        this.claimId = claimId;
    }

    public String getCauseStandard() {
        return causeStandard;
    }

    public void setCauseStandard(String causeStandard) {
        this.causeStandard = causeStandard;
    }

    public String getEffectStandard() {
        return effectStandard;
    }

    public void setEffectStandard(String effectStandard) {
        this.effectStandard = effectStandard;
    }

    public long getRecordCount() {
        return recordCount;
    }

    public void setRecordCount(long recordCount) {
        this.recordCount = recordCount;
    }

    public long getPaperCount() {
        return paperCount;
    }

    public void setPaperCount(long paperCount) {
        this.paperCount = paperCount;
    }

    public long getDiversity() {
        return diversity;
    }

    public void setDiversity(long diversity) {
        this.diversity = diversity;
    }

    public long getPositiveCount() {
        return positiveCount;
    }

    public void setPositiveCount(long positiveCount) {
        this.positiveCount = positiveCount;
    }

    public long getNegativeCount() {
        return negativeCount;
    }

    public void setNegativeCount(long negativeCount) {
        this.negativeCount = negativeCount;
    }

    public long getNullCount() {
        return nullCount;
    }

    public void setNullCount(long nullCount) {
        this.nullCount = nullCount;
    }

    public long getMixedCount() {
        return mixedCount;
    }

    public void setMixedCount(long mixedCount) {
        this.mixedCount = mixedCount;
    }

    public long getSubfieldCount() {
        return subfieldCount;
    }

    public void setSubfieldCount(long subfieldCount) {
        this.subfieldCount = subfieldCount;
    }

    public long getTopicCount() {
        return topicCount;
    }

    public void setTopicCount(long topicCount) {
        this.topicCount = topicCount;
    }

    public Integer getYearMin() {
        return yearMin;
    }

    public void setYearMin(Integer yearMin) {
        this.yearMin = yearMin;
    }

    public Integer getYearMax() {
        return yearMax;
    }

    public void setYearMax(Integer yearMax) {
        this.yearMax = yearMax;
    }

    public String getMethodsText() {
        return methodsText;
    }

    public void setMethodsText(String methodsText) {
        this.methodsText = methodsText;
    }
}
