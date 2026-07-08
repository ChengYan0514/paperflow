package com.paperflow.admin.model;

public class WorkRow {
    private String workId;
    private String title;
    private String doi;
    private Integer publicationYear;
    private String publicationDate;
    private String type;
    private String language;
    private String sourceIds;
    private String matchedFileId;
    private Integer flagMatch;
    private Integer flagText;
    private Integer flagBlock;

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

    public String getDoi() {
        return doi;
    }

    public void setDoi(String doi) {
        this.doi = doi;
    }

    public Integer getPublicationYear() {
        return publicationYear;
    }

    public void setPublicationYear(Integer publicationYear) {
        this.publicationYear = publicationYear;
    }

    public String getPublicationDate() {
        return publicationDate;
    }

    public void setPublicationDate(String publicationDate) {
        this.publicationDate = publicationDate;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getSourceIds() {
        return sourceIds;
    }

    public void setSourceIds(String sourceIds) {
        this.sourceIds = sourceIds;
    }

    public String getMatchedFileId() {
        return matchedFileId;
    }

    public void setMatchedFileId(String matchedFileId) {
        this.matchedFileId = matchedFileId;
    }

    public Integer getFlagMatch() {
        return flagMatch;
    }

    public void setFlagMatch(Integer flagMatch) {
        this.flagMatch = flagMatch;
    }

    public Integer getFlagText() {
        return flagText;
    }

    public void setFlagText(Integer flagText) {
        this.flagText = flagText;
    }

    public Integer getFlagBlock() {
        return flagBlock;
    }

    public void setFlagBlock(Integer flagBlock) {
        this.flagBlock = flagBlock;
    }
}
