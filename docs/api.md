# API Overview

The API is organized around a small set of core authenticated endpoints and a larger set of feature modules that are scaffolded and ready to expand.

## Auth
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/2fa/setup`
- `POST /api/auth/2fa/verify`
- `GET /api/auth/me`

## Users / Roles
- `GET /api/users`
- `POST /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`
- `PATCH /api/users/:id/status`
- `GET /api/roles`
- `POST /api/roles`
- `PATCH /api/roles/:id`
- `DELETE /api/roles/:id`

## Dashboard
- `GET /api/dashboard/overview`

## Feature Modules
The following module roots are scaffolded and ready for deeper implementation:
- `/api/accounts`
- `/api/packages`
- `/api/resellers`
- `/api/domains`
- `/api/dns`
- `/api/email`
- `/api/databases`
- `/api/files`
- `/api/ssl`
- `/api/backups`
- `/api/metrics`
- `/api/security`
- `/api/services`
- `/api/php`
- `/api/notifications`
- `/api/audit`
- `/api/api-tokens`
- `/api/settings`
- `/api/tasks`

## Response Format
All responses use a consistent JSON wrapper:
```json
{ "success": true, "data": {} }
```

Errors:
```json
{ "success": false, "error": { "code": "error_code", "message": "Readable message" } }
```

