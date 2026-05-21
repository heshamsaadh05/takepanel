#!/usr/bin/env bash
set -euo pipefail

# TakePanel Full Rebuild + Login Repair
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/heshamsaadh05/takepanel/main/deploy/installer/rebuild_takepanel.sh | sudo bash

if [[ $EUID -ne 0 ]]; then
  echo "Run as root."
  exit 1
fi

REPO_URL="https://github.com/heshamsaadh05/takepanel.git"
INSTALL_DIR="/opt/takepanel"
BACKEND_DIR="$INSTALL_DIR/backend"
FRONTEND_DIR="$INSTALL_DIR/frontend"
APP_USER="takepanel"
APP_GROUP="takepanel"
APP_PORT="8000"
ENV_FILE="$BACKEND_DIR/.env"
SERVICE_FILE="/etc/systemd/system/takepanel.service"
SERVER_IP="$(hostname -I | awk '{print $1}')"
BACKUP_SUFFIX="$(date +%Y%m%d_%H%M%S)"

log() { echo "[TakePanel Rebuild] $*"; }

install_packages_apt() {
  apt update
  apt install -y git curl nginx python3 python3-venv python3-pip openssl ca-certificates gnupg pigz libpam0g-dev
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
}

install_packages_dnf() {
  dnf install -y epel-release
  dnf install -y git curl nginx python3 python3-pip openssl ca-certificates pigz pam-devel gcc
  curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
  dnf install -y nodejs
}

if command -v apt >/dev/null 2>&1; then
  install_packages_apt
elif command -v dnf >/dev/null 2>&1; then
  install_packages_dnf
else
  echo "Unsupported package manager. Use apt or dnf."
  exit 1
fi

NODE_MAJOR="$(node -v | sed 's/^v//' | cut -d. -f1 || echo 0)"
if [[ "${NODE_MAJOR:-0}" -lt 20 ]]; then
  echo "Node.js 20+ is required. Current: $(node -v 2>/dev/null || echo none)"
  exit 1
fi

if ! id "$APP_USER" >/dev/null 2>&1; then
  useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
fi

git config --global --add safe.directory "$INSTALL_DIR" || true

if [[ -d "$INSTALL_DIR/.git" ]]; then
  if ! git -C "$INSTALL_DIR" pull --ff-only; then
    log "git pull failed, cloning fresh copy"
    mv "$INSTALL_DIR" "${INSTALL_DIR}.bak.${BACKUP_SUFFIX}"
    git clone "$REPO_URL" "$INSTALL_DIR"
  fi
else
  if [[ -d "$INSTALL_DIR" ]]; then
    mv "$INSTALL_DIR" "${INSTALL_DIR}.bak.${BACKUP_SUFFIX}"
  fi
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

chown -R "$APP_USER:$APP_GROUP" "$INSTALL_DIR"

log "Recreating backend virtualenv"
sudo -u "$APP_USER" bash -c "cd '$BACKEND_DIR' && rm -rf .venv && python3 -m venv .venv"
sudo -u "$APP_USER" bash -c "cd '$BACKEND_DIR' && . .venv/bin/activate && pip install --upgrade pip && pip install -r requirements.txt"

if [[ ! -f "$ENV_FILE" ]]; then
  SECRET_KEY="$(openssl rand -hex 32)"
  JWT_SECRET_KEY="$(openssl rand -hex 32)"
  cat > "$ENV_FILE" <<EOF
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
else
  grep -q '^TAKEPANEL_BOOTSTRAP_DB_ON_START=' "$ENV_FILE" || echo 'TAKEPANEL_BOOTSTRAP_DB_ON_START=true' >> "$ENV_FILE"
  grep -q '^TAKEPANEL_ADMIN_EMAIL=' "$ENV_FILE" || echo 'TAKEPANEL_ADMIN_EMAIL=admin@takepanel.local' >> "$ENV_FILE"
  grep -q '^TAKEPANEL_ADMIN_PASSWORD=' "$ENV_FILE" || echo 'TAKEPANEL_ADMIN_PASSWORD=ChangeMe123!' >> "$ENV_FILE"
  grep -q '^TAKEPANEL_SYSTEM_AUTH_ENABLED=' "$ENV_FILE" || echo 'TAKEPANEL_SYSTEM_AUTH_ENABLED=true' >> "$ENV_FILE"
  grep -q '^TAKEPANEL_SYSTEM_ADMIN_USERS=' "$ENV_FILE" || echo 'TAKEPANEL_SYSTEM_ADMIN_USERS=root' >> "$ENV_FILE"
fi
chown "$APP_USER:$APP_GROUP" "$ENV_FILE"

log "Rebuilding frontend"
sudo -u "$APP_USER" bash -c "cd '$FRONTEND_DIR' && npm install && npm run build"

log "Writing systemd service"
cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=TakePanel Backend (Gunicorn)
After=network.target

[Service]
User=$APP_USER
Group=$APP_GROUP
WorkingDirectory=$BACKEND_DIR
EnvironmentFile=$ENV_FILE
ExecStart=$BACKEND_DIR/.venv/bin/gunicorn -w 4 -b 127.0.0.1:$APP_PORT run:app
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

log "Ensuring DB tables + admin login"
sudo -u "$APP_USER" bash -c "cd '$BACKEND_DIR' && . .venv/bin/activate && set -a && . ./.env && set +a && python - <<'PY'
from app import create_app
from app.extensions import db
from app.models.user import User
import os

app = create_app()
with app.app_context():
    db.create_all()
    email = os.getenv('TAKEPANEL_ADMIN_EMAIL', 'admin@takepanel.local').lower()
    password = os.getenv('TAKEPANEL_ADMIN_PASSWORD', 'ChangeMe123!')
    u = User.query.filter_by(email=email).first()
    if not u:
        u = User(email=email, role='admin')
        db.session.add(u)
    u.role = 'admin'
    u.is_active = True
    u.set_password(password)
    db.session.commit()
print('admin bootstrap ok')
PY"

systemctl daemon-reload
systemctl enable takepanel
systemctl restart takepanel
systemctl enable nginx
systemctl restart nginx

sleep 2
curl -sS "http://127.0.0.1:$APP_PORT/api/health" || true

log "Rebuild completed"
echo "Panel URL: http://$SERVER_IP/login"
echo "Panel admin: admin@takepanel.local / ChangeMe123!"
echo "Server login: root / <your server password>"
echo "Check backend: systemctl status takepanel --no-pager -l"
