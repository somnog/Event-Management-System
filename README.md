# Event-Management-System

Event management microservices backend with an API gateway, authentication, event management, and shared local infrastructure.

## Services

- `apps/auth-service`: registration, login, JWT access tokens, refresh-token rotation, logout, roles, and audit logs.
- `apps/event-service`: event and category business operations.
- `apps/gateway`: public HTTP API gateway and health checks.

Copy each service's environment template or create a local `.env` file before running it. Never commit secret values.
