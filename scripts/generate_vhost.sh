#!/usr/bin/env bash
set -euo pipefail

SERVER_TYPE="${1:-}"
DOMAIN="${2:-}"
WEB_ROOT="${3:-}"

if [[ -z "$SERVER_TYPE" || -z "$DOMAIN" || -z "$WEB_ROOT" ]]; then
  echo "Usage: generate_vhost.sh <nginx|apache> <domain> <web_root>"
  exit 1
fi

if [[ "$SERVER_TYPE" == "nginx" ]]; then
  if [[ -d /etc/nginx/conf.d ]]; then
    OUT_FILE="/etc/nginx/conf.d/$DOMAIN.conf"
    ENABLE_LINK=""
  else
    mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
    OUT_FILE="/etc/nginx/sites-available/$DOMAIN.conf"
    ENABLE_LINK="/etc/nginx/sites-enabled/$DOMAIN.conf"
  fi
  mkdir -p "$(dirname "$OUT_FILE")"
  cat > "$OUT_FILE" <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    root $WEB_ROOT;
    index index.html index.php;

    location / {
        try_files \$uri \$uri/ =404;
    }
}
EOF
  if [[ -n "${ENABLE_LINK:-}" ]]; then
    ln -sf "$OUT_FILE" "$ENABLE_LINK"
  fi
  if command -v nginx >/dev/null 2>&1; then
    nginx -t
    systemctl reload nginx || true
  fi
  echo "Generated Nginx vhost: $OUT_FILE"
elif [[ "$SERVER_TYPE" == "apache" ]]; then
  OUT_FILE="/etc/httpd/conf.d/$DOMAIN.conf"
  mkdir -p "$(dirname "$OUT_FILE")"
  cat > "$OUT_FILE" <<EOF
<VirtualHost *:80>
    ServerName $DOMAIN
    ServerAlias www.$DOMAIN
    DocumentRoot $WEB_ROOT
    <Directory $WEB_ROOT>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
EOF
  if command -v httpd >/dev/null 2>&1; then
    httpd -t
    systemctl reload httpd || true
  elif command -v apache2ctl >/dev/null 2>&1; then
    apache2ctl -t
    systemctl reload apache2 || true
  fi
  echo "Generated Apache vhost: $OUT_FILE"
else
  echo "Unsupported server type: $SERVER_TYPE"
  exit 1
fi
