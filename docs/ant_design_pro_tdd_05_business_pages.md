# Ant Design Pro TDD 05: 业务页面和内容块阅读器

本阶段迁移现有只读业务页面。列表页用 `ProTable`，详情页用 Ant Design 基础组件，
内容块阅读器直接迁移旧逻辑。

后续状态：`/service-status` 已改为真实服务状态页，新增 `/failure-tasks` 失败任务
只读处理建议页；`/knowledge-base` 和 `/block-search` 仍为占位页面。

## Public Interface

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

## TDD Slices

### 1. 工作台

RED:

- `/task-status` 调用 `GET /api/task-status`。
- 显示 totals 指标。
- 显示来源期刊处理进度。
- 支持 sourceId、sourceName、provider、stage、sort 的本地筛选/排序。

GREEN:

- 使用 `PageContainer`、统计卡片和进度条。
- 不新增后端接口。

### 2. 来源期刊列表和详情

RED:

- `/sources` 使用 URL query 调用 `GET /api/sources`。
- `ProTable` 显示旧前端同等列。
- 点击 sourceId 进入 `/sources/:sourceId`。
- 详情页显示基础信息和统计，并可跳转论文/原始文件筛选页。

GREEN:

- 迁移 Source service 类型和列表 columns。

### 3. 论文列表和详情

RED:

- `/works` 使用 URL query 调用 `GET /api/works`。
- `ProTable` 显示旧前端同等列。
- 点击 workId 进入详情。
- matchedFileId 跳转原始文件详情。
- 详情页显示 metadata、来源期刊、作者、匹配原始文件和内容块入口。

GREEN:

- 迁移 Work service 类型、状态标签和详情组件。

### 4. 原始文件列表和详情

RED:

- `/original-files` 使用 URL query 调用 `GET /api/original-files`。
- `ProTable` 显示旧前端同等列。
- fileId/sourceId/matchedWorkId 链接可跳转。
- 详情页显示 metadata、状态、文本文件和资产链接。

GREEN:

- 迁移 Original File service 类型和详情组件。

### 5. 内容块阅读器

RED:

- `/works/:workId/blocks` 调用分页接口并拉取全部 blocks。
- `/original-files/:fileId/blocks` 同样拉取全部 blocks。
- `includeDiscarded=true` 会传给后端。
- 能渲染：
  - title
  - text
  - equation + KaTeX
  - table + HTML 清洗
  - image
  - reference
  - page_footnote

GREEN:

- 从旧 `web-admin/src/main.tsx` 拆出 `BlocksReader`。
- 保留 `sanitizeTable`、`latexMarkup`、`assetUrl` 等逻辑。
- 只为适配 Umi/Ant Design 做最小改动。

### 6. 服务管理和知识管理占位

RED:

- 本阶段 `/service-status` 显示占位；后续已接入真实服务状态页。
- `/knowledge-base` 显示占位。
- `/block-search` 显示占位。
- Swagger 菜单打开 `/swagger-ui/index.html`。

GREEN:

- 使用统一 `Placeholder` 页面。
- 本阶段不新增 API；后续服务状态页使用 `GET /api/service-status`。

## Done

运行：

```bash
cd web-admin-pro
npm run build
```

如已有前端测试：

```bash
cd web-admin-pro
npm test
```

通过后进入 `docs/ant_design_pro_tdd_06_docs_acceptance.md`。
