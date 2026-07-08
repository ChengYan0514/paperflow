# Java Admin Vibe Coding Rules

本文是给 AI 和开发者的 Java 后端生成规范。目标是让第一版只读 API 稳定落地，
不把 Python pipeline 的业务逻辑搬进 Java。

## 改代码前必须读

每次修改 Java 后端或 Java 文档前，先读：

1. `CONTEXT.md`
2. `architecture.md`
3. `docs/db_design.md`
4. `docs_java/overview.md`
5. `docs_java/api.yaml`
6. `docs_java/db_read_model.md`

涉及 API 契约时，先改 `docs_java/api.yaml`，再改 Controller/DTO/Mapper。
修改 `docs_java/api.yaml` 后，用以下命令确认 YAML 可解析：

```bash
uv run python -c "import yaml; yaml.safe_load(open('docs_java/api.yaml'))"
```

## 硬边界

Java 后端第一版只读。禁止生成以下能力：

- `INSERT`、`UPDATE`、`DELETE`、DDL、迁移脚本。
- 修改 `original_file_job` 状态。
- 人工修正 Matching。
- 调用 Python CLI、MinerU 或外部采集程序。
- 读取 `DATA_ROOT` 之外的文件、写入文件、下载远程 PDF、生成或修改 parsed
  图片。
- 登录、角色、JWT、Spring Security。
- Redis、缓存、消息队列、定时任务。
- GraphQL、WebSocket、前端页面。

如果需求需要这些能力，先更新设计文档并单独评审。

## 技术栈限制

使用：

- Java 17
- Spring Boot 3.x
- Maven
- Spring Web
- MyBatis XML mapper
- PostgreSQL JDBC
- Bean Validation
- springdoc-openapi
- Spring Boot Test

不要引入：

- JPA/Hibernate
- Lombok
- Redis
- Spring Security
- jOOQ
- Testcontainers
- Docker 配置

新增依赖前必须先说明为什么现有依赖和 JDK 标准库不够。

## 包结构

Java 代码放在 `java-admin/`，包名：

```text
com.paperflow.admin
```

第一版只保留：

```text
config
controller
service
mapper
dto
model
```

不要提前创建 `common`、`utils`、`facade`、`infra`、`domain` 等目录。

## API 规范

- REST + JSON。
- JSON 字段使用 camelCase。
- OpenAlex ID 只支持短 ID：`S...`、`W...`。
- 路径参数轻量校验前缀，不实现完整 OpenAlex URL 归一化。
- 分页参数 `page` 从 1 开始。
- 普通列表默认 `size=20`、最大 `size=100`。
- Blocks 默认 `size=100`、最大 `size=500`。
- Work 列表默认排序：
  `publicationYear DESC NULLS LAST, workId ASC`。
- Blocks 固定按 `blockSeq ASC` 排序。
- 错误响应必须符合 `docs_java/api.yaml`。
- `docs_java/api.yaml` 是唯一 OpenAPI 契约源；Swagger UI 必须加载运行时
  `/api.yaml` 静态资源，`/v3/api-docs` 必须返回同一份资源，不启用生成式
  api-docs 作为第二份契约。

## 数据库规范

- Java 默认复用 `.env` 中的 `PAPERFLOW_DB_*` 连接配置；部署时建议这些变量
  指向 PostgreSQL 只读账号。
- schema 通过 JDBC URL `currentSchema` 设置。
- MyBatis SQL 使用裸表名，不拼 `${schema}`。
- SQL 写在 `src/main/resources/mapper/*.xml`。
- 默认不打印 SQL 和参数日志。
- `pdf_bbox` 用 `pdf_bbox::text` 查询，Service 用 Jackson 转 `JsonNode`。
- 不写 MyBatis TypeHandler，除非多个 JSONB 字段都需要统一处理。
- 文件资产只能通过 `paperflow.api.data-root` 解析数据库中的相对路径，必须拒绝
  `..` 或绝对路径。

## DTO 和模型

- API 响应 DTO 优先使用 Java `record`。
- MyBatis 查询模型可以使用普通 class，便于映射。
- 不引入 Lombok。
- `processingStatus` 只在 Java Service 中派生，不写回数据库。
- Block 使用一个统一 DTO，不做多态 JSON 子类。

## 测试和检查

改 Java 代码后至少运行：

```bash
cd java-admin
mvn test
```

第一版测试重点：

- `processingStatus` 派生规则。
- 分页参数校验。
- ID 和搜索参数校验。
- 错误响应格式。

暂不上 Testcontainers。Mapper SQL 先通过本地只读库或后续集成测试验证。

## 文档维护

- 新增 `java-admin/` 代码结构时，同步更新 `architecture.md`。
- API 字段、路径、错误码、分页规则变化时，同步更新
  `docs_java/api.yaml`。
- 查询口径、状态派生、表关联变化时，同步更新
  `docs_java/db_read_model.md`。
- 不要把已废弃的设计留在活动文档正文里。
