# Paperflow Admin Platform

Paperflow Admin Platform is the standalone management platform for a Paperflow
database. Most domain resources remain read-only, while Paper CRUD and single-file
upload are implemented as the controlled write boundary.
It contains:

- `java-admin/`: Spring Boot REST API and Swagger UI.
- `web-admin-pro/`: Ant Design Pro / Umi Max management frontend.
- `docs/`: backend contract, runbook, and Paperflow database reference docs.
- `CONTEXT.md`: shared Paperflow domain terms.

The current platform reads Paperflow PostgreSQL tables and files under
`DATA_ROOT` and writes local Admin tables such as `admin_user` and
`admin_audit_log`. Paper CRUD adds controlled writes to Paper records and Original
File versions without triggering the Python
pipeline or running MinerU. See
[`docs/adr/0003-paper-crud-and-source-search.md`](docs/adr/0003-paper-crud-and-source-search.md)
and [`docs/paper-crud-implementation-plan.md`](docs/paper-crud-implementation-plan.md).

Current management features include:

- Session/CSRF login, fixed roles, user management, and role matrix.
- Source, Work, Original File, parsed full-text block, and asset browsing.
- Service status page backed by database, data-root, disk, and recent-error checks.
- Structured operation audit log for login/logout and user-management actions.
- CSV export for Source, Work, and Original File lists using current filters.
- Read-only failure task guidance with CLI retry commands for Matching, Text Parsing,
  and Block Import failures.
- Causal knowledge graph exploration: graph filtering, relation and variable details,
  paper evidence, and field/topic analysis.

## Configure

Copy `.env.example` to `.env` and update the database and data-root values.
The database account needs read access to Paperflow business tables and read/write
access to `admin_user` and `admin_audit_log`.
If the causal knowledge graph is stored in a different PostgreSQL database, also set
`CAUSAL_DB_*` so the knowledge-graph endpoints use that separate connection.

`CAUSAL_DB_*` is optional: each variable falls back to the corresponding
`PAPERFLOW_DB_*` value when it is unset.

```bash
cp .env.example .env
```

## Run Backend

```bash
cd java-admin
mvn spring-boot:run
```

Default backend URLs:

```text
http://localhost:8080/swagger-ui/index.html
http://localhost:8080/api.yaml
http://localhost:8080/v3/api-docs
```

## Run Frontend

```bash
cd web-admin-pro
npm ci
npm run dev
```

Default frontend URL:

```text
http://localhost:8000
```

For a non-default backend:

```bash
API_BASE_URL=http://localhost:8081 npm run dev
```

## Production

Deploy the frontend as Nginx static files and run the packaged Spring Boot JAR
under systemd. Nginx proxies `/api/` to the loopback-only backend, so the
browser uses one HTTPS origin. Deployment templates and commands are in
[`docs/admin_runbook.md`](docs/admin_runbook.md).

## Checks

```bash
cd java-admin
mvn test
```

```bash
cd web-admin-pro
npm ci
npm run test
npm run lint
```
