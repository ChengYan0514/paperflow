# OpenAlex 来源元数据导入设计

本设计落实 ADR 0004。术语以 `CONTEXT.md` 为准；页面上的“来源数据导入”只导入
OpenAlex 元数据，绝不表示原始文件采集或全文处理。当前离线 OpenAlex 数据集没有
Source 类型字段，因此检索和导入适用于全部已存在的 Source。

## 用户流程

1. 用户在 `/source-search` 按来源名称、Source ID、ISSN 或出版社检索。
2. 每个结果可打开“导入来源数据”对话框。对话框固定展示所选 Source 和 Source ID，
   可选填写起止发表年份；留空即全部年份。
3. `ADMIN` 或 `SUPER_ADMIN` 提交后，后端权威校验该 Source 存在，创建
   `QUEUED` 任务并返回。存在同 Source 的活动任务时返回冲突，不创建重复任务。
4. 页面展示该 Source 最近导入任务并轮询任务详情。完成后显示导入的 Source、Work、
   Work-Source、Work-Author、Work-Topic 数量和重置的失败匹配数量；失败时显示安全的
   错误摘要，并允许有权限者创建一次重试任务。
5. 成功后提供“查看来源期刊”和“查看论文”入口，后者带入 Source ID；不自动运行
   Matching 或任何全文阶段。

## 任务模型

`openalex_journal_import_task` 是 Paperflow 业务 schema 内的协调表。时间均为
`timestamptz`，计数均为非负整数。

| 字段 | 说明 |
| --- | --- |
| `task_id` | UUID 文本主键，由 Java 创建 |
| `source_id` | 待导入的 OpenAlex Source ID；不是对本地 `source` 的外键，因为任务创建时该 Source 尚未导入 |
| `year_from`, `year_to` | 可空的闭区间；同时非空时 `year_from <= year_to` |
| `status` | `QUEUED`、`RUNNING`、`SUCCEEDED`、`FAILED` |
| `created_by` | 提交人的 `admin_user.id`；管理用户表独立初始化，任务表不建立数据库外键 |
| `created_at`, `started_at`, `finished_at` | 生命周期时间 |
| `worker_id` | 当前或最近一次领取任务的 worker 标识 |
| `lease_expires_at`, `last_heartbeat_at` | `RUNNING` 租约和心跳；终态清空租约 |
| `attempt_count` | worker 领取次数；租约过期后重新领取会递增 |
| `progress_current`, `progress_total`, `progress_message` | 导入器阶段进度；当前总步数为 7，但客户端不得把 7 作为固定契约 |
| `result` | 成功时 JSONB：`sourceCount`、`workCount`、`workSourceCount`、`workAuthorCount`、`workTopicCount`、`matchResetCount` |
| `error_code`, `error_message` | 失败摘要；不得保存数据库 URL、密码、完整堆栈或未过滤的外部异常内容 |

约束与索引：

- `CHECK status IN ('QUEUED','RUNNING','SUCCEEDED','FAILED')`。
- `CHECK year_from IS NULL OR year_to IS NULL OR year_from <= year_to`。
- `CHECK progress_current >= 0 AND progress_total >= 0 AND progress_current <= progress_total`。
- 部分唯一索引：同一 `source_id` 至多一个 `status IN ('QUEUED','RUNNING')` 的任务。
  租约已过期但尚未被 worker 重新领取时仍保持占用；Java 不得绕过该约束创建并发任务。
- 列表索引：`(source_id, created_at DESC)` 与 `(status, created_at)`；worker 领取查询
  使用 `(status, lease_expires_at, created_at)`。

任务不可取消、不可删除。失败重试只创建一个新的 `QUEUED` 任务并以
`retry_of_task_id` 指向失败任务，保留完整审计链。V1 不支持人工将 `RUNNING` 改为
终态；租约恢复负责处理 worker 崩溃。

## HTTP API

全部接口受登录态和 CSRF 保护（安全的 GET 除外）。创建和重试返回的任务对象不暴露
worker 环境、数据库配置或内部异常堆栈。

| 方法 | 路径 | 权限 | 语义 |
| --- | --- | --- | --- |
| `POST` | `/api/openalex/journal-imports` | `ADMIN`、`SUPER_ADMIN` | 创建单 Source 导入任务，返回 `201` |
| `GET` | `/api/openalex/journal-imports` | 已登录 | 按 Source、状态分页查看任务 |
| `GET` | `/api/openalex/journal-imports/{taskId}` | 已登录 | 查询单个任务及结果 |
| `POST` | `/api/openalex/journal-imports/{taskId}/retry` | `ADMIN`、`SUPER_ADMIN` | 仅原任务为 `FAILED` 时创建重试任务，返回 `201` |

创建请求只含 `sourceId`、`yearFrom`、`yearTo`。后端验证短 OpenAlex ID、年份范围和
权限；然后通过只读 OpenAlex mapper 回查 `sources.id`。Source 不存在返回
`404 SOURCE_NOT_FOUND`，活动任务冲突返回 `409 OPENALEX_JOURNAL_IMPORT_CONFLICT`。

Source 搜索接口继续使用 `/api/openalex/source-search`，全量同步投影全部 Source；搜索
响应不包含不存在于当前离线数据集的 `sourceType` 字段。

## Worker 协议

worker 以 `PAPERFLOW_WORKER_ID`（默认主机名与进程号）标识，使用和 Java 相同的
`PAPERFLOW_DB_*`、`OPENALEX_DB_*`、schema 配置。它不提供 HTTP 服务，默认每 5 秒
轮询一次，可由 `PAPERFLOW_OPENALEX_IMPORT_POLL_SECONDS` 配置；租约默认 5 分钟，
由 `PAPERFLOW_OPENALEX_IMPORT_LEASE_SECONDS` 配置。

1. 在一个短业务库事务中以 `FOR UPDATE SKIP LOCKED` 选择最早的 `QUEUED` 任务，或
   租约已到期的 `RUNNING` 任务；设置 `RUNNING`、worker、`started_at`（首次才设置）、
   新租约、心跳、进度起点，并递增 `attempt_count`。
2. 打开 OpenAlex 只读连接和 Paperflow 业务写事务，调用现有
   `OpenAlexMetadataImporter.import_by_sources([source_id], year_from, year_to)`。将其
   `ProgressEvent` 写入任务进度，并在长阶段期间续租。
3. 成功时，在提交元数据写事务后用短事务写入 `SUCCEEDED`、结果、`finished_at`，清空
   租约；失败时确保元数据写事务回滚，再用短事务写入 `FAILED`、已过滤错误摘要和
   `finished_at`，清空租约。
4. 写进度、心跳、成功或失败时必须带 `WHERE task_id = ? AND status = 'RUNNING' AND
   worker_id = ?`，防止过期 worker 覆盖被重新领取的任务。

`OpenAlexMetadataImporter` 的导入内容和事务语义保持不变。任务记录可能在导入成功
但状态落库前因进程中断而被再次领取；导入本身的 upsert 和失败匹配重置必须保持幂等。

## 部署与运行

生产环境增加 `/opt/paperflow` 的 Python 项目与隔离 `uv` 环境。worker 使用独立
`paperflow` 系统账号和 `/etc/paperflow-admin/admin.env`，仅需要读取 OpenAlex schema，
并写 Paperflow 的元数据表、`original_file_job`（匹配重置）和任务表。它不需要
`DATA_ROOT` 写权限，也不需要 MinerU、Milvus 或公网监听端口。

systemd 服务名为 `paperflow-openalex-import-worker.service`。它随网络和 PostgreSQL
可达后启动，异常退出自动重启；Java 服务与 worker 可以独立升级。运行手册应提供：

```bash
systemctl status paperflow-openalex-import-worker
journalctl -u paperflow-openalex-import-worker -f
```

worker CLI 是 `paperflow --no-progress run-openalex-import-worker`；仅用于故障排查的
单次领取可加 `--once`。可通过 `PAPERFLOW_OPENALEX_IMPORT_POLL_SECONDS` 和
`PAPERFLOW_OPENALEX_IMPORT_LEASE_SECONDS` 调整轮询和租约。

监控至少覆盖：`FAILED` 任务数、`RUNNING` 且心跳过期的任务数、最长排队时长、worker
最近心跳和最近成功完成时间。
