package com.paperflow.admin.service;

public record PageRequest(int page, int size, int offset) {
    public static PageRequest of(Integer page, Integer size, int defaultSize, int maxSize) {
        int resolvedPage = page == null ? 1 : page;
        int resolvedSize = size == null ? defaultSize : size;
        if (resolvedPage < 1 || resolvedSize < 1 || resolvedSize > maxSize) {
            throw new IllegalArgumentException("Invalid request");
        }
        return new PageRequest(resolvedPage, resolvedSize, (resolvedPage - 1) * resolvedSize);
    }
}
