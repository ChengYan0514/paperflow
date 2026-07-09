# Admin Auth TDD 04: Frontend Admin Users Page

> 历史文档：本文对应旧 `web-admin/` 与 `ADMIN` / `VIEWER` 两角色方案。
> 当前用户管理与角色管理以 `web-admin-pro/` 和
> `docs/ant_design_pro_tdd_04_system_management.md` 为准。

本文件对应实现计划第 4 步：前端实现 `/users`，删除 `/roles` 占位。

## Public Interface

- `ADMIN` 可见“用户管理”菜单和 `/users`。
- `VIEWER` 不显示“用户管理”菜单。
- `VIEWER` 直接访问 `/users` 显示 403。
- `/roles` 不保留。
- 用户列表列：
  - 用户名
  - 显示名
  - 角色
  - 状态
  - 最近登录
  - 创建时间
  - 操作

## TDD Slices

### 1. 按角色显示导航

RED:

- 当前用户 `role=ADMIN` 时，Layout 显示“用户管理”和“用户列表”。
- 当前用户 `role=VIEWER` 时，不显示“用户管理”。

GREEN:

- 导航根据 `AuthUser.role` 判断。
- 不做菜单权限配置表。

### 2. `/users` 权限边界

RED:

- `VIEWER` 直接进入 `/users`，显示 403 页面。
- `ADMIN` 进入 `/users`，调用 `GET /api/admin-users`。
- `/roles` 路由不存在或重定向到 `/users`，页面不再显示“角色权限”占位。

GREEN:

- 删除 `/roles` 导航和占位路由。
- 加最小 `ForbiddenPage`。

### 3. 用户列表渲染

RED:

- Mock `GET /api/admin-users` 返回两个用户。
- 断言列包含：
  - 用户名
  - 显示名，null 时显示 `-`
  - `ADMIN` / `VIEWER`
  - 启用/禁用
  - 最近登录
  - 创建时间
  - 操作按钮
- 断言不显示 ID 和 password hash。

GREEN:

- 实现 `UsersPage`。
- 不做分页、搜索、筛选、排序控件。

### 4. 创建用户

RED:

- 点击创建，表单字段：
  - username
  - displayName
  - role
  - password
  - enabled
- 不出现确认密码字段。
- 提交时 `POST /api/admin-users` 带 CSRF header。
- 成功后刷新列表或把返回用户插入列表。

GREEN:

- 用原生 input/select/checkbox。
- `enabled` 默认 true。
- 前端做基本必填和密码最小长度 12；后端仍是最终校验。

### 5. 启用/禁用和改角色

RED:

- 对普通用户点击禁用，调用：
  - `PATCH /api/admin-users/{id}`
  - body `{ "enabled": false }`
- 修改角色调用同一 PATCH。
- 后端返回 `ADMIN_USER_CONFLICT` 时显示错误 message。

GREEN:

- 操作成功后刷新列表。
- 不实现删除。

### 6. 重置密码

RED:

- 点击重置密码，表单只输入新密码。
- 不出现确认密码字段。
- 提交 `POST /api/admin-users/{id}/reset-password`，带 CSRF header。
- 成功后关闭表单并显示成功状态。

GREEN:

- 不做随机密码、邮件、忘记密码。

### 7. 自己改密码入口

RED:

- 当前用户可打开“修改密码”表单。
- 字段：
  - oldPassword
  - newPassword
  - confirmNewPassword
- confirm 不一致时不发请求。
- 一致时 `POST /api/auth/change-password` 只提交 oldPassword/newPassword。

GREEN:

- 入口可放在 Layout 当前用户区域。
- 成功后当前会话保持。

## Done

运行：

```bash
cd web-admin
npm test -- --run
npm run build
```

最终再运行：

```bash
cd java-admin
mvn test
cd ../web-admin
npm run build
```
