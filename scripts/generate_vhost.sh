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
  OUT_FILE="/etc/nginx/sites-available/$DOMAIN.conf"
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
  ln -sf "$OUT_FILE" "/etc/nginx/sites-enabled/$DOMAIN.conf"
  echo "Generated Nginx vhost: $OUT_FILE"
elif [[ "$SERVER_TYPE" == "apache" ]]; then
  OUT_FILE="/etc/httpd/conf.d/$DOMAIN.conf"
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
  echo "Generated Apache vhost: $OUT_FILE"
else
  echo "Unsupported server type: $SERVER_TYPE"
  exit 1
fi
