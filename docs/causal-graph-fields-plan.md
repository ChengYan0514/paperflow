# 因果知识图谱领域分析增强方案

状态：已废弃。

说明：领域分析不再提供 Top 10、热力图或当前选中子领域详情。页面展示与因果知识图谱一致的全库指标、全库高频关系/变量/方法分布，以及可筛选的领域明细表；下文保留为历史方案，不应据此恢复已删除功能。

## 目标

将 `/knowledge/causal-graph/fields` 从单一的“子领域 × 主题”明细表，增强为适合比较和下钻的统计概览页，同时保留管理员核查数据所需的完整明细表。

页面形式参考 `causal-explorer` 的 `/fields`，但使用当前 Umi + Ant Design Pro 管理端的页面结构和组件风格，不引入新的图表依赖。

## 页面结构

页面自上而下由三部分组成：

1. **领域与主题热力图**
   - 行为声明记录数最高的 Top 10 子领域，列为声明记录数最高的 Top 10 主题。
   - 单元格显示声明记录数，并以深浅表达相对数量；数字和 `aria-label` 不能只依赖颜色表达含义。
   - 点击行选择子领域。默认选择排名第一的子领域。
   - 不含 `NULL`、空字符串或“未标注”的子领域、主题。未标注数据仍可在下方明细表中审计。

2. **选中子领域详情**
   - 统计卡：论文数、声明记录数、标准关系数、变量数。
   - 方法分布：按声明记录数排序的 Top 10 方法和“其他”，以横向占比条和数值呈现；不额外安装饼图或图表库。
   - 空的 `causal_inference_method` 归为“未标注方法”，并参与方法总数和占比计算。
   - Top 10 变量：展示变量名称、领域内出现次数，链接到现有变量详情路由。
   - Top 8 高频关系：不继承图谱总览的最低重复阈值，直接从该子领域的全部标准关系中取前 8 名。展示领域内的声明记录数、论文数和方法数，并以次要信息显示该关系的全库声明记录数；链接到现有关系详情路由。
   - 排序规则：先按领域内声明记录数降序，再按关系的全库方法数、全库论文数降序，最后按关系标识稳定排序。

3. **完整明细表**
   - 保留当前的子领域、主题、声明记录数、论文数和变量数，以及子领域/主题文本筛选、排序、分页能力。
   - 其作用是查看不在 Top 10 内的标签和未标注标签，不以热力图替代。

## 状态与交互

- 选中领域写入 URL：`/knowledge/causal-graph/fields?subfield=<name>`。
- 页面加载时，参数存在且属于当前 Top 10 时选择它；参数缺失、无效或因数据刷新退出 Top 10 时，回退到排名第一的子领域。
- URL 中的选中领域不改变下方完整明细表的文本筛选条件。
- 变量链接使用 `/knowledge/causal-graph/nodes/:variable`，关系链接使用 `/knowledge/causal-graph/edges?cause=...&effect=...`。

## 统计口径

### 基本指标

| 指标 | 定义 |
| --- | --- |
| 声明记录数 | `COUNT(DISTINCT paper_claim_table.record_id)` |
| 论文数 | `COUNT(DISTINCT paper_claim_table.paper_id)` |
| 标准关系数 | `COUNT(DISTINCT paper_claim_table.claim_id)` |
| 变量数 | 声明记录关联的 `cause_standard` 和 `effect_standard` 的去重并集 |
| 方法数 | 非空方法名称的去重数；方法分布中的空值则归入“未标注方法” |

`work_topic` 可以为同一论文提供多条标签。一个声明记录会完整计入每个关联的“子领域 × 主题”组合，这表示多标签覆盖，而不是互斥分类。因此，热力图的行、列或单元格相加不能与全库声明记录总数比较；页面需给出该说明。

所有聚合在 `work_topic` 连接后都必须对 `record_id`、`paper_id`、`claim_id` 使用 `DISTINCT`。这避免同一论文存在多条主题记录时，将同一声明在同一统计维度内重复计数。

### 高频关系的范围

关系的领域内指标只统计关联该子领域的声明记录；“全库声明记录数”不受该领域筛选影响。这样可同时显示领域内研究强度和跨领域复现规模，且不会把全局高频关系误表述为本领域高频关系。

## API 与后端设计

继续使用 `GET /api/knowledge/causal-graph/fields`，并保持现有 `items` 字段不变。响应中新增概览字段，采用一次请求返回所有页面所需的 Top 10 数据：

```ts
type CausalFieldAnalysis = {
  items: CausalFieldItem[];
  overview: {
    subfields: string[];
    topics: string[];
    matrix: Record<string, Record<string, number>>;
    details: Record<string, CausalSubfieldDetail>;
  };
};
```

`CausalSubfieldDetail` 包含统计卡数据、已排序的方法计数、Top 变量和 Top 关系；Top 关系同时带领域内指标与全库声明记录数。DTO、服务层和前端 TypeScript 类型需要同步扩展。

服务层继续对 `fields()` 使用 `causalGraphFields` 本地缓存和 `sync = true`。概览、详情和明细在同一 `fields()` 调用内构建，确保它们来自同一缓存快照。缓存失效仍遵循[因果知识图谱无数据库改动加速方案](causal-graph-cache-plan.md)：外部 ETL 成功完成后重启 Java 服务。

MyBatis 查询按以下职责拆分，避免通过前端拼接大规模原始记录：

1. 现有完整明细 `listFields(200)`，保留并修正为去重口径。
2. Top 子领域与 Top 主题排名，以及两者的交叉热力图。
3. Top 子领域的统计卡、方法分布和变量排名。
4. Top 子领域的关系排名，以及对应关系的全库声明记录数、论文数和方法数。

只对 Top 10 子领域查询详情；不为每个完整明细表条目生成详情数据。各查询都需要确定性排序，保证缓存结果和测试稳定。

## 实现范围

- `web-admin-pro/src/pages/Knowledge/CausalGraph/Fields.tsx`：实现热力图、URL 状态、选中领域详情和保留后的明细表。
- `web-admin-pro/src/services/knowledge.ts`：扩展领域分析响应类型。
- `java-admin/src/main/java/com/paperflow/admin/dto/`：新增或扩展领域概览、领域详情、方法、变量和关系 DTO。
- `java-admin/src/main/java/com/paperflow/admin/model/`：补充 MyBatis 聚合行模型。
- `java-admin/src/main/java/com/paperflow/admin/mapper/KnowledgeGraphMapper.java` 与 `src/main/resources/mapper/KnowledgeGraphMapper.xml`：新增聚合查询并修正既有明细的去重统计。
- `java-admin/src/main/java/com/paperflow/admin/service/KnowledgeGraphService.java`：在现有缓存边界内组装扩展响应。
- 前后端测试：覆盖统计口径、链接、URL 回退、筛选和缓存行为。

## 验收标准

- `/fields` 一次加载后可显示 Top 10×10 热力图、默认子领域详情和完整明细表。
- 热力图单元格和详情中的声明记录数使用去重后的 `record_id`，同一标签组合内不会因 `work_topic` 多行而放大。
- 多标签论文会出现在每个关联组合中，并且页面说明统计非互斥。
- 未标注标签不参与 Top 10，但仍能在完整明细表中搜索到。
- `subfield` 查询参数可恢复选中领域；无效参数回退到排名第一项。
- 变量和关系链接能进入当前详情页；关系详情中的证据范围与页面标注一致。
- 方法分布包含“未标注方法”“其他”，且各分项之和等于选中领域的声明记录数。
- 在现有缓存生命周期内重复访问 `/fields` 不重复执行领域聚合；ETL 后重启服务会得到新快照。
- 后端 DTO/SQL 测试和前端交互测试通过。
