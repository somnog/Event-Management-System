# Event-Management-System

Platform integration backend with an API gateway and authentication service.

## Services

- `apps/auth-service`: registration, login, JWT access tokens, refresh-token rotation, logout, roles, and audit logs.
- `apps/gateway`: public HTTP API gateway and health checks.

Copy each service's environment template or create a local `.env` file before running it. Never commit secret values.
