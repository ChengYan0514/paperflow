# causal-explorer 路由与页面对应分析

结论：`causal-explorer` 的 6 个业务页面在当前项目中均有对应实现；路由前缀改为管理员端的 `/knowledge/causal-graph`。

| causal-explorer | 当前项目 | 相同点与主要差异 |
| --- | --- | --- |
| `/` | `/knowledge/causal-graph` | 都是图谱总览、过滤、力导向图、点击节点/边进入详情。当前改为 Ant Design 管理端布局，增加 URL 持久化筛选、节点/边数上限和“高频关系”表；原项目则是三栏探索器、侧栏预览和“最可靠关系”卡片。 |
| `/node/$variable` | `/knowledge/causal-graph/nodes/:variable` | 都展示变量的入/出边和一跳图谱。原项目有领域饼图、年份柱图与卡片列表；当前改为统计卡和表格。后端仍返回领域、年份统计，但前端未展示。 |
| `/edge/$cause/$effect` | `/knowledge/causal-graph/edges?cause=…&effect=…` | 都展示关系、方向、证据和详情跳转。原项目有方法/方向/年份图、跨领域指标、本地图和证据筛选排序；当前只展示记录数、论文数、方法数和证据表，且接入论文管理。 |
| `/paper/$paperId` | `/knowledge/causal-graph/papers/:workId` | 都展示论文的因果声明与论文内图谱。原项目会请求 OpenAlex 补充摘要、外链和完整声明卡；当前使用本地 `work` 数据，新增“论文详情 / 全文 Blocks”跳转，声明详情收敛为可展开表格。 |
| `/fields` | `/knowledge/causal-graph/fields` | 都按子领域/主题分析。原项目是 Top 10×10 热力图和选中领域详情；当前以全库统计、高频关系/变量/方法分布和可筛选、分页的完整聚合表呈现，不维护选中子领域状态。 |

共同的核心图谱交互也基本保留：关系颜色表示方向、线宽表示重复证据、分歧超过 40% 用虚线，点击节点/边进入详情；可对照原版 [ForceGraph.tsx](../causal-explorer/causal-explorer/src/components/ForceGraph.tsx) 与现版 [CausalForceGraph.tsx](../web-admin-pro/src/pages/Knowledge/CausalGraph/components/CausalForceGraph.tsx)。

架构上，原项目是独立的 TanStack Start 应用、SQLite 预构建数据，并会直连 OpenAlex；当前则是 Umi/Ant Design Pro + Java API + PostgreSQL，并融入登录、菜单、论文、全文和来源管理。路由定义可见 [原版](../causal-explorer/causal-explorer/src/routeTree.gen.ts) 与 [现版](../web-admin-pro/config/routes.ts)。

一个值得注意的不一致：当前总览的“最小记录数”实际传给后端的是 `minRecordCount`，但提示文字写成“最少被多少篇论文重复验证”；原版的 `repetition` 明确是论文数。另，当前“关系详情”路由未隐藏在菜单中，但缺少 `cause/effect` 参数时无法独立正常展示。
