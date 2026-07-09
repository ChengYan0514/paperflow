# Ant Design Pro TDD 06: 文档和最终验收

本阶段只做收口：更新运行文档、确认旧前端保留策略、跑完整检查。

## Public Interface

```text
README.md
docs/admin_runbook.md
docs/ant_design_pro_migration_plan.md
docs_java/api.yaml
web-admin/
web-admin-pro/
```

## TDD Slices

### 1. README 运行方式更新

RED:

- 文档检查：
  - README 不再只写 `web-admin` 作为唯一前端。
  - README 包含 `web-admin-pro` 启动方式。
  - README 使用 `API_BASE_URL`，不再指导新前端使用 `VITE_API_BASE_URL`。

GREEN:

- 更新 README。
- 明确旧 `web-admin/` 验收前保留。

### 2. Runbook 更新

RED:

- `docs/admin_runbook.md` 包含：
  - 后端启动。
  - 旧前端启动。
  - 新前端启动。
  - 默认 `SUPER_ADMIN` 初始化说明。
  - 默认账号 `admin`、默认密码 `admin`，并要求首次登录后修改。
  - 密码最小长度 5。

GREEN:

- 更新 runbook。
- 不删除旧前端说明。

### 3. 旧角色文档收口

RED:

- 搜索 `VIEWER`、`ADMIN / VIEWER`。
- 确认仍有历史文档时，明确标记为历史，或更新为三角色。

GREEN:

- 更新当前有效文档。
- 不必重写全部历史 TDD 文档，必要时加“已被三角色方案替代”的说明。

### 4. 全量后端验收

RED:

- 运行：

```bash
cd java-admin
mvn test
```

GREEN:

- 修复失败测试。
- 不降低权限测试覆盖。

### 5. 全量前端验收

RED:

- 运行：

```bash
cd web-admin-pro
npm run build
```

GREEN:

- 修复类型、路由、构建问题。
- 不要求删除旧 `web-admin/`。

### 6. 最终手工验收清单

RED:

- 按三种账号手工验证：
  - `SUPER_ADMIN`
  - `ADMIN`
  - `USER`

GREEN:

- 确认：
  - 登录/退出正常。
  - 菜单权限正确。
  - 用户管理权限正确。
  - 角色管理只读。
  - 业务列表和详情可用。
  - 内容块阅读器可用。
  - 服务管理和知识管理为占位。

## Done

最终命令：

```bash
cd java-admin
mvn test
```

```bash
cd ../web-admin-pro
npm run build
```

验收通过后，单独决定是否删除或替换旧 `web-admin/`。
