package com.paperflow.admin;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.mybatis.spring.annotation.MapperScan;

@MapperScan("com.paperflow.admin.mapper")
@SpringBootApplication
public class PaperflowAdminApplication {
    public static void main(String[] args) {
        SpringApplication.run(PaperflowAdminApplication.class, args);
    }
}
