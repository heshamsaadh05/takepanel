# Installation

## One-Command Server Install

For a fresh Linux server, use the official bootstrap installer:

```bash
curl -fsSL https://raw.githubusercontent.com/heshamsaadh05/takepanel/main/deploy/installer/bootstrap_install.sh | sudo bash
```

This is the recommended production-style path because it:

- detects the host package manager
- installs backend, frontend, and system dependencies
- clones the latest repository
- configures the backend service
- builds the frontend
- installs the system agent helpers
- wires nginx as the reverse proxy
- bootstraps the default admin account

## Requirements

- Ubuntu, Debian, AlmaLinux, or another supported Linux distribution
- `curl`
- `sudo` access
- outbound network access for package installation and repository cloning

## Local Development

### Backend

```bash
cd backend
npm install
npx prisma generate
npm run prisma:migrate
npm run seed
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Agent

```bash
cd agent
npm install
npm run dev
```

## Docker

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

## First Login

After the installer completes:

- Email: `owner@takepanel.local`
- Password: `TakePanel@2026!`

For system-login mode, the panel can also be configured to accept the server root credentials depending on the backend settings.

## Notes

- Copy `backend/.env.example` to `backend/.env` for non-Docker deployments.
- Copy `agent/.env.example` to `agent/.env` when running the privileged agent on a real server.
- The bootstrap installer is the canonical “one command” entry point, similar in spirit to cPanel/WHM setup flows.
