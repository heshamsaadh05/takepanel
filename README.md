# TakePanel

Modular web hosting control panel (cPanel-like) with Flask backend and React frontend.

## Zero-Input Server Install (IP Mode)

Run one command only on a fresh Linux server (no arguments required):

```bash
curl -fsSL https://raw.githubusercontent.com/heshamsaadh05/takepanel/main/deploy/installer/install_takepanel.sh | sudo bash
```

## Full Rebuild + Login Repair (One Command)
If login fails or installation is partially broken, run:

```bash
curl -fsSL https://raw.githubusercontent.com/heshamsaadh05/takepanel/main/deploy/installer/rebuild_takepanel.sh | sudo bash
```

What installer does automatically:
- Installs dependencies (nginx, python, node)
- Clones project from GitHub to `/opt/takepanel`
- Builds frontend and installs backend dependencies
- Creates `.env` with generated secure keys
- Creates `systemd` backend service (`takepanel` via gunicorn)
- Configures nginx on server IP (`default_server`)
- Seeds default admin account
- Installs a root-owned system-auth helper and sudoers rule for `root` logins
- Enables server login with `root` credentials by default

After install:
- Panel URL: `http://SERVER_IP`
- Backend service: `sudo systemctl status takepanel`
- Nginx config: `/etc/nginx/conf.d/takepanel.conf`

Default login:
- Username: `root`
- Password: the same password used for SSH/server login
- Authentication uses a root-owned helper at `/usr/local/bin/takepanel-auth-system` via `sudo`, so the panel checks the live Linux account password safely

## Optional Domain + SSL Later
You can later move from IP mode to domain + Let's Encrypt from inside panel scripts/API.

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
