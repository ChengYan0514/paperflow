# Java Admin Next TDD Plan

本文把 `docs_java/admin_next_plan.md` 拆成可按 TDD 逐步开发的竖切片。每个切片
遵循：先补一个行为测试，确认失败，再写最少实现让它通过，最后只在需要时重构。

状态更新：本文是文献资源筛选、排序和菜单改造的历史 TDD 拆分。后续已经补齐
登录权限、用户管理、真实服务状态页、失败任务只读建议、操作审计和三大列表
CSV 导出；当前状态以 `docs_java/overview.md`、`docs/admin_runbook.md` 和
`docs/admin_platform_maturity_gap.md` 为准。

## 已确认决策

- Java API 和数据库继续使用 `Work`；前端可见中文统一显示“论文”。
- 本轮不新增 `/papers` 路由，继续使用 `/works`。
- 本轮不扩展 Blocks 接口；全文页只保留现有 `includeDiscarded`。
- `GET /api/task-status` 不改后端接口；前端对 `sources[]` 做本地筛选和排序。
- 不需要截图交付。
- 占位菜单只做前端静态页面，不新增 API、DTO、数据库表或测试数据。
- 只读边界不变：不新增写接口，不触发 pipeline，不引入登录权限。

## 查询口径

- Source `sourceId`、`sourceName`、`provider` 大小写不敏感包含匹配。
- Work `workId` 和 Original File `fileId` 用精确匹配。
- `sourceName` 通过 `source.source_name` 大小写不敏感包含匹配。
- `authorName` 只用于 Work 列表，通过 `work_author.author_name` 大小写不敏感包含匹配。
- DOI 参数做轻量归一化：trim、小写、移除 `https://doi.org/` 或
  `http://dx.doi.org/` 前缀。
- `type`、`language`、`originalFileType` 用大小写不敏感精确匹配。
- Original File `provider` 用大小写不敏感包含匹配。
- `hasOriginalFiles`、`hasFailures` 只接受 `true` / `false`；空字符串忽略。
- 未知 `sort` 统一返回 `VALIDATION_ERROR`。

## 开发切片

### 0. 契约和读模型文档

RED:

- 更新 `docs_java/api.yaml` 后运行：

```bash
uv run python -c "import yaml; yaml.safe_load(open('docs_java/api.yaml'))"
```

GREEN:

- 给 `GET /api/sources` 增加 `sourceId`、`sourceName`、`provider`、
  `hasOriginalFiles`、`hasFailures`、`sort`。
- 给 `GET /api/works` 增加 `workId`、`sourceName`、`authorName`、
  `type`、`language`、`matchedFileId`、`sort`。
- 给 `GET /api/original-files` 增加 `fileId`、`sourceName`、
  `provider`、`originalFileType`、`yearFrom`、`yearTo`、`sort`。
- 更新 `docs_java/db_read_model.md` 的筛选、排序、异常口径。

### 1. Source 列表筛选

RED:

- 在 `SourceControllerIntegrationTest` 添加一个 Mapper-backed 测试：`sourceId`、
  `sourceName`、`provider` 都是不区分大小写包含匹配，`hasFailures=true`
  只返回有解析失败或 Block Import 失败的 Source。

GREEN:

- 增加 Source 查询参数、Mapper 参数和 SQL 条件。
- 空字符串在 Service 层 trim 后忽略。

### 2. Source 列表排序

RED:

- 添加测试覆盖 `sort=failureCountDesc`、`sort=workCountDesc` 和未知 sort 返回
  `VALIDATION_ERROR`。

GREEN:

- 增加 `SourceSort` enum。
- MyBatis 用 `<choose>` 映射白名单排序；不拼接前端原始字段名。

### 3. Work 列表新增筛选

RED:

- 添加一个测试覆盖 `workId` 精确匹配、`sourceName`、`authorName`、
  `type`、`language`、`matchedFileId`。
- 添加一个测试覆盖 DOI URL 输入能匹配归一化 DOI。

GREEN:

- 增加 Work 查询参数、轻量 DOI 归一化、Mapper 条件。
- `sourceName` 和 `authorName` 用 `EXISTS`，避免重复 Work 行。

### 4. Work 列表排序

RED:

- 添加测试覆盖 `publicationYearAsc`、`titleAsc`、`statusIssueFirst`、
  `statusReadyFirst`。
- 添加测试覆盖未知 sort 返回 400。

GREEN:

- 增加 `WorkSort` enum。
- MyBatis 用 `<choose>` 映射白名单排序；不拼接前端原始字段名。

### 5. Original File 列表新增筛选

RED:

- 添加一个测试覆盖 `fileId` 精确匹配、`sourceName`、`provider`、
  `originalFileType`。
- 添加一个测试覆盖 `yearFrom/yearTo`。
- 添加一个测试覆盖非法范围返回 `VALIDATION_ERROR`。

GREEN:

- 增加 Original File 查询参数、Mapper 条件和范围校验。
- `sourceName` 通过 `source` 表过滤。

### 6. Original File 列表排序

RED:

- 添加测试覆盖 `yearDesc`、`fileSizeAsc`、`providerAsc`、
  `textStatusIssueFirst`。
- 添加测试覆盖未知 sort 返回 `VALIDATION_ERROR`。

GREEN:

- 增加 `OriginalFileSort` enum。
- MyBatis 用 `<choose>` 映射白名单排序。

### 7. 后端收口

RED:

- 运行：

```bash
cd java-admin
mvn test
```

GREEN:

- 保持所有新增 SQL 为 `SELECT`。
- 如契约或读模型在实现中调整，同步更新 `docs_java/api.yaml` 和
  `docs_java/db_read_model.md`。

### 8. 前端文案和二级菜单

RED:

- 运行前端 build，先确认当前状态：

```bash
cd web-admin
npm run build
```

GREEN:

- 可见中文从“作品”改为“论文”。
- 左侧菜单改为二级结构：
  `文献资源`、`用户管理`、`服务管理`、`知识管理`。
- 当前页面放入 `文献资源`。
- `用户列表`、`角色权限`、`服务状态`、`知识库`、`内容块检索` 做“待设计”空态。
- `API 文档` 链接现有 Swagger UI 或 `/api.yaml`。

### 9. 前端列表筛选和排序

RED:

- 对三个列表页分别确认 URL query 能保留筛选和排序。

GREEN:

- 复用现有 `Filters`，全展开显示字段，不做高级筛选折叠。
- Source、Work、Original File 列表把新增参数和 `sort` 同步进 URL query。
- Task Status 页面只在前端本地处理 `sourceId`、`sourceName`、`provider`、
  `stage`、`sort`。

### 10. 最终检查

运行：

```bash
uv run python -c "import yaml; yaml.safe_load(open('docs_java/api.yaml'))"
cd java-admin
mvn test
cd ../web-admin
npm run build
```

最终验收：

- 管理端可见文案不出现“作品”，统一显示“论文”。
- 来源、论文、原始文件列表都有检索和排序。
- 排序只接受白名单值。
- 刷新页面后检索和排序保持。
- 左侧菜单是二级菜单。
- 占位菜单可达并显示“待设计”。
- Java 后端仍只读。
