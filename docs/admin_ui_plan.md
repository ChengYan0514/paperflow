# Paperflow Admin UI Plan

> 历史文档：本文描述旧 `web-admin/` Vite 前端的一版实现计划，其中
> `ADMIN` / `VIEWER` 权限模型已被 `docs/ant_design_pro_migration_plan.md`
> 的 `SUPER_ADMIN` / `ADMIN` / `USER` 三角色方案替代。新前端以
> `web-admin-pro/` 和 `API_BASE_URL` 为准。

本文定义前端管理页面的制作计划。前端只消费 Java Admin REST API，
不直接访问数据库，不直接读取本地文件，不触发 Python pipeline 或 MinerU。

## 目标

第一版 Admin UI 解决两个问题：

1. 快速查看来源期刊、Work、Original File Job 的处理状态。
2. 支持排查 Matching、Text Parsing、Block Import 的失败或未完成数据。

## 非目标

当前不做：

- JWT、SSO、自注册、动态权限矩阵。
- Paperflow 业务写操作，包括状态重置、人工修正匹配、重试任务。
- 直接连接 PostgreSQL。
- 绕过 Java Admin API 读取 `DATA_ROOT` 文件，或生成、修改 parsed 图片。
- 触发 Python CLI、MinerU 或外部采集程序。
- 缓存、离线同步、WebSocket、GraphQL。

## 项目方案

前端作为独立子项目放在仓库根目录：

```text
web-admin/
```

推荐技术栈：

- Vite
- React
- TypeScript
- React Router
- TanStack Query
- Plain CSS 或轻量 CSS Modules

不引入大型 UI 套件，先用原生表格、表单、按钮和少量状态徽标完成。API 类型以
`docs_java/api.yaml` 为准，第一版可以手写少量 TypeScript 类型；只有接口继续
增加时再考虑生成客户端。

开发时前端通过环境变量配置 Java 后端地址：

```text
VITE_API_BASE_URL=http://localhost:8080
```

## 信息架构

第一版页面：

```text
/login
/task-status
/sources
/sources/:sourceId
/works
/works/:workId
/works/:workId/blocks
/original-files
/original-files/:fileId
/users
```

默认首页跳转到 `/task-status`，作为只读管理工作台。前端启动时请求
`GET /api/auth/me`：已登录则渲染后台，未登录则跳转 `/login`，登录成功后回到
原目标路径。已登录用户访问 `/login` 时跳转 `/task-status`。

`ADMIN` 可访问用户管理页面；`VIEWER` 访问用户管理页面时显示 403 无权限页。
登录页先调用 `GET /api/auth/csrf` 初始化 CSRF token。写请求从 `XSRF-TOKEN`
cookie 读取 token，并带 `X-XSRF-TOKEN` header。

### 登录

`/login`

- 用户名、密码登录。
- 登录失败显示统一错误，不区分用户名不存在、密码错误或账号禁用。
- 登录成功后回到原目标路径。

### 用户管理

`/users`

- 仅 `ADMIN` 可访问。
- 支持创建 Admin User、禁用/启用账号、修改角色、重置密码。
- 用户名创建后不可修改。
- 不能禁用或降级最后一个启用状态的 `ADMIN`。
- 不保留单独的 `/roles` 页面；角色选择放在用户创建/编辑表单里。
- 不提供删除用户。
- 列表列为：用户名、显示名、角色、状态、最近登录、创建时间、操作。
- `VIEWER` 不显示“用户管理”菜单；直接访问 `/users` 显示 403。
- 创建用户表单字段：username、displayName、role、password、enabled；不加确认
  密码。
- 自己改密码表单包含 oldPassword、newPassword、confirmNewPassword；API 只提交
  oldPassword 和 newPassword。
- 管理员重置密码表单只输入新密码，不加确认密码。

## 页面设计

### 工作台

`/task-status`

- 显示全库来源期刊、Work、Original File、匹配成功 Work、解析成功 Original File、
  Block Import 完成 Original File 数。
- 筛选项：sourceId、sourceName、provider、stage、sort。
- `sourceId`、`sourceName`、`provider` 均为不区分大小写包含匹配。
- `stage` 只聚焦对应进度条，不筛掉来源期刊行。
- 按来源期刊显示 workCount、originalFileCount、matchedWorkCount、
  parsedFileCount、blockImportedFileCount。
- 用进度条展示 Matching、Text Parsing、Block Import 进展。
- 默认排序为 `sourceIdAsc`；可选 `workCountDesc`、`originalFileCountDesc`、
  `matchedProgressAsc`、`parsedProgressAsc`、`blockImportedProgressAsc`、
  `abnormalCountDesc`。

### 来源期刊

`/sources`

- 筛选项：sourceId、sourceName、provider、hasOriginalFiles、hasFailures、sort。
- `sourceId`、`sourceName`、`provider` 均为不区分大小写包含匹配。
- 排序只支持 `sourceIdAsc`、`workCountDesc`、`failureCountDesc`。
- 表格列：来源期刊 ID、来源期刊名称、provider、workCount、originalFileCount、
  matchedFileCount、parsedFileCount、readyFileCount、parseFailedFileCount、
  blockFailedFileCount、unsupportedFileCount。
- 支持分页。
- 来源期刊 ID 链接到 `/sources/:sourceId`。

`/sources/:sourceId`

- 显示来源期刊基础信息和统计指标。
- 提供跳转：
  - `/works?sourceId=...`
  - `/original-files?sourceId=...`

### Works

`/works`

- 筛选项：sourceId、title、doi、yearFrom、yearTo、processingStatus。
- 额外支持 workId、sourceName、authorName、type、language、matchedFileId、sort。
- `workId`、`matchedFileId` 精确匹配；`sourceName`、`authorName` 为不区分大小写
  包含匹配；`type`、`language` 为不区分大小写精确匹配。
- DOI 会轻量归一化后匹配；`yearFrom/yearTo` 为闭区间。
- 排序只支持 `publicationYearDesc`、`publicationYearAsc`、`titleAsc`、
  `statusIssueFirst`、`statusReadyFirst`。
- 表格列：Work ID、title、doi、publicationYear、sourceIds、
  processingStatus、matchedFileId、flagMatch、flagText、flagBlock。
- Work ID 链接到 `/works/:workId`。
- matchedFileId 链接到 `/original-files/:fileId`。

`/works/:workId`

- 展示 Work metadata、来源期刊、Authors、processingStatus。
- 展示 matchedFile；无 matched file 时清楚显示 `NO_MATCHED_FILE`。
- 操作入口：
  - 查看 blocks：`/works/:workId/blocks`
  - 查看 matched Original File：`/original-files/:fileId`

`/works/:workId/blocks`

- 筛选项：includeDiscarded。
- 按 `blockSeq` 全文顺序把 title、text、image、table、equation、
  page_footnote、reference 等 block 拼成一篇完整文章。
- 完整文章放在固定大小的边框阅读器中，通过鼠标滚轮或触控上下滚动。
- 图片、表格图片、公式图片使用 API 返回的资产 URL 展示。
- 渲染标题层级、KaTeX 公式、表格、脚注和 references；`blockText` 中的
  `<table>` HTML 会清理后按真实表格渲染，公式 block 会去掉 `$$...$$` 后按
  LaTeX 渲染。
- 默认隐藏 discarded block。

### Original Files

`/original-files`

- 筛选项：sourceId、fileId、sourceName、provider、matchedWorkId、flagMatch、
  flagText、flagBlock、originalFileType、yearFrom、yearTo、sort。
- `fileId`、`matchedWorkId` 精确匹配；`sourceName`、`provider` 为不区分大小写
  包含匹配；`originalFileType` 为不区分大小写精确匹配。
- 不提供文件大小范围筛选。
- 排序只支持 `sourceIdAsc`、`yearDesc`、`fileSizeAsc`、`providerAsc`、
  `textStatusIssueFirst`。
- 表格列：fileId、sourceId、originalFileType、originalFileName、fileSize、
  matchedWorkId、flagMatch、flagText、flagBlock、provider、year。
- fileId 链接到 `/original-files/:fileId`。
- matchedWorkId 链接到 `/works/:workId`。

`/original-files/:fileId`

- 展示 Original File metadata。
- 展示 Original File Job 状态：flagMatch、matchedWorkId、flagText、
  flagBlock。
- matchedWorkId 非空时提供跳转到 `/works/:workId` 的操作入口。
- 调用 `/api/original-files/{fileId}/blocks` 按全文顺序渲染解析后的 blocks。
- 展示 textFiles 表格：fileType、fileName、filePath、fileSize，并提供资产链接。
- 页面末尾通过 Java Admin 资产 URL 预览 PDF/HTML 原始文件；XML 原始文件只保留
  路径链接，不嵌入展示内容。

## 状态展示

`processingStatus` 使用固定枚举：

```text
NO_MATCHED_FILE
MATCHED
PARSING
PARSE_FAILED
UNSUPPORTED_TEXT_INPUT
PARSED
BLOCK_FAILED
READY
```

`flag_match`、`flag_text`、`flag_block` 用短标签展示，同时保留原始数字值。

## API 映射

前端只调用：

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

OpenAPI 契约入口：

```text
GET /api.yaml
GET /v3/api-docs
```

## 开发顺序

1. 后端增加 `admin_user` 建表 SQL 和 Spring Security Session/CSRF。
2. 后端实现 `auth` 和 `admin-users` API。
3. 前端实现 `/login`、路由保护和 CSRF header。
4. 前端实现 `/users`，删除 `/roles` 占位。

## 验收标准

- 所有页面只通过 Java Admin REST API 取数。
- 列表分页可用，筛选项能反映到 URL query。
- 详情页刷新后可直接恢复。
- API 错误按 `ErrorResponse` 显示 code、message、requestId。
- 未登录用户只能访问 `/login`。
- `VIEWER` 无法进入用户管理页面。
- 没有 Paperflow 业务写操作、缓存、直接文件读取、pipeline 触发代码。

## 后续扩展

只有只读页面稳定后再评估：

- 更丰富的跨页汇总和趋势展示。
- 人工修正 Matching。
- retry / reset 状态操作。
- 企业 SSO。
