package com.paperflow.admin.model;

public class MatchedFileRow {
    private String fileId;
    private String sourceId;
    private Integer year;
    private String paperTitle;
    private String authors;
    private String doi;
    private String url;
    private String provider;
    private String originalFileName;
    private String originalFilePath;
    private String originalFileType;
    private Long fileSize;
    private Integer flagMatch;
    private String matchedWorkId;
    private Integer flagText;
    private Integer flagBlock;

    public String getFileId() {
        return fileId;
    }

    public void setFileId(String fileId) {
        this.fileId = fileId;
    }

    public String getSourceId() {
        return sourceId;
    }

    public void setSourceId(String sourceId) {
        this.sourceId = sourceId;
    }

    public Integer getYear() {
        return year;
    }

    public void setYear(Integer year) {
        this.year = year;
    }

    public String getPaperTitle() {
        return paperTitle;
    }

    public void setPaperTitle(String paperTitle) {
        this.paperTitle = paperTitle;
    }

    public String getAuthors() {
        return authors;
    }

    public void setAuthors(String authors) {
        this.authors = authors;
    }

    public String getDoi() {
        return doi;
    }

    public void setDoi(String doi) {
        this.doi = doi;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getOriginalFileName() {
        return originalFileName;
    }

    public void setOriginalFileName(String originalFileName) {
        this.originalFileName = originalFileName;
    }

    public String getOriginalFilePath() {
        return originalFilePath;
    }

    public void setOriginalFilePath(String originalFilePath) {
        this.originalFilePath = originalFilePath;
    }

    public String getOriginalFileType() {
        return originalFileType;
    }

    public void setOriginalFileType(String originalFileType) {
        this.originalFileType = originalFileType;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    public Integer getFlagMatch() {
        return flagMatch;
    }

    public void setFlagMatch(Integer flagMatch) {
        this.flagMatch = flagMatch;
    }

    public String getMatchedWorkId() {
        return matchedWorkId;
    }

    public void setMatchedWorkId(String matchedWorkId) {
        this.matchedWorkId = matchedWorkId;
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
