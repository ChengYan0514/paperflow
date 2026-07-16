package com.paperflow.admin.model;

public class CausalPaperSearchRow {
    private String workId;
    private String title;
    private Integer publicationYear;
    private String sourceName;
    private long claimRecordCount;

    public String getWorkId() {
        return workId;
    }

    public void setWorkId(String workId) {
        this.workId = workId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Integer getPublicationYear() {
        return publicationYear;
    }

    public void setPublicationYear(Integer publicationYear) {
        this.publicationYear = publicationYear;
    }

    public String getSourceName() {
        return sourceName;
    }

    public void setSourceName(String sourceName) {
        this.sourceName = sourceName;
    }

    public long getClaimRecordCount() {
        return claimRecordCount;
    }

    public void setClaimRecordCount(long claimRecordCount) {
        this.claimRecordCount = claimRecordCount;
    }
}
