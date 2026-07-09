# Admin User Authentication

Paperflow Admin uses local Admin User accounts stored in the current database schema's `admin_user` table, with Spring Security session cookies and CSRF protection for same-origin login. We chose this over JWT, SSO, a separate auth schema, and dynamic RBAC because the first required boundary is small: Paperflow business tables stay read-only, while Admin Users need only fixed `SUPER_ADMIN`, `ADMIN`, and `USER` roles.
