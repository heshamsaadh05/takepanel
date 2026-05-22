#!/usr/bin/env bash
set -euo pipefail

# HostMaster zero-input installer.
# This is the actual production bootstrap used by deploy/installer/bootstrap_install.sh.

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root: curl ... | sudo bash"
  exit 1
fi

REPO_URL="https://github.com/heshamsaadh05/takepanel.git"
INSTALL_DIR="/opt/hostmaster"
BACKEND_DIR="$INSTALL_DIR/backend"
FRONTEND_DIR="$INSTALL_DIR/frontend"
AGENT_DIR="$INSTALL_DIR/agent"
APP_USER="hostmaster"
APP_GROUP="hostmaster"
APP_NAME="HostMaster Panel"
BACKEND_PORT="8080"
AGENT_PORT="9090"
SERVER_IP="$(hostname -I | awk '{print $1}')"
BACKUP_SUFFIX="$(date +%Y%m%d_%H%M%S)"
POSTGRES_DB="hostmaster"
POSTGRES_USER="hostmaster"
POSTGRES_PASSWORD="$(openssl rand -hex 16)"
AGENT_TOKEN="$(openssl rand -hex 32)"
HOSTMASTER_ENV="$BACKEND_DIR/.env"
AGENT_ENV="$AGENT_DIR/.env"
BACKEND_SERVICE_FILE="/etc/systemd/system/hostmaster-backend.service"
WORKER_SERVICE_FILE="/etc/systemd/system/hostmaster-worker.service"
AGENT_SERVICE_FILE="/etc/systemd/system/hostmaster-agent.service"
NGINX_SITE="/etc/nginx/conf.d/hostmaster.conf"
OLD_NGINX_SITE="/etc/nginx/conf.d/takepanel.conf"
OLD_TAKEPANEL_SERVICE="/etc/systemd/system/takepanel.service"
SUDOERS_FILE="/etc/sudoers.d/hostmaster"

log() { echo "[HostMaster Installer] $*"; }

detect_pkg_manager() {
  if command -v apt >/dev/null 2>&1; then
    echo apt
  elif command -v dnf >/dev/null 2>&1; then
    echo dnf
  else
    echo ""
  fi
}

detect_service_unit() {
  local unit
  local candidates=("$@")
  local available
  available="$(systemctl list-unit-files --type=service --no-legend 2>/dev/null | awk '{print $1}')"
  for unit in "${candidates[@]}"; do
    if printf '%s\n' "$available" | grep -qx "$unit"; then
      printf '%s\n' "$unit"
      return 0
    fi
  done
  printf '%s\n' "${candidates[0]}"
}

setup_apt() {
  apt update
  DEBIAN_FRONTEND=noninteractive apt install -y \
    git curl nginx postgresql postgresql-contrib redis-server \
    python3 python3-pip python3-venv openssl ca-certificates sudo build-essential gnupg
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  DEBIAN_FRONTEND=noninteractive apt install -y nodejs
}

setup_dnf() {
  dnf install -y epel-release
  dnf install -y \
    git curl nginx postgresql-server postgresql-contrib postgresql redis \
    python3 openssl ca-certificates sudo gcc-c++ make
  curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
  dnf install -y nodejs
  if [[ ! -f /var/lib/pgsql/data/PG_VERSION ]]; then
    postgresql-setup --initdb
  fi
}

ensure_system_user() {
  if ! getent group "$APP_GROUP" >/dev/null 2>&1; then
    groupadd --system "$APP_GROUP"
  fi

  if ! id "$APP_USER" >/dev/null 2>&1; then
    useradd --system --create-home --home-dir "/var/lib/$APP_USER" --gid "$APP_GROUP" --shell /usr/sbin/nologin "$APP_USER"
  fi
}

clone_or_update_repo() {
  git config --global --add safe.directory "$INSTALL_DIR" || true

  if [[ -d "$INSTALL_DIR/.git" ]]; then
    if ! git -C "$INSTALL_DIR" pull --ff-only; then
      log "git pull failed, creating a fresh clone backup"
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
}

write_env_files() {
  cat > "$HOSTMASTER_ENV" <<EOF
NODE_ENV=production
PORT=$BACKEND_PORT
APP_NAME="HostMaster Panel"
APP_URL=http://$SERVER_IP
API_PREFIX=/api
DATABASE_URL=postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@127.0.0.1:5432/$POSTGRES_DB?schema=public
REDIS_URL=redis://127.0.0.1:6379
AGENT_URL=http://127.0.0.1:$AGENT_PORT
AGENT_TOKEN=$AGENT_TOKEN
AGENT_TIMEOUT_MS=10000
JWT_ACCESS_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
ADMIN_BOOTSTRAP_EMAIL=admin@hostmaster.local
ADMIN_BOOTSTRAP_PASSWORD=ChangeMe123!
ADMIN_BOOTSTRAP_USERNAME=admin
DEFAULT_LOCALE=en
DEFAULT_THEME=dark
MOCK_SYSTEM_MODE=true
ARGON2_TIME_COST=3
ARGON2_MEMORY_COST=65536
ARGON2_PARALLELISM=1
EOF

  cat > "$AGENT_ENV" <<EOF
HOSTMASTER_AGENT_PORT=$AGENT_PORT
HOSTMASTER_AGENT_TOKEN=$AGENT_TOKEN
HOSTMASTER_AGENT_ALLOWED_OPS=create_system_user,create_home_directory,write_vhost,reload_web_server,create_dns_zone,create_mailbox,create_database,issue_ssl,run_backup,restore_backup,collect_metrics,manage_service
HOSTMASTER_AGENT_MOCK=true
EOF

  chown "$APP_USER:$APP_GROUP" "$HOSTMASTER_ENV" "$AGENT_ENV"
  chmod 0640 "$HOSTMASTER_ENV" "$AGENT_ENV"
}

install_node_dependencies() {
  log "Installing backend dependencies"
  sudo -u "$APP_USER" bash -c "cd '$BACKEND_DIR' && npm ci --no-audit --no-fund"

  log "Installing frontend dependencies"
  sudo -u "$APP_USER" bash -c "cd '$FRONTEND_DIR' && npm ci --no-audit --no-fund"

  log "Installing agent dependencies"
  sudo -u "$APP_USER" bash -c "cd '$AGENT_DIR' && npm ci --no-audit --no-fund"
}

initialize_postgresql() {
  local pg_service
  pg_service="$(detect_service_unit postgresql.service postgresql@.service)"
  systemctl enable --now "$pg_service" || true

  # Wait briefly for PostgreSQL to become ready.
  for _ in $(seq 1 30); do
    if sudo -u postgres psql -tAc 'SELECT 1' >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname = '$POSTGRES_USER'" | grep -q 1; then
    sudo -u postgres createuser "$POSTGRES_USER"
  fi
  sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
SET password_encryption = 'scram-sha-256';
ALTER USER "$POSTGRES_USER" WITH PASSWORD '$POSTGRES_PASSWORD';
SQL

  if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = '$POSTGRES_DB'" | grep -q 1; then
    sudo -u postgres createdb -O "$POSTGRES_USER" "$POSTGRES_DB"
  else
    sudo -u postgres psql -c "ALTER DATABASE \"$POSTGRES_DB\" OWNER TO \"$POSTGRES_USER\";"
  fi
}

configure_postgresql_auth() {
  local pg_hba_file
  pg_hba_file="$(find /etc/postgresql /var/lib/pgsql -name pg_hba.conf -print -quit 2>/dev/null || true)"
  if [[ -z "$pg_hba_file" || ! -f "$pg_hba_file" ]]; then
    log "Could not locate pg_hba.conf; skipping auth tuning"
    return 0
  fi

  if grep -q '127.0.0.1/32            scram-sha-256' "$pg_hba_file"; then
    return 0
  fi

  cp "$pg_hba_file" "${pg_hba_file}.bak.${BACKUP_SUFFIX}"
  {
    echo 'host    all             all             127.0.0.1/32            scram-sha-256'
    echo 'host    all             all             ::1/128                 scram-sha-256'
    cat "${pg_hba_file}.bak.${BACKUP_SUFFIX}"
  } > "$pg_hba_file"

  local pg_service
  pg_service="$(detect_service_unit postgresql.service postgresql@.service)"
  systemctl restart "$pg_service"
}

build_backend_and_frontend() {
  log "Generating Prisma client"
  sudo -u "$APP_USER" bash -c "cd '$BACKEND_DIR' && npx prisma generate"

  log "Applying database migrations"
  sudo -u "$APP_USER" bash -c "cd '$BACKEND_DIR' && npx prisma migrate deploy"

  log "Seeding initial data"
  sudo -u "$APP_USER" bash -c "cd '$BACKEND_DIR' && npm run seed"

  log "Building backend"
  sudo -u "$APP_USER" bash -c "cd '$BACKEND_DIR' && npm run build"

  log "Building frontend"
  sudo -u "$APP_USER" bash -c "cd '$FRONTEND_DIR' && npm run build"

  log "Building agent"
  sudo -u "$APP_USER" bash -c "cd '$AGENT_DIR' && npm run build"
}

install_sudoers() {
  cat > "$SUDOERS_FILE" <<EOF
Defaults:hostmaster !requiretty
hostmaster ALL=(root) NOPASSWD: /bin/systemctl restart nginx, /bin/systemctl reload nginx
EOF
  chmod 0440 "$SUDOERS_FILE"
  visudo -cf "$SUDOERS_FILE"
}

install_systemd_units() {
  local pg_service redis_service
  pg_service="$(detect_service_unit postgresql.service postgresql@.service)"
  redis_service="$(detect_service_unit redis-server.service redis.service)"

  cat > "$BACKEND_SERVICE_FILE" <<EOF
[Unit]
Description=HostMaster Backend API
After=network.target $pg_service $redis_service

[Service]
Type=simple
User=$APP_USER
Group=$APP_GROUP
WorkingDirectory=$BACKEND_DIR
EnvironmentFile=$HOSTMASTER_ENV
ExecStart=/usr/bin/node $BACKEND_DIR/dist/index.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

  cat > "$WORKER_SERVICE_FILE" <<EOF
[Unit]
Description=HostMaster Task Worker
After=network.target $redis_service

[Service]
Type=simple
User=$APP_USER
Group=$APP_GROUP
WorkingDirectory=$BACKEND_DIR
EnvironmentFile=$HOSTMASTER_ENV
ExecStart=/usr/bin/node $BACKEND_DIR/dist/queue/worker.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

  cat > "$AGENT_SERVICE_FILE" <<EOF
[Unit]
Description=HostMaster System Agent
After=network.target

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=$AGENT_DIR
EnvironmentFile=$AGENT_ENV
ExecStart=/usr/bin/node $AGENT_DIR/dist/index.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable hostmaster-backend hostmaster-worker hostmaster-agent
}

configure_nginx() {
  if [[ -f "$OLD_NGINX_SITE" ]]; then
    mv "$OLD_NGINX_SITE" "${OLD_NGINX_SITE}.bak.${BACKUP_SUFFIX}"
  fi
  if [[ -f /etc/nginx/sites-enabled/default ]]; then
    mv /etc/nginx/sites-enabled/default "/etc/nginx/sites-enabled/default.bak.${BACKUP_SUFFIX}"
  fi
  if [[ -f /etc/nginx/conf.d/default.conf ]]; then
    mv /etc/nginx/conf.d/default.conf "/etc/nginx/conf.d/default.conf.bak.${BACKUP_SUFFIX}"
  fi

  cat > "$NGINX_SITE" <<EOF
server {
    listen 80 default_server;
    server_name _;
    client_max_body_size 100m;

    root $FRONTEND_DIR/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

  nginx -t
  systemctl enable nginx
  systemctl restart nginx
}

cleanup_legacy_takepanel() {
  systemctl disable --now takepanel >/dev/null 2>&1 || true
  if [[ -f "$OLD_TAKEPANEL_SERVICE" ]]; then
    mv "$OLD_TAKEPANEL_SERVICE" "${OLD_TAKEPANEL_SERVICE}.bak.${BACKUP_SUFFIX}"
  fi
}

start_services() {
  local pg_service redis_service
  pg_service="$(detect_service_unit postgresql.service postgresql@.service)"
  redis_service="$(detect_service_unit redis-server.service redis.service)"
  systemctl enable --now "$pg_service" || true
  systemctl enable --now "$redis_service" || true
  systemctl restart hostmaster-backend
  systemctl restart hostmaster-worker
  systemctl restart hostmaster-agent
}

validate_install() {
  for _ in $(seq 1 30); do
    if curl -fsS "http://127.0.0.1:$BACKEND_PORT/api/health" >/dev/null 2>&1 && curl -fsS http://127.0.0.1/ >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done

  journalctl -u hostmaster-backend -n 40 --no-pager || true
  journalctl -u nginx -n 40 --no-pager || true
  echo "HostMaster validation failed. Check hostmaster-backend and nginx logs."
  exit 1
}

main() {
  local pm
  pm="$(detect_pkg_manager)"
  if [[ -z "$pm" ]]; then
    echo "Unsupported OS package manager. Use apt or dnf."
    exit 1
  fi

  log "Installing dependencies via $pm"
  if [[ "$pm" == "apt" ]]; then
    setup_apt
  else
    setup_dnf
  fi

  if ! command -v node >/dev/null 2>&1; then
    echo "Node.js installation failed."
    exit 1
  fi
  local node_major
  node_major="$(node -v | sed 's/^v//' | cut -d. -f1)"
  if [[ "${node_major:-0}" -lt 20 ]]; then
    echo "Node.js 20+ is required."
    exit 1
  fi

  ensure_system_user
  cleanup_legacy_takepanel
  clone_or_update_repo
  install_node_dependencies
  write_env_files
  initialize_postgresql
  configure_postgresql_auth
  install_sudoers
  build_backend_and_frontend
  install_systemd_units
  configure_nginx
  start_services
  validate_install

  log "Installation completed"
  echo "Panel URL: http://$SERVER_IP"
  echo "Admin login: admin@hostmaster.local"
  echo "Admin password: ChangeMe123!"
  echo "Backend service: systemctl status hostmaster-backend --no-pager -l"
  echo "Worker service: systemctl status hostmaster-worker --no-pager -l"
  echo "Agent service: systemctl status hostmaster-agent --no-pager -l"
}

main "$@"
