# 论文 CRUD、全文文件生命周期与 OpenAlex Source 检索

## 状态

已实施。生产数据库迁移与真实环境 CRUD 联调已于 2026-08-04 完成；正式服务部署仍按
运行手册执行。

本文取代 ADR 0002 中“论文管理保持只读”和“不增加在线编辑”的决定。ADR 0002
关于 Paper 以 `original_file.file_id` 为身份、Work 仅作为可选 OpenAlex 补充元数据、
论文页面与路由的其他决定继续有效。

## 背景

管理平台目前只读 Paperflow 业务表及 `DATA_ROOT` 文件。新阶段只开放 Paper
Management Record 的增删改查，并支持单篇原始全文上传。Source、Work、解析结果、
任务状态和因果数据不开放通用 CRUD；Java 管理端也不执行 Matching、Text Parsing
或 Block Import。

当前 PostgreSQL 拓扑是同一数据库的两个 schema：

- Paperflow 业务数据：`openalex.widi_chengyan`，由 `PAPERFLOW_DB_*` 配置。
- OpenAlex 数据集：`openalex.dataset_20241125`，由独立的 `OPENALEX_DB_*` 配置。

OpenAlex Source 原表为 `dataset_20241125.sources`，其主要字段是 `id`、
`display_name`、`issn_l`、`issn`、`publisher`、`works_count`、
`cited_by_count`、`is_oa`、`is_in_doaj`、`homepage_url` 和 `updated_date`。
该 schema 对管理端保持只读。

## 决策

### 写入边界

- 本阶段只实现 Paper 的创建、查询、元数据编辑、软删除、恢复和永久删除。
- 支持单次上传一个 PDF、XML 或 HTML 文件，不支持批量上传。
- Source 只提供搜索、选择和按需同步，不允许用户修改或删除 OpenAlex Source。
- Work、Work Author、Work Source、任务状态、解析文本、Block 和因果数据仍为只读资源。
- Java 请求不触发 Python CLI、MinerU 或离线 pipeline。
- 新建 Paper 时仍创建 `original_file_job`：PDF 的 `flag_match/flag_text/flag_block`
  初始化为 `0/0/0`；XML/HTML 初始化为 `0/-2/0`。实际数据库已有
  `flag_vector` 时沿用数据库默认值或显式初始化为 `0`，但本功能不管理向量任务。

### Paper 身份与规范化

用户原始文件名不保存。创建时，后端按首次提交元数据生成不可变 `file_id`：

```text
fingerprint_input =
  canonical(source_id) + "\n" +
  canonical(year) + "\n" +
  canonical(paper_title) + "\n" +
  canonical(authors)

file_id = lowercase_hex(SHA-256(UTF-8(fingerprint_input)))
```

`canonical` 的统一规则是 Unicode NFKC、trim、连续空白压缩为一个空格，并使用
`Locale.ROOT` 小写化。年份使用十进制字符串。作者先逐项规范化，再按用户排序以
英文分号连接；作者顺序参与 Hash。

`file_id` 仅在创建时计算一次，创建后永久不变。修改元数据、Source、替换或恢复
文件版本均不重新计算。物理文件名为 `{file_id}.{normalized_extension}`。

批量 CSV 导入也必须提供 `year`，并校验 `file_name` 去除扩展名后等于按同一规则计算的
`file_id`；不一致的行在预检阶段失败。

如果 `file_id` 已存在：

- 正常记录返回 `409 PAPER_ALREADY_EXISTS`。
- 软删除记录返回 `409 PAPER_IN_TRASH`，不能用重新上传绕过恢复流程。
- 并发创建由主键约束裁决，失败请求必须清理临时文件。
- 永久删除后允许用相同元数据重新创建并复用相同 `file_id`。

DOI 相同但 `file_id` 不同只提示重复风险，不强制阻止。文件字节不计算或保存内容
Hash，也不做基于文件内容的去重。

### 创建字段与校验

创建表单必填：

- 从 OpenAlex Source 推荐中选定的 `source_id`。
- 年份，范围为 1000 至服务器当前年份加 1。
- 非空论文标题。
- 至少一位非空作者，前端使用可增删和排序的结构化作者控件。
- 一个原始全文文件。

DOI 和原始文章 URL 可选。`provider` 不由用户填写，统一保存
`manual-upload`。作者 API 使用数组，业务表继续用英文分号连接的字符串保存。
DOI 沿用现有去前缀、trim 和小写规范化规则。

允许 PDF、XML、HTML，后端同时校验扩展名、声明 MIME 和文件魔数/内容特征。
默认最大 100 MB，通过环境变量配置。拒绝 ZIP、Word、图片及其他格式。

### 双数据源与 Source 搜索

Java 后端建立独立 OpenAlex 数据源，配置前缀为 `OPENALEX_DB_*`。该数据源仅执行
只读查询，不能复用 Paperflow 写事务。

在 Paperflow 业务 schema 建立 `openalex_source_search` 本地检索快照。至少保存：

- `source_id`
- `display_name`
- `publisher`
- `issn_l`
- `issn`
- `works_count`
- `cited_by_count`
- `is_oa`
- `is_in_doaj`
- `homepage_url`
- `source_updated_at`
- `synced_at`

启用 `pg_trgm`，为规范化名称和出版社建立 GIN trigram 索引；Source ID 和 ISSN
建立精确查询索引。搜索至少输入 2 个字符，默认最多返回 20 条。ID 和 ISSN 精确
命中优先，名称相似度其次，并用 `works_count` 辅助排序。

本阶段提供幂等的全量初始化和手动同步命令或管理接口，不实现定时同步。搜索结果
至少显示 Source ID、名称、ISSN、出版社、Works 数、OA/DOAJ 标记和可用主页链接。

创建或修改 Paper 的 Source 时，前端只提交 `source_id`。后端必须回查 OpenAlex
权威记录；Paperflow 本地 `source` 不存在时，在业务事务内按需插入必要字段。已存在
记录不在本次操作中覆盖，Source 更新同步另行设计。

### 文件存储和版本

Java 后端和离线 pipeline 使用同一个持久化 `DATA_ROOT`。路径全部是相对
`DATA_ROOT` 的后端生成路径，拒绝绝对路径和 `..`：

```text
当前文件      openalex/original/{source_id}/{file_id}.{ext}
临时上传      .upload-tmp/{request_id}/
历史版本      paperflow/archive/{file_id}/{version_no}.{ext}
软删除隔离    paperflow/trash/{file_id}/
永久删除过渡  paperflow/pending-delete/{operation_id}/
```

健康检查增加上传相关目录的可写性检查。全文内容不写入 PostgreSQL。

创建时初始文件即版本 1。替换文件是独立操作，不与元数据编辑混合：

- `file_id` 不变，旧当前文件移入归档，新文件成为下一版本。
- `original_file` 指向当前版本；`original_file_version` 保存全部版本。
- 有查看权限的用户可查看和下载历史版本。
- USER、ADMIN、SUPER_ADMIN 均可上传新版本。
- 只有 ADMIN、SUPER_ADMIN 可以恢复历史版本。
- 恢复历史版本通过复制/提升为一个新版本实现，不原地篡改旧版本记录。
- 历史版本不单独删除，只随 Paper 永久删除清理。
- 暂不设置版本数量或保留期限上限。
- 替换和恢复版本使旧解析产物失效并重置对应现有状态，但不触发离线处理；更完整的
  任务协调、执行中取消和 worker 领取规则留到任务管理阶段设计。

### 元数据编辑与匹配锁定

未匹配 Paper 可修改 Source、年份、标题、作者、DOI 和 URL。`flag_match=1` 后，
Source、年份、标题、作者和 DOI 全部锁定，前后端都必须拒绝修改；不增加“匹配待
复核”状态。URL 始终可编辑。

未匹配 Paper 修改 Source 时：

- 重新校验并按需同步新 Source。
- 将当前文件原子移动到新 Source 目录。
- 更新 `source_id` 和 `original_file_path`，`file_id` 不变。
- 历史版本路径不含 Source，不移动。
- 目标路径已存在时拒绝且不得覆盖。
- 文件移动与数据库事务间使用补偿恢复，不能留下半更新状态。

### 软删除、恢复和永久删除

软删除将当前文件及其归档版本移动到 Paper 的回收区，业务记录保留。删除原因可选，
非空时最长 500 字符。普通列表默认排除软删除记录；直接访问返回
`PAPER_IN_TRASH`；ADMIN 和 SUPER_ADMIN 使用独立回收站查询、恢复。

恢复保留删除前的业务数据和任务状态，将文件移回正式/归档目录。删除和恢复都写
审计日志。

永久删除只能由 SUPER_ADMIN 对回收站记录执行，并要求用户再次输入固定中文文本
`删除`。前端确认不是安全边界，后端必须重新校验角色、确认文本、软删除状态和
乐观锁版本。

永久删除清理：

- 当前原始文件、全部历史版本和隔离目录。
- `original_file` 记录，以及经确认的外键级联数据：`original_file_job`、
  `text_file`、`block` 和 Block 扩展表。

永久删除不得删除 OpenAlex Work、Source、Work-Source、Work Author 或以 Work 为
主体的因果数据。审计日志永久保留，但只记录操作和 `file_id`，不保留全文。

文件系统和数据库不能组成原子事务，因此永久删除采用：先移入
`pending-delete`，再提交数据库删除，最后物理清理。最终清理失败必须留下可重试的
清理记录。

本阶段不设计离线任务取消、执行中锁定、worker 对软删除的过滤或任务管理页面；这些
问题在任务管理功能中单独决策。

### 权限

| 操作 | USER | ADMIN | SUPER_ADMIN |
| --- | --- | --- | --- |
| 查看、搜索、预览、下载 | 是 | 是 | 是 |
| 创建并上传 | 是 | 是 | 是 |
| 编辑允许修改的元数据 | 是 | 是 | 是 |
| 上传新文件版本 | 是 | 是 | 是 |
| 查看历史版本 | 是 | 是 | 是 |
| 恢复历史版本 | 否 | 是 | 是 |
| 软删除、查看回收站、恢复 | 否 | 是 | 是 |
| 永久删除 | 否 | 否 | 是 |
| OpenAlex Source 检索 | 是 | 是 | 是 |

所有写操作记录操作者、目标 `file_id`、动作、请求 ID 和字段变更摘要。

### 并发控制与上传一致性

`original_file` 增加 `record_version` 乐观锁。详情返回 `recordVersion`；元数据更新、
替换文件、恢复版本、软删除、恢复和永久删除均提交期望版本。更新语句使用
`WHERE file_id = ? AND record_version = ?`，冲突返回
`409 PAPER_VERSION_CONFLICT`。

上传采用临时文件、数据库事务和补偿清理：

1. 流式写入 `.upload-tmp/{request_id}` 并完成大小、格式和元数据校验。
2. 校验 Source，规范化字段并计算 `file_id`。
3. 在业务事务内写 Paper、版本、Job 和审计记录。
4. 将临时文件原子移动到正式目录。
5. 数据库失败时删除临时文件；最终移动失败时不得返回成功，记录可修复状态并执行
   补偿。

任何接口都不接受客户端提供的服务器文件路径或正式文件名。

## 后果

- Java 后端不再是纯只读业务服务，需要 Paperflow 业务表、文件目录和审计表的最小
  写权限。
- 文件系统与数据库的一致性成为显式领域问题，需要补偿记录和运维清理能力。
- `file_id` 从“历史离线文件名去扩展名”扩展为“旧数据保持原身份，新在线记录使用
  元数据指纹”；两者均为不可变 Paper 身份。
- OpenAlex Source 搜索不直接对大表执行每次按键的全表模糊扫描，而由本地搜索快照
  提供稳定性能。
- 任务执行和任务管理仍不属于本次范围。
