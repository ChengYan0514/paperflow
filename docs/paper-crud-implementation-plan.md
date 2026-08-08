# Paper CRUD 与 Source 检索实施计划

## 目的

本文把 ADR 0003 拆成可开发、可测试、可发布的实施步骤。所有行为约束以
`docs/adr/0003-paper-crud-and-source-search.md` 为准；本文不重新定义产品语义。

## 范围

交付内容：

- 单篇 Paper 创建和 PDF/XML/HTML 上传。
- Paper 查询、受匹配状态约束的元数据编辑。
- 全文文件替换、版本列表、下载和管理员版本恢复。
- 软删除、回收站、恢复、SUPER_ADMIN 永久删除。
- 独立 OpenAlex Source 检索页面和可复用选择器。
- OpenAlex Source 本地搜索快照与按需同步到业务 `source`。
- 双数据源、数据库迁移、权限、审计、并发控制和文件补偿。

不交付：

- 批量上传。
- Source、Work、解析结果、Block 或因果数据的通用 CRUD。
- Matching、Text Parsing、Block Import 的触发、取消、调度或任务管理。
- 定时 Source 同步。
- 文件内容 Hash、跨 Paper 文件去重和版本自动清理。

## 数据库迁移

引入 Flyway，并在发布流水线中显式执行/验证迁移。建议迁移顺序：

### V001：Paper 生命周期字段

为 `original_file` 增加：

```sql
created_at timestamptz
created_by bigint
updated_at timestamptz
updated_by bigint
deleted_at timestamptz
deleted_by bigint
delete_reason varchar(500)
record_version bigint NOT NULL DEFAULT 0
current_version integer NOT NULL DEFAULT 1
```

`created_by/updated_by/deleted_by` 是否建立到 `admin_user` 的外键，应以“用户禁用但不
物理删除”的既有约束为前提；若历史或运维写入可能没有 Admin User，则允许 NULL。
旧数据标记为历史导入：操作者为空，时间字段不伪造业务创建时间。

列表常用索引至少覆盖：

```text
deleted_at
(source_id, deleted_at)
(deleted_at, year DESC, file_id)
```

### V002：文件版本和待清理操作

建立 `original_file_version`：

```text
file_id                 FK -> original_file ON DELETE CASCADE
version_no              integer
file_name               varchar(255)
file_path               varchar(1000)
file_type               varchar(10)
file_size               bigint
uploaded_by             bigint nullable
uploaded_at             timestamptz
is_current              boolean
```

约束：

- 主键 `(file_id, version_no)`。
- 同一 `file_id` 最多一个 `is_current=true`，使用部分唯一索引。
- 类型限制为 PDF/XML/HTML，大小非负，路径只能保存 DATA_ROOT 相对路径。

迁移旧数据时，为每条 `original_file` 建立版本 1，并与当前文件字段一致。

建立文件操作补偿表，例如 `file_cleanup_operation`：

```text
operation_id
file_id
operation_type
status
staged_path
target_path
last_error
attempt_count
created_at
updated_at
```

状态和操作类型使用数据库 CHECK 约束。该表用于最终落盘失败和永久删除最终清理失败，
不扩展为通用任务管理。

### V003：OpenAlex Source 搜索快照

确保 `pg_trgm` 可用，建立 `openalex_source_search` 及精确、trigram 索引。ISSN JSON
建议以 `jsonb` 保存，并额外生成可索引的规范化 ISSN 文本或数组列。

### V004：约束与查询索引

- 增加回收站查询索引。
- 校验所有 `file_id` 外键的级联范围。
- 校验 Block 扩展表从 Block 主表的级联范围。
- 永久删除上线前，用事务回滚的集成测试证明不会删除 Work、Source 或因果数据。
- 将真实库已有但文档遗漏的 `flag_vector` 纳入迁移基线，禁止误删。

## 后端设计

### 配置和数据源

保留主数据源：

```text
PAPERFLOW_DB_HOST
PAPERFLOW_DB_PORT
PAPERFLOW_DB_NAME
PAPERFLOW_DB_SCHEMA=widi_chengyan
PAPERFLOW_DB_USER
PAPERFLOW_DB_PASSWORD
```

新增只读 OpenAlex 数据源：

```text
OPENALEX_DB_HOST
OPENALEX_DB_PORT
OPENALEX_DB_NAME
OPENALEX_DB_SCHEMA=dataset_20241125
OPENALEX_DB_USER
OPENALEX_DB_PASSWORD
```

增加：

```text
PAPER_UPLOAD_MAX_SIZE=100MB
DATA_ROOT
```

建立独立的 OpenAlex `SqlSessionFactory/SqlSessionTemplate` 和 mapper 标记，禁止 Source
查询误用主写事务。生产账号按 schema 配置最小权限。

### 服务职责

建议按当前项目层次增加聚焦服务，避免建立无边界的通用工具层：

- `PaperWriteService`：创建、编辑、删除、恢复、永久删除和乐观锁。
- `PaperFileService`：临时上传、类型检查、安全路径、移动、归档和补偿。
- `PaperVersionService`：版本列表、新版本和恢复版本。
- `OpenAlexSourceSearchService`：外部查询、本地快照搜索和 Source 按需同步。
- 现有 `AdminAuditLogService`：扩展 Paper 写动作审计。

所有正式路径必须由服务根据 `DATA_ROOT/source_id/file_id/version` 生成；controller 和
DTO 不接受服务器路径。

### API 契约

在 `docs/backend/api.yaml` 中增加并实现：

```text
POST   /api/papers
PUT    /api/papers/{fileId}
DELETE /api/papers/{fileId}
GET    /api/papers/trash
POST   /api/papers/{fileId}/restore
POST   /api/papers/{fileId}/purge

GET    /api/papers/{fileId}/versions
POST   /api/papers/{fileId}/versions
POST   /api/papers/{fileId}/versions/{versionNo}/restore

GET    /api/openalex/source-search
GET    /api/openalex/source-search/{sourceId}
POST   /api/openalex/source-search/sync
```

创建和上传新版本使用 `multipart/form-data`。元数据 JSON 使用独立 part，文件使用
`file` part。写请求继续使用 Session、CSRF 和同源策略。

核心错误码：

```text
PAPER_ALREADY_EXISTS          409
PAPER_IN_TRASH                409
PAPER_VERSION_CONFLICT        409
PAPER_MATCHED_FIELDS_LOCKED   409
PAPER_FILE_VERSION_DUPLICATE  409（仅版本号/请求重复，不比较内容）
PAPER_STORAGE_CONFLICT        409
PAPER_NOT_FOUND               404
SOURCE_NOT_FOUND              404
SOURCE_SELECTION_REQUIRED     400
INVALID_PAPER_FILE            400
PAPER_FILE_TOO_LARGE          413
PURGE_CONFIRMATION_REQUIRED   400
FORBIDDEN                     403
```

### 创建流程

1. 验证角色、CSRF 和 multipart 大小。
2. 流式写临时文件；校验扩展名、MIME 和内容特征。
3. 规范化标题、作者、年份、DOI 和 URL。
4. 从 OpenAlex 数据源回查 `source_id`。
5. 计算 SHA-256 元数据指纹 `file_id`。
6. 检查正常记录、回收站记录及目标路径冲突。
7. 在业务事务中按需插入本地 Source，创建 `original_file`、Job、版本 1 和审计记录。
8. 原子移动至正式路径；失败时执行补偿且接口不返回成功。
9. 返回新建 Paper 详情和 `recordVersion`。

### 编辑流程

- 请求必须带 `recordVersion`。
- `flag_match=1` 时比较请求与当前值，拒绝 Source、年份、标题、作者和 DOI 的任何
  变化；URL 可变。
- 未匹配 Paper 修改 Source 时回查 OpenAlex、按需同步本地 Source、移动当前文件，
  并在失败时恢复原路径/原记录。
- 成功后 `record_version + 1`，更新 `updated_at/updated_by` 并写字段级审计摘要。

### 文件版本流程

- 上传新版本前校验 Paper 未软删除和乐观锁版本。
- 将旧当前文件归档，写新版本并更新 `original_file` 当前文件字段。
- 版本恢复创建新的递增版本，来源文件保留不动。
- 历史版本下载仍通过受控资产接口，不能暴露绝对路径。
- 替换/恢复后的解析数据失效和状态重置封装在同一业务事务中；不触发任何 worker。

### 删除流程

软删除：

- 仅 ADMIN/SUPER_ADMIN。
- 删除原因可空，非空最长 500 字符。
- 校验 `recordVersion`，将当前和归档文件移入回收区。
- 设置删除字段并递增版本；普通查询统一增加 `deleted_at IS NULL`。

恢复：

- 仅 ADMIN/SUPER_ADMIN。
- 校验目标路径冲突，移回文件，清除当前删除字段并递增版本。
- 删除历史通过审计日志保留。

永久删除：

- 仅 SUPER_ADMIN、仅回收站记录、确认字符串必须精确等于 `删除`。
- 校验 `recordVersion`。
- 文件先移入 `pending-delete`，数据库事务删除 `original_file` 并写不可变审计。
- 提交后清理 staged 文件；失败写入补偿表供运维重试。

### Source 搜索流程

- 查询字符串 trim；少于 2 字符不执行模糊搜索，但完整 `S...` ID 和规范化 ISSN 可
  直接精确查询。
- ID/ISSN 精确结果置顶；名称和出版社使用 trigram。
- API 最多返回 20 条，服务端硬限制最大结果数。
- 全量同步使用 upsert，并记录同步时间；失败不截断旧快照。
- Paper 创建时必须回查 OpenAlex 原表，不能只信任可能过期的本地快照。

## 前端设计

### 路由和入口

- `/papers/new`：单篇导入。
- `/papers/:fileId/edit`：元数据编辑。
- `/papers/:fileId`：增加写操作和版本区块。
- `/papers/trash`：ADMIN/SUPER_ADMIN 回收站。
- `/source-search`：所有已登录角色可访问的 OpenAlex 来源检索。

### SourceSearchSelect

同一组件复用于新建、未匹配 Paper 编辑和独立检索页：

- 输入防抖，2 字符后搜索。
- 清晰展示名称、ID、ISSN、出版社和统计信息。
- 选择后保存 ID 与展示快照；提交只发送 ID。
- 提供键盘选择、加载、无结果和外部数据源失败状态。
- 独立页面额外提供复制 Source ID 和打开主页操作。

### Paper 表单

- 作者是可增删、排序列表，不暴露英文分号协议。
- 显示允许格式和 100 MB 默认上限。
- 不显示或提交服务器文件路径、正式文件名、`provider` 和 `file_id`。
- 已匹配详情中锁定 Source、年份、标题、作者、DOI，并解释锁定原因。
- 所有编辑请求携带 `recordVersion`；冲突后要求重新加载，不静默覆盖。

### 删除和版本交互

- USER 不显示删除、回收站、恢复或版本回滚入口。
- 软删除确认允许填写可选原因。
- 永久删除弹窗要求输入 `删除`，按钮在文本完全匹配前禁用。
- 版本列表显示版本号、类型、大小、上传者、时间和当前状态。
- 回滚历史版本需要二次确认，并说明解析结果会失效但不会自动触发离线任务。

## 权限和审计

后端方法级权限是最终边界，前端 `access.ts` 只负责展示：

- `canWritePapers`：全部角色。
- `canDeletePapers`：ADMIN、SUPER_ADMIN。
- `canRestorePapers`：ADMIN、SUPER_ADMIN。
- `canRestorePaperVersions`：ADMIN、SUPER_ADMIN。
- `canPurgePapers`：仅 SUPER_ADMIN。
- `canSearchOpenAlexSources`：全部角色。

审计动作至少包括：

```text
PAPER_CREATE
PAPER_UPDATE
PAPER_FILE_REPLACE
PAPER_VERSION_RESTORE
PAPER_SOFT_DELETE
PAPER_RESTORE
PAPER_PURGE
OPENALEX_SOURCE_SYNC
```

审计详情禁止保存文件内容、数据库密码、绝对路径和敏感请求头。

## 测试计划

### 数据库与后端

- Flyway 从当前真实 schema 基线升级。
- 旧 Paper 自动生成版本 1，读接口保持兼容。
- 双数据源 mapper 不串库、不写 OpenAlex schema。
- Source ID、ISSN、中文/英文名称和出版社搜索排序。
- Source 快照同步失败保留旧数据。
- 元数据规范化及 `file_id` 固定测试向量。
- 正常、回收站和并发重复创建。
- PDF/XML/HTML 有效样例及伪扩展、错误 MIME、超限文件。
- 任一数据库或文件步骤失败后的临时文件和补偿状态。
- 已匹配字段锁定、URL 可编辑。
- 未匹配 Source 修改和文件移动回滚。
- 乐观锁覆盖所有写接口。
- 版本递增、当前版本唯一、管理员回滚创建新版本。
- USER/ADMIN/SUPER_ADMIN 权限矩阵。
- 软删除查询隔离、恢复路径冲突、可选删除原因。
- 永久删除确认文本、级联边界和最终清理失败。
- 审计包含操作者和差异，但不泄露文件或密钥。

### 前端

- Source 搜索防抖、选择、键盘和错误态。
- 作者列表增删排序及必填校验。
- 单文件上传、进度、失败重试和离开页面提示。
- 已匹配字段禁用与后端错误兜底。
- 乐观锁冲突刷新提示。
- 角色控制、回收站、可选删除原因和永久删除输入。
- 版本列表、下载和管理员回滚。

### 发布验收

- 生产账号对业务 schema 有所需最小写权限，对 OpenAlex schema 只读。
- Java 和 pipeline 看到同一个持久化 `DATA_ROOT`。
- 上传目录健康检查可读、可写且剩余空间充足。
- 100 MB 文件能在 Nginx、Spring multipart 和应用配置三层通过。
- 数据库备份和文件目录备份可恢复。
- 灰度创建、编辑、替换、软删除、恢复和永久删除各完成一次。

## 推荐交付顺序

1. 数据库基线、Flyway 和备份/恢复演练。
2. 双数据源与 OpenAlex Source 搜索快照。
3. Source 搜索 API、独立页面和复用选择器。
4. 文件安全服务、Paper 创建和版本 1。
5. 元数据编辑、匹配字段锁定和 Source 文件移动。
6. 文件替换、版本列表、下载和管理员恢复。
7. 软删除、回收站和恢复。
8. SUPER_ADMIN 永久删除与补偿清理。
9. OpenAPI、运行手册、监控、完整集成测试和灰度发布。

每一步必须以纵向可运行切片交付，后一步不得依赖尚未验证的文件补偿或权限边界。
