# Ant Design Pro TDD 03: 新前端认证外壳

本阶段在 `web-admin-pro/` 跑通登录、退出、CSRF、当前用户和菜单权限。
不迁移业务列表页。

## Public Interface

```text
API_BASE_URL
GET  /api/auth/csrf
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
web-admin-pro/src/app.tsx
web-admin-pro/src/access.ts
web-admin-pro/src/services/auth.ts
```

## TDD Slices

### 1. request 使用 API_BASE_URL

RED:

- 新增前端测试或可执行检查：
  - 设置 `API_BASE_URL=http://localhost:8080`。
  - 调用 service 时请求 URL 以该地址开头。
  - 不读取 `VITE_API_BASE_URL`。

GREEN:

- 配置 Umi request。
- 封装 `apiBaseUrl = process.env.API_BASE_URL || ''`。

### 2. CSRF 写请求

RED:

- 测试 `POST /api/auth/login` 前：
  - 没有 `XSRF-TOKEN` cookie 时会先请求 `/api/auth/csrf`。
  - 写请求带 `X-XSRF-TOKEN` header。

GREEN:

- 实现 cookie 读取。
- request interceptor 或写请求 helper 统一加 CSRF header。

### 3. 登录成功进入后台

RED:

- 前端行为测试：
  - 打开 `/login?redirect=/works`。
  - 输入用户名密码并提交。
  - mock 后端返回 `SUPER_ADMIN`。
  - 页面跳转 `/works`。

GREEN:

- 实现登录页。
- 登录成功刷新 `initialState.currentUser`。

### 4. 未登录后台页跳登录

RED:

- 访问 `/task-status`，`/api/auth/me` 返回 401。
- 断言跳转 `/login?redirect=/task-status`。

GREEN:

- 在 layout 或 `getInitialState` 中处理未登录。
- 后台页统一保护。

### 5. 退出登录

RED:

- 已登录状态点击退出。
- 断言调用 `POST /api/auth/logout`。
- 断言跳转 `/login`。

GREEN:

- 接入 Ant Design Pro 右上角用户菜单。

### 6. 菜单按三角色显示

RED:

- `SUPER_ADMIN` 看到用户管理和角色管理。
- `ADMIN` 看到用户管理，看不到角色管理。
- `USER` 看不到系统管理。

GREEN:

- 实现 `access.ts`：
  - `canSuperAdmin`
  - `canManageUsers`
  - `canViewRoles`

## Done

运行：

```bash
cd web-admin-pro
npm run build
```

如已配置测试：

```bash
cd web-admin-pro
npm test
```

通过后进入 `docs/ant_design_pro_tdd_04_system_management.md`。
