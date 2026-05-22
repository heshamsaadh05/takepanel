# HostMaster Panel

HostMaster Panel is a modular web hosting control panel built as an independent product with:

- `backend/` Node.js + TypeScript + Prisma + PostgreSQL + Redis
- `frontend/` React + TypeScript + Vite + TailwindCSS
- `agent/` a privileged system agent for allowlisted server operations
- `docker/` local development and integration compose files
- `docs/` architecture, security, deployment, installation, and roadmap notes

The project is designed to grow into a full hosting platform with admin and user panels, RBAC, audit logs, task queues, system provisioning, backups, SSL, DNS, mail, databases, and service management.

## Quick Start

### 1. Install dependencies

Backend:
```bash
cd backend
npm install
```

Frontend:
```bash
cd frontend
npm install
```

Agent:
```bash
cd agent
npm install
```

### 2. Configure env files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp agent/.env.example agent/.env
```

### 3. Database setup

```bash
cd backend
npx prisma generate
npm run prisma:migrate
npm run seed
```

### 4. Run locally

Backend:
```bash
cd backend
npm run dev
```

Frontend:
```bash
cd frontend
npm run dev
```

Agent:
```bash
cd agent
npm run dev
```

### 5. Docker

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

## Root Convenience Scripts

From the repository root:

```bash
npm run migrate
npm run seed
npm run create-admin
npm run worker
npm run agent
```

## Default Login

After seeding, the default admin login is:

- Email: `admin@hostmaster.local`
- Password: `ChangeMe123!`

## Documentation

- [Architecture](docs/architecture.md)
- [Installation](docs/installation.md)
- [API](docs/api.md)
- [Security](docs/security.md)
- [Deployment](docs/deployment.md)
- [Roadmap](docs/roadmap.md)

