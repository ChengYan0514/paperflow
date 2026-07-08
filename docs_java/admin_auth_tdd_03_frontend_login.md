# Admin Auth TDD 03: Frontend Login, Route Guard, and CSRF

本文件对应实现计划第 3 步：前端实现 `/login`、路由保护和 CSRF header。

当前 `web-admin` 没有前端测试框架。第一步先加最小测试工具，只测公共 UI 行为
和 API client 行为；不要为了测试拆内部实现。

## Public Interface

- `/login`
- 启动时 `GET /api/auth/me`
- 登录前 `GET /api/auth/csrf`
- 写请求带 `X-XSRF-TOKEN`
- 未登录访问后台页面跳 `/login`
- 已登录访问 `/login` 跳 `/task-status`

## TDD Slices

### 1. 加最小前端测试脚手架

RED:

- 安装最小 dev 依赖：
  - `vitest`
  - `@testing-library/react`
  - `@testing-library/jest-dom`
  - `jsdom`
- 加一个会失败的 smoke test：渲染根路由时能看到登录页。

GREEN:

- 配置 `npm test`。
- 不引入大型 UI 测试框架或 E2E 工具。

### 2. 未登录进入后台跳登录

RED:

- Mock `fetch`：
  - `GET /api/auth/me` 返回 401 JSON。
- 渲染 `/task-status`。
- 断言显示登录表单，并保留原目标路径。

GREEN:

- 增加 auth query/provider 或最小路由 guard。
- 加载中显示现有 loading 状态。
- 401 以外错误显示现有 API error 样式。

### 3. 登录页初始化 CSRF 并登录成功

RED:

- Mock `fetch` 顺序：
  - `GET /api/auth/csrf` 返回 token。
  - `POST /api/auth/login` 断言 header `X-XSRF-TOKEN` 存在，body 包含
    username/password。
  - 登录返回 `AuthUser`。
  - 后续进入原目标页面。
- UI 输入用户名密码，点击登录，断言跳回原目标路径。

GREEN:

- 增加 `getCsrfToken()` 和 `postJson()`。
- 前端从 `XSRF-TOKEN` cookie 读 token；测试可用 document.cookie 设置。
- 所有请求使用 same-origin path，不把 token 放 localStorage。

### 4. 登录失败显示统一错误

RED:

- `POST /api/auth/login` 返回 401：
  - `code=UNAUTHORIZED`
  - message 为统一错误。
- 断言仍停留在 `/login`，密码框不泄露到 URL。

GREEN:

- 用现有 `ErrorResponse` 渲染错误。
- 不区分账号不存在、密码错误、账号禁用。

### 5. 已登录访问 `/login` 跳工作台

RED:

- `GET /api/auth/me` 返回 `role=VIEWER`。
- 进入 `/login`。
- 断言跳 `/task-status`。

GREEN:

- 登录页根据当前用户状态重定向。

### 6. 登出

RED:

- 已登录状态点击退出：
  - `POST /api/auth/logout` 带 CSRF header。
  - 成功后回 `/login`。

GREEN:

- 在 Layout 顶部加最小退出按钮和当前用户名显示。
- 不做多设备管理。

## Done

运行：

```bash
cd web-admin
npm test -- --run
npm run build
```

通过后进入 `docs_java/admin_auth_tdd_04_frontend_users.md`。
