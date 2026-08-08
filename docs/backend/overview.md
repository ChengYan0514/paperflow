# Paperflow Java Admin Overview

本文定义 Paperflow Java 后端管理服务当前已经实现的边界。当前服务对 Paperflow
业务表保持只读，只为登录、用户管理和审计写入本地管理表，不替代 Python
pipeline。已经接受但尚未实施的 Paper CRUD 新边界见 ADR 0003 和
`docs/paper-crud-implementation-plan.md`；实现该计划时必须同步修订本文。

## 目标

Java 后端只做七件事：

1. 从 Paperflow 项目库读取 `source`、`work`、`original_file`、
   `original_file_job`、`text_file`、`block*` 表。
2. 将数据库行组织成前端或 Swagger UI 需要的 JSON DTO。
3. 通过 REST API 暴露 Source 概览、Work 搜索、Work 详情、Original File
   blocks 和 `DATA_ROOT` 下只读文件资产。
4. 通过本地 Admin User 账号提供后台登录、退出、当前用户和用户管理接口。
5. 提供服务状态、最近错误摘要和结构化操作审计查询。
6. 为 Source、Work、Original File 列表提供按当前筛选导出 CSV。
7. 从独立或同库的 causal 数据源提供只读因果知识图谱查询，包括总览、关系、变量、
   论文证据和领域分析。

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
- JWT、SSO、自注册、动态权限矩阵和 CORS。
- 前端页面。

Paperflow 业务数据仍然不通过 Java 后端写入。

## 第一版功能

提供登录、用户管理和只读业务 REST JSON 端点：

```text
GET /api/auth/csrf
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
POST /api/auth/change-password
GET /api/admin-users
POST /api/admin-users
PATCH /api/admin-users/{id}
POST /api/admin-users/{id}/reset-password
GET /api/admin-roles
GET /api/admin-audit-logs
GET /api/task-status
GET /api/service-status
GET /api/sources
GET /api/sources/export
GET /api/sources/{sourceId}
GET /api/works
GET /api/works/export
GET /api/works/{workId}
GET /api/works/{workId}/blocks
GET /api/original-files
GET /api/original-files/export
GET /api/original-files/{fileId}
GET /api/original-files/{fileId}/blocks
GET /api/assets/**
GET /api/knowledge/causal-graph/summary
GET /api/knowledge/causal-graph/graph
GET /api/knowledge/causal-graph/search/nodes
GET /api/knowledge/causal-graph/search/terms
GET /api/knowledge/causal-graph/search/papers
GET /api/knowledge/causal-graph/nodes/{variable}
GET /api/knowledge/causal-graph/edges
GET /api/knowledge/causal-graph/claims/{claimId}
GET /api/knowledge/causal-graph/papers/{workId}
GET /api/knowledge/causal-graph/papers/{workId}/summary
GET /api/knowledge/causal-graph/fields
```

API 契约见 `docs/backend/api.yaml`。

## 技术栈

第一版推荐：

- Java 17
- Spring Boot 3.x
- Maven
- Spring Web
- Spring Security
- MyBatis XML mapper
- PostgreSQL JDBC driver
- Bean Validation
- springdoc-openapi Swagger UI
- JUnit/Spring Boot Test

不引入 JPA、Redis、Lombok、GraphQL、jOOQ 或 Docker。

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
变量指向最小权限账号：允许读取 Paperflow 业务表，只允许写当前 schema 中的
`admin_user` 和 `admin_audit_log` 表。
如果 causal knowledge graph 在另一套数据库中，再额外设置 `CAUSAL_DB_*`；
知识图谱相关的 MyBatis mapper 会使用这组连接。

schema 通过 JDBC URL 的 `currentSchema` 指定：

```text
jdbc:postgresql://${PAPERFLOW_DB_HOST}:${PAPERFLOW_DB_PORT}/${PAPERFLOW_DB_NAME}?currentSchema=${PAPERFLOW_DB_SCHEMA}
```

causal knowledge graph 的数据库也可以通过独立 schema 指定：

```text
jdbc:postgresql://${CAUSAL_DB_HOST}:${CAUSAL_DB_PORT}/${CAUSAL_DB_NAME}?currentSchema=${CAUSAL_DB_SCHEMA}
```

MyBatis SQL 使用裸表名，不动态拼接 schema。

## Admin User

`admin_user` 位于当前 schema，不单独创建 schema。用户名大小写不敏感，使用
`username_normalized` 做唯一约束；用户名只允许 ASCII 字母、数字、下划线、
点和短横线，长度 3-50。密码只保存 BCrypt hash。每个 Admin User 只有一个
固定角色：`SUPER_ADMIN`、`ADMIN` 或 `USER`。用户名创建后不可修改；需要更换登录名时新建账号
并禁用旧账号。

`SUPER_ADMIN` 可以管理所有用户并访问角色管理；`ADMIN` 只能管理 `USER`；
`USER` 只能访问现有只读业务页面。管理员可以修改自己的密码，但不能禁用自己
或把自己降级。用户离职或不再使用时禁用账号，不物理删除。系统必须始终至少
保留一个启用状态的 `SUPER_ADMIN`。

首个 `SUPER_ADMIN` 由 `docs/admin_user_init.sql` 初始化；应用启动时不自动创建
默认管理员。默认账号为 `admin`，默认密码为 `admin`，首次登录后应立即修改。

登录态使用同源 HttpOnly Session Cookie。所有写请求启用 Spring Security CSRF
防护，前端先调用 `GET /api/auth/csrf` 初始化 token，再从 `XSRF-TOKEN` cookie
读取 token，并通过 `X-XSRF-TOKEN` header 提交。

账号规则：

- 用户名创建和登录时先 trim，再按 `Locale.ROOT` 小写写入
  `username_normalized`；密码不 trim。
- `display_name` trim 后为空则存 `NULL`。
- `role` 只接受大写 `SUPER_ADMIN`、`ADMIN` 或 `USER`。
- 创建用户默认 `enabled=true`，禁用账号登录时仍返回统一 401。
- 用户列表不分页、不搜索、不筛选，按 `created_at DESC, id DESC` 排序。
- `last_login_at` 登录成功时使用数据库 `now()` 更新；更新失败则登录失败。
- `created_at`、`updated_at`、`last_login_at` 使用数据库时间；不使用 trigger，
  更新 SQL 显式设置 `updated_at = now()`。
- 允许同账号多端同时登录；改密码或重置密码不主动踢掉已有会话。
- 生产环境必须使用 HTTPS，并设置 `SESSION_COOKIE_SECURE=true`。
- 匿名 API 只开放 `GET /api/auth/csrf` 和 `POST /api/auth/login`；`/api.yaml`、
  `/v3/api-docs` 和 Swagger UI 需要登录。
- 未登录和无权限 API 返回 JSON `ErrorResponse`，不返回 HTML 登录页或重定向。
- 不做失败锁定、登录限流、忘记密码、头像、邮箱、手机号、备注、
  `created_by`、`updated_by`、`deleted_at`、逻辑删除、角色/启用状态
  索引或迁移框架。

推荐表结构：

```sql
CREATE TABLE admin_user (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL CHECK (username ~ '^[A-Za-z0-9_.-]{3,50}$'),
  username_normalized VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  display_name VARCHAR(100),
  role VARCHAR(20) NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'USER')),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Admin Audit Log

`admin_audit_log` 位于当前 schema，用于记录本地管理操作，不写 Paperflow 业务表。
应用启动时会用 `CREATE TABLE IF NOT EXISTS` 确保该表和基础索引存在；
`docs/admin_user_init.sql` 也包含同一表结构，便于手工初始化。

当前记录的事件：

- 登录成功和登录失败。
- 退出登录。
- 创建用户、更新用户、重置密码。
- 修改自己的密码。

审计字段包括 actorId、actorUsername、action、targetType、targetId、result、
requestId、remoteAddr、userAgent、message、createdAt。只有 `SUPER_ADMIN`
可以通过 `GET /api/admin-audit-logs` 查询。

## Service Status and Failure Guidance

`GET /api/service-status` 需要登录后访问，返回 Java 后端、数据库连接、
`DATA_ROOT`、磁盘空间、版本号和最近未处理 API 错误摘要。最近错误只保存在进程内，
用于管理台快速定位，不替代集中日志系统。

失败任务处理仍保持只读。前端 `/failure-tasks` 复用 Original File 查询失败项，
只展示解释、上下文入口和可复制的 Python CLI 建议命令；Java 后端不执行这些命令。

列表导出接口返回 UTF-8 BOM CSV：

```text
GET /api/sources/export
GET /api/works/export
GET /api/original-files/export
```

导出复用列表筛选和排序参数，不分页。

## 配置

本地环境读取 `java-admin/.env` 或仓库根目录 `.env`。生产环境由 systemd 读取
`/etc/paperflow-admin/admin.env`；完整部署步骤见 `docs/admin_runbook.md`。

```yaml
spring:
  config:
    import:
      - optional:file:.env[.properties]
      - optional:file:../.env[.properties]
  datasource:
    url: "jdbc:postgresql://${PAPERFLOW_DB_HOST:localhost}:${PAPERFLOW_DB_PORT:5432}/${PAPERFLOW_DB_NAME:paperflow}?currentSchema=${PAPERFLOW_DB_SCHEMA:paperflow}"
    username: ${PAPERFLOW_DB_USER:paperflow}
    password: ${PAPERFLOW_DB_PASSWORD:password}
    hikari:
      maximum-pool-size: 10
server:
  address: ${SERVER_ADDRESS:127.0.0.1}
  forward-headers-strategy: framework
  servlet:
    session:
      cookie:
        secure: ${SESSION_COOKIE_SECURE:false}
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

`LOG_FILE` 设置后端日志文件。默认单个日志文件最大 20 MB，保留 30 天，历史日志总量
上限 1 GB；可通过 `LOG_MAX_FILE_SIZE`、`LOG_MAX_HISTORY` 和 `LOG_TOTAL_SIZE_CAP`
覆盖。数据库账号读取 Paperflow 业务表，并读写 `admin_user` 和 `admin_audit_log`。

Blocks 接口单独使用默认 `size=100`、最大 `size=500`。
资产接口只解析并读取 `paperflow.api.data-root` 下的相对路径。

## OpenAPI 和 Swagger

`docs/backend/api.yaml` 是唯一 OpenAPI 契约源。`java-admin/pom.xml` 在构建和
运行时把它作为 classpath 静态资源打包为 `/api.yaml`。Swagger UI 使用
springdoc UI，但只加载 `/api.yaml`：

```text
/swagger-ui/index.html
/api.yaml
/v3/api-docs
```

`/v3/api-docs` 由 Java controller 返回同一份 classpath YAML。springdoc 默认
生成式 api-docs 关闭，避免运行时 Swagger/OpenAPI 与 `docs/backend/api.yaml`
产生第二份契约。`/api.yaml`、`/v3/api-docs` 和 Swagger UI 需要登录后访问。

## 运行方式

本地运行：

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

生产部署使用 `docs/admin_runbook.md` 中的 Nginx 和 systemd 步骤。
