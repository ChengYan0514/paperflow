# Admin Frontend and Backend Runbook

本文说明 Paperflow Java Admin 后端和 Web Admin 前端的本地启动方式。

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
```

## 启动前端

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

前端开发服务会把同源 `/api` 和 `/v3` 请求代理到 Java 后端。默认后端地址是
`http://localhost:8080`。

如果后端不在默认地址，启动前端前设置：

```bash
cd web-admin
VITE_API_BASE_URL=http://localhost:8081 npm run dev
```

## 生产构建前端

```bash
cd web-admin
npm install
npm run build
```

构建产物输出到：

```text
web-admin/dist/
```

## 停止服务

前端和后端都是前台进程运行时，按 `Ctrl+C` 停止对应终端里的进程。

如果需要从另一个终端停止本地开发进程，可先查看：

```bash
ps -ef | grep -E 'spring-boot:run|PaperflowAdminApplication|vite --host|npm run dev'
```

然后只停止确认属于本项目的 PID：

```bash
kill <pid>
```
