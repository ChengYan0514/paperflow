# Ant Design Pro TDD 04: 系统管理页面

本阶段迁移 `/users` 和 `/roles`。先证明三角色权限闭环，再迁业务页面。

## Public Interface

```text
GET    /api/admin-users
POST   /api/admin-users
PATCH  /api/admin-users/{id}
POST   /api/admin-users/{id}/reset-password
GET    /api/admin-roles
/users
/roles
```

## TDD Slices

### 1. 用户列表

RED:

- `SUPER_ADMIN` 访问 `/users`：
  - 调用 `GET /api/admin-users`。
  - 表格显示用户名、显示名、角色、状态、最近登录、创建时间、操作。
- `USER` 访问 `/users` 显示 403 或被阻止访问。

GREEN:

- 用 `ProTable` 实现用户列表。
- 不分页、不搜索，按后端数组展示。

### 2. 创建用户 ModalForm

RED:

- 点击创建用户打开 `ModalForm`。
- 密码长度 4 时前端阻止提交。
- 密码长度 5 时提交 `POST /api/admin-users`。
- 成功后关闭弹窗并刷新表格。

GREEN:

- 表单字段：username、displayName、role、password、enabled。
- 角色选项按当前用户权限限制。

### 3. ADMIN 只能创建 USER

RED:

- 当前用户为 `ADMIN` 时，创建用户表单角色选项只有 `USER`。
- 当前用户为 `SUPER_ADMIN` 时，角色选项有三种。

GREEN:

- 把角色可选项集中到一个小 helper。

### 4. 修改角色和启用状态

RED:

- 表格中修改角色调用 `PATCH /api/admin-users/{id}`。
- 启用/禁用按钮弹出 `Popconfirm`。
- 成功后刷新表格。
- 后端 403 或 conflict 时显示错误消息。

GREEN:

- 使用 `Select` 和 `Popconfirm`。
- 不做乐观更新。

### 5. 重置密码 ModalForm

RED:

- 点击重置密码打开 `ModalForm`。
- 新密码长度 4 阻止提交。
- 长度 5 调用 `POST /api/admin-users/{id}/reset-password`。
- 成功后关闭弹窗并提示。

GREEN:

- 只提交 `newPassword`。
- 不加确认密码。

### 6. 角色管理只读矩阵

RED:

- `SUPER_ADMIN` 访问 `/roles`：
  - 调用 `GET /api/admin-roles`。
  - 显示 `SUPER_ADMIN`、`ADMIN`、`USER` 三行。
  - 显示每个角色的权限说明。
- `ADMIN` 和 `USER` 不可访问 `/roles`。

GREEN:

- 用 `ProTable` 或普通 `Table` 展示只读矩阵。
- 不提供编辑按钮。

## Done

运行：

```bash
cd web-admin-pro
npm run build
```

后端如有接口调整：

```bash
cd java-admin
mvn test
```

通过后进入 `docs/ant_design_pro_tdd_05_business_pages.md`。
