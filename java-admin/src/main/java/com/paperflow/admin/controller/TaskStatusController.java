package com.paperflow.admin.controller;

import com.paperflow.admin.dto.TaskStatusResponse;
import com.paperflow.admin.service.AdminService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/task-status")
public class TaskStatusController {
    private final AdminService service;

    public TaskStatusController(AdminService service) {
        this.service = service;
    }

    @GetMapping
    public TaskStatusResponse getTaskStatus() {
        return service.getTaskStatus();
    }
}
