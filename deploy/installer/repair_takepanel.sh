#!/usr/bin/env bash
set -euo pipefail

# TakePanel Repair Script
# Usage: curl -fsSL <raw_url>/deploy/installer/repair_takepanel.sh | sudo bash

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root: curl ... | sudo bash"
  exit 1
fi

REPO_URL="https://github.com/heshamsaadh05/takepanel.git"
INSTALL_DIR="/opt/takepanel"
BACKEND_DIR="$INSTALL_DIR/backend"
FRONTEND_DIR="$INSTALL_DIR/frontend"
APP_USER="takepanel"
APP_GROUP="takepanel"
APP_PORT="8000"
SERVICE_FILE="/etc/systemd/system/takepanel.service"
NGINX_SITE="/etc/nginx/conf.d/takepanel.conf"
SERVER_IP="$(hostname -I | awk '{print $1}')"
BACKUP_SUFFIX="$(date +%Y%m%d_%H%M%S)"

log() { echo "[TakePanel Repair] $*"; }

install_node20_apt() {
  apt update
  apt install -y curl ca-certificates gnupg
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
}

install_node20_dnf() {
  dnf install -y curl ca-certificates
  curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
  dnf install -y nodejs
}

if command -v apt >/dev/null 2>&1; then
  install_node20_apt
elif command -v dnf >/dev/null 2>&1; then
  install_node20_dnf
else
  echo "Unsupported OS package manager"
  exit 1
fi

NODE_MAJOR="$(node -v | sed 's/^v//' | cut -d. -f1 || echo 0)"
if [[ "${NODE_MAJOR:-0}" -lt 20 ]]; then
  echo "Node.js 20+ required. Current: $(node -v 2>/dev/null || echo none)"
  exit 1
fi

if ! id "$APP_USER" >/dev/null 2>&1; then
  useradd --system --create-home --shell /sbin/nologin "$APP_USER"
fi

# Prevent git safe.directory blocking on root-owned repair runs.
git config --global --add safe.directory "$INSTALL_DIR" || true

if [[ ! -d "$INSTALL_DIR/.git" ]]; then
  if [[ -d "$INSTALL_DIR" ]]; then
    mv "$INSTALL_DIR" "${INSTALL_DIR}.bak.${BACKUP_SUFFIX}"
  fi
  git clone "$REPO_URL" "$INSTALL_DIR"
else
  if ! git -C "$INSTALL_DIR" pull --ff-only; then
    log "git pull failed, falling back to fresh clone"
    mv "$INSTALL_DIR" "${INSTALL_DIR}.bak.${BACKUP_SUFFIX}"
    git clone "$REPO_URL" "$INSTALL_DIR"
  fi
fi

chown -R "$APP_USER:$APP_GROUP" "$INSTALL_DIR"

log "Installing backend dependencies"
sudo -u "$APP_USER" bash -c "cd '$BACKEND_DIR' && python3 -m venv .venv"
sudo -u "$APP_USER" bash -c "cd '$BACKEND_DIR' && . .venv/bin/activate && pip install --upgrade pip && pip install -r requirements.txt"

if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  SECRET_KEY="$(openssl rand -hex 32)"
  JWT_SECRET_KEY="$(openssl rand -hex 32)"
  cat > "$BACKEND_DIR/.env" <<EOF
SECRET_KEY=$SECRET_KEY
JWT_SECRET_KEY=$JWT_SECRET_KEY
DATABASE_URL=sqlite:///$BACKEND_DIR/takepanel.db
MOCK_SYSTEM_COMMANDS=false
WEB_ROOT_BASE=/var/www
WEB_SERVICE_NAME=nginx
MAIL_BASE_DIR=/var/mail/vhosts
BACKUP_BASE_DIR=/var/backups/takepanel
TAKEPANEL_BOOTSTRAP_DB_ON_START=true
TAKEPANEL_ADMIN_EMAIL=admin@takepanel.local
TAKEPANEL_ADMIN_PASSWORD=ChangeMe123!
TAKEPANEL_SYSTEM_AUTH_ENABLED=true
TAKEPANEL_SYSTEM_ADMIN_USERS=root
EOF
fi
chown "$APP_USER:$APP_GROUP" "$BACKEND_DIR/.env"

log "Building frontend"
sudo -u "$APP_USER" bash -c "cd '$FRONTEND_DIR' && npm install && npm run build"

log "Creating takepanel service"
cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=TakePanel Backend (Gunicorn)
After=network.target

[Service]
User=$APP_USER
Group=$APP_GROUP
WorkingDirectory=$BACKEND_DIR
EnvironmentFile=$BACKEND_DIR/.env
ExecStart=$BACKEND_DIR/.venv/bin/gunicorn -w 4 -b 127.0.0.1:$APP_PORT run:app
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

log "Initializing DB and admin account"
sudo -u "$APP_USER" bash -c "cd '$BACKEND_DIR' && . .venv/bin/activate && set -a && . ./.env && set +a && flask --app run.py bootstrap-admin --email \"\${TAKEPANEL_ADMIN_EMAIL:-admin@takepanel.local}\" --password \"\${TAKEPANEL_ADMIN_PASSWORD:-ChangeMe123!}\" --reset-password"

log "Configuring nginx"
cat > "$NGINX_SITE" <<EOF
server {
    listen 80 default_server;
    server_name _;

    root $FRONTEND_DIR/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:$APP_PORT/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

if [[ -f /etc/nginx/sites-enabled/default ]]; then
  rm -f /etc/nginx/sites-enabled/default
fi

chmod -R o+rX "$FRONTEND_DIR/dist"

systemctl daemon-reload
systemctl enable takepanel
systemctl restart takepanel

nginx -t
systemctl enable nginx
systemctl restart nginx

log "Repair completed"
echo "Panel URL: http://$SERVER_IP"
echo "Login: admin@takepanel.local / ChangeMe123!"
echo "Backend: systemctl status takepanel --no-pager -l"
