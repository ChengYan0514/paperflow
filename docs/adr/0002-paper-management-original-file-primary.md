# 论文管理以 Original File 为主资源

## 状态

已实施。

本文是论文管理与论文全文文件管理重构的实施规范。

## 决策

### 资源边界

- 管理端的“论文管理记录（Paper）”以 `original_file.file_id` 为唯一身份。
- `original_file` 与 `original_file_job` 是论文管理的主数据和任务状态来源。
- `work` 是可选的 OpenAlex 补充元数据。只有匹配成功的论文管理记录才有关联
  Work；未匹配 Original File 同样必须出现在论文管理中。
- 一个 Work 最多匹配一个 Original File Job 的现有数据库约束继续有效。
- `original_file` 保持外部采集数据，不从 OpenAlex 回写或回填标题、作者或其他
  字段。不得为回填增加字段、迁移或同步任务。

### 术语

- **Paper Management Record / Paper**：管理端资源，身份为 `file_id`。
- **Work**：OpenAlex 元数据实体，身份为 `work_id`。不得将 Work 当作 Paper
  Management Record。
- 页面可使用中文“论文”作为 Paper Management Record 的产品名称；OpenAlex
  区块须明确标为“OpenAlex 元数据”。

### 页面与路由

移除下列页面与路由，且不提供重定向或兼容入口：

- `/works`
- `/works/:workId`
- `/works/:workId/blocks`
- `/original-files`
- `/original-files/:fileId`
- `/original-files/:fileId/blocks`

替换为：

- `/papers`：论文管理列表。
- `/papers/:fileId`：论文详情。
- `/papers/:fileId/blocks`：解析后全文阅读器。

全文阅读器按 `file_id` 查询实际内容块，不要求论文已匹配 Work。原始文件通过
只读资产链接在新标签页内联预览；不增加在线编辑或任务执行能力。

因果图谱继续以 `work_id` 查询。为避免与 Paper 混淆，因果声明页面改为：

- `/knowledge/causal-graph/causal-claims/:workId`
- `/api/knowledge/causal-graph/causal-claims/:workId`

因果图谱中只有能够解析到匹配 `file_id` 的 Work 才显示论文详情链接；否则显示
“未关联原始文件”，但因果图谱自身仍可正常浏览。

### 论文管理列表

列表显示列固定为：

1. 标题
2. 作者
3. 来源期刊
4. 年份
5. 平台
6. 解析状态

各展示字段均来自 `original_file`：

- 标题使用 `paper_title`，为空时回退 `original_file_name`。
- 作者使用 `authors`。
- 年份使用 `year`，为空时不以 OpenAlex 年份回退。
- 平台使用 `original_file.provider`。
- 来源期刊由 `original_file.source_id` 关联 Source 得到。

主检索为跨字段检索，覆盖原始标题、原始作者、DOI 和 `file_id`；不搜索 OpenAlex
标题或作者。高级筛选至少包含来源、年份范围、平台、匹配状态、解析状态和内容块
入库状态。多个任务状态筛选按交集（AND）生效。匹配状态和内容块入库状态不作为
列表列展示，但必须保留为高级筛选；详情页始终展示三项状态。

默认排序为 `original_file.year DESC NULLS LAST, file_id ASC`。保留显式的匹配、
解析、内容块入库异常优先等排障排序。CSV 导出复用列表筛选和排序，并包含原始
文件元数据、三项任务状态、匹配 Work ID 以及 OpenAlex 标题。

### 论文详情

页面标题使用原始论文标题；若为空，使用原始文件名。页面按以下顺序展示：

1. 原始作者。
2. 原始文件元数据：文件 ID、DOI、URL、年份、来源 ID、来源名称和采集平台。
3. 任务处理状态：匹配状态、解析状态、内容块入库状态，均直接来自
   `original_file_job`。
4. OpenAlex 元数据，仅匹配成功时展示：Work ID、标题、DOI、发表年份、发表日期、
   类型、语言，以及全部关联 Source 的 ID、名称、平台。作者使用结构化表格，仅
   显示作者 ID、姓名、位置。
5. 解析后全文入口和文本文件列表。
6. 原始论文全文文件的只读预览链接。
7. 因果声明区块。

原始文件与 OpenAlex 的标题、DOI、年份不一致时只并列展示，不增加自动“元数据
冲突”判定。

因果声明区块始终存在：未匹配时显示“尚未匹配 OpenAlex，暂无可关联的因果声明”；
匹配时显示声明记录数、标准变量对数、变量数及进入完整因果声明页面的入口。完整
声明、证据表和论文图谱不嵌入论文详情。

### 接口与错误语义

废弃且删除下列管理端只读接口，不保留兼容层：

- `/api/works/**`
- `/api/original-files/**`

新增并使用：

- `GET /api/papers`
- `GET /api/papers/export`
- `GET /api/papers/{fileId}`
- `GET /api/papers/{fileId}/blocks`

论文详情响应按页面区块分组，至少包含 `originalFile`、`taskStatus`、可空的
`openAlex`、`textFiles` 和 `causalSummary`。字段不得摊平，以免原始元数据与
OpenAlex 元数据的同名字段发生语义混淆。按 `file_id` 查询不到记录时返回
`PAPER_NOT_FOUND`。

本次论文管理保持只读，不在管理端增加匹配、解析、内容块入库或重试操作。离线
处理管线继续负责这些任务。

### 周边页面与统计

- Source 详情只链接到按 Source 筛选的 `/papers`，不再维护 Work 列表入口。
- 工作台和来源管理保留“OpenAlex Work 数”作为独立元数据统计；匹配、解析和内容
  块入库进度均按 Original File 统计。
- 失败任务页面保留，复用 Original File Job 的异常判断并全部链接至
  `/papers/:fileId`。

## 实施约束

- 删除旧控制器、DTO、服务方法、前端页面、路由、客户端方法及其测试，避免同一
  管理资源继续存在 Work 和 Original File 两套入口。
- 同步更新 OpenAPI、读模型文档、架构文档、运行手册、页面功能文档和测试。
- 保留数据库中的 `work`、`work_source`、`work_author`，它们仍是匹配和因果图谱
  的必要元数据；本决策不删除这些表或离线管线能力。
