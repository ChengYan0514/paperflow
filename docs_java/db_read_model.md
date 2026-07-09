# Java Admin Database Read Model

本文定义 Java 只读 API 如何从 Paperflow PostgreSQL 表组织数据。数据库表、
字段、约束和状态值以 `docs/db_design.md` 为准。

## 总原则

- Java 后端只读 Paperflow 项目库。
- 不写入、不修正、不触发 pipeline。
- 所有 SQL 通过 MyBatis XML mapper 管理。
- PostgreSQL schema 由 JDBC URL `currentSchema` 控制，SQL 不动态拼 schema。
- API JSON 使用 camelCase，数据库字段仍使用 snake_case。
- Work、Source、Original File 等术语沿用 `CONTEXT.md`。

## Source 统计口径

`GET /api/sources` 和 `GET /api/sources/{sourceId}` 返回 Source 基础字段和
8 个统计指标：

| API 字段 | 口径 |
| --- | --- |
| `workCount` | `work_source.source_id = sourceId` 的 Work 数 |
| `originalFileCount` | `original_file.source_id = sourceId` 的 Original File Job 数 |
| `matchedFileCount` | `flag_match = 1` |
| `parsedFileCount` | `flag_text = 2` |
| `readyFileCount` | `flag_text = 2 AND flag_block = 1` |
| `parseFailedFileCount` | `flag_text = -1` |
| `blockFailedFileCount` | `flag_text = 2 AND flag_block = -1` |
| `unsupportedFileCount` | `flag_text = -2` |

Work 数和 file/status 数不是同一口径。Work 数来自 `work_source`，其他统计
来自 `original_file` 和 `original_file_job`。

Source 列表支持筛选：

- `sourceId`：大小写不敏感包含匹配 `source.source_id`。
- `sourceName`：大小写不敏感包含匹配 `source.source_name`。
- `provider`：大小写不敏感包含匹配 `source.provider`。
- `hasOriginalFiles`：是否存在关联 Original File。
- `hasFailures`：是否存在 Text Parsing 失败或 Block Import 失败。

Source 列表排序只接受白名单值：

| `sort` | 排序 |
| --- | --- |
| `sourceIdAsc` 或空 | `source_id ASC` |
| `workCountDesc` | `workCount DESC, source_id ASC` |
| `failureCountDesc` | `(parseFailedFileCount + blockFailedFileCount) DESC, source_id ASC` |

## Task Status 统计口径

`GET /api/task-status` 返回全库汇总和按 Source 分组的任务进度计数，用于前端
进度条展示。

全库 `totals` 字段口径：

| API 字段 | 口径 |
| --- | --- |
| `sourceCount` | `source` 表行数 |
| `workCount` | `work` 表行数 |
| `originalFileCount` | `original_file.file_id` 去重数 |
| `matchedWorkCount` | `original_file_job.flag_match = 1` 且 `matched_work_id` 非空的 Work 去重数 |
| `parsedFileCount` | `original_file_job.flag_text = 2` 的 `file_id` 去重数 |
| `blockImportedFileCount` | `original_file_job.flag_block = 1` 的 `file_id` 去重数 |

按 Source 的 `sources[]` 字段口径：

| API 字段 | 口径 |
| --- | --- |
| `sourceId` / `sourceName` / `provider` | `source` 基础字段 |
| `workCount` | `work_source.source_id = sourceId` 的 Work 去重数 |
| `originalFileCount` | `original_file.source_id = sourceId` 的 `file_id` 去重数 |
| `matchedWorkCount` | 该 Source 的 `work_source.work_id` 中有 matched Original File Job 的 Work 去重数 |
| `parsedFileCount` | 该 Source 下 `flag_text = 2` 的 Original File 去重数 |
| `blockImportedFileCount` | 该 Source 下 `flag_block = 1` 的 Original File 去重数 |

前端进度条只使用这些计数派生展示比例：Matching 使用
`matchedWorkCount / workCount`，Text Parsing 和 Block Import 使用
`parsedFileCount / originalFileCount`、`blockImportedFileCount / originalFileCount`。

## Work 列表读模型

`GET /api/works` 默认返回所有 Work，包括没有 matched Original File Job 的
Work。

基础查询关系：

```text
work
LEFT JOIN original_file_job ON original_file_job.matched_work_id = work.work_id
LEFT JOIN original_file ON original_file.file_id = original_file_job.file_id
```

Source 过滤和 `sourceIds` 字段来自 `work_source`。实现时可以用聚合查询，也
可以先分页查 Work，再批量查 `sourceIds`。

默认排序：

```sql
ORDER BY publication_year DESC NULLS LAST, work_id ASC
```

支持筛选：

- `sourceId`
- `title`
- `doi`
- `yearFrom`
- `yearTo`
- `processingStatus`
- `workId`
- `sourceName`
- `authorName`
- `type`
- `language`
- `matchedFileId`

`title`、`doi` 和新增字符串参数 trim 后为空时忽略。`workId` 精确匹配。`sourceName` 和
`authorName` 使用 `EXISTS` 过滤，避免重复 Work 行。`type`、`language` 大小写
不敏感精确匹配。`matchedFileId` 精确匹配 matched Original File Job 的
`file_id`。`doi` 参数先 trim、小写，并移除 `https://doi.org/` 或
`http://dx.doi.org/` 前缀。`yearFrom` 和 `yearTo` 同时存在时必须满足
`yearFrom <= yearTo`。

Work 列表排序只接受白名单值：

| `sort` | 排序 |
| --- | --- |
| `publicationYearDesc` 或空 | `publication_year DESC NULLS LAST, work_id ASC` |
| `publicationYearAsc` | `publication_year ASC NULLS LAST, work_id ASC` |
| `titleAsc` | `title ASC NULLS LAST, work_id ASC` |
| `workIdAsc` | `work_id ASC` |
| `statusIssueFirst` | 失败状态优先，再按默认排序 |
| `statusReadyFirst` | `READY` 优先，再按默认排序 |

## Work 详情读模型

`GET /api/works/{workId}` 返回：

- `work`: `work` 表基础字段。
- `sources`: `work_source` 关联的 `source` 简要信息。
- `authors`: `work_author` 行。
- `matchedFile`: matched Original File 和 Original File Job 状态；没有则为
  `null`。
- `processingStatus`: Java 派生状态。

Work 存在但没有 matched file 时返回 `200`，`matchedFile: null`，
`processingStatus: NO_MATCHED_FILE`。

只有 Work 本身不存在时返回 `WORK_NOT_FOUND`。

## Blocks 读模型

`GET /api/works/{workId}/blocks` 通过 matched Original File Job 找到 `file_id`：

```text
work.work_id
-> original_file_job.matched_work_id
-> original_file_job.file_id
-> block.file_id
```

接口按实际 block 行返回，不要求 `processingStatus = READY`。如果 Work 存在
但没有 matched file 或没有 block 行，返回空分页。Work 不存在时返回
`WORK_NOT_FOUND`。

排序和分页：

```text
ORDER BY block_seq ASC
page 默认 1
size 默认 100
size 最大 500
```

默认过滤 `block_type = 'discarded'`，传 `includeDiscarded=true` 时返回。

`GET /api/original-files/{fileId}/blocks` 直接通过 `block.file_id` 查询同一读模型，
用于未匹配 Work 或 XML/HTML Original File 已有 block rows 的全文展示。只有
Original File 不存在时返回 `ORIGINAL_FILE_NOT_FOUND`；文件存在但没有 block 行时
返回空分页。

Block 扩展字段通过 `LEFT JOIN` 合并：

- `block_image`
- `block_table`
- `block_equation`
- `block_footnote`
- `block_reference`

`block_reference` 可能一对多。实现时可以聚合成字符串数组，也可以分页查 block
后批量查询 references 再组装 DTO。
当前 Mapper 使用 `STRING_AGG(reference_text, CHR(10) ORDER BY reference_seq)`
聚合为 `references_text`，Service 再拆分成 `references` 字符串数组。

`block.pdf_bbox` 是 JSONB。第一版 SQL 使用：

```sql
pdf_bbox::text AS pdf_bbox_json
```

Service 用 Jackson 解析成 `JsonNode` 后原样返回。

图片、表格图片、公式图片字段同时返回数据库中的相对路径和可访问 URL：

```text
imagePath -> imageUrl
tableImagePath -> tableImageUrl
equationImagePath -> equationImageUrl
```

如果数据库路径已经以 `openalex/` 开头，按 `DATA_ROOT` 相对路径直接生成
`/api/assets/...`；如果只保存如 `images/fig.png` 这样的 parsed 目录相对路径，
先用该 `file_id` 的 `text_file.file_path` 推导 parsed 目录后再生成资产 URL。

## Original File / Job 读模型

`GET /api/original-files` 返回 Original File 与其 Original File Job 状态。

基础查询关系：

```text
original_file
JOIN original_file_job ON original_file_job.file_id = original_file.file_id
```

支持筛选：

- `sourceId`
- `matchedWorkId`
- `flagMatch`
- `flagText`
- `flagBlock`
- `fileId`
- `sourceName`
- `provider`
- `originalFileType`
- `yearFrom`
- `yearTo`

`fileId` 精确匹配。`sourceName` 通过 `source` 表大小写
不敏感包含匹配。`provider` 大小写不敏感包含匹配。`originalFileType` 大小写不敏感精确匹配。
`yearFrom/yearTo` 是闭区间；最小值大于最大值时返回 `VALIDATION_ERROR`。

Original File 列表排序只接受白名单值：

| `sort` | 排序 |
| --- | --- |
| `sourceIdAsc` 或空 | `source_id ASC, file_id ASC` |
| `yearDesc` | `year DESC NULLS LAST, file_id ASC` |
| `fileSizeAsc` | `file_size ASC, file_id ASC` |
| `providerAsc` | `provider ASC NULLS LAST, file_id ASC` |
| `textStatusIssueFirst` | Text Parsing 或 Block Import 失败优先，再按默认排序 |

默认排序：

```sql
ORDER BY source_id ASC, file_id ASC
```

`GET /api/original-files/{fileId}` 返回一条 Original File、对应 Job 状态和
`text_file` 列表。Original File 和 Text File DTO 同时返回数据库相对路径和
`/api/assets/...` 只读 URL。只有 `original_file` 不存在时返回
`ORIGINAL_FILE_NOT_FOUND`。

## Asset 读模型

`GET /api/assets/**` 只读取 `paperflow.api.data-root` 下的文件。传入路径必须是
数据库保存或 Service 组装出的 `DATA_ROOT` 相对路径；绝对路径和包含 `..` 的路径
按无效请求处理。资产接口不查询外部网络、不写文件、不触发解析。

## processingStatus 派生规则

Java 不新增数据库字段，只从 matched job 的 `flag_text` 和 `flag_block` 派生
API 展示状态。

判定优先级固定如下：

| 顺序 | 条件 | 状态 |
| --- | --- | --- |
| 1 | 没有 matched job | `NO_MATCHED_FILE` |
| 2 | `flag_text = -2` | `UNSUPPORTED_TEXT_INPUT` |
| 3 | `flag_text = -1` | `PARSE_FAILED` |
| 4 | `flag_text = 1` | `PARSING` |
| 5 | `flag_text = 2 AND flag_block = -1` | `BLOCK_FAILED` |
| 6 | `flag_text = 2 AND flag_block = 1` | `READY` |
| 7 | `flag_text = 2 AND flag_block = 0` | `PARSED` |
| 8 | 其他已匹配情况 | `MATCHED` |

Work 搜索的状态筛选使用 `processingStatus` 参数，不让前端直接拼
`flag_text` / `flag_block` 条件。返回行的 `processingStatus` 是单一展示状态，
但搜索筛选使用包含式语义：

| 筛选值 | 匹配范围 |
| --- | --- |
| `NO_MATCHED_FILE` | 没有 matched job |
| `MATCHED` | 所有有 matched job 的 Work，包括 Parsing、Parsed、Ready 和失败状态 |
| `PARSING` | `flag_text = 1` |
| `PARSE_FAILED` | `flag_text = -1` |
| `UNSUPPORTED_TEXT_INPUT` | `flag_text = -2` |
| `PARSED` | `flag_text = 2`，包括 `PARSED`、`BLOCK_FAILED` 和 `READY` |
| `BLOCK_FAILED` | `flag_text = 2 AND flag_block = -1` |
| `READY` | `flag_text = 2 AND flag_block = 1` |

Text Parsing 不依赖 Matching。未匹配 Original File 的解析状态不会出现在 Work
搜索结果中，应通过 `GET /api/original-files` 的 `flagText` / `flagBlock` 筛选查看。

## 错误语义

统一错误响应：

```json
{
  "code": "WORK_NOT_FOUND",
  "message": "Work not found",
  "requestId": "9c0d2d7e3f1a4b61"
}
```

第一版错误码：

- `VALIDATION_ERROR`
- `SOURCE_NOT_FOUND`
- `WORK_NOT_FOUND`
- `ORIGINAL_FILE_NOT_FOUND`
- `INTERNAL_ERROR`
