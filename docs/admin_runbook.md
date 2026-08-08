# Admin Frontend and Backend Runbook

本文说明 Paperflow Java Admin 后端和 Ant Design Pro 前端的本地启动方式，以及
Nginx + systemd 的生产部署方式。

## 前置条件

- Java 17 和 Maven 可用。
- Node.js 22+ 和 npm 可用。
- 仓库根目录 `.env` 或 `java-admin/.env` 已配置 `PAPERFLOW_DB_*`，Java 后端会读取
  这些配置连接 Paperflow PostgreSQL 数据库。
- 论文写入功能还需要配置只读 `OPENALEX_DB_*`。当前生产拓扑中两套连接指向同一
  `openalex` 数据库，业务 schema 为 `widi_chengyan`，OpenAlex schema 为
  `dataset_20241125`。
- 如果 causal knowledge graph 在单独数据库，再额外配置 `CAUSAL_DB_*`；知识图谱
  相关接口会优先使用这组连接信息。
- causal 数据库首次部署知识图谱查询前，由 schema owner 创建声明关联索引并更新
  统计信息；详见下方“因果知识图谱索引”。
- 数据库账号需要读写 Paperflow 业务 schema 中的 `original_file`、
  `original_file_job`、`original_file_version`、Source 搜索快照、文件补偿表和管理表；
  对 OpenAlex schema 只需要 SELECT。
- 如果要预览 PDF/HTML 或 parsed 图片，`.env` 还需要配置 `DATA_ROOT` 指向
  Paperflow 数据根目录；未配置时默认使用仓库相对路径 `data`。
- Java 进程必须能写 `DATA_ROOT/openalex/original`、`.upload-tmp`、
  `paperflow/archive`、`paperflow/trash` 和 `paperflow/pending-delete`。

### Source 模糊搜索索引

应用账号当前没有数据库级 `CREATE` 权限，因此 Flyway 不尝试安装 PostgreSQL
`pg_trgm` 扩展。生产环境建议由数据库管理员执行一次：

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

扩展存在时迁移会创建名称和出版社的 trigram 索引；扩展不存在时 Source 搜索仍可
使用，但模糊查询会退化为 `LIKE` 扫描。首次部署后由 SUPER_ADMIN 在“OpenAlex
来源检索”页面执行一次全量同步。

## 启动后端

### 因果知识图谱索引

在 causal 数据库上执行一次：

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_paper_claim_claim_id
    ON paper_claim_table (claim_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_paper_claim_paper_id
    ON paper_claim_table (paper_id);

ANALYZE paper_claim_table;
ANALYZE claim_table;
ANALYZE work_topic;
```

`CREATE INDEX CONCURRENTLY` 不能放在显式事务中执行。应用运行账号只需要读取这些
表；索引创建和 `ANALYZE` 应由 causal schema owner 或维护账号执行。

如果修改了 causal 查询账号的 `work_mem` 或 `statement_timeout`，重启后端或排空
连接池后再验收，确保新连接继承角色配置。

因果图谱的总览与领域分析使用进程内缓存。外部 causal ETL 成功后，重启
`paperflow-admin`，使下一次访问从已完成的 ETL 结果重建缓存；不要在 ETL 尚未完整
落库时重启服务。

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

### web-admin-pro

另开一个终端，在仓库根目录执行：

```bash
cd web-admin-pro
npm ci
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

## 生产构建前端

```bash
cd web-admin-pro
npm ci
npm run build
```

新前端构建产物输出到：

```text
web-admin-pro/dist/
```

## 生产部署（Nginx + systemd）

生产环境只常驻运行 Java 后端。前端构建为静态文件后，由 Nginx 提供；Nginx 将
`/api/`、Swagger 相关路径反向代理到本机 `127.0.0.1:8080`。前后端同源，现有
Session 和 CSRF 配置无需 CORS 配置。

前置条件：服务器已安装 Java 17、Nginx、Node.js 22+ 和 Maven；已有 HTTPS
证书；`paperflow` 是无登录权限的系统用户，且能读取 `DATA_ROOT`。

### 首次安装

以下路径是部署约定，可按需整体替换，但配置中的路径必须保持一致：

```bash
sudo install -d -o paperflow -g paperflow /opt/paperflow-admin
sudo install -d -m 700 -o root -g paperflow /etc/paperflow-admin
sudo install -m 600 -o root -g paperflow .env.example /etc/paperflow-admin/admin.env
sudoedit /etc/paperflow-admin/admin.env
```

在生产环境的 `admin.env` 中填入真实数据库和 `DATA_ROOT`，并设置：

```dotenv
SESSION_COOKIE_SECURE=true
SERVER_ADDRESS=127.0.0.1
```

新数据库需要由 schema owner 账号连接到 `admin.env` 指定的数据库和 schema 后，执行
一次初始化 SQL。该脚本创建两个本地管理表和默认 `SUPER_ADMIN`，已有管理表的数据库
不要重复执行：

```bash
psql -v ON_ERROR_STOP=1 -f docs/admin_user_init.sql
```

当前后端启动时还会对审计表执行 `CREATE TABLE/INDEX IF NOT EXISTS`，因此运行账号
需要目标 schema 的 `CREATE` 权限。若后续改为仅由迁移账号建表，可移除这一运行时
DDL 要求。

构建、安装后端和前端：

```bash
cd java-admin
mvn -DskipTests package
sudo install -o paperflow -g paperflow -m 640 target/paperflow-admin-0.1.0.jar /opt/paperflow-admin/paperflow-admin.jar

cd ../web-admin-pro
npm ci
npm run build
sudo install -d -o root -g root /var/www/paperflow-admin
sudo rsync -a --delete dist/ /var/www/paperflow-admin/
```

安装仓库中的服务与站点模板。将其中的 `admin.example.com` 和证书路径替换为实际值后，
再启用：

```bash
sudo install -m 644 deploy/systemd/paperflow-admin.service /etc/systemd/system/paperflow-admin.service
sudo install -m 644 deploy/nginx/paperflow-admin.conf /etc/nginx/sites-available/paperflow-admin
sudo ln -s /etc/nginx/sites-available/paperflow-admin /etc/nginx/sites-enabled/paperflow-admin
sudo nginx -t
sudo systemctl daemon-reload
sudo systemctl enable --now paperflow-admin
sudo systemctl reload nginx
```

常用检查：

```bash
systemctl status paperflow-admin
journalctl -u paperflow-admin -f
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/api/service-status
curl -s -o /dev/null -w '%{http_code}\n' https://admin.example.com/api/service-status
```

两个 `curl` 命令应返回 `401`，表示受保护 API 可达。实际服务检查在登录后通过 Web
界面验证。

### 升级

重新构建 JAR 和 `dist/`，覆盖上述两个安装目标后执行：

```bash
sudo systemctl restart paperflow-admin
```

前端文件由 Nginx 直接读取，静态文件更新不需要重启 Nginx。仅改动 Nginx 配置时先运行
`sudo nginx -t`，再 `sudo systemctl reload nginx`。

### 注意事项

- 不要在生产环境运行 `mvn spring-boot:run`、`npm run dev` 或 `npm run preview`。
- 后端只监听回环地址；不要将 8080 暴露到公网。只公开 Nginx 的 443 端口。
- `/etc/paperflow-admin/admin.env` 是密钥文件，不提交 Git，不复制到前端构建目录。
- `.env.example` 只包含占位值。此前若其中的数据库密码真实有效，应立即轮换。

## 默认超级管理员

在新数据库上执行一次 `docs/admin_user_init.sql` 后，会初始化一个启用的
`SUPER_ADMIN`：

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
- `/knowledge/causal-graph` 可加载总览、变量/关系详情、论文证据和领域分析；若在
  causal ETL 后验收，先重启后端以清空进程内缓存。
- `SUPER_ADMIN` 可访问 `/audit-logs` 查询登录、退出、创建用户、更新用户、重置密码、
  修改密码等审计事件；`ADMIN` 和 `USER` 不可访问。
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
