package com.paperflow.admin.model;

public class CausalOverviewRow {
    private long totalClaimRecords;
    private long totalStandardClaims;
    private long totalPapers;
    private long totalNodes;
    private long totalEdges;
    private long graphNodes;
    private long graphEdges;

    public long getTotalClaimRecords() {
        return totalClaimRecords;
    }

    public void setTotalClaimRecords(long totalClaimRecords) {
        this.totalClaimRecords = totalClaimRecords;
    }

    public long getTotalStandardClaims() {
        return totalStandardClaims;
    }

    public void setTotalStandardClaims(long totalStandardClaims) {
        this.totalStandardClaims = totalStandardClaims;
    }

    public long getTotalPapers() {
        return totalPapers;
    }

    public void setTotalPapers(long totalPapers) {
        this.totalPapers = totalPapers;
    }

    public long getTotalNodes() {
        return totalNodes;
    }

    public void setTotalNodes(long totalNodes) {
        this.totalNodes = totalNodes;
    }

    public long getTotalEdges() {
        return totalEdges;
    }

    public void setTotalEdges(long totalEdges) {
        this.totalEdges = totalEdges;
    }

    public long getGraphNodes() {
        return graphNodes;
    }

    public void setGraphNodes(long graphNodes) {
        this.graphNodes = graphNodes;
    }

    public long getGraphEdges() {
        return graphEdges;
    }

    public void setGraphEdges(long graphEdges) {
        this.graphEdges = graphEdges;
    }
}
