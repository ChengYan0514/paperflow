# Java Admin Management Platform Next Plan

本文整理下一版 Java 管理平台需求。当前目标仍是只读管理端：先把文献资源页的
命名、检索和排序做好；用户管理、服务管理、知识管理先进入二级菜单结构，不在
本轮做写操作或权限体系。

状态更新：本文是文献资源筛选、排序和菜单改造的历史计划。该轮能力已完成；
后续又补齐了登录权限、用户管理、真实服务状态页、失败任务只读建议、操作审计
和三大列表 CSV 导出。当前边界和后续优先级以 `docs_java/overview.md` 和
`docs/admin_platform_maturity_gap.md` 为准。

## 范围

本轮做：

- 管理端中文文案把“作品”统一改为“论文”。
- 左侧菜单改成二级结构。
- 当前 Source、Work、Original File 页面统一归入“文献资源”一级菜单。
- 来源期刊列表增加检索。
- 论文、来源期刊、原始文件列表补齐管理端需要的检索字段和排序方式。

本轮不做：

- 登录、角色、权限、用户写操作。
- 服务启停、pipeline 触发、MinerU 调度。
- 知识库写入、向量化、知识问答。
- 为了菜单占位新增数据库表。
- 截图交付。

数据库和 Java API 内部仍沿用 OpenAlex / Paperflow 的 `Work` 术语；前端菜单、
页面标题、表头、按钮和状态说明统一显示“论文”。如果后续要求 URL 也改成
`/papers`，前端保留 `/works` 到 `/papers` 的重定向，Java API 仍使用
`/api/works`，避免牵连表名和 OpenAPI 大改名。

## 菜单结构

```text
文献资源
├── 工作台
├── 来源期刊
├── 论文检索
└── 原始文件检索

用户管理
├── 用户列表（占位）
└── 角色权限（占位）

服务管理
├── 服务状态（占位）
└── API 文档

知识管理
├── 知识库（占位）
└── 内容块检索（后续评估）
```

占位菜单只展示“待设计”空态，不新增后端接口。`API 文档` 可直接跳转现有
Swagger UI 或 `/api.yaml`。

## 检索和排序设计

列表接口新增排序只允许白名单值，不接受任意字段名，避免前端把 SQL 排序字段
透传到后端。所有列表的筛选条件和排序条件都要同步到 URL query，刷新后保持。

### 工作台

用途：快速定位来源期刊级处理进度和异常。

检索字段：

- `sourceId`：来源期刊 ID，不区分大小写包含匹配。
- `sourceName`：来源期刊名称，不区分大小写包含匹配。
- `provider`：来源期刊平台，不区分大小写包含匹配。
- `stage`：`MATCHING`、`TEXT_PARSING`、`BLOCK_IMPORT`，用于聚焦某个进度条。
  该字段只调整进度条视觉聚焦，不筛掉来源期刊行。

默认排序：

- `sourceId ASC`，稳定展示。

用户可选排序：

- `workCount DESC`
- `originalFileCount DESC`
- `matchedProgress ASC`
- `parsedProgress ASC`
- `blockImportedProgress ASC`
- `abnormalCount DESC`

### 来源期刊

用途：按来源期刊定位论文覆盖量、原始文件数量和处理异常。

检索字段：

- `sourceId`：来源期刊 ID，不区分大小写包含匹配。
- `sourceName`：来源期刊名称，不区分大小写包含匹配。
- `provider`：来源期刊平台，不区分大小写包含匹配。
- `hasOriginalFiles`：是否已有原始文件。
- `hasFailures`：是否存在解析失败或 block 入库失败。

默认排序：

- `sourceId ASC`。

用户可选排序：

- `sourceId ASC`
- `workCount DESC`
- `failureCount DESC`

`failureCount = parseFailedFileCount + blockFailedFileCount`，只在查询 DTO 中派生，
不新增数据库字段。

### 论文检索

用途：查 OpenAlex 论文元数据、匹配文件和处理状态。页面显示“论文”，API 和数据库
仍使用 `Work`。

检索字段：

- `workId`：精确匹配。
- `title`：标题模糊匹配。
- `doi`：DOI 归一化后匹配。
- `sourceId`：所属来源期刊。
- `sourceName`：按来源期刊名称模糊过滤。
- `authorName`：作者名模糊过滤。
- `yearFrom` / `yearTo`：发表年份范围。
- `type`：OpenAlex 类型。
- `language`：语言。
- `processingStatus`：现有派生状态。
- `matchedFileId`：匹配到的原始文件。

默认排序：

- `publicationYear DESC NULLS LAST, workId ASC`。

用户可选排序：

- `publicationYear DESC`
- `publicationYear ASC`
- `title ASC`
- `workId ASC`
- `statusIssueFirst`：失败、解析中、未匹配优先。
- `statusReadyFirst`：READY 优先。

`statusIssueFirst` 只用于管理排查，按派生状态排序，不写回数据库。

### 原始文件检索

用途：按采集文件排查匹配、解析、block 入库问题。

检索字段：

- `fileId`：精确匹配。
- `sourceId`：来源期刊。
- `sourceName`：来源期刊名称。
- `provider`：原始文件采集平台，即 `original_file.provider`，不区分大小写包含匹配。
- `matchedWorkId`：匹配到的论文 ID。
- `originalFileType`：`PDF`、`XML`、`HTML`。
- `yearFrom` / `yearTo`：CSV 论文年份范围。
- `flagMatch`：匹配状态。
- `flagText`：文本解析状态。
- `flagBlock`：block 入库状态。

默认排序：

- `sourceId ASC, fileId ASC`。

用户可选排序：

- `sourceIdAsc`：`sourceId ASC, fileId ASC`。
- `year DESC`
- `fileSize ASC`
- `provider ASC`
- `textStatusIssueFirst`

### 全文 / 内容块页面

用途：查看论文或原始文件解析后的正文。

检索字段：

- `includeDiscarded`：沿用现有能力。

排序：

- 固定 `blockSeq ASC`，不提供用户排序。全文阅读必须保持原文顺序。

## API 调整清单

实现时先更新 `docs_java/api.yaml`，再改 Java Controller / DTO / Mapper。

- `GET /api/task-status`：后端接口不变。前端对当前返回的 `sources[]` 按
  `sourceId`、`sourceName`、`provider`、`stage`、`sort` 做本地筛选。
- `GET /api/sources`：增加来源期刊检索字段和 `sort`。
- `GET /api/works`：增加 `workId`、`sourceName`、`authorName`、
  `type`、`language`、`matchedFileId`、`sort`。
- `GET /api/original-files`：增加 `fileId`、`sourceName`、
  `provider`、`originalFileType`、`yearFrom`、`yearTo`、`sort`。
- Blocks 接口不扩展筛选，仍只保留 `includeDiscarded`，排序固定
  `blockSeq ASC`。

后端校验规则：

- 未知 `sort` 返回 `VALIDATION_ERROR`。
- 年份范围必须满足 `from <= to`。
- 空字符串参数 trim 后忽略。
- 所有 SQL 排序使用枚举映射，不拼接前端原始字段名。

## 开发顺序

1. 更新 OpenAPI 和读模型文档，确定新增 query 参数和排序枚举。
2. Java 后端增加来源、论文、原始文件检索和排序白名单。
3. 为新增检索和排序补 Mapper-backed 测试。
4. 前端把“作品”统一改为“论文”，左侧导航改成二级菜单。
5. 前端列表页补检索区、排序控件、URL query 同步。
6. 增加占位一级菜单：用户管理、服务管理、知识管理。
7. 跑 `mvn test` 和前端 build。

## 验收标准

- 管理端可见文案不再出现“作品”，统一显示“论文”。
- 来源期刊、论文、原始文件列表都有检索和排序。
- 排序选项来自固定枚举，刷新页面后检索和排序保持。
- 左侧菜单是二级菜单，当前页面归入“文献资源”。
- 用户管理、服务管理、知识管理出现在一级菜单下，并有明确占位页。
- Java 后端仍只读，不新增写接口、不触发 pipeline、不引入登录权限体系。
