# 因果知识图谱无数据库改动加速方案

状态：计划中，尚未实现。

## 目标与边界

在不修改 causal PostgreSQL 的表、索引或视图，也不增加 Redis 等基础设施的前提下，缩短因果知识图谱总览和领域分析的重复加载时间。

缓存仅覆盖下列高成本、固定结果的读取：

- `GET /api/knowledge/causal-graph/summary`
- `GET /api/knowledge/causal-graph/fields`
- 默认参数的 `GET /api/knowledge/causal-graph/graph`：`minRecordCount=20`、`minDiversity=5`、`maxNodes=300`、`maxEdges=500`，且没有关键词、领域或论文数过滤。

带关键词、领域、论文数或非默认节点/边限制的图谱请求继续实时查询。不要按任意请求参数缓存，避免用户输入造成无界内存增长。

## 为什么先做本地内存缓存

当前 Java 服务为单实例部署，固定页面结果体积小。Spring 自带的 `ConcurrentMapCache` 已能满足需求，不需要新增依赖、网络服务或数据库权限。

缓存命中时不查询 causal 数据库；首次请求、服务重启后的首次请求仍会执行实时聚合。因此它解决的是重复访问，不是冷启动。

## 开发步骤

1. 在 `java-admin` 启用 Spring Cache，并注册三个命名的本地 `ConcurrentMapCache`。
2. 在 `KnowledgeGraphService` 的 `summary()` 和 `fields()` 上缓存结果；使用 `sync = true`，防止并发首访重复执行同一慢查询。
3. 仅在图谱参数完全匹配上述默认值时缓存 `graph()` 结果；其他参数绕过缓存。
4. 不改变 Controller 路径、DTO、前端请求参数或 MyBatis SQL。
5. 在 `KnowledgeGraphControllerIntegrationTest` 中按 TDD 添加测试：
   - 首次 HTTP 请求得到图谱/领域数据；
   - 修改测试 causal 数据后再次请求，默认页面仍返回首次结果；
   - 非默认图谱请求仍返回修改后的实时结果。
6. 运行相关 Java 集成测试和完整 `mvn test`；在实际 causal 数据库上复测端点耗时与 `EXPLAIN ANALYZE`。

## 失效与发布

因果数据由本仓库之外的 ETL 写入，Java 代码中没有可挂接的因果数据导入完成事件。

因此第一版的失效规则是：外部 causal ETL 成功完成后重启 Java 服务。进程退出即清空本地缓存；下一次默认页面访问重建缓存。

```text
外部 causal ETL 成功
        ↓
systemctl restart paperflow-admin
        ↓
首次默认页面请求重建缓存
        ↓
后续请求直接命中本地缓存
```

不要在用户请求中刷新缓存，也不要在未确认数据已完整导入时重启服务。

## 验收标准

- API 的状态码和 JSON 结构与缓存前一致。
- 同一服务进程内，重复访问上述三个默认页面不再触发对应的实时聚合。
- 带筛选条件的图谱仍反映当前数据库数据。
- ETL 后重启服务，默认页面重新读取新数据。

## 后续升级条件

只有满足以下任一条件时才继续投入：

- 服务重启后的首次访问也不能接受慢查询；此时由 ETL 生成并原子替换 JSON 文件快照，Java 启动时加载它。
- Java 扩容为多个实例；此时再评估共享缓存或 Redis，并同时定义跨实例失效机制。
- 实测默认查询在缓存未命中时仍不能满足可接受的等待时间；此时回到 PostgreSQL 读模型/物化视图方案。

Redis 不是第一阶段的前置条件：它不能消除冷缓存的实时聚合，也不能替代 ETL 完成后的失效流程。
