# Ant Design Pro TDD 01: 三角色后端权限模型

本阶段把现有 `ADMIN` / `VIEWER` 改为固定三角色：
`SUPER_ADMIN`、`ADMIN`、`USER`。先稳定后端公共接口，再做新前端。

## Public Interface

```text
docs/admin_user_init.sql
GET    /api/auth/me
POST   /api/auth/change-password
GET    /api/admin-users
POST   /api/admin-users
PATCH  /api/admin-users/{id}
POST   /api/admin-users/{id}/reset-password
GET    /api/admin-roles
docs_java/api.yaml
```

## TDD Slices

### 1. 初始化 SQL 支持三角色和默认超级管理员

RED:

- 修改或新增 schema 测试，读取 `../docs/admin_user_init.sql`。
- 断言 `admin_user.role` 只接受 `SUPER_ADMIN`、`ADMIN`、`USER`。
- 断言 SQL 初始化后存在一个启用的 `username='admin'`、`role='SUPER_ADMIN'`。
- 断言默认超级管理员密码为 `admin`，保存的是 BCrypt hash，不是明文。
- 断言插入旧角色 `VIEWER` 失败。

GREEN:

- 更新 `docs/admin_user_init.sql`。
- 可清空旧 `admin_user` 数据。
- 默认超级管理员：
  - username: `admin`
  - password: `admin`
  - role: `SUPER_ADMIN`
- 不引入 Flyway/Liquibase。

### 2. 登录和当前用户返回新角色

RED:

- 修改 `AuthControllerIntegrationTest`：
  - 默认 `admin` / `admin` 登录成功，`GET /api/auth/me` 返回 `role=SUPER_ADMIN`。
  - `ADMIN` 登录成功，返回 `role=ADMIN`。
  - `USER` 登录成功，返回 `role=USER`。

GREEN:

- 更新 `AdminRole` enum。
- 更新测试数据中的角色。
- 登录后的 authority 继续使用 `ROLE_` 前缀。

### 3. 密码最小长度改为 5

RED:

- 覆盖创建用户、重置密码、修改自己密码：
  - 长度 4 返回 `VALIDATION_ERROR`。
  - 长度 5 可成功。

GREEN:

- 修改 DTO validation。
- 保留最大长度 200。
- 密码不 trim。

### 4. SUPER_ADMIN 管理所有用户

RED:

- `SUPER_ADMIN` 可：
  - 创建 `SUPER_ADMIN`、`ADMIN`、`USER`。
  - 更新任意用户显示名、角色、启用状态。
  - 重置任意用户密码。

GREEN:

- 修改 `AdminUserService` 权限判断。
- 保留用户名大小写不敏感唯一约束。

### 5. ADMIN 只能管理 USER

RED:

- `ADMIN` 可创建 `USER`。
- `ADMIN` 可更新、启禁、重置 `USER`。
- `ADMIN` 创建 `ADMIN` 或 `SUPER_ADMIN` 返回 403。
- `ADMIN` 更新、禁用、重置 `ADMIN` 或 `SUPER_ADMIN` 返回 403。

GREEN:

- 在 service 层集中做权限判断。
- 不在 controller 复制权限逻辑。

### 6. USER 不能访问用户管理

RED:

- `USER` 访问以下接口返回 403 JSON：
  - `GET /api/admin-users`
  - `POST /api/admin-users`
  - `PATCH /api/admin-users/{id}`
  - `POST /api/admin-users/{id}/reset-password`

GREEN:

- 复用统一 `requireUserManager` 或等价私有方法。

### 7. 保护最后一个启用 SUPER_ADMIN 和当前用户

RED:

- 不能禁用最后一个启用的 `SUPER_ADMIN`。
- 不能把最后一个启用的 `SUPER_ADMIN` 降级。
- 当前用户不能禁用自己。
- 当前用户不能降级自己。

GREEN:

- 把原“最后 ADMIN”保护改成“最后 SUPER_ADMIN”保护。
- 错误继续返回 `ADMIN_USER_CONFLICT`。

### 8. 角色矩阵接口

RED:

- 新增 `GET /api/admin-roles` 集成测试：
  - `SUPER_ADMIN` 返回 200。
  - `ADMIN` 和 `USER` 返回 403。
  - 响应包含 `SUPER_ADMIN`、`ADMIN`、`USER` 三行和权限说明。

GREEN:

- 新增只读 controller/service 或 controller 内固定返回。
- 不新增数据库表。

### 9. OpenAPI 同步

RED:

- 更新 `docs_java/api.yaml` 后运行 YAML 解析。
- 断言文档里的角色枚举不再包含 `VIEWER`。
- 断言密码 `minLength` 为 5。

GREEN:

- 同步 `AdminRole` schema。
- 新增 `/api/admin-roles` contract。

## Done

运行：

```bash
cd java-admin
mvn test
```

```bash
python -c "import yaml; yaml.safe_load(open('docs_java/api.yaml'))"
```

通过后进入 `docs/ant_design_pro_tdd_02_pro_scaffold.md`。
