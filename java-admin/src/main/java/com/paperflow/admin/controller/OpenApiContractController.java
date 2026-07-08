package com.paperflow.admin.controller;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
public class OpenApiContractController {
    @ResponseBody
    @GetMapping(value = "/v3/api-docs", produces = "application/yaml")
    public ClassPathResource openApiDocs() {
        return new ClassPathResource("static/api.yaml");
    }
}
