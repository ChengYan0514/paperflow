package com.paperflow.admin.controller;

import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;

public final class RequestIds {
    private RequestIds() {}

    public static String get(HttpServletRequest request) {
        Object existing = request.getAttribute("paperflowRequestId");
        if (existing instanceof String requestId) {
            return requestId;
        }
        String requestId = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        request.setAttribute("paperflowRequestId", requestId);
        return requestId;
    }
}
