# Paperflow Admin Platform 设计说明

## 1. 文档概述

本文说明 Paperflow Admin Platform 的项目设计，包括系统定位、功能模块、技术架构、
数据边界、接口设计、权限设计、资产访问和现有数据库表结构。文档用于帮助项目参与者
理解当前管理平台如何读取 Paperflow 数据、如何组织后台功能，以及后续扩展功能时应
遵守哪些现有设计约束。

相关参考文档：

- `CONTEXT.md`：Paperflow 领域术语。
- `docs/db_design.md`：Paperflow 业务数据库完整设计。
- `docs_java/db_read_model.md`：Java 后端业务读模型与统计口径。
- `docs_java/api.yaml`：当前后端 OpenAPI 契约。
- `docs/admin_runbook.md`：本地运行和验收说明。

## 2. 项目定位

Paperflow Admin Platform 是 Paperflow 数据库的独立管理平台。它面向管理人员提供
只读业务数据浏览、任务状态观测、失败任务排查、用户管理、角色管理、操作审计和
CSV 导出能力。

项目由两个主要子系统组成：

- `java-admin/`：Spring Boot 后端，负责认证鉴权、REST API、业务只读查询、管理表写入和资产访问。
- `web-admin-pro/`：Ant Design Pro / Umi Max 前端，负责后台页面、菜单、表格、详情页和交互。

管理平台读取 Paperflow PostgreSQL 业务表和 `DATA_ROOT` 下的文件资产。它不负责
导入 OpenAlex 元数据、不导入原始文件、不执行匹配、不调用 MinerU、不执行 Block
入库，也不修改 Paperflow 业务表。当前平台只写本地管理表，例如 `admin_user` 和
`admin_audit_log`。

## 3. 系统边界

### 3.1 已有能力

当前系统已经实现：

- Session/CSRF 登录、退出、当前用户、修改密码。
- 固定角色：`SUPER_ADMIN`、`ADMIN`、`USER`。
- 管理用户维护、角色说明、操作审计。
- Source、Work、Original File 列表和详情。
- Work 与 Original File 的 parsed Blocks 阅读。
- 原始文件和 parsed 资产访问。
- Source、Work、Original File CSV 导出。
- 任务状态、服务状态、失败任务说明。
- Swagger UI 和 OpenAPI YAML 访问。

### 3.2 当前非目标

当前系统不做：

- OpenAlex Metadata Import。
- Original File Import。
- Matching。
- Text Parsing。
- Block Import。
- Python CLI 或 MinerU 调度。
- Paperflow 业务表写入。
- 动态权限矩阵、SSO、JWT、自注册。
- 知识库和块搜索的正式业务能力；当前相关页面为占位。

### 3.3 业务表只读原则

管理平台对 Paperflow 业务表保持只读。允许写入的表限于管理平台自身表：

- `admin_user`
- `admin_audit_log`

后续如果新增管理平台功能需要持久化数据，应新增独立的管理平台表，并通过
`work_id`、`source_id`、`file_id`、`block_id` 等稳定标识与现有业务数据建立逻辑关联，
不应直接改写现有 Paperflow 业务表。

## 4. 领域术语

| 术语 | 含义 |
| --- | --- |
| Work | OpenAlex 作品实体，主键为 `work_id`。前端中文通常显示为“论文”。 |
| Source | OpenAlex 来源实体，主键为 `source_id`。可理解为来源期刊或出版来源。 |
| Original File | 本地保存的论文源文件，主键为 `file_id`。 |
| File Hash | 当前领域中指 `original_file_name` 去除后缀后的值，用作 `file_id`，不是内容 hash。 |
| Original File Job | 按 `file_id` 记录 Matching、Text Parsing、Block Import 状态。 |
| Matching | 将 Original File Job 关联到 Work 的过程。 |
| Text Parsing | 使用 MinerU 将 PDF 解析为 structured parsed 输出。 |
| Block Import | 将 parsed 输出写入 block 相关数据库表。 |
| Block | parsed 全文内容块，可表示标题、正文、公式、表格、图片、参考文献、脚注等。 |
| Admin User | 管理平台登录账号，不等同于 OpenAlex 作者。 |
| Admin Role | 管理平台固定角色，当前为 `SUPER_ADMIN`、`ADMIN`、`USER`。 |

## 5. 总体架构

```text
Browser
  │
  │ HTTP / Same-origin Session Cookie
  ▼
web-admin-pro
  │
  │ /api/* JSON
  │ /api/assets/* file stream
  ▼
java-admin
  ├── Spring Security Session + CSRF
  ├── REST Controllers
  ├── Services
  ├── MyBatis Mapper / JdbcTemplate
  └── AssetService
        │
        ├── PostgreSQL
        │     ├── Paperflow 业务表：只读
        │     └── 管理平台表：读写
        │
        └── DATA_ROOT
              ├── openalex/original/...
              ├── openalex/parsed/...
              └── openalex/mineru_raw/...
```

目录结构：

```text
paperflow-admin-platform/
├── README.md
├── CONTEXT.md
├── architecture.md
├── docs/
├── docs_java/
├── java-admin/
└── web-admin-pro/
```

## 6. 后端设计

### 6.1 技术栈

- Java 17
- Spring Boot 3.3.x
- Spring Web
- Spring Security
- MyBatis XML Mapper
- PostgreSQL JDBC Driver
- Bean Validation
- springdoc-openapi Swagger UI
- JUnit / Spring Boot Test

后端不使用 JPA、Redis、Lombok、GraphQL、jOOQ 或 Docker。

### 6.2 包结构

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

职责划分：

| 包 | 职责 |
| --- | --- |
| `config` | Spring Security、配置属性、应用配置。 |
| `controller` | REST 路由、入参校验、响应封装。 |
| `service` | 查询编排、状态派生、权限判断、DTO 转换、CSV 生成。 |
| `mapper` | MyBatis 查询接口。 |
| `dto` | API 请求和响应对象。 |
| `model` | 数据库查询投影对象。 |

### 6.3 核心服务

| 服务 | 职责 |
| --- | --- |
| `AdminService` | Source、Work、Original File、Block、任务状态和 CSV 导出的只读业务查询。 |
| `AdminUserService` | 登录、当前用户、改密、管理用户创建、更新、重置密码。 |
| `AdminAuditLogService` | 登录、退出、用户管理、改密等管理操作审计。 |
| `ServiceStatusService` | Java 后端、数据库、数据目录、磁盘空间、最近错误状态检查。 |
| `AssetService` | 将数据库相对路径转换为资产 URL，并限制文件访问在 `DATA_ROOT` 内。 |
| `AdminSchemaInitializer` | 启动时确保 `admin_audit_log` 表和基础索引存在。 |

### 6.4 SQL 设计原则

- MyBatis XML 管理业务 SQL。
- PostgreSQL schema 通过 JDBC URL `currentSchema` 控制。
- SQL 不动态拼接 schema。
- 排序字段使用后端白名单，不直接使用用户输入拼接 SQL。
- 列表接口使用分页。
- Work 多值关系筛选使用 `EXISTS`，避免重复 Work 行。
- Block 扩展表通过 `LEFT JOIN` 合并。

## 7. 前端设计

### 7.1 技术栈

- React
- Umi Max
- Ant Design Pro
- Ant Design
- TypeScript
- Vitest
- Biome

### 7.2 目录职责

```text
web-admin-pro/
├── config/routes.ts        # 路由和菜单
├── src/app.tsx             # 运行时配置、登录保护、布局、请求配置
├── src/access.ts           # 前端角色访问控制
├── src/services/auth.ts    # 登录、退出、CSRF、当前用户、修改密码
├── src/services/admin.ts   # 用户、角色、审计日志 API
├── src/services/business.ts# Source/Work/File/Block/状态 API
└── src/pages/              # 页面组件
```

### 7.3 菜单结构

```text
/
├── /task-status
├── 文献资源
│   ├── /sources
│   ├── /sources/:sourceId
│   ├── /works
│   ├── /works/:workId
│   ├── /works/:workId/blocks
│   ├── /original-files
│   ├── /original-files/:fileId
│   └── /original-files/:fileId/blocks
├── 系统管理
│   ├── /users
│   ├── /roles
│   └── /audit-logs
├── 服务管理
│   ├── /service-status
│   ├── /failure-tasks
│   └── /swagger-ui/index.html
└── 知识管理
    ├── /knowledge-base
    └── /block-search
```

`/knowledge-base` 和 `/block-search` 当前为占位页面。

### 7.4 请求设计

前端使用 Umi request：

- `baseURL = process.env.API_BASE_URL || ''`
- `withCredentials = true`

写请求会先获取 CSRF token，再设置 `X-XSRF-TOKEN` header。

## 8. 功能模块设计

### 8.1 认证与用户管理

认证使用 Spring Security Session。登录流程：

1. 前端调用 `GET /api/auth/csrf` 初始化 CSRF token。
2. 前端调用 `POST /api/auth/login`，携带用户名、密码和 `X-XSRF-TOKEN`。
3. 后端校验 `admin_user`，成功后写入 Spring Security Session。
4. 后续请求通过 HttpOnly Session Cookie 鉴权。
5. 退出调用 `POST /api/auth/logout`。

管理用户使用 `admin_user` 表保存。用户名大小写不敏感，密码只保存 BCrypt hash。
系统至少保留一个启用的 `SUPER_ADMIN`。

### 8.2 权限模型

| 角色 | 能力 |
| --- | --- |
| `SUPER_ADMIN` | 访问所有只读业务页面；管理所有用户；查看角色说明；查看审计日志。 |
| `ADMIN` | 访问所有只读业务页面；只能管理 `USER`。 |
| `USER` | 访问只读业务页面和服务页面；不能访问系统管理。 |

前端通过 `src/access.ts` 控制菜单和页面可见性；后端保留最终权限校验。

### 8.3 Source 管理

Source 模块提供：

- Source 列表。
- Source 详情。
- Source 统计。
- Source CSV 导出。

统计指标包括 Work 数、Original File 数、已匹配数、已解析数、全文入库数、
解析失败数、Block 入库失败数、不支持解析数。

### 8.4 Work 管理

Work 模块提供：

- Work 列表。
- Work 详情。
- 关联 Source。
- 作者列表。
- matched Original File。
- 处理状态派生。
- Work Blocks 阅读。
- Work CSV 导出。

Work 列表默认包含未匹配 Original File 的 Work。

### 8.5 Original File 管理

Original File 模块提供：

- Original File 列表。
- Original File 详情。
- Original File Job 状态。
- text_file parsed 文件列表。
- Original File Blocks 阅读。
- Original File CSV 导出。

Original File 查询以 `original_file JOIN original_file_job` 为基础。

### 8.6 Blocks 阅读

Blocks 支持两个入口：

- `GET /api/works/{workId}/blocks`
- `GET /api/original-files/{fileId}/blocks`

Block 扩展字段来自：

- `block_image`
- `block_table`
- `block_equation`
- `block_footnote`
- `block_reference`

默认过滤 `block_type = 'discarded'`，传 `includeDiscarded=true` 时返回 discarded 块。

### 8.7 服务状态与失败任务

服务状态页面展示：

- Java 后端状态。
- 数据库连接状态。
- `DATA_ROOT` 可读状态。
- 磁盘空间。
- 最近 API 错误摘要。

失败任务页面只读展示失败说明和可复制的 Python CLI 建议命令，不触发 pipeline。

### 8.8 操作审计

审计日志记录本地管理操作，包括：

- 登录成功。
- 登录失败。
- 退出登录。
- 创建用户。
- 更新用户。
- 重置密码。
- 修改自己的密码。

只有 `SUPER_ADMIN` 可以查询审计日志。

## 9. 数据库设计

### 9.1 数据库边界

当前项目读取 Paperflow PostgreSQL schema 中的业务表，并写入本地管理表。

业务表：

- `source`
- `work`
- `work_source`
- `work_author`
- `original_file`
- `original_file_job`
- `text_file`
- `block`
- `block_image`
- `block_table`
- `block_equation`
- `block_footnote`
- `block_reference`

管理表：

- `admin_user`
- `admin_audit_log`

Paperflow 项目库需要启用 `pg_trgm`，用于标题模糊匹配：

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### 9.2 文件路径规则

数据库中的文件路径都保存为相对 `DATA_ROOT` 的相对路径，不包含 `data/` 前缀。

| 类型 | 相对路径 |
| --- | --- |
| CSV 文件 | `openalex/csv/{csv_file_name}` |
| 原始文件 | `openalex/original/{source_id}/{original_file_name}` |
| MinerU 原始输出 | `openalex/mineru_raw/{source_id}/{file_id}/` |
| 规范化 parsed 输出 | `openalex/parsed/{source_id}/{file_id}/` |

### 9.3 `source`

OpenAlex 来源表，记录期刊或出版来源基础信息。

| 字段 | 类型 | 约束/说明 |
| --- | --- | --- |
| `source_id` | `varchar(255)` | 主键；OpenAlex source ID。 |
| `source_name` | `varchar(1000)` | OpenAlex source display name。 |
| `provider` | `varchar(1000)` | 可为空；来自 OpenAlex publisher。 |
| `flag_collect` | `int2` | 默认 `0`；取值 `0/1`；当前管理平台不以该字段驱动流程。 |

约束：

- 主键：`source(source_id)`
- `CHECK flag_collect IN (0, 1)`

### 9.4 `work`

OpenAlex Work 基础信息表。

| 字段 | 类型 | 约束/说明 |
| --- | --- | --- |
| `work_id` | `varchar(255)` | 主键；OpenAlex work ID。 |
| `doi` | `varchar(1000)` | 归一化 DOI；不建唯一约束。 |
| `title` | `varchar(1000)` | 标题；用于标题模糊匹配。 |
| `publication_year` | `int4` | 公开年份。 |
| `publication_date` | `varchar(255)` | 公开日期。 |
| `type` | `varchar(255)` | OpenAlex type。 |
| `language` | `varchar(255)` | OpenAlex language。 |

约束和索引：

- 主键：`work(work_id)`
- 普通索引：`work(doi)`
- 普通索引：`work(publication_year)`
- GIN trgm 索引：`work(title gin_trgm_ops)`

### 9.5 `work_source`

Work 与 Source 的关联表。

| 字段 | 类型 | 约束/说明 |
| --- | --- | --- |
| `work_id` | `varchar(255)` | 主键字段；外键 `work.work_id`，`ON DELETE CASCADE`。 |
| `source_id` | `varchar(255)` | 主键字段；外键 `source.source_id`，`ON DELETE CASCADE`。 |

约束和索引：

- 主键：`work_source(work_id, source_id)`
- 普通索引：`work_source(source_id)`

### 9.6 `work_author`

Work 作者关联表。

| 字段 | 类型 | 约束/说明 |
| --- | --- | --- |
| `work_id` | `varchar(255)` | 主键字段；外键 `work.work_id`，`ON DELETE CASCADE`。 |
| `author_id` | `varchar(255)` | 主键字段；OpenAlex author ID。 |
| `author_name` | `varchar(255)` | 作者姓名。 |
| `author_position` | `varchar(32)` | 可为空；非空时只能是 `first`、`middle`、`last`。 |

约束和索引：

- 主键：`work_author(work_id, author_id)`
- `CHECK author_position IS NULL OR author_position IN ('first', 'middle', 'last')`
- 普通索引：`work_author(author_name)`

### 9.7 `original_file`

原始文件登记表。导入阶段只校验和登记，不做匹配。

| 字段 | 类型 | 约束/说明 |
| --- | --- | --- |
| `file_id` | `varchar(255)` | 主键；由 `original_file_name` 去除后缀得到；不是内容 hash。 |
| `source_id` | `varchar(255)` | 外键 `source.source_id`，`ON DELETE RESTRICT`。 |
| `year` | `int4` | CSV 输入的论文年份。 |
| `paper_title` | `varchar(2000)` | CSV 输入的论文标题。 |
| `authors` | `varchar(2000)` | CSV 输入的作者，英文分号 `;` 分隔。 |
| `doi` | `varchar(500)` | 归一化 DOI，可为空。 |
| `url` | `varchar(2000)` | 原始采集页面或下载链接。 |
| `provider` | `varchar(255)` | 原始文件采集平台。 |
| `original_file_name` | `varchar(255)` | 原始文件名。 |
| `original_file_path` | `varchar(1000)` | 相对路径，必须位于 `openalex/original/...`。 |
| `original_file_type` | `varchar(10)` | 只能是 `PDF`、`XML`、`HTML`。 |
| `file_size` | `int8` | 文件大小，单位字节。 |

约束和索引：

- 主键：`original_file(file_id)`
- 普通索引：`original_file(source_id)`
- 普通索引：`original_file(doi)`
- 普通索引：`original_file(provider)`
- `CHECK original_file_type IN ('PDF', 'XML', 'HTML')`

### 9.8 `original_file_job`

按 Original File 记录匹配和下游处理状态。

| 字段 | 类型 | 约束/说明 |
| --- | --- | --- |
| `file_id` | `varchar(255)` | 主键；外键 `original_file.file_id`，`ON DELETE CASCADE`。 |
| `flag_match` | `int2` | 默认 `0`；取值 `-1/0/1`。 |
| `matched_work_id` | `varchar(255)` | 可为空；外键 `work.work_id`，`ON DELETE SET NULL`。 |
| `flag_text` | `int2` | 默认 `0`；取值 `-2/-1/0/1/2`。 |
| `flag_block` | `int2` | 默认 `0`；取值 `-1/0/1`。 |

约束和索引：

- 主键：`original_file_job(file_id)`
- 唯一约束：`original_file_job(matched_work_id)`，非空时保证一个 Work 最多匹配一个 Original File Job。
- 普通索引：`original_file_job(matched_work_id)`
- `CHECK flag_match IN (-1, 0, 1)`
- `CHECK (flag_match = 1 AND matched_work_id IS NOT NULL) OR (flag_match IN (-1, 0) AND matched_work_id IS NULL)`
- `CHECK flag_text IN (-2, -1, 0, 1, 2)`
- `CHECK flag_block IN (-1, 0, 1)`

`flag_match`：

| 值 | 含义 |
| --- | --- |
| `0` | 尚未尝试匹配 |
| `1` | 已匹配到 `matched_work_id` |
| `-1` | 最近一次匹配未找到候选 |

`flag_text`：

| 值 | 含义 |
| --- | --- |
| `0` | MinerU 未解析 |
| `1` | MinerU 解析中 |
| `2` | MinerU 解析完成 |
| `-1` | MinerU 解析失败 |
| `-2` | 文件类型当前版本不支持解析 |

`flag_block`：

| 值 | 含义 |
| --- | --- |
| `0` | Block 未入库 |
| `1` | Block 入库完成 |
| `-1` | Block 入库失败 |

### 9.9 `text_file`

解析后全文文件登记表，只登记规范化 parsed 输出文件。

| 字段 | 类型 | 约束/说明 |
| --- | --- | --- |
| `file_id` | `varchar(255)` | 主键字段；外键 `original_file.file_id`，`ON DELETE CASCADE`。 |
| `file_type` | `varchar(10)` | 主键字段；只能是 `JSON`、`MD`。 |
| `file_name` | `varchar(255)` | parsed 输出文件名。 |
| `file_path` | `varchar(1000)` | 指向 `openalex/parsed/{source_id}/{file_id}/...`。 |
| `file_size` | `int8` | 文件大小，单位字节。 |

约束：

- 主键：`text_file(file_id, file_type)`
- `CHECK file_type IN ('JSON', 'MD')`

### 9.10 `block`

全文内容块主表。

| 字段 | 类型 | 约束/说明 |
| --- | --- | --- |
| `block_id` | `varchar(32)` | 主键；内容块 ID。 |
| `file_id` | `varchar(255)` | 外键 `original_file.file_id`，`ON DELETE CASCADE`。 |
| `block_type` | `varchar(50)` | 块类型。 |
| `block_text` | `text` | 原始块文本。 |
| `pdf_page` | `int4` | PDF 页码，从 0 开始。 |
| `pdf_bbox` | `jsonb` | PDF 坐标信息。 |
| `block_seq` | `int4` | 同一 `file_id` 内从 0 开始。 |
| `parent_title_block_id` | `varchar(32)` | 外键 `block.block_id`，`ON DELETE SET NULL`。 |
| `title_level` | `int2` | 标题层级；仅标题块设置。 |

约束和索引：

- 主键：`block(block_id)`
- 唯一约束：`block(file_id, block_seq)`
- 普通索引：`block(file_id)`
- `CHECK block_type IN ('title', 'text', 'equation', 'table', 'image', 'reference', 'page_footnote', 'discarded')`

### 9.11 `block_image`

图片块扩展表。

| 字段 | 类型 | 约束/说明 |
| --- | --- | --- |
| `block_id` | `varchar(32)` | 主键；外键 `block.block_id`，`ON DELETE CASCADE`。 |
| `image_path` | `varchar(1000)` | 图片相对路径。 |
| `image_caption` | `text` | 图片标题。 |
| `image_footnote` | `text` | 图片脚注。 |

### 9.12 `block_table`

表格块扩展表。

| 字段 | 类型 | 约束/说明 |
| --- | --- | --- |
| `block_id` | `varchar(32)` | 主键；外键 `block.block_id`，`ON DELETE CASCADE`。 |
| `image_path` | `varchar(1000)` | 表格图片相对路径。 |
| `table_caption` | `text` | 表格标题。 |
| `table_footnote` | `text` | 表格脚注。 |

### 9.13 `block_equation`

公式块扩展表。

| 字段 | 类型 | 约束/说明 |
| --- | --- | --- |
| `block_id` | `varchar(32)` | 主键；外键 `block.block_id`，`ON DELETE CASCADE`。 |
| `image_path` | `text` | 公式图片相对路径。 |
| `format` | `varchar(20)` | 公式格式，例如 `latex`。 |

### 9.14 `block_footnote`

页脚注扩展表。

| 字段 | 类型 | 约束/说明 |
| --- | --- | --- |
| `block_id` | `varchar(32)` | 主键；外键 `block.block_id`，`ON DELETE CASCADE`。 |
| `footnote_label` | `varchar(50)` | 脚注标签，可为空。 |
| `footnote_text` | `text` | 脚注内容，不可为空。 |

### 9.15 `block_reference`

参考文献扩展表。

| 字段 | 类型 | 约束/说明 |
| --- | --- | --- |
| `block_id` | `varchar(32)` | 主键字段；外键 `block.block_id`，`ON DELETE CASCADE`。 |
| `reference_seq` | `int4` | 主键字段；同一 block 下从 0 开始。 |
| `reference_text` | `text` | 参考文献内容，不可为空。 |

约束：

- 主键：`block_reference(block_id, reference_seq)`

### 9.16 `admin_user`

管理平台用户表。

| 字段 | 类型 | 约束/说明 |
| --- | --- | --- |
| `id` | `BIGSERIAL` | 主键。 |
| `username` | `VARCHAR(50)` | 登录用户名；只允许 ASCII 字母、数字、下划线、点、短横线；长度 3-50。 |
| `username_normalized` | `VARCHAR(50)` | 规范化用户名；唯一。 |
| `password_hash` | `VARCHAR(100)` | BCrypt 密码 hash。 |
| `display_name` | `VARCHAR(100)` | 展示名，可为空。 |
| `role` | `VARCHAR(20)` | `SUPER_ADMIN`、`ADMIN`、`USER`。 |
| `enabled` | `BOOLEAN` | 是否启用，默认 `TRUE`。 |
| `last_login_at` | `TIMESTAMP WITH TIME ZONE` | 最近登录时间。 |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | 创建时间，默认 `now()`。 |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | 更新时间，默认 `now()`。 |

约束：

- 主键：`admin_user(id)`
- 唯一约束：`admin_user(username_normalized)`
- `CHECK username ~ '^[A-Za-z0-9_.-]{3,50}$'`
- `CHECK role IN ('SUPER_ADMIN', 'ADMIN', 'USER')`

### 9.17 `admin_audit_log`

管理平台操作审计表。

| 字段 | 类型 | 约束/说明 |
| --- | --- | --- |
| `id` | `BIGSERIAL` | 主键。 |
| `actor_id` | `BIGINT` | 操作人 ID。 |
| `actor_username` | `VARCHAR(50)` | 操作人用户名。 |
| `action` | `VARCHAR(80)` | 操作类型。 |
| `target_type` | `VARCHAR(80)` | 目标类型。 |
| `target_id` | `VARCHAR(255)` | 目标 ID。 |
| `result` | `VARCHAR(20)` | `SUCCESS` 或 `FAILURE`。 |
| `request_id` | `VARCHAR(80)` | 请求 ID。 |
| `remote_addr` | `VARCHAR(100)` | 客户端地址。 |
| `user_agent` | `VARCHAR(500)` | User-Agent。 |
| `message` | `VARCHAR(1000)` | 审计说明。 |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | 创建时间，默认 `now()`。 |

索引：

- `idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC)`
- `idx_admin_audit_log_actor ON admin_audit_log(actor_username)`
- `idx_admin_audit_log_action ON admin_audit_log(action)`

## 10. 业务读模型

### 10.1 Source 统计

Source 列表和详情返回 Source 基础字段与统计信息。

| API 字段 | 口径 |
| --- | --- |
| `workCount` | `work_source.source_id = sourceId` 的 Work 数 |
| `originalFileCount` | `original_file.source_id = sourceId` 的 Original File 数 |
| `matchedFileCount` | `flag_match = 1` |
| `parsedFileCount` | `flag_text = 2` |
| `readyFileCount` | `flag_text = 2 AND flag_block = 1` |
| `parseFailedFileCount` | `flag_text = -1` |
| `blockFailedFileCount` | `flag_text = 2 AND flag_block = -1` |
| `unsupportedFileCount` | `flag_text = -2` |

### 10.2 Task Status

`GET /api/task-status` 返回全库汇总和按 Source 分组的任务进度计数。

全库指标：

- Source 数。
- Work 数。
- Original File 数。
- 已匹配 Work 数。
- 已解析文件数。
- Block 入库文件数。

前端用这些计数派生 Matching、Text Parsing、Block Import 的进度比例。

### 10.3 Work 查询

Work 列表默认返回所有 Work，包括没有 matched Original File Job 的 Work。

基础关系：

```text
work
LEFT JOIN original_file_job ON original_file_job.matched_work_id = work.work_id
```

Work 详情返回：

- Work 元数据。
- Source 简要列表。
- 作者列表。
- matched Original File。
- 派生处理状态。

### 10.4 Original File 查询

Original File 列表基础关系：

```text
original_file
JOIN original_file_job ON original_file_job.file_id = original_file.file_id
```

Original File 详情返回：

- 原始文件元数据。
- Job 状态。
- 原始文件访问 URL。
- parsed `text_file` 列表。

### 10.5 Block 查询

Work Blocks 路径：

```text
work.work_id
-> original_file_job.matched_work_id
-> original_file_job.file_id
-> block.file_id
```

Original File Blocks 直接通过 `block.file_id` 查询。Block 查询按 `block_seq ASC`
排序，默认过滤 discarded 块。

### 10.6 Work 处理状态派生

| 条件 | `processingStatus` |
| --- | --- |
| 无 matched file | `NO_MATCHED_FILE` |
| `flag_text = -2` | `UNSUPPORTED_TEXT_INPUT` |
| `flag_text = -1` | `PARSE_FAILED` |
| `flag_text = 1` | `PARSING` |
| `flag_text = 2 AND flag_block = -1` | `BLOCK_FAILED` |
| `flag_text = 2 AND flag_block = 1` | `READY` |
| `flag_text = 2 AND flag_block = 0` | `PARSED` |
| 其他已匹配情况 | `MATCHED` |

## 11. API 设计

OpenAPI 契约以 `docs_java/api.yaml` 为准。

### 11.1 认证与用户

```text
GET  /api/auth/csrf
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/change-password

GET  /api/admin-users
POST /api/admin-users
PATCH /api/admin-users/{id}
POST /api/admin-users/{id}/reset-password
GET  /api/admin-roles
GET  /api/admin-audit-logs
```

### 11.2 业务查询

```text
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
```

### 11.3 API 文档

```text
GET /api.yaml
GET /v3/api-docs
GET /swagger-ui/index.html
```

`docs_java/api.yaml` 会被 Maven 打包为运行时 `/api.yaml` 静态资源，`/v3/api-docs`
返回同一份 YAML，避免运行时生成第二份契约。

## 12. 资产访问设计

数据库保存的是相对 `DATA_ROOT` 的路径。后端 DTO 同时返回数据库路径和可访问 URL。

示例：

- `originalFilePath` / `originalFileUrl`
- `filePath` / `fileUrl`
- `imagePath` / `imageUrl`
- `tableImagePath` / `tableImageUrl`
- `equationImagePath` / `equationImageUrl`

`AssetService` 负责：

- URL encode 路径片段。
- 拒绝绝对路径。
- 拒绝空路径片段、`.`、`..`。
- 将相对路径解析到 `DATA_ROOT`。
- 确认最终路径仍在 `DATA_ROOT` 内。

`AssetController` 使用 inline 响应返回文件，并根据文件名推断 `Content-Type`。

## 13. 配置设计

后端读取 `java-admin/.env` 或仓库根目录 `.env`：

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
paperflow:
  api:
    default-page-size: 20
    max-page-size: 100
    default-block-page-size: 100
    max-block-page-size: 500
    data-root: ${DATA_ROOT:data}
```

关键配置：

| 配置 | 说明 |
| --- | --- |
| `PAPERFLOW_DB_HOST` | PostgreSQL 主机。 |
| `PAPERFLOW_DB_PORT` | PostgreSQL 端口。 |
| `PAPERFLOW_DB_NAME` | 数据库名。 |
| `PAPERFLOW_DB_SCHEMA` | 当前 schema。 |
| `PAPERFLOW_DB_USER` | 数据库用户。 |
| `PAPERFLOW_DB_PASSWORD` | 数据库密码。 |
| `DATA_ROOT` | Paperflow 数据根目录。 |
| `LOG_FILE` | 后端日志文件路径。 |

## 14. 运行方式

后端：

```bash
cd java-admin
mvn spring-boot:run
```

默认地址：

```text
http://localhost:8080
```

前端：

```bash
cd web-admin-pro
npm install
npm run dev
```

默认地址：

```text
http://localhost:8000
```

构建后端：

```bash
cd java-admin
mvn package
java -jar target/*.jar
```

构建前端：

```bash
cd web-admin-pro
npm run build
```

## 15. 安全设计

当前安全控制：

- Session 登录。
- CSRF 防护。
- BCrypt 密码 hash。
- 写请求需要 CSRF token。
- 业务 SQL 使用参数化查询。
- 排序字段使用白名单。
- 资产路径限制在 `DATA_ROOT` 下。
- Swagger UI 和 OpenAPI 文档需要登录访问。
- 业务表只读。

生产部署建议：

- 使用 HTTPS。
- 修改默认 `admin/admin`。
- 使用最小权限数据库账号。
- 只给业务表读权限。
- 只给管理表必要读写权限。
- 接入集中日志或主机日志采集。

## 16. 扩展说明

当前知识管理菜单下的 `/knowledge-base` 和 `/block-search` 仍为占位页面。后续如果在
知识管理方向新增功能，应优先复用现有的 Work、Source、Original File、Block、
资产访问、用户权限和审计能力。

新增功能如需保存数据，应新增独立表，并通过稳定业务标识与现有数据关联：

- `work_id`
- `source_id`
- `file_id`
- `block_id`

不应直接修改 Paperflow 业务表，也不应把查询页面设计为隐式触发 Python pipeline
或 MinerU 任务。
