package com.paperflow.admin.model;

import java.time.LocalDateTime;

public class OpenAlexSourceRow {
    private String sourceId;
    private String issnL;
    private String issn;
    private String displayName;
    private String publisher;
    private Integer worksCount;
    private Integer citedByCount;
    private Boolean oa;
    private Boolean inDoaj;
    private String homepageUrl;
    private LocalDateTime updatedDate;

    public String getSourceId() { return sourceId; }
    public void setSourceId(String sourceId) { this.sourceId = sourceId; }
    public String getIssnL() { return issnL; }
    public void setIssnL(String issnL) { this.issnL = issnL; }
    public String getIssn() { return issn; }
    public void setIssn(String issn) { this.issn = issn; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public String getPublisher() { return publisher; }
    public void setPublisher(String publisher) { this.publisher = publisher; }
    public Integer getWorksCount() { return worksCount; }
    public void setWorksCount(Integer worksCount) { this.worksCount = worksCount; }
    public Integer getCitedByCount() { return citedByCount; }
    public void setCitedByCount(Integer citedByCount) { this.citedByCount = citedByCount; }
    public Boolean getOa() { return oa; }
    public void setOa(Boolean oa) { this.oa = oa; }
    public Boolean getInDoaj() { return inDoaj; }
    public void setInDoaj(Boolean inDoaj) { this.inDoaj = inDoaj; }
    public String getHomepageUrl() { return homepageUrl; }
    public void setHomepageUrl(String homepageUrl) { this.homepageUrl = homepageUrl; }
    public LocalDateTime getUpdatedDate() { return updatedDate; }
    public void setUpdatedDate(LocalDateTime updatedDate) { this.updatedDate = updatedDate; }
}
