# Paperflow Java Admin Overview

本文定义 Paperflow Java 后端管理服务的第一版边界。该服务是
PostgreSQL 数据库的只读消费层，不替代 Python pipeline。

## 目标

Java 后端只做三件事：

1. 从 Paperflow 项目库读取 `source`、`work`、`original_file`、
   `original_file_job`、`text_file`、`block*` 表。
2. 将数据库行组织成前端或 Swagger UI 需要的 JSON DTO。
3. 通过 REST API 暴露 Source 概览、Work 搜索、Work 详情、Original File
   blocks 和 `DATA_ROOT` 下只读文件资产。

Python 项目继续负责所有数据生产：

- OpenAlex Metadata Import
- Original File Import
- Matching
- Text Parsing
- Block Import

## 非目标

第一版 Java 后端不做：

- 数据导入、匹配、解析、block 入库。
- 修改 Paperflow 表，包括状态重置、人工修正匹配、重试任务。
- 触发 Python CLI 或 MinerU。
- 读取配置的 `DATA_ROOT` 之外的磁盘文件、下载远程 PDF、生成或修改 parsed
  图片。
- 应用登录鉴权、角色权限、CORS、缓存。
- 前端页面。

这些能力只有在只读 API 稳定后再单独设计。

## 第一版功能

只提供只读 REST JSON 端点：

```text
GET /api/task-status
GET /api/sources
GET /api/sources/{sourceId}
GET /api/works
GET /api/works/{workId}
GET /api/works/{workId}/blocks
GET /api/original-files
GET /api/original-files/{fileId}
GET /api/original-files/{fileId}/blocks
GET /api/assets/**
```

API 契约见 `docs_java/api.yaml`。

## 技术栈

第一版推荐：

- Java 17
- Spring Boot 3.x
- Maven
- Spring Web
- MyBatis XML mapper
- PostgreSQL JDBC driver
- Bean Validation
- springdoc-openapi Swagger UI
- JUnit/Spring Boot Test

不引入 JPA、Spring Security、Redis、Lombok、GraphQL、jOOQ 或 Docker。

## 项目位置

后续实现代码时，Java 子项目放在仓库根目录：

```text
java-admin/
```

推荐包结构：

```text
com.paperflow.admin
├── PaperflowAdminApplication
├── config
├── controller
├── service
├── mapper
├── dto
└── model
```

层职责：

- `controller`: REST 入参、校验和响应。
- `service`: 查询编排、分页处理、`processingStatus` 派生。
- `mapper`: MyBatis SQL。
- `dto`: API 响应 record。
- `model`: 数据库行或查询投影对象。

不要提前添加 `domain`、`infra`、`facade`、`common`、`utils` 等目录。

## 数据库访问

Java 后端默认复用 `.env` 中的 `PAPERFLOW_DB_*` 连接配置。部署时建议让这些
变量指向只读账号；Java 代码和 MyBatis SQL 仍只允许读取 Paperflow schema
中的表，不能 `INSERT`、`UPDATE` 或 `DELETE`。

schema 通过 JDBC URL 的 `currentSchema` 指定：

```text
jdbc:postgresql://${PAPERFLOW_DB_HOST}:${PAPERFLOW_DB_PORT}/${PAPERFLOW_DB_NAME}?currentSchema=${PAPERFLOW_DB_SCHEMA}
```

MyBatis SQL 使用裸表名，不动态拼接 schema。

## 配置

第一版只需要以下配置项：

```yaml
spring:
  config:
    import:
      - optional:file:.env[.properties]
      - optional:file:../.env[.properties]
  datasource:
    url: "jdbc:postgresql://${PAPERFLOW_DB_HOST:localhost}:${PAPERFLOW_DB_PORT:5432}/${PAPERFLOW_DB_NAME:paperflow}?currentSchema=${PAPERFLOW_DB_SCHEMA:widi_chengyan}"
    username: ${PAPERFLOW_DB_USER:paperflow}
    password: ${PAPERFLOW_DB_PASSWORD:password}
    hikari:
      maximum-pool-size: 10
mybatis:
  mapper-locations: classpath:mapper/*.xml
  configuration:
    map-underscore-to-camel-case: true
springdoc:
  enable-default-api-docs: false
  swagger-ui:
    url: /api.yaml
paperflow:
  database:
    schema: paperflow
  api:
    default-page-size: 20
    max-page-size: 100
    default-block-page-size: 100
    max-block-page-size: 500
    data-root: ${DATA_ROOT:data}
```

Blocks 接口单独使用默认 `size=100`、最大 `size=500`。
资产接口只解析并读取 `paperflow.api.data-root` 下的相对路径。

## OpenAPI 和 Swagger

`docs_java/api.yaml` 是唯一 OpenAPI 契约源。`java-admin/pom.xml` 在构建和
运行时把它作为 classpath 静态资源打包为 `/api.yaml`。Swagger UI 使用
springdoc UI，但只加载 `/api.yaml`：

```text
/swagger-ui/index.html
/api.yaml
/v3/api-docs
```

`/v3/api-docs` 由 Java controller 返回同一份 classpath YAML。springdoc 默认
生成式 api-docs 关闭，避免运行时 Swagger/OpenAPI 与 `docs_java/api.yaml`
产生第二份契约。

## 运行方式

第一版只文档化本地运行：

```bash
cd java-admin
mvn spring-boot:run
```

或打包后运行：

```bash
cd java-admin
mvn package
java -jar target/*.jar
```
