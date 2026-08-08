package com.paperflow.admin;

import com.paperflow.admin.mapper.CausalMapper;
import com.paperflow.admin.mapper.OpenAlexMapper;
import org.apache.ibatis.annotations.Mapper;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.mybatis.spring.annotation.MapperScan;

@MapperScan(basePackages = "com.paperflow.admin.mapper", annotationClass = Mapper.class, sqlSessionTemplateRef = "sqlSessionTemplate")
@MapperScan(basePackages = "com.paperflow.admin.mapper", annotationClass = CausalMapper.class, sqlSessionTemplateRef = "causalSqlSessionTemplate")
@MapperScan(basePackages = "com.paperflow.admin.mapper", annotationClass = OpenAlexMapper.class, sqlSessionTemplateRef = "openAlexSqlSessionTemplate")
@SpringBootApplication
public class PaperflowAdminApplication {
    public static void main(String[] args) {
        SpringApplication.run(PaperflowAdminApplication.class, args);
    }
}
