# Deployment

## Production Shape
- Reverse proxy: Nginx
- Backend API: Node.js service
- Worker: background task process
- Agent: separate system service, usually running with elevated OS permissions only when needed

## Systemd Services
- `hostmaster-backend.service`
- `hostmaster-worker.service`
- `hostmaster-agent.service`

## Reverse Proxy
- `docker/nginx.conf` provides the local reverse proxy example
- In production, map `/api` to the backend and everything else to the frontend

## SSL
- Terminate TLS at the reverse proxy
- Use Let’s Encrypt or an external certificate manager

## Backup Strategy
- Back up PostgreSQL regularly
- Back up account archives and object storage destinations
- Keep backups off-server when possible

