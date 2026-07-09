package com.paperflow.admin.controller;

import com.paperflow.admin.dto.ServiceStatusResponse;
import com.paperflow.admin.service.ServiceStatusService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/service-status")
public class ServiceStatusController {
    private final ServiceStatusService service;

    public ServiceStatusController(ServiceStatusService service) {
        this.service = service;
    }

    @GetMapping
    public ServiceStatusResponse status() {
        return service.status();
    }
}
