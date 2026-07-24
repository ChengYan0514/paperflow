# Paperflow Admin Platform Architecture

This repository is the standalone management platform for Paperflow. It keeps
Paperflow business data read-only, and only writes the local `admin_user` and
`admin_audit_log` tables. It is split into a Java backend, a React frontend,
and documentation copied from the Paperflow project where the database and
domain terms are defined.

## Layout

```text
paperflow-admin-platform/
├── README.md
├── CONTEXT.md
├── architecture.md
├── docs/
│   └── backend/
├── java-admin/
└── web-admin-pro/
```

- `CONTEXT.md`: Paperflow domain glossary. Keep API and UI wording consistent
  with it unless a frontend label intentionally localizes a term.
- `docs/db_design.md`: Paperflow database tables, status values, constraints,
  and indexes consumed by the Java backend.
- `docs/pipeline.md`: reference for Paperflow pipeline stages and status
  transitions.
- `docs/admin_runbook.md`: local backend/frontend runbook.
- `docs/backend/api.yaml`: the single OpenAPI contract source.
- `docs/backend/db_read_model.md`: SQL join and DTO derivation rules.
- `docs/backend/overview.md`: Java backend scope and non-goals.
- `docs/backend/vibe_coding_rules.md`: Java backend generation rules.

## Java Backend

`java-admin/` is a Spring Boot 3.x, Java 17, Maven project. It exposes REST
JSON endpoints over the Paperflow PostgreSQL database. Paperflow business
tables remain read-only; user management and audit logging write only the
`admin_user` and `admin_audit_log` tables in the configured schema.

```text
GET /api/auth/csrf
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
POST /api/auth/change-password
GET /api/admin-users
POST /api/admin-users
PATCH /api/admin-users/{id}
POST /api/admin-users/{id}/reset-password
GET /api/admin-roles
GET /api/admin-audit-logs
GET /api/task-status
GET /api/service-status
GET /api/sources
GET /api/sources/export
GET /api/sources/{sourceId}
GET /api/works
GET /api/works/export
GET /api/works/{workId}
GET /api/works/{workId}/blocks
GET /api/original-files
GET /api/original-files/export
GET /api/original-files/{fileId}
GET /api/original-files/{fileId}/blocks
GET /api/assets/**
GET /api/knowledge/causal-graph/summary
GET /api/knowledge/causal-graph/graph
GET /api/knowledge/causal-graph/search/nodes
GET /api/knowledge/causal-graph/search/terms
GET /api/knowledge/causal-graph/search/papers
GET /api/knowledge/causal-graph/nodes/{variable}
GET /api/knowledge/causal-graph/edges
GET /api/knowledge/causal-graph/claims/{claimId}
GET /api/knowledge/causal-graph/papers/{workId}
GET /api/knowledge/causal-graph/papers/{workId}/summary
GET /api/knowledge/causal-graph/fields
```

`docs/backend/api.yaml` is packaged by `java-admin/pom.xml` as the runtime
`/api.yaml` static resource. `/v3/api-docs` returns the same YAML resource, and
generated springdoc API docs are disabled. `/api.yaml`, `/v3/api-docs`, and
Swagger UI require login in production.

`src/main/resources/application.yml` loads `.env` from `java-admin/.env` or the
project root `../.env`. Database schema selection is controlled by PostgreSQL
JDBC `currentSchema`. Causal graph queries use `CAUSAL_DB_*` when configured,
otherwise the corresponding `PAPERFLOW_DB_*` connection values.

The graph summary and field-analysis responses use process-local caches. After
an external causal ETL succeeds, restart the Java service before using the
refreshed graph data.

## Web Frontend

`web-admin-pro/` is an Ant Design Pro / Umi Max React TypeScript frontend. It
calls the Java Admin REST API only. During local development, Umi proxy config
forwards same-origin `/api` requests to `API_BASE_URL` or
`http://localhost:8080`.

Production deployment is same-origin: the React app and Java API are served
under the same site, and login state uses an HttpOnly session cookie. Unsafe
requests use Spring Security CSRF protection with `XSRF-TOKEN` and the
`X-XSRF-TOKEN` header. Production requires HTTPS and sets
`SESSION_COOKIE_SECURE=true`.

## Boundaries

This project does not:

- import OpenAlex metadata or Original Files;
- perform matching, text parsing, or block import;
- trigger Python CLI commands or MinerU;
- write Paperflow database tables;
- read files outside configured `DATA_ROOT`;
- implement dynamic permission matrices, self-registration, JWT, SSO,
  scheduling, queues, or caching.
