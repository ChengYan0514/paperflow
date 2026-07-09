package com.paperflow.admin.service;

import com.paperflow.admin.dto.RecentErrorDto;
import java.time.OffsetDateTime;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class RecentErrorService {
    private final ArrayDeque<RecentErrorDto> recentErrors = new ArrayDeque<>();

    public synchronized void record(String requestId, String method, String path, String message) {
        recentErrors.addFirst(new RecentErrorDto(requestId, method, path, message, OffsetDateTime.now()));
        while (recentErrors.size() > 20) {
            recentErrors.removeLast();
        }
    }

    public synchronized List<RecentErrorDto> recentErrors() {
        return new ArrayList<>(recentErrors);
    }
}
