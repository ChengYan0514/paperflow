# Paperflow Admin Platform Architecture

This repository is the standalone read-only management platform for Paperflow.
It is split into a Java backend, a React frontend, and documentation copied from
the Paperflow project where the database and domain terms are defined.

## Layout

```text
paperflow-admin-platform/
├── README.md
├── CONTEXT.md
├── architecture.md
├── docs/
├── docs_java/
├── java-admin/
└── web-admin/
```

- `CONTEXT.md`: Paperflow domain glossary. Keep API and UI wording consistent
  with it unless a frontend label intentionally localizes a term.
- `docs/db_design.md`: Paperflow database tables, status values, constraints,
  and indexes consumed by the Java backend.
- `docs/pipeline.md`: reference for Paperflow pipeline stages and status
  transitions.
- `docs/admin_ui_plan.md`: read-only frontend scope and page design.
- `docs/admin_runbook.md`: local backend/frontend runbook.
- `docs_java/api.yaml`: the single OpenAPI contract source.
- `docs_java/db_read_model.md`: SQL join and DTO derivation rules.
- `docs_java/overview.md`: Java backend scope and non-goals.
- `docs_java/vibe_coding_rules.md`: Java backend generation rules.

## Java Backend

`java-admin/` is a Spring Boot 3.x, Java 17, Maven project. It exposes read-only
REST JSON endpoints over the Paperflow PostgreSQL database:

```text
GET /api/task-status
GET /api/sources
GET /api/sources/{sourceId}
GET /api/works
GET /api/works/{workId}
GET /api/works/{workId}/blocks
GET /api/original-files
GET /api/original-files/{fileId}
GET /api/original-files/{fileId}/blocks
GET /api/assets/**
```

`docs_java/api.yaml` is packaged by `java-admin/pom.xml` as the runtime
`/api.yaml` static resource. `/v3/api-docs` returns the same YAML resource, and
generated springdoc API docs are disabled.

`src/main/resources/application.yml` loads `.env` from `java-admin/.env` or the
project root `../.env`. Database schema selection is controlled by PostgreSQL
JDBC `currentSchema`.

## Web Frontend

`web-admin/` is a Vite React TypeScript frontend. It calls the Java Admin REST
API only. During local development, `vite.config.ts` proxies same-origin `/api`
and `/v3` requests to `VITE_API_BASE_URL` or `http://localhost:8080`.

## Boundaries

This project does not:

- import OpenAlex metadata or Original Files;
- perform matching, text parsing, or block import;
- trigger Python CLI commands or MinerU;
- write Paperflow database tables;
- read files outside configured `DATA_ROOT`;
- implement login, roles, write actions, scheduling, queues, or caching.
