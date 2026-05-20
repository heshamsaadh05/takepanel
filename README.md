# TakePanel

Modular web hosting control panel (cPanel-like) with Flask backend and React frontend.

## One-Command Domain Install (Production)

Use this on a fresh Linux server with DNS A record pointing to server IP.

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USER/YOUR_REPO/main/deploy/installer/install_takepanel.sh | sudo bash -s -- panel.example.com admin@example.com https://github.com/YOUR_USER/YOUR_REPO.git
```

Arguments:
1. `panel.example.com` : your domain
2. `admin@example.com` : Let's Encrypt email
3. `https://github.com/YOUR_USER/YOUR_REPO.git` : repository URL

What installer does:
- Installs dependencies (nginx, python, node, certbot)
- Clones project to `/opt/takepanel`
- Builds frontend and installs backend dependencies
- Creates `.env` with secure generated secrets
- Creates `systemd` service `takepanel` (gunicorn)
- Configures nginx reverse proxy + SPA routing
- Issues SSL via Let's Encrypt
- Seeds default admin account

After install:
- Panel URL: `https://your-domain`
- Backend service: `sudo systemctl status takepanel`
- Nginx config: `/etc/nginx/sites-available/takepanel.conf`

## Installer Script
- Main installer: `deploy/installer/install_takepanel.sh`

## Dev Quick Start

### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
flask run --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
