# Ant Design Pro TDD 00: 阶段索引

本文把 `docs/ant_design_pro_migration_plan.md` 拆成可按 TDD 逐步开发的阶段文档。
每个阶段都按竖切片推进：先写一个能失败的行为测试，再写最少实现让它通过，
最后只做必要重构。

## 执行顺序

1. `docs/ant_design_pro_tdd_01_roles_backend.md`
   - 改后端三角色权限模型、初始化 SQL、密码最小长度和角色矩阵接口。
2. `docs/ant_design_pro_tdd_02_pro_scaffold.md`
   - 初始化 `web-admin-pro/`，保留 Ant Design Pro/Umi Max 最小可运行骨架。
3. `docs/ant_design_pro_tdd_03_auth_shell.md`
   - 跑通新前端登录、退出、CSRF、`initialState` 和基础权限。
4. `docs/ant_design_pro_tdd_04_system_management.md`
   - 迁移用户管理和角色管理。
5. `docs/ant_design_pro_tdd_05_business_pages.md`
   - 迁移业务页面、占位菜单和内容块阅读器。
6. `docs/ant_design_pro_tdd_06_docs_acceptance.md`
   - 更新文档并做最终验收。

## 总规则

- 每次只做一个阶段；阶段内一次只做一个 RED/GREEN 切片。
- 测试验证公共接口和用户可见行为，不测私有实现。
- 旧 `web-admin/` 在验收前保留。
- 新前端只使用 `API_BASE_URL`，不兼容 `VITE_API_BASE_URL`。
- 角色固定为 `SUPER_ADMIN`、`ADMIN`、`USER`，不做动态 RBAC。
- 服务管理和知识管理第一阶段只保留占位页面。

## 每阶段提交建议

每个阶段单独提交。提交前至少运行该阶段 Done 里列出的命令。

如果阶段内发现方案需要调整，先改对应 TDD 文档，再改代码。
