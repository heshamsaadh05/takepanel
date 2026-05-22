# HostMaster Architecture

HostMaster is a modular hosting control panel designed as an independent product inspired by the feature set of traditional hosting dashboards, while avoiding any copied brand assets or UI text.

## Core Layers

### 1. Backend API
- TypeScript + Express
- Prisma ORM with PostgreSQL
- JWT access and refresh tokens
- RBAC permission checks
- Audit logging for sensitive actions
- Rate limiting and security headers

### 2. Frontend
- React + TypeScript
- Vite build pipeline
- TailwindCSS-based UI system
- Arabic and English support with RTL switching
- Separate admin and user panels

### 3. Queue and Worker
- BullMQ queue abstraction for async tasks
- A worker process executes background jobs
- Jobs are used for provisioning, backups, restores, and reporting

### 4. Agent
- A separate privileged service for system-level operations
- Communicates using a signed internal token
- Accepts only allowlisted operations
- Returns structured JSON results

### 5. Database
- PostgreSQL is the primary system of record
- Prisma schema contains users, roles, accounts, domains, DNS, email, databases, SSL, backups, metrics, and audit records

## Task Lifecycle
1. User triggers an action from the UI.
2. Backend validates input and permissions.
3. Backend creates a `Task` record.
4. Backend enqueues a job.
5. Worker processes the job.
6. If privileged system work is required, the worker calls the agent.
7. Agent returns structured output.
8. Worker updates task status and stores results.
9. Backend writes audit logs and notifications.
10. Frontend refreshes state by polling or future websocket integration.

## Security Model
- JWT-based session authentication
- Role-based permissions
- Audit trails for all sensitive actions
- Agent requests require signed headers
- File-manager paths must stay within account home directories
- Privileged shell execution is not performed directly from API requests

