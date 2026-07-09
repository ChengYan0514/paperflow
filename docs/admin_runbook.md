# Admin Frontend and Backend Runbook

本文说明 Paperflow Java Admin 后端、旧 Vite 前端和新 Ant Design Pro 前端的
本地启动方式。

## 前置条件

- Java 17 和 Maven 可用。
- Node.js 和 npm 可用。
- 仓库根目录 `.env` 已配置 `PAPERFLOW_DB_*`，Java 后端会读取这些配置连接
  Paperflow PostgreSQL 数据库。
- 如果要预览 PDF/HTML 或 parsed 图片，`.env` 还需要配置 `DATA_ROOT` 指向
  Paperflow 数据根目录；未配置时默认使用仓库相对路径 `data`。

## 启动后端

在仓库根目录执行：

```bash
cd java-admin
mvn spring-boot:run
```

默认地址：

```text
http://localhost:8080
```

常用入口：

```text
http://localhost:8080/swagger-ui/index.html
http://localhost:8080/api.yaml
http://localhost:8080/v3/api-docs
http://localhost:8080/api/service-status
```

## 启动前端

### 新前端：web-admin-pro

另开一个终端，在仓库根目录执行：

```bash
cd web-admin-pro
npm install
npm run dev
```

默认地址：

```text
http://localhost:8000
```

新前端使用 `API_BASE_URL` 配置 Java 后端地址。默认同源请求 `/api`；如果后端
不在默认地址，启动前设置：

```bash
cd web-admin-pro
API_BASE_URL=http://localhost:8081 npm run dev
```

### 旧前端：web-admin

旧 `web-admin/` 在最终验收前保留，用于对照旧功能。

另开一个终端，在仓库根目录执行：

```bash
cd web-admin
npm install
npm run dev
```

默认地址：

```text
http://localhost:5173
```

旧前端开发服务会把同源 `/api` 和 `/v3` 请求代理到 Java 后端。默认后端地址是
`http://localhost:8080`。

如果后端不在默认地址，旧前端启动前设置：

```bash
cd web-admin
VITE_API_BASE_URL=http://localhost:8081 npm run dev
```

## 生产构建前端

```bash
cd web-admin-pro
npm install
npm run build
```

新前端构建产物输出到：

```text
web-admin-pro/dist/
```

旧前端构建：

```bash
cd web-admin
npm install
npm run build
```

构建产物输出到：

```text
web-admin/dist/
```

## 默认超级管理员

`docs/admin_user_init.sql` 会初始化一个启用的 `SUPER_ADMIN`：

```text
username: admin
password: admin
```

该默认密码仅用于首次进入系统，首次登录后应立即修改。当前前后端密码最小长度
为 5，创建用户、重置密码和修改自己密码都使用同一规则。

## 最终手工验收清单

按三个角色分别登录新前端 `web-admin-pro/` 验收：

- `SUPER_ADMIN`：登录/退出正常；可见用户管理和角色管理；可创建、编辑、启用、
  禁用、重置各角色用户；角色管理为只读矩阵。
- `ADMIN`：登录/退出正常；可见用户管理但不可见角色管理；只能创建、编辑、
  启用、禁用、重置 `USER`。
- `USER`：登录/退出正常；不可见系统管理；直接访问 `/users` 或 `/roles` 应被
  阻止。

业务页面验收：

- `/task-status`、`/sources`、`/works`、`/original-files` 列表和详情可加载。
- 内容块阅读器可渲染 title、text、equation、table、image、reference、
  page_footnote。
- `/sources`、`/works`、`/original-files` 可按当前筛选导出 CSV。
- `/service-status` 展示 Java 后端、数据库、`DATA_ROOT`、磁盘空间和最近错误。
- `/failure-tasks` 展示失败状态解释和可复制 CLI 命令；页面只读，不触发 pipeline。
- `SUPER_ADMIN` 可访问 `/audit-logs` 查询登录、退出、创建用户、更新用户、重置密码、
  修改密码等审计事件；`ADMIN` 和 `USER` 不可访问。
- `/knowledge-base`、`/block-search` 仍保持占位页面。
- Swagger 菜单打开 `/swagger-ui/index.html`。

## 停止服务

前端和后端都是前台进程运行时，按 `Ctrl+C` 停止对应终端里的进程。

如果需要从另一个终端停止本地开发进程，可先查看：

```bash
ps -ef | grep -E 'spring-boot:run|PaperflowAdminApplication|vite --host|max dev|npm run dev'
```

然后只停止确认属于本项目的 PID：

```bash
kill <pid>
```
