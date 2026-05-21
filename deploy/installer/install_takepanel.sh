#!/usr/bin/env bash
set -euo pipefail

# TakePanel Zero-Input Installer
# Usage: curl -fsSL <raw_url> | sudo bash
# No parameters required.

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
NGINX_SITE="/etc/nginx/conf.d/takepanel.conf"
SERVER_IP="$(hostname -I | awk '{print $1}')"
BACKUP_SUFFIX="$(date +%Y%m%d_%H%M%S)"
HELPER_SRC="$INSTALL_DIR/deploy/installer/takepanel-auth-system.py"
HELPER_DST="/usr/local/bin/takepanel-auth-system"
SUDOERS_FILE="/etc/sudoers.d/takepanel"

log() { echo "[TakePanel] $*"; }

install_packages_apt() {
  apt update
  apt install -y git curl nginx python3 python3-venv python3-pip openssl ca-certificates gnupg pigz sudo
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
}

install_packages_dnf() {
  dnf install -y epel-release
  dnf install -y git curl nginx python3 python3-pip openssl ca-certificates pigz sudo
  curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
  dnf install -y nodejs
}

if command -v apt >/dev/null 2>&1; then
  log "Installing dependencies via apt"
  install_packages_apt
elif command -v dnf >/dev/null 2>&1; then
  log "Installing dependencies via dnf"
  install_packages_dnf
else
  echo "Unsupported OS package manager. Use apt or dnf."
  exit 1
fi

NODE_MAJOR="$(node -v | sed 's/^v//' | cut -d. -f1 || echo 0)"
if [[ "${NODE_MAJOR:-0}" -lt 20 ]]; then
  echo "Node.js 20+ is required but not available. Current: $(node -v 2>/dev/null || echo 'none')"
  exit 1
fi

if ! id "$APP_USER" >/dev/null 2>&1; then
  useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
fi
if getent group wheel >/dev/null 2>&1; then
  usermod -aG wheel "$APP_USER" || true
fi

log "Cloning/Updating project"
# Prevent git safe.directory blocking on root-owned install runs.
git config --global --add safe.directory "$INSTALL_DIR" || true

if [[ -d "$INSTALL_DIR/.git" ]]; then
  if ! git -C "$INSTALL_DIR" pull --ff-only; then
    log "git pull failed, falling back to fresh clone"
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

log "Setting up backend"
sudo -u "$APP_USER" bash -c "cd '$BACKEND_DIR' && python3 -m venv .venv"
sudo -u "$APP_USER" bash -c "cd '$BACKEND_DIR' && . .venv/bin/activate && pip install --upgrade pip && pip install -r requirements.txt"

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
TAKEPANEL_ADMIN_EMAIL=owner@takepanel.local
TAKEPANEL_ADMIN_PASSWORD=TakePanel@2026!
TAKEPANEL_SYSTEM_AUTH_ENABLED=true
TAKEPANEL_SYSTEM_AUTH_HELPER=/usr/local/bin/takepanel-auth-system
TAKEPANEL_SYSTEM_AUTH_TIMEOUT=10
TAKEPANEL_SYSTEM_ADMIN_USERS=root
EOF
chown "$APP_USER:$APP_GROUP" "$BACKEND_DIR/.env"

log "Installing system auth helper"
install -o root -g root -m 0755 "$HELPER_SRC" "$HELPER_DST"
cat > "$SUDOERS_FILE" <<EOF
Defaults:takepanel !requiretty
takepanel ALL=(root) NOPASSWD: $HELPER_DST *
EOF
chmod 0440 "$SUDOERS_FILE"
visudo -cf "$SUDOERS_FILE"

log "Setting up frontend"
sudo -u "$APP_USER" bash -c "cd '$FRONTEND_DIR' && npm install"
sudo -u "$APP_USER" bash -c "cd '$FRONTEND_DIR' && npm run build"

log "Creating systemd service"
cat > /etc/systemd/system/takepanel.service <<EOF
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

systemctl daemon-reload
systemctl enable takepanel
systemctl restart takepanel

log "Configuring nginx for server IP"
mkdir -p /etc/nginx/conf.d
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
        try_files \$uri /index.html;
    }
}
EOF

if [[ -f /etc/nginx/sites-enabled/default ]]; then
  rm -f /etc/nginx/sites-enabled/default
fi

nginx -t
systemctl enable nginx
systemctl restart nginx

log "Creating default admin account"
sudo -u "$APP_USER" bash -c "cd '$BACKEND_DIR' && . .venv/bin/activate && set -a && . ./.env && set +a && flask --app run.py bootstrap-admin --email 'owner@takepanel.local' --password 'TakePanel@2026!' --reset-password" || true

log "Installation completed"
echo "Panel URL: http://$SERVER_IP"
echo "Backend service: systemctl status takepanel"
echo "Nginx service: systemctl status nginx"
echo "Login: root / your server password"
