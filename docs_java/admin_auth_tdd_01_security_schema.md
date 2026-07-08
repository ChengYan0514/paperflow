# Admin Auth TDD 01: `admin_user` Table and Security Shell

本文件对应实现计划第 1 步：增加 `admin_user` 建表 SQL 和 Spring Security
Session/CSRF。只搭安全外壳，不实现用户管理业务。

## Public Interface

- `docs/admin_user_init.sql`
- `GET /api/auth/csrf`
- 全局 API 需要登录，匿名只允许：
  - `GET /api/auth/csrf`
  - `POST /api/auth/login`
- 写请求需要 `X-XSRF-TOKEN`。
- `/api.yaml`、`/v3/api-docs`、Swagger UI 需要登录。

## TDD Slices

### 1. 建表 SQL 可在测试库执行

RED:

- 新增一个 schema 测试，读取 `../docs/admin_user_init.sql` 中的 `CREATE TABLE`
  语句，在 H2 PostgreSQL mode 执行。
- 断言可以插入：
  - `username='Admin'`
  - `username_normalized='admin'`
  - BCrypt 形状的 `password_hash`
  - `role='ADMIN'`
- 再插入 `username_normalized='admin'` 应失败。

GREEN:

- 修正 `docs/admin_user_init.sql`，直到测试通过。
- 不引入 Flyway/Liquibase。

### 2. Spring Security 依赖存在但不接业务

RED:

- 新增 `SecuritySmokeTest`：
  - `GET /api/task-status` 未登录返回 401 JSON `ErrorResponse`。
  - `GET /api/auth/csrf` 未登录返回 200，并设置 `XSRF-TOKEN` cookie。

GREEN:

- 加 `spring-boot-starter-security`。
- 加最小 `SecurityConfig`：
  - API 未登录返回 JSON 401，不重定向 HTML 登录页。
  - 暂时只开放 `/api/auth/csrf` 和 `/api/auth/login`。
  - 先用测试内存用户让安全链能跑通；下一步替换成数据库用户。

### 3. CSRF 保护写请求

RED:

- 在 `SecuritySmokeTest` 加：
  - 未登录或无 CSRF 的 `POST /api/auth/login` 返回 403 或 401，但不能成功。
  - 带 `XSRF-TOKEN` cookie 和 `X-XSRF-TOKEN` header 后，请求能进入认证流程。

GREEN:

- 使用 Spring Security `CookieCsrfTokenRepository.withHttpOnlyFalse()`。
- 不禁用 CSRF。
- Cookie 名保持 `XSRF-TOKEN`，header 名保持 `X-XSRF-TOKEN`。

### 4. Swagger/OpenAPI 受保护

RED:

- 修改现有 `OpenApiContractTest`：
  - 未登录访问 `/api.yaml`、`/v3/api-docs`、`/swagger-ui/index.html` 返回 401。
  - 使用测试登录态后这些地址仍能返回现有内容。

GREEN:

- Security 配置不要把 OpenAPI 端点加入匿名白名单。
- 现有“runtime OpenAPI 等于 docs_java/api.yaml”的断言保留，只在已登录状态下跑。

## Done

运行：

```bash
cd java-admin
mvn test -Dtest=SecuritySmokeTest,OpenApiContractTest
```

通过后进入 `docs_java/admin_auth_tdd_02_backend_api.md`。
