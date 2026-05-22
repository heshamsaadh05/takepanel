# Installation

## Requirements
- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- Linux server for system operations

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
- Email: `admin@hostmaster.local`
- Password: `ChangeMe123!`

## Notes
- Copy `backend/.env.example` to `backend/.env` for non-Docker deployments.
- Copy `agent/.env.example` to `agent/.env` when running the privileged agent on a real server.

