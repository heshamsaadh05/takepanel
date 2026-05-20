#!/usr/bin/env bash
set -euo pipefail

# TakePanel One-Command Installer
# Supports: Ubuntu/Debian (apt), AlmaLinux/RHEL/CentOS (dnf)

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root: sudo bash install_takepanel.sh ..."
  exit 1
fi

DOMAIN="${1:-}"
EMAIL="${2:-}"
REPO_URL="${3:-}"
INSTALL_DIR="/opt/takepanel"
BACKEND_DIR="$INSTALL_DIR/backend"
FRONTEND_DIR="$INSTALL_DIR/frontend"
APP_USER="takepanel"
APP_GROUP="takepanel"
APP_PORT="8000"
NGINX_SITE="/etc/nginx/sites-available/takepanel.conf"
NGINX_SITE_ENABLED="/etc/nginx/sites-enabled/takepanel.conf"

if [[ -z "$DOMAIN" || -z "$EMAIL" || -z "$REPO_URL" ]]; then
  echo "Usage: bash install_takepanel.sh <domain> <email> <repo_url>"
  exit 1
fi

log() { echo "[TakePanel] $*"; }

install_packages_apt() {
  apt update
  apt install -y git curl nginx certbot python3-certbot-nginx python3 python3-venv python3-pip nodejs npm openssl
}

install_packages_dnf() {
  dnf install -y epel-release
  dnf install -y git curl nginx certbot python3-certbot-nginx python3 python3-pip nodejs npm openssl
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

if ! id "$APP_USER" >/dev/null 2>&1; then
  useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
fi

log "Cloning/Updating project"
if [[ -d "$INSTALL_DIR/.git" ]]; then
  git -C "$INSTALL_DIR" pull --ff-only || true
else
  rm -rf "$INSTALL_DIR"
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
EOF
chown "$APP_USER:$APP_GROUP" "$BACKEND_DIR/.env"

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

log "Configuring nginx"
mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
cat > "$NGINX_SITE" <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

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
ln -sf "$NGINX_SITE" "$NGINX_SITE_ENABLED"
if [[ -f /etc/nginx/sites-enabled/default ]]; then
  rm -f /etc/nginx/sites-enabled/default
fi
nginx -t
systemctl enable nginx
systemctl restart nginx

log "Issuing SSL certificate"
certbot --nginx --non-interactive --agree-tos --email "$EMAIL" -d "$DOMAIN" -d "www.$DOMAIN" || true

log "Creating default admin account"
sudo -u "$APP_USER" bash -c "cd '$BACKEND_DIR' && . .venv/bin/activate && flask --app run.py seed-admin" || true

log "Installation completed"
echo "URL: https://$DOMAIN"
echo "Backend service: systemctl status takepanel"
echo "Admin user: admin@takepanel.local"
echo "Admin password: ChangeMe123! (change it immediately)"
