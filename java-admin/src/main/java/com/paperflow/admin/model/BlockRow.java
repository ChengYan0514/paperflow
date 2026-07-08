package com.paperflow.admin.model;

public class BlockRow {
    private String blockId;
    private String fileId;
    private String blockType;
    private String blockText;
    private Integer pdfPage;
    private String pdfBboxJson;
    private Integer blockSeq;
    private String parentTitleBlockId;
    private Integer titleLevel;
    private String imagePath;
    private String imageCaption;
    private String imageFootnote;
    private String tableImagePath;
    private String tableCaption;
    private String tableFootnote;
    private String equationImagePath;
    private String equationFormat;
    private String footnoteLabel;
    private String footnoteText;
    private String referencesText;
    private String parsedDirectory;

    public String getBlockId() {
        return blockId;
    }

    public void setBlockId(String blockId) {
        this.blockId = blockId;
    }

    public String getFileId() {
        return fileId;
    }

    public void setFileId(String fileId) {
        this.fileId = fileId;
    }

    public String getBlockType() {
        return blockType;
    }

    public void setBlockType(String blockType) {
        this.blockType = blockType;
    }

    public String getBlockText() {
        return blockText;
    }

    public void setBlockText(String blockText) {
        this.blockText = blockText;
    }

    public Integer getPdfPage() {
        return pdfPage;
    }

    public void setPdfPage(Integer pdfPage) {
        this.pdfPage = pdfPage;
    }

    public String getPdfBboxJson() {
        return pdfBboxJson;
    }

    public void setPdfBboxJson(String pdfBboxJson) {
        this.pdfBboxJson = pdfBboxJson;
    }

    public Integer getBlockSeq() {
        return blockSeq;
    }

    public void setBlockSeq(Integer blockSeq) {
        this.blockSeq = blockSeq;
    }

    public String getParentTitleBlockId() {
        return parentTitleBlockId;
    }

    public void setParentTitleBlockId(String parentTitleBlockId) {
        this.parentTitleBlockId = parentTitleBlockId;
    }

    public Integer getTitleLevel() {
        return titleLevel;
    }

    public void setTitleLevel(Integer titleLevel) {
        this.titleLevel = titleLevel;
    }

    public String getImagePath() {
        return imagePath;
    }

    public void setImagePath(String imagePath) {
        this.imagePath = imagePath;
    }

    public String getImageCaption() {
        return imageCaption;
    }

    public void setImageCaption(String imageCaption) {
        this.imageCaption = imageCaption;
    }

    public String getImageFootnote() {
        return imageFootnote;
    }

    public void setImageFootnote(String imageFootnote) {
        this.imageFootnote = imageFootnote;
    }

    public String getTableImagePath() {
        return tableImagePath;
    }

    public void setTableImagePath(String tableImagePath) {
        this.tableImagePath = tableImagePath;
    }

    public String getTableCaption() {
        return tableCaption;
    }

    public void setTableCaption(String tableCaption) {
        this.tableCaption = tableCaption;
    }

    public String getTableFootnote() {
        return tableFootnote;
    }

    public void setTableFootnote(String tableFootnote) {
        this.tableFootnote = tableFootnote;
    }

    public String getEquationImagePath() {
        return equationImagePath;
    }

    public void setEquationImagePath(String equationImagePath) {
        this.equationImagePath = equationImagePath;
    }

    public String getEquationFormat() {
        return equationFormat;
    }

    public void setEquationFormat(String equationFormat) {
        this.equationFormat = equationFormat;
    }

    public String getFootnoteLabel() {
        return footnoteLabel;
    }

    public void setFootnoteLabel(String footnoteLabel) {
        this.footnoteLabel = footnoteLabel;
    }

    public String getFootnoteText() {
        return footnoteText;
    }

    public void setFootnoteText(String footnoteText) {
        this.footnoteText = footnoteText;
    }

    public String getReferencesText() {
        return referencesText;
    }

    public void setReferencesText(String referencesText) {
        this.referencesText = referencesText;
    }

    public String getParsedDirectory() {
        return parsedDirectory;
    }

    public void setParsedDirectory(String parsedDirectory) {
        this.parsedDirectory = parsedDirectory;
    }
}
