# Security

## Authentication
- Short-lived JWT access tokens
- Refresh tokens for session renewal
- Optional 2FA fields and setup endpoints

## Authorization
- RBAC permissions are stored on roles
- `super_admin` bypasses permission checks
- Middleware enforces route-level permissions

## Agent Security
- Privileged operations go through the agent, not directly through requests
- Agent requests must include a shared token and signature
- Only allowlisted operations are accepted

## File Manager Safety
- Account file operations must remain inside the account home directory
- Path traversal should be rejected
- No system paths may be touched from the user file manager

## Operational Hardening
- Security headers via Helmet
- Rate limiting on the API
- Audit logs for critical actions
- API token hashes are stored instead of raw values
- Passwords are hashed with bcrypt

