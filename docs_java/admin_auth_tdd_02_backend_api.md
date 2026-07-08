# Admin Auth TDD 02: Auth and Admin User APIs

本文件对应实现计划第 2 步：实现 `auth` 和 `admin-users` API。所有测试走
`MockMvc` 公共 HTTP 接口，数据库用 H2，不 mock 自己的 service/mapper。

## Public Interface

```text
GET  /api/auth/csrf
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/change-password
GET  /api/admin-users
POST /api/admin-users
PATCH /api/admin-users/{id}
POST /api/admin-users/{id}/reset-password
```

## Test Data Rule

每个集成测试用 `@Sql` 建 `admin_user`，字段口径以
`docs/admin_user_init.sql` 为准。密码 hash 用 BCrypt 生成的固定测试值，不存
明文。

## TDD Slices

### 1. 登录成功返回当前用户并更新最近登录时间

RED:

- 新增 `AuthControllerIntegrationTest`：
  - 先 `GET /api/auth/csrf` 取 cookie/header。
  - `POST /api/auth/login` 使用 `username=' admin '` 和正确密码。
  - 断言 200，返回 `id/username/displayName/role`，不返回 `enabled`、
    `passwordHash`、`lastLoginAt`。
  - 再 `GET /api/auth/me` 断言同一用户。
  - 通过 API 可观察行为验证 `lastLoginAt`：用 `GET /api/admin-users` 登录为
    ADMIN 后看到该用户 `lastLoginAt` 非空。

GREEN:

- 实现数据库 `UserDetailsService` 或等价认证服务。
- 登录时 trim username、按 `Locale.ROOT` 小写查 `username_normalized`。
- 登录成功同事务更新 `last_login_at = now()`。

### 2. 登录失败统一 401

RED:

- 覆盖：
  - 用户不存在。
  - 密码错误。
  - `enabled=false`。
- 都返回 JSON：
  - `code=UNAUTHORIZED`
  - `requestId` 为字符串
  - message 不暴露账号是否存在或禁用。

GREEN:

- 统一 Spring Security authentication failure handler。
- 不返回 HTML，不重定向。

### 3. 当前用户改密码

RED:

- `POST /api/auth/change-password`：
  - `VIEWER` 可改自己密码。
  - 旧密码错误返回 401 或 `VALIDATION_ERROR`，按 OpenAPI 最终口径固定。
  - 新密码少于 12 返回 `VALIDATION_ERROR`。
  - 成功后旧密码不能登录，新密码能登录。
  - 当前会话继续有效。

GREEN:

- 只保存 BCrypt hash。
- 密码不 trim，最大 200。

### 4. ADMIN 列出用户

RED:

- 新增 `AdminUserControllerIntegrationTest`：
  - `ADMIN` 登录后 `GET /api/admin-users` 返回数组。
  - 按 `created_at DESC, id DESC` 排序。
  - 响应包含 `username/displayName/role/enabled/lastLoginAt/createdAt/updatedAt`。
  - 不包含 `passwordHash`。
  - `VIEWER` 返回 403 JSON。

GREEN:

- 实现 `AdminUserController`、service、mapper。
- 不分页、不筛选、不搜索。

### 5. ADMIN 创建用户

RED:

- `POST /api/admin-users`：
  - 创建 `VIEWER` 默认 `enabled=true`。
  - `displayName` trim 后空字符串存成 null。
  - 用户名格式 `^[A-Za-z0-9_.-]{3,50}$`。
  - `Admin` 和 `admin` 冲突，返回 `ADMIN_USER_CONFLICT`。
  - `role=admin` 小写返回 `VALIDATION_ERROR`。

GREEN:

- 写 `username_normalized = trim(username).toLowerCase(Locale.ROOT)`。
- 不允许修改用户名。

### 6. ADMIN 更新显示名、角色、启用状态

RED:

- `PATCH /api/admin-users/{id}`：
  - 可修改 `displayName`、`role`、`enabled`。
  - 不能禁用自己。
  - 不能把自己从 `ADMIN` 降级为 `VIEWER`。
  - 不能禁用最后一个启用 `ADMIN`。
  - 不能降级最后一个启用 `ADMIN`。
  - 未找到用户返回 `ADMIN_USER_NOT_FOUND`。

GREEN:

- 在 service 层做自保护和最后 ADMIN 保护。
- 更新 SQL 显式 `updated_at = now()`，不用 trigger。

### 7. ADMIN 重置密码

RED:

- `POST /api/admin-users/{id}/reset-password`：
  - ADMIN 可重置另一个 ADMIN 的密码。
  - 新密码少于 12 返回 `VALIDATION_ERROR`。
  - 成功后新密码可登录。
  - 不主动踢掉已有会话。

GREEN:

- 只更新 `password_hash` 和 `updated_at`。
- 不做忘记密码、邮件、随机密码。

### 8. 登出

RED:

- 登录后 `POST /api/auth/logout` 返回 204。
- 随后 `GET /api/auth/me` 返回 401。

GREEN:

- 使用 Spring Security session invalidation。

## Done

运行：

```bash
cd java-admin
mvn test
```

通过后进入 `docs_java/admin_auth_tdd_03_frontend_login.md`。
