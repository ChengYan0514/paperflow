# Ant Design Pro 迁移实施方案

本文定义 Paperflow Admin 从现有 `web-admin` 迁移到完整 Ant Design Pro / Umi Max
前端的实施方案，并同步定义三角色用户权限模型。第一阶段目标是功能等价迁移，
同时完成用户与角色管理所需的最小后端改造。

现状补充：第一阶段之后已继续补齐服务状态页、操作审计查询、失败任务只读处理建议，
以及 Source / Work / Original File 三大列表 CSV 导出。业务写操作和在线触发
pipeline 仍然不是当前目标。

按 TDD 逐步开发时，从阶段索引开始：
`docs/ant_design_pro_tdd_00_index.md`。

## 已确认决策

- 新前端并行放在 `web-admin-pro/`，旧 `web-admin/` 保留到验收完成。
- 实施时新建分支，避免污染当前可用前端。
- `web-admin-pro/` 直接基于官方 Ant Design Pro 模板初始化，不手工从零搭 Umi。
- 前端架构从 Vite 切换到 Umi Max，使用 Ant Design Pro 生态。
- 第一阶段保持前后端分离，不把前端构建产物打入 Spring Boot JAR。
- 页面路由保持现有业务路由不变，并恢复 `/roles` 为角色管理页。
- 认证协议保持 Session Cookie + CSRF，不改 JWT。
- 请求层使用 Umi request，不保留 TanStack Query。
- 列表页统一使用 `ProTable`。
- 用户创建和重置密码使用 `ModalForm`。
- 内容块阅读器逻辑完整保留，包括 KaTeX、表格清洗、图片展示、参考文献和脚注。
- 新前端只使用 `API_BASE_URL` 配置后端地址，不兼容 `VITE_API_BASE_URL`。
- `admin_user` 表数据可以清空；初始化 SQL 只保留一个默认 `SUPER_ADMIN`。
- 默认超级管理员账号为 `admin`，默认密码为 `admin`，首次登录后应立即修改密码。
- 密码最小长度从 12 改为 5，前后端、OpenAPI、测试和文档同步修改。

## 非目标

第一阶段不做：

- 动态 RBAC，不创建 `role`、`permission`、`role_permission` 表。
- 用户删除、登录历史查询；操作审计查询已在后续补齐。
- SSO、JWT、第三方登录、自注册。
- Spring Boot JAR 内嵌前端静态资源。
- 业务数据写操作，例如重试任务、人工修正匹配、修改 Paperflow 表。
- 重新设计业务页面路由或接口协议。

## 目标架构

```text
paperflow-admin-platform/
  java-admin/      Spring Boot REST API
  web-admin/       旧 Vite React 前端，验收前保留
  web-admin-pro/   新 Ant Design Pro / Umi Max 前端
```

开发运行：

```bash
cd java-admin
mvn spring-boot:run
```

```bash
cd web-admin-pro
API_BASE_URL=http://localhost:8080 npm start
```

## 信息架构

保留现有业务路由：

```text
/login
/task-status
/sources
/sources/:sourceId
/works
/works/:workId
/works/:workId/blocks
/original-files
/original-files/:fileId
/users
/roles
/service-status
/knowledge-base
/block-search
```

菜单结构：

```text
工作台

文献资源
- 来源期刊
- 论文
- 原始文件

系统管理
- 用户管理
- 角色管理

服务管理
- 服务状态
- 失败任务
- Swagger

知识管理
- 知识库
- 内容块检索
```

菜单可见性：

```text
SUPER_ADMIN: 全部菜单
ADMIN:       业务菜单 + 系统管理/用户管理 + 服务管理 + 知识管理
USER:        业务菜单 + 服务管理 + 知识管理，不显示系统管理
```

`/swagger-ui/index.html` 继续作为外链入口。
`服务状态` 和 `失败任务` 已接入真实页面；`知识管理` 第一阶段仍保留占位页面。

## 角色模型

第一阶段使用三个固定角色：

```text
SUPER_ADMIN  超级管理员
ADMIN        管理员
USER         普通用户
```

权限边界：

```text
SUPER_ADMIN
- 可访问所有页面。
- 可创建、编辑、启用、禁用所有用户。
- 可重置所有用户密码。
- 可访问角色管理页。
- 不允许禁用或降级最后一个启用的 SUPER_ADMIN。
- 不允许禁用或降级自己。

ADMIN
- 可访问业务页面、服务管理和知识管理。
- 可访问用户管理页。
- 可创建、编辑、启用、禁用 USER。
- 可重置 USER 密码。
- 不可创建、编辑、禁用、重置 SUPER_ADMIN 或 ADMIN。
- 不可访问角色管理页。

USER
- 可访问业务只读页面、服务管理和知识管理。
- 不可访问系统管理。
```

业务只读页面：

```text
/task-status
/sources
/works
/original-files
/service-status
/failure-tasks
/knowledge-base
/block-search
/swagger-ui/index.html
```

## 数据库方案

保留单表 `admin_user`，不引入动态角色表。`role` 取值改为：

```text
SUPER_ADMIN
ADMIN
USER
```

初始化 SQL 可清空原有账号，并创建一个默认超级管理员：

```sql
TRUNCATE TABLE admin_user RESTART IDENTITY;

INSERT INTO admin_user (username, username_normalized, password_hash, display_name, role, enabled)
VALUES (
  'admin',
  'admin',
  '$2b$12$NGQEGzJKiH5sMYTsiVQpTe7m/K.jmuWICMtM6HrYP.d4vPk2W8V4C',
  '超级管理员',
  'SUPER_ADMIN',
  TRUE
);
```

默认登录信息：

```text
username: admin
password: admin
```

该默认密码只用于初始化进入系统，首次登录后必须修改。

`docs/admin_user_init.sql` 需要同步更新 `CHECK` 约束和默认账号。

## 后端改造

需要修改：

- `AdminRole` 枚举：`SUPER_ADMIN`、`ADMIN`、`USER`。
- `admin_user` schema SQL：更新角色约束。
- 登录后的 Spring Security authority：继续使用 `ROLE_` 前缀，例如 `ROLE_SUPER_ADMIN`。
- 用户管理服务：
  - `SUPER_ADMIN` 拥有全部用户管理权限。
  - `ADMIN` 只能管理 `USER`。
  - `USER` 不能访问用户管理接口。
  - 保留最后一个启用 `SUPER_ADMIN` 保护。
  - 保留禁止禁用或降级自己的保护。
- 密码最小长度统一改为 5：
  - 创建用户。
  - 管理员重置密码。
  - 用户修改自己密码。
- OpenAPI `docs_java/api.yaml` 更新角色枚举和密码长度。
- 现有后端测试按三角色重写。

后端接口优先复用现有路径：

```text
GET    /api/auth/csrf
POST   /api/auth/login
GET    /api/auth/me
POST   /api/auth/logout
POST   /api/auth/change-password
GET    /api/admin-users
POST   /api/admin-users
PATCH  /api/admin-users/{id}
POST   /api/admin-users/{id}/reset-password
```

新增角色管理只读接口：

```text
GET /api/admin-roles
```

返回固定权限矩阵，用于 `/roles` 页面展示。也可以第一阶段不新增接口，
由前端写死同一份矩阵；推荐新增接口，避免前后端权限说明分叉。

## 前端改造

`web-admin-pro/` 基于官方 Ant Design Pro 模板初始化后，删除示例业务页，保留
Layout、request、initialState、access、路由结构。

建议目录：

```text
web-admin-pro/src/
  app.tsx
  access.ts
  requestErrorConfig.ts
  services/
    api.ts
    auth.ts
    users.ts
    roles.ts
    sources.ts
    works.ts
    originalFiles.ts
  pages/
    Login/
    TaskStatus/
    Sources/
    Works/
    OriginalFiles/
    Users/
    Roles/
    Placeholder/
  components/
    BlocksReader/
    StatusBadge/
    FieldDescriptions/
```

请求层规则：

- 基础地址来自 `process.env.API_BASE_URL`。
- 所有请求携带 `credentials: 'include'` 或等价配置。
- 写请求自动附加 `X-XSRF-TOKEN`。
- CSRF token 优先读 `XSRF-TOKEN` cookie；没有则调用 `/api/auth/csrf`。
- 统一处理后端 `ErrorResponse`，展示 `message`，保留 `requestId` 便于排查。

鉴权规则：

- `getInitialState` 调用 `/api/auth/me` 获取当前用户。
- 未登录访问后台页跳转 `/login?redirect=...`。
- 已登录访问 `/login` 跳转 `/task-status`。
- `access.ts` 只定义最小权限：
  - `canSuperAdmin`
  - `canManageUsers`
  - `canViewRoles`

页面组件：

- `/sources`、`/works`、`/original-files`、`/users` 使用 `ProTable`。
- 详情页使用 `PageContainer`、`Descriptions`、`Card`、`Table`。
- `/users`：
  - 创建用户：`ModalForm`。
  - 重置密码：`ModalForm`。
  - 启用/禁用：`Popconfirm`。
  - 角色切换：按当前用户权限限制可选项。
- `/roles`：
  - `SUPER_ADMIN` 可访问。
  - 展示三角色只读权限矩阵。
- 内容块阅读器迁移为独立 `BlocksReader`，保留旧逻辑。

## 迁移步骤

1. 新建实施分支。
2. 初始化 `web-admin-pro/`：
   - clone 官方 Ant Design Pro。
   - 删除内层 `.git`。
   - 更新 package name。
   - 跑通 `npm install` 和启动页。
3. 后端角色模型改造：
   - 更新 enum、SQL、服务权限判断、密码最小长度。
   - 更新 OpenAPI 和测试。
4. 新前端基础设施：
   - 配置 `API_BASE_URL`。
   - 实现 request、CSRF、登录、退出、initialState、access。
5. 迁移系统管理：
   - `/users`。
   - `/roles`。
6. 迁移业务列表页：
   - `/task-status`。
   - `/sources`。
   - `/works`。
   - `/original-files`。
7. 迁移详情页和内容块阅读器：
   - 来源期刊详情。
   - 论文详情和论文 blocks。
   - 原始文件详情和原始文件 blocks。
8. 更新 README 和运行手册：
   - 新前端启动命令。
   - `API_BASE_URL`。
   - 旧 `web-admin` 保留说明。
9. 验收通过后，单独决定是否删除或替换旧 `web-admin/`。

## 验收清单

后端：

- `mvn test` 通过。
- OpenAPI 校验通过。
- `SUPER_ADMIN` 能管理所有用户。
- `ADMIN` 只能管理 `USER`。
- `USER` 访问用户管理返回 403。
- 最后一个启用 `SUPER_ADMIN` 不能被禁用或降级。
- 密码长度 5 的创建、重置、修改密码流程可用。

前端：

- `npm run build` 通过。
- 未登录访问后台页会跳登录。
- 登录成功后回到原目标路径。
- 退出后不能继续访问后台数据。
- `SUPER_ADMIN` 可见用户管理和角色管理。
- `ADMIN` 可见用户管理，不可见角色管理。
- `USER` 不可见系统管理。
- 列表页筛选、分页、排序与旧前端等价。
- 详情页链接跳转与旧前端等价。
- 内容块阅读器能渲染 title、text、equation、table、image、reference、page_footnote。
- PDF/HTML/XML 资产链接仍走 `/api/assets/**`。

## 风险与处理

- Ant Design Pro 模板依赖较多：只保留必要示例代码，删除模板 mock 和无关页面。
- Umi 环境变量与 Vite 不同：文档只保留 `API_BASE_URL`。
- 权限模型变更影响后端测试：先改后端测试，再迁前端权限展示。
- 内容块阅读器有业务逻辑：迁移时优先复制旧逻辑，避免重写解析规则。
- 旧文档仍描述 `ADMIN` / `VIEWER`：本方案落地时同步更新旧文档或标记为历史。
