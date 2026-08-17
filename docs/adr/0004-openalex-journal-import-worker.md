# OpenAlex 来源元数据导入与 Worker

## 状态

已接受，待实施。

## 背景

`/source-search` 原本是 OpenAlex Source 搜索快照，用于 Paper 创建时选择
Source。现在管理平台需要以 **OpenAlex Source** 为入口，由管理员提交指定年份范围
（或全量）的元数据导入。

现有 Python `paperflow import-openalex` 已实现权威 Source 校验、OpenAlex 元数据
读取、业务表幂等写入和失败 Matching 重置。用 Java 再实现相同查询和写入会使两套
导入语义逐步漂移；但将 CLI 直接放进 HTTP 请求会使长时间运行、进度、失败恢复和
部署环境都不可控。

## 决策

- `/source-search` 为“OpenAlex 来源检索”，展示本地 OpenAlex `sources` 快照中的所有
  Source。提交任务时从只读 OpenAlex 数据源权威回查 Source 存在性；当前离线数据集不提供
  Source 类型字段，因此不做期刊类型筛选。
- 仅 `ADMIN` 和 `SUPER_ADMIN` 可创建或重试导入任务；所有已登录用户可查看任务
  状态和结果。
- 一个任务只导入一个 `source_id`；`year_from`、`year_to` 都为空表示该 Source 所有可用
  年份。任意指定范围必须满足 `year_from <= year_to`。
- 管理平台在 Paperflow 业务 schema 写入 `openalex_journal_import_task`，用于任务
  协调、结果呈现和审计；它不是 OpenAlex 元数据本身。
- 同一个 Source 同时至多有一个 `QUEUED` 或 `RUNNING` 任务；租约到期的运行任务仍
  保留该占用，直到被 worker 重新领取。失败重试创建新的任务记录，而不覆盖原任务。
- Python `paperflow` 是唯一的 OpenAlex Metadata Import 执行实现。新增独立的
  `paperflow-openalex-import-worker` systemd 服务轮询并领取任务，复用
  `OpenAlexMetadataImporter`，不得由 Java HTTP 请求执行 Python CLI 或子进程。
- Worker 对领取的任务设置可续期租约并持续写入进度。进程异常后，租约到期的
  `RUNNING` 任务可被其他 worker 重新领取。导入写入必须仍在一个 Paperflow 业务
  数据库事务中完成；异常时该次业务写入回滚。
- 导入正式写入 `source`、`work`、`work_source`、`work_author`、`work_topic`，并
  重置本 Source 下 `flag_match=-1` 的 Original File Job。它不创建 Original File 或
  Original File Job，也不执行 Matching、Text Parsing 或 Block Import。

## 后果

- ADR 0003 中“Java 请求不触发 Python CLI 或离线 pipeline”的边界保持成立：Java
  只提交和查询任务，独立 worker 执行 Python 领域逻辑。
- 应用账号需要写入任务表；worker 需要 OpenAlex schema 的只读权限和 Paperflow
  业务 schema 的元数据表及任务表写权限。
- 部署增加 Python 运行环境、worker systemd 服务及监控项。Java 服务重启、浏览器
  关闭或请求超时不会中断已提交的导入。
