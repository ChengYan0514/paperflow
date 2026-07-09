# Paperflow Admin Platform

Paperflow Admin Platform is the standalone read-only management platform for a
Paperflow database. It contains:

- `java-admin/`: Spring Boot REST API and Swagger UI.
- `web-admin-pro/`: Ant Design Pro / Umi Max management frontend.
- `web-admin/`: legacy Vite React frontend, retained until final acceptance.
- `docs_java/`: Java backend contract and read model.
- `docs/`: frontend plan, runbook, and Paperflow database reference docs.
- `CONTEXT.md`: shared Paperflow domain terms.

The platform reads Paperflow PostgreSQL tables and files under `DATA_ROOT`. It
does not import data, trigger the Python pipeline, run MinerU, or write
Paperflow tables.

## Configure

Copy `.env.example` to `.env` and update the database and data-root values.
Use a read-only PostgreSQL account when possible.

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

## Run New Frontend

```bash
cd web-admin-pro
npm install
npm run dev
```

Default new frontend URL:

```text
http://localhost:8000
```

For a non-default backend:

```bash
API_BASE_URL=http://localhost:8081 npm run dev
```

## Run Legacy Frontend

```bash
cd web-admin
npm install
npm run dev
```

Default legacy frontend URL:

```text
http://localhost:5173
```

For a non-default backend, the legacy Vite frontend still uses:

```bash
VITE_API_BASE_URL=http://localhost:8081 npm run dev
```

## Checks

```bash
cd java-admin
mvn test
```

```bash
cd web-admin-pro
npm install
npm run build
```

The legacy `web-admin/` is kept for comparison until acceptance is complete.

```bash
python -c "import yaml; yaml.safe_load(open('docs_java/api.yaml'))"
```
