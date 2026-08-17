# Paperflow 数据库设计文档

本文描述当前版本实际使用的 PostgreSQL 表结构、约束、索引和状态流转。当前版本覆盖
OpenAlex 元数据导入、原始文件登记、匹配、MinerU 解析、block 入库及其来源导入任务；
不包含论文采集、OpenAlex API 导入、向量化和 `work_keyword`。

## 1. 数据库边界

### 1.1 使用表

当前版本使用以下表：

- `source`
- `work`
- `work_source`
- `work_author`
- `work_topic`
- `original_file`
- `original_file_job`
- `text_file`
- `block`
- `block_image`
- `block_table`
- `block_equation`
- `block_footnote`
- `block_reference`

### 1.2 PostgreSQL 扩展

Paperflow 项目库必须启用 `pg_trgm`，用于标题模糊匹配：

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### 1.3 路径保存规则

数据库中保存的文件路径都是相对物理数据根目录的相对路径，不包含 `data/` 前缀。

默认物理根目录由后续 Original File Import / Text Parsing 实现补充配置。

```text
data
```

规范相对路径：

| 类型 | 相对路径 |
| --- | --- |
| CSV 文件 | `openalex/csv/{csv_file_name}` |
| 原始文件 | `openalex/original/{source_id}/{original_file_name}` |
| MinerU 原始输出 | `openalex/mineru_raw/{source_id}/{file_id}/` |
| 规范化 parsed 输出 | `openalex/parsed/{source_id}/{file_id}/` |

原始文件和 CSV 在导入前必须已经位于规范路径下。Paperflow 不移动、不复制外部交付文件，只负责校验和登记。

## 2. 表结构

### 2.1 `source`

表格描述：OpenAlex 来源表，记录期刊或来源的基础信息。

| 名称 | 代码 | 主键 | 数据类型 | 约束/说明 |
| --- | --- | --- | --- | --- |
| 来源 ID | `source_id` | TRUE | `varchar(255)` | OpenAlex source ID |
| 来源名称 | `source_name` | FALSE | `varchar(1000)` | OpenAlex `sources.display_name` |
| 来源平台 | `provider` | FALSE | `varchar(1000)` | 可为空；来自 OpenAlex `sources.publisher`；不与 `original_file.provider` 建关联 |
| 是否采集完成 | `flag_collect` | FALSE | `int2` | 默认 `0`；取值 `0/1`；当前版本不以该字段驱动流程 |

约束：

- 主键：`source(source_id)`
- `CHECK flag_collect IN (0, 1)`

### 2.2 `work`

表格描述：作品基础信息表，记录从 OpenAlex 源数据库导入的作品核心元数据。

| 名称 | 代码 | 主键 | 数据类型 | 约束/说明 |
| --- | --- | --- | --- | --- |
| 作品 ID | `work_id` | TRUE | `varchar(255)` | OpenAlex work ID |
| DOI | `doi` | FALSE | `varchar(1000)` | 归一化 DOI；不建唯一约束 |
| 标题 | `title` | FALSE | `varchar(1000)` | 用于标题模糊匹配 |
| 公开年份 | `publication_year` | FALSE | `int4` |  |
| 公开日期 | `publication_date` | FALSE | `varchar(255)` |  |
| 类型 | `type` | FALSE | `varchar(255)` | 保留 OpenAlex `type`，当前不作为过滤条件 |
| 语言 | `language` | FALSE | `varchar(255)` | 保留 OpenAlex `language`，当前不作为过滤条件 |

约束和索引：

- 主键：`work(work_id)`
- 普通索引：`work(doi)`
- 普通索引：`work(publication_year)`
- GIN trgm 索引：`work(title gin_trgm_ops)`

`work.doi` 不建唯一约束，避免 OpenAlex 异常数据导致元数据导入失败。DOI 匹配时由业务逻辑要求唯一候选。

### 2.3 `work_source`

表格描述：作品与来源的关联表。

| 名称 | 代码 | 主键 | 数据类型 | 约束/说明 |
| --- | --- | --- | --- | --- |
| 作品 ID | `work_id` | TRUE | `varchar(255)` | 外键 `work.work_id`，`ON DELETE CASCADE` |
| 来源 ID | `source_id` | TRUE | `varchar(255)` | 外键 `source.source_id`，`ON DELETE CASCADE` |

约束和索引：

- 主键：`work_source(work_id, source_id)`
- 普通索引：`work_source(source_id)`

匹配阶段必须通过 `work_source` 校验候选 `work_id` 属于 CSV 中给定的 `source_id`。

### 2.4 `work_author`

表格描述：作品作者关联表，记录从 OpenAlex 源数据库导入的作者信息。

| 名称 | 代码 | 主键 | 数据类型 | 约束/说明 |
| --- | --- | --- | --- | --- |
| 作品 ID | `work_id` | TRUE | `varchar(255)` | 外键 `work.work_id`，`ON DELETE CASCADE` |
| 作者 ID | `author_id` | TRUE | `varchar(255)` | OpenAlex author ID |
| 作者姓名 | `author_name` | FALSE | `varchar(255)` | 用于作者集合相似度 |
| 作者位置 | `author_position` | FALSE | `varchar(32)` | 可为空；非空时只能是 `first`、`middle`、`last` |

约束和索引：

- 主键：`work_author(work_id, author_id)`
- `CHECK author_position IS NULL OR author_position IN ('first', 'middle', 'last')`
- 普通索引：`work_author(author_name)`

当前版本不增加 `author_order`。

### 2.5 `work_topic`

表格描述：OpenAlex Work 与主题的关联表，由来源元数据导入写入，供因果图谱与后续
主题查询使用。

| 名称 | 代码 | 主键 | 数据类型 | 约束/说明 |
| --- | --- | --- | --- | --- |
| 作品 ID | `work_id` | TRUE | `varchar(255)` | 外键 `work.work_id`，`ON DELETE CASCADE` |
| 主题 ID | `topic_id` | TRUE | `varchar(255)` | OpenAlex topic ID |
| 主题名称 | `topic_name` | FALSE | `varchar(1000)` | 可为空 |
| 学科领域 | `field_name` | FALSE | `varchar(1000)` | 可为空 |
| 子领域 | `subfield_name` | FALSE | `varchar(1000)` | 可为空 |
| 域 | `domain_name` | FALSE | `varchar(1000)` | 可为空 |
| 关键词 | `keywords` | FALSE | `varchar(1000)` | 可为空；导入时截断到字段上限 |
| 描述 | `description` | FALSE | `varchar(1000)` | 可为空；导入时截断到字段上限 |

约束和索引：

- 主键：`work_topic(work_id, topic_id)`
- 普通索引：`work_topic(topic_id)`

### 2.6 `original_file`

表格描述：原始文件登记表。导入阶段只校验和登记，不做匹配。`file_id` 是全库唯一且不可变的原始文件身份，定义为规范化 `source_id`、`year`、`paper_title` 与 `authors` 的 SHA-256 十六进制哈希，不是文件内容 hash。

| 名称 | 代码 | 主键 | 数据类型 | 约束/说明 |
| --- | --- | --- | --- | --- |
| 文件 ID | `file_id` | TRUE | `varchar(255)` | 主键；元数据稳定 SHA-256 哈希；全库唯一且不可变 |
| 来源 ID | `source_id` | FALSE | `varchar(255)` | 外键 `source.source_id`，`ON DELETE RESTRICT` |
| 论文年份 | `year` | FALSE | `int4` | CSV 输入 |
| 论文标题 | `paper_title` | FALSE | `varchar(2000)` | CSV 输入 |
| 论文作者 | `authors` | FALSE | `varchar(2000)` | CSV 输入；多作者用英文分号 `;` 分隔，单作者不附加分号 |
| DOI | `doi` | FALSE | `varchar(500)` | 归一化 DOI，可为空 |
| 文章采集链接 | `url` | FALSE | `varchar(2000)` | CSV 输入；原始采集页面或下载链接，可为空 |
| 采集平台 | `provider` | FALSE | `varchar(255)` | CSV 输入；如 `springer`，以后查询采集平台以该字段为准 |
| 原始文件名称 | `original_file_name` | FALSE | `varchar(255)` | CSV `file_name` |
| 原始文件路径 | `original_file_path` | FALSE | `varchar(1000)` | 相对路径，必须位于 `openalex/original/...` |
| 原始文件类型 | `original_file_type` | FALSE | `varchar(10)` | 只能是 `PDF`、`XML`、`HTML` |
| 原始文件大小 | `file_size` | FALSE | `int8` | 单位：字节 |

约束和索引：

- 主键：`original_file(file_id)`
- 普通索引：`original_file(source_id)`
- 普通索引：`original_file(doi)`
- 普通索引：`original_file(provider)`
- `CHECK original_file_type IN ('PDF', 'XML', 'HTML')`

`source.provider` 和 `original_file.provider` 语义不同，不建立外键或枚举关联。后续查询采集平台时，以 `original_file.provider` 为准。

同一个 File Hash 重复导入时保持一条记录。如果后续导入提供更高优先级文件类型，按 `PDF > XML > HTML` 在 Original File Import 阶段替换 `original_file_name`、`original_file_path`、`original_file_type` 和 `file_size`。

### 2.7 `original_file_job`

表格描述：按 `original_file.file_id` 粒度记录真实原始文件的匹配和下游处理状态。Original File Import 插入新的 `original_file` 后，同步创建 `original_file_job`。

| 名称 | 代码 | 主键 | 数据类型 | 约束/说明 |
| --- | --- | --- | --- | --- |
| 文件 ID | `file_id` | TRUE | `varchar(255)` | 外键 `original_file.file_id`，`ON DELETE CASCADE` |
| 匹配状态 | `flag_match` | FALSE | `int2` | 默认 `0`；取值 `-1/0/1` |
| 匹配到的作品 ID | `matched_work_id` | FALSE | `varchar(255)` | 可为空；外键 `work.work_id`，`ON DELETE SET NULL` |
| MinerU 解析状态 | `flag_text` | FALSE | `int2` | 默认 `0`；取值 `-2/-1/0/1/2` |
| block 入库状态 | `flag_block` | FALSE | `int2` | 默认 `0`；取值 `-1/0/1` |

约束：

- 主键：`original_file_job(file_id)`
- 唯一约束：`original_file_job(matched_work_id)`；多个 `NULL` 允许存在，非空时保证一个 Work 最多匹配一个 Original File Job
- 普通索引：`original_file_job(matched_work_id)`
- `CHECK flag_match IN (-1, 0, 1)`
- `CHECK (flag_match = 1 AND matched_work_id IS NOT NULL) OR (flag_match IN (-1, 0) AND matched_work_id IS NULL)`
- `CHECK flag_text IN (-2, -1, 0, 1, 2)`
- `CHECK flag_block IN (-1, 0, 1)`

`flag_match` 状态：

| 值 | 含义 |
| --- | --- |
| `0` | 尚未尝试匹配 |
| `1` | 已匹配到 `matched_work_id` |
| `-1` | 最近一次匹配未找到候选，可在 OpenAlex 元数据更新后重置为 `0` |

`flag_text` 状态：

| 值 | 含义 |
| --- | --- |
| `0` | MinerU 未解析 |
| `1` | MinerU 解析中 |
| `2` | MinerU 解析完成，parsed 输出已生成 |
| `-1` | MinerU 解析失败，可显式重试 |
| `-2` | 文件类型当前版本不支持解析 |

`flag_block` 状态：

| 值 | 含义 |
| --- | --- |
| `0` | block 未入库 |
| `1` | block 入库完成 |
| `-1` | block 入库失败，可显式重试 |

失败状态不会在任务启动时自动重置，必须通过显式 retry 参数重跑。`XML` 和 `HTML` 原始文件在创建 `original_file_job` 时设置 `flag_text=-2`，当前版本不进入 MinerU。

### 2.8 `openalex_journal_import_task`

表格描述：管理平台提交、Python worker 领取和展示 OpenAlex 来源元数据导入的协调表。
它不保存 OpenAlex 原数据，也不替代 `source`、`work` 与关联表。

| 名称 | 代码 | 主键 | 数据类型 | 约束/说明 |
| --- | --- | --- | --- | --- |
| 任务 ID | `task_id` | TRUE | `varchar(64)` | UUID 文本主键 |
| 来源 ID | `source_id` | FALSE | `varchar(255)` | OpenAlex Source ID；不设本地 `source` 外键 |
| 起始年份 | `year_from` | FALSE | `int4` | 可为空 |
| 结束年份 | `year_to` | FALSE | `int4` | 可为空 |
| 状态 | `status` | FALSE | `varchar(16)` | `QUEUED/RUNNING/SUCCEEDED/FAILED` |
| 创建人 | `created_by` | FALSE | `int8` | 提交人的 `admin_user.id`；管理用户表独立初始化，不设数据库外键 |
| 重试来源任务 | `retry_of_task_id` | FALSE | `varchar(64)` | 自关联；仅失败任务可被重试 |
| worker 标识 | `worker_id` | FALSE | `varchar(255)` | 可为空 |
| 租约与心跳 | `lease_expires_at`, `last_heartbeat_at` | FALSE | `timestamptz` | 仅运行中任务使用 |
| 领取次数 | `attempt_count` | FALSE | `int4` | 默认 `0` |
| 进度 | `progress_current`, `progress_total`, `progress_message` | FALSE | `int4/int4/varchar(1000)` | 默认 `0/0`；总步数不是 API 固定值 |
| 结果 | `result` | FALSE | `jsonb` | 成功后的计数结果 |
| 错误 | `error_code`, `error_message` | FALSE | `varchar(80)/varchar(2000)` | 过滤后的安全摘要 |
| 生命周期时间 | `created_at`, `started_at`, `finished_at` | FALSE | `timestamptz` | 创建时间必填，其他可空 |

约束和索引：

- `CHECK status IN ('QUEUED','RUNNING','SUCCEEDED','FAILED')`
- `CHECK year_from IS NULL OR year_to IS NULL OR year_from <= year_to`
- `CHECK progress_current >= 0 AND progress_total >= 0 AND progress_current <= progress_total`
- `UNIQUE (source_id) WHERE status IN ('QUEUED','RUNNING')`
- 索引：`(source_id, created_at DESC)`、`(status, lease_expires_at, created_at)`。

详见 `docs/openalex-journal-import.md` 与 ADR 0004。

### 2.9 `text_file`

表格描述：解析后全文文件登记表，只登记规范化 parsed 输出文件，不登记 MinerU raw 中间文件。

| 名称 | 代码 | 主键 | 数据类型 | 约束/说明 |
| --- | --- | --- | --- | --- |
| 文件 ID | `file_id` | TRUE | `varchar(255)` | 外键 `original_file.file_id`，`ON DELETE CASCADE` |
| 文件类型 | `file_type` | TRUE | `varchar(10)` | 只能是 `JSON`、`MD` |
| 文件名称 | `file_name` | FALSE | `varchar(255)` | parsed 输出文件名 |
| 文件路径 | `file_path` | FALSE | `varchar(1000)` | 指向 `openalex/parsed/{source_id}/{file_id}/...` |
| 文件大小 | `file_size` | FALSE | `int8` | 单位：字节 |

约束：

- 主键：`text_file(file_id, file_type)`
- `CHECK file_type IN ('JSON', 'MD')`

Block Import 只依赖 parsed JSON；MD 可以登记，但不作为 block 入库来源。Text Parsing 重跑前删除该 `file_id` 的旧 `text_file` 记录，解析成功后重建。

### 2.10 `block`

表格描述：内容块主表，存储全文内容块，包括标题、正文、公式、表格、图片、引用、脚注和丢弃块。

| 名称 | 代码 | 主键 | 数据类型 | 约束/说明 |
| --- | --- | --- | --- | --- |
| 块 ID | `block_id` | TRUE | `varchar(32)` | 内容块 ID |
| 文件 ID | `file_id` | FALSE | `varchar(255)` | 外键 `original_file.file_id`，`ON DELETE CASCADE` |
| 块类型 | `block_type` | FALSE | `varchar(50)` | 见下方取值 |
| 块文本内容 | `block_text` | FALSE | `text` | 原始块文本，标题块也在此存储标题文本 |
| PDF 页码 | `pdf_page` | FALSE | `int4` | PDF 页码，从 0 开始 |
| PDF 边界框 | `pdf_bbox` | FALSE | `jsonb` | PDF 坐标信息 |
| 内容块顺序 | `block_seq` | FALSE | `int4` | 同一 `file_id` 内从 0 开始 |
| 所属标题块 ID | `parent_title_block_id` | FALSE | `varchar(32)` | 外键 `block.block_id`，`ON DELETE SET NULL` |
| 标题块层级 | `title_level` | FALSE | `int2` | 仅标题块设置；顶层标题为 0 |

约束和索引：

- 主键：`block(block_id)`
- 唯一约束：`block(file_id, block_seq)`
- 普通索引：`block(file_id)`
- `CHECK block_type IN ('title', 'text', 'equation', 'table', 'image', 'reference', 'page_footnote', 'discarded')`

Block Import 按 `file_id` 幂等重建。删除 `block` 主表记录时，扩展表通过外键 `ON DELETE CASCADE` 自动清理。查询某个 OpenAlex Work 的全文块时，通过 `original_file_job.matched_work_id -> original_file_job.file_id -> block.file_id` 关联。

### 2.11 `block_image`

表格描述：图片块扩展表，保存图片类内容块的图片路径、标题和脚注。

| 名称 | 代码 | 主键 | 数据类型 | 约束/说明 |
| --- | --- | --- | --- | --- |
| 块 ID | `block_id` | TRUE | `varchar(32)` | 外键 `block.block_id`，`ON DELETE CASCADE` |
| 图片路径 | `image_path` | FALSE | `varchar(1000)` | 相对路径 |
| 图片标题 | `image_caption` | FALSE | `text` | 图片标题 |
| 图片脚注 | `image_footnote` | FALSE | `text` | 图片脚注 |

约束：

- 主键：`block_image(block_id)`

### 2.12 `block_table`

表格描述：表格块扩展表，保存表格类内容块的图片路径、表题和脚注。

| 名称 | 代码 | 主键 | 数据类型 | 约束/说明 |
| --- | --- | --- | --- | --- |
| 块 ID | `block_id` | TRUE | `varchar(32)` | 外键 `block.block_id`，`ON DELETE CASCADE` |
| 表格图片路径 | `image_path` | FALSE | `varchar(1000)` | 相对路径 |
| 表格标题 | `table_caption` | FALSE | `text` | 表格标题 |
| 表格脚注 | `table_footnote` | FALSE | `text` | 表格脚注 |

约束：

- 主键：`block_table(block_id)`

### 2.13 `block_equation`

表格描述：公式块扩展表，保存公式类内容块的图片路径和公式格式。

| 名称 | 代码 | 主键 | 数据类型 | 约束/说明 |
| --- | --- | --- | --- | --- |
| 块 ID | `block_id` | TRUE | `varchar(32)` | 外键 `block.block_id`，`ON DELETE CASCADE` |
| 公式图片路径 | `image_path` | FALSE | `text` | 相对路径 |
| 公式格式 | `format` | FALSE | `varchar(20)` | 例如 `latex` |

约束：

- 主键：`block_equation(block_id)`

### 2.14 `block_footnote`

表格描述：页脚注扩展表，保存 MinerU `page_footnote` 映射结果。关联的
`block.block_type` 为 `page_footnote`。

| 名称 | 代码 | 主键 | 数据类型 | 约束/说明 |
| --- | --- | --- | --- | --- |
| 块 ID | `block_id` | TRUE | `varchar(32)` | 外键 `block.block_id`，`ON DELETE CASCADE` |
| 脚注标签 | `footnote_label` | FALSE | `varchar(50)` | 可为空 |
| 脚注内容 | `footnote_text` | FALSE | `text` | 不可为空 |

约束：

- 主键：`block_footnote(block_id)`

### 2.15 `block_reference`

表格描述：参考文献扩展表，统一保存 MinerU 解析得到的参考文献条目。关联的
`block.block_type` 为 `reference`。

| 名称 | 代码 | 主键 | 数据类型 | 约束/说明 |
| --- | --- | --- | --- | --- |
| 块 ID | `block_id` | TRUE | `varchar(32)` | 外键 `block.block_id`，`ON DELETE CASCADE` |
| 参考文献顺序 | `reference_seq` | TRUE | `int4` | 同一 block 下从 0 开始 |
| 参考文献内容 | `reference_text` | FALSE | `text` | 不可为空 |

约束：

- 主键：`block_reference(block_id, reference_seq)`

## 3. 数据流程与状态流转

### 3.1 OpenAlex Metadata Import

当前版本只支持从 OpenAlex 源数据库导入，不支持 OpenAlex API。

写入表：

- `source`
- `work`
- `work_source`
- `work_author`
- `work_topic`

不写入 `work_keyword`。

导入规则：

1. 导入由一个或多个 `source_id` 驱动，年份范围可选。
2. 导入前必须校验所有传入 `source_id` 都存在于 OpenAlex 源库；任意一个不存在则整体失败。
3. `source`、`work` 按主键 upsert。
4. `work_source`、`work_author`、`work_topic` 按复合键 upsert，或在事务中重建本次导入 work 的关联。
5. CLI 直接运行不创建任务行；管理平台来源导入创建协调任务，由 Python worker 领取后执行同一导入器。
6. 对本次导入 Source 下 `original_file_job.flag_match=-1` 的记录，重置为 `0`，允许新增或更新后的 OpenAlex 元数据触发重新匹配。
7. 导入范围缩小时，不自动删除旧 `work` 或旧 `original_file_job`。

字段映射：

| OpenAlex 源字段 | Paperflow 字段 |
| --- | --- |
| `sources.id` | `source.source_id` |
| `sources.display_name` | `source.source_name` |
| `sources.publisher` | `source.provider` |
| `works.id` | `work.work_id` |
| `works.doi` | `work.doi` |
| `works.title` | `work.title` |
| `works.publication_year` | `work.publication_year` |
| `works.publication_date` | `work.publication_date` |
| `works.type` | `work.type` |
| `works.lang` | `work.language` |
| `works_locations.work_id` | `work_source.work_id` |
| `works_locations.source_id` | `work_source.source_id` |
| `works_authorships.work_id` | `work_author.work_id` |
| `works_authorships.author_id` | `work_author.author_id` |
| `authors.display_name` | `work_author.author_name` |
| `works_authorships.author_position` | `work_author.author_position` |
| `works_topics.work_id` | `work_topic.work_id` |
| `works_topics.topic_id` | `work_topic.topic_id` |
| `topics` 的名称、领域、关键词和描述字段 | `work_topic` 对应字段 |

### 3.2 Original File Import

当前版本只支持 CSV 驱动导入，不支持目录扫描猜测元数据。

CSV 文件必须已经位于：

```text
{DATA_ROOT}/openalex/csv/{csv_file_name}
```

CSV 中每一行指向的原始文件必须已经位于：

```text
{DATA_ROOT}/openalex/original/{source_id}/{original_file_name}
```

CSV 字段映射：

| CSV 字段 | 数据库字段 |
| --- | --- |
| `source_id` | `original_file.source_id` |
| `year` | `original_file.year` |
| `paper_title` | `original_file.paper_title` |
| `authors` | `original_file.authors` |
| `doi` | `original_file.doi` |
| `url` | `original_file.url` |
| `provider` | `original_file.provider` |
| `file_name` | `original_file.original_file_name` |
| `file_path` | `original_file.original_file_path` |
| `file_type` | `original_file.original_file_type` |
| `file_size` | `original_file.file_size` |
| `source_id`、`year`、`paper_title`、`authors` | 规范化后计算 `original_file.file_id` |

CSV 不提供 `file_id` 字段，由导入器根据元数据计算；无扩展名的 `file_name` 必须与计算结果相同，`file_path` 指向带扩展名的实际文件。

每行 CSV 必须满足：

1. `source_id` 存在于本地 `source` 表。
2. `file_path` 是以 `openalex/original/` 开头的相对路径。
3. `file_path` 指向的物理文件存在。
4. `file_name` 是无扩展名的 File Hash，等于 `file_path` 末尾文件名去掉扩展名后的值。
5. `file_type` 规范化后只能是 `PDF`、`XML`、`HTML`。
6. `file_size` 应与实际文件大小一致。
7. 多位作者使用英文分号 `;` 分隔；单作者不附加分号。
8. `url` 可为空；非空时保留原值，不做 URL 规范化。
9. `provider` 可为空；非空时去除首尾空白后入库。

不满足上述条件的行不导入 `original_file`。

字段规范化：

1. `file_type` 入库统一为大写无点后缀：`PDF`、`XML`、`HTML`。
2. DOI 去除首尾空白、`https://doi.org/`、`http://dx.doi.org/`、`doi:` 前缀后转小写；空字符串视为 `NULL`。
3. 本地 `work.doi` 和 `original_file.doi` 都保存归一化 DOI，不额外保存原始 DOI。
4. 作者字段导入时不猜测多种格式。多作者使用英文分号分隔，单作者保持原值。
5. `provider` 仅记录原始文件采集平台；不校验是否存在于 `source.provider`。

幂等规则：

1. `file_id` 不存在：插入新 `original_file`，并创建对应 `original_file_job`。
2. `file_id` 已存在：不新增记录。
3. 重复导入时只补充已有记录中的空字段。
4. 同一字段两边都有值但不同：保留已有值，记录日志。
5. 只有当新文件类型优先级更高时，替换已有 `original_file_name`、`original_file_path`、`original_file_type` 和 `file_size`。
6. Original File Import 不做匹配，即使文件名就是已知 `work_id`。
7. 对已存在但缺少 `original_file_job` 的原始文件记录，补建 `original_file_job`。

`original_file_job` 初始状态：

| 文件类型 | `flag_match` | `matched_work_id` | `flag_text` | `flag_block` |
| --- | --- | --- | --- | --- |
| `PDF` | `0` | `NULL` | `0` | `0` |
| `XML` / `HTML` | `0` | `NULL` | `-2` | `0` |

### 3.3 Matching

Matching 负责把一个 `original_file_job.file_id` 关联到一个 OpenAlex Work，并更新 `original_file_job.flag_match` 和 `matched_work_id`。Matching 不驱动 Text Parsing；未匹配成功的 PDF 原始文件仍然可以由 `original_file_job` 进入解析和 block 入库。

待匹配输入：

```sql
SELECT orig.*
FROM original_file AS orig
JOIN original_file_job AS job ON job.file_id = orig.file_id
WHERE job.flag_match = 0;
```

匹配阶段所有路径都必须受 `source_id` 约束。CSV 中的 `source_id` 是强输入契约，必须能在本地 OpenAlex 元数据中找到。

匹配顺序：

1. 直接文件名匹配：如果 `file_id` 是本地已知 `work_id`，且存在 `(work_id, source_id)` 对应的 `work_source` 关系，则直接匹配成功。
2. DOI 精确匹配：`original_file.doi` 非空，在本地 `work` 中命中唯一候选，且候选和 CSV `source_id` 存在 `work_source` 关系。
3. 模糊匹配：DOI 为空或 DOI 未成功匹配时，限定同一 `source_id`，使用 `work`、`work_source`、`work_author` 数据打分。

模糊匹配默认打分：

| 字段 | 算法 | 权重 |
| --- | --- | --- |
| `source_id` | 精确匹配，必须满足 | - |
| `paper_title` | PostgreSQL `pg_trgm` 相似度 | `0.6` |
| `authors` | 作者名集合 Jaccard 相似度 | `0.25` |
| `year` | 同年为 `1`，差 1 年为 `0.5`，否则 `0` | `0.15` |

自动匹配条件：

1. 最高分 `>= MATCH_THRESHOLD`，默认 `0.8`。
2. 最高分领先第二名至少 `MATCH_MARGIN`，默认 `0.05`。
3. 如果最高分并列或分差不足，不自动匹配。

匹配成功后：

1. 设置对应 `original_file_job.flag_match=1`。
2. 设置对应 `original_file_job.matched_work_id=work.work_id`。
3. 不修改 `original_file_job.flag_text` 和 `original_file_job.flag_block`。

未匹配成功时：

1. 设置对应 `original_file_job.flag_match=-1`。
2. 保持 `matched_work_id=NULL`。
3. 后续 OpenAlex Metadata Import 更新同 Source 元数据时，可将 `flag_match=-1` 重置为 `0` 重新匹配。

同一 `work_id` 冲突由 `original_file_job(matched_work_id)` 唯一约束防止。对于同一论文的 PDF/XML/HTML，当前领域约定它们拥有相同 File Hash 和元数据，文件类型优先级只在 Original File Import 阶段处理，不在 Matching 阶段重新选择。

### 3.4 Text Parsing

Text Parsing 只负责调用 MinerU 解析 PDF，并生成规范化 parsed 输出。

调度条件：

```text
original_file_job.flag_text=0
AND original_file.original_file_type='PDF'
```

输入：

1. 通过 `original_file.original_file_path` 找到原始文件。
2. 仅 `original_file_type=PDF` 的记录进入 MinerU。
3. `XML` 和 `HTML` 在 Original File Import 创建 `original_file_job` 时设置 `flag_text=-2`。
4. 原始文件是否已匹配到 `work_id` 不影响 Text Parsing 调度。

输出：

```text
openalex/mineru_raw/{source_id}/{file_id}/
openalex/parsed/{source_id}/{file_id}/
```

`{source_id}` 使用 `original_file.source_id`，`{file_id}` 使用 `original_file.file_id`。

重跑规则：

1. 在 Paperflow 数据库事务中锁定 eligible job，设置
   `original_file_job.flag_text=1`；PostgreSQL 运行时使用 `SKIP LOCKED`
   避免多个 worker 领取同一任务，并删除该 `file_id` 的旧 `text_file`
   记录。
2. 清理该 `file_id` 对应的 MinerU raw 和 parsed 输出目录。
3. 调用 MinerU router `/tasks` 提交异步任务。
4. 轮询 `/tasks/{task_id}`，完成后从 `/tasks/{task_id}/result` 下载 ZIP。
5. 生成规范化 parsed JSON/MD。
6. 插入新的 `text_file` 记录。
7. 成功后设置 `flag_text=2`，并重置 `flag_block=0`。
8. 失败后设置 `flag_text=-1`。

默认不处理 `flag_text=-1`。失败任务必须通过显式 retry 参数处理。`flag_text=-2` 不自动重跑。

`parse-text --concurrency` 可让多个 MinerU router 任务同时在途；不要高于 router 实际并发能力太多。

### 3.5 Block Import

Block Import 负责将 parsed JSON 写入 block 相关表。它独立于 Text Parsing，由 `original_file_job.flag_block` 跟踪。

调度条件：

```text
flag_text=2 AND flag_block=0
```

输入：

1. Block Import 只依赖 parsed JSON。
2. `text_file` 中可以保存 `JSON` 和 `MD`，但 MD 不作为 block 入库来源。
3. 如果 parsed JSON 不存在或不可读，设置 `flag_block=-1`。

幂等重跑规则：

1. 在同一事务中删除该 `file_id` 已有 block 主表记录。
2. 依赖扩展表外键 `ON DELETE CASCADE` 清理扩展表。
3. 从 parsed JSON 完整重建 block 主表和扩展表。
4. 成功后设置 `flag_block=1`。
5. 失败后设置 `flag_block=-1`。

类型映射：

- MinerU `page_footnote` 写入 `block.block_type='page_footnote'`，并写
  `block_footnote`。
- MinerU `ref_text`，以及 `type='list' AND sub_type='ref_text'`，写入
  `block.block_type='reference'`，并写 `block_reference`。

默认不处理 `flag_block=-1`。失败任务必须通过显式 retry 参数处理。

## 4. 调度入口

当前版本采用全局状态驱动调度，不引入目标批次表。

默认调度范围：

1. Matching 扫描 `original_file_job.flag_match=0` 的记录。
2. Text Parsing 和 Block Import 扫描全部历史 `original_file_job`。
3. 只处理满足当前阶段状态条件的记录。
4. 可选支持按 `source_id`、`work_id` 或 `file_id` 限定运行范围。

当前已实现入口：

```bash
paperflow import-openalex --source-id S123 --year-from 2020 --year-to 2024
paperflow import-original-files --csv openalex/csv/batch.csv
paperflow match
paperflow parse-text
paperflow import-blocks
```

`parse-text` 和 `import-blocks` 都支持 `--retry-failed` 显式重试失败任务。
