# Ant Design Pro TDD 02: 新前端工程骨架

本阶段只初始化 `web-admin-pro/` 并收敛模板代码，不接业务接口。

## Public Interface

```text
web-admin-pro/
web-admin-pro/package.json
web-admin-pro/config/routes.ts
web-admin-pro/src/app.tsx
web-admin-pro/src/access.ts
```

## TDD Slices

### 1. 初始化官方 Ant Design Pro 模板

RED:

- 在仓库根目录确认 `web-admin-pro/` 不存在或为空。
- 新建分支后执行官方模板初始化。

GREEN:

- clone 官方 Ant Design Pro 到 `web-admin-pro/`。
- 删除 `web-admin-pro/.git`。
- 更新 package name 为 `paperflow-web-admin-pro`。
- 不删除旧 `web-admin/`。

### 2. 最小构建通过

RED:

- 运行：

```bash
cd web-admin-pro
npm run build
```

- 如果模板默认构建失败，记录错误。

GREEN:

- 安装依赖。
- 只做能让模板构建通过的最小改动。
- 删除明显无关的模板 mock、示例页入口和示例菜单。

### 3. 路由骨架保留目标路径

RED:

- 添加前端路由检查或构建期可见配置检查，确认存在：
  - `/login`
  - `/task-status`
  - `/sources`
  - `/works`
  - `/original-files`
  - `/users`
  - `/roles`
  - `/service-status`
  - `/knowledge-base`
  - `/block-search`

GREEN:

- 配置 Umi routes。
- 先全部指向占位页面，除 `/login` 外不实现业务。

### 4. 菜单结构落地

RED:

- 用最小前端测试或静态配置检查确认菜单文案：
  - 工作台
  - 文献资源
  - 系统管理
  - 服务管理
  - 知识管理

GREEN:

- 按方案配置菜单。
- 服务管理和知识管理只接占位页。
- Swagger 保留外链 `/swagger-ui/index.html`。

## Done

运行：

```bash
cd web-admin-pro
npm run build
```

通过后进入 `docs/ant_design_pro_tdd_03_auth_shell.md`。
