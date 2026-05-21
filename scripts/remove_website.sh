#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-}"
WEB_ROOT="${2:-}"

if [[ -z "$DOMAIN" || -z "$WEB_ROOT" ]]; then
  echo "Usage: remove_website.sh <domain> <web_root>"
  exit 1
fi

rm -rf "$(dirname "$WEB_ROOT")"
rm -f "/etc/nginx/conf.d/$DOMAIN.conf" "/etc/nginx/sites-available/$DOMAIN.conf" "/etc/nginx/sites-enabled/$DOMAIN.conf"
rm -f "/etc/httpd/conf.d/$DOMAIN.conf"

if command -v nginx >/dev/null 2>&1; then
  systemctl reload nginx || true
fi
if command -v httpd >/dev/null 2>&1; then
  systemctl reload httpd || true
elif command -v apache2ctl >/dev/null 2>&1; then
  systemctl reload apache2 || true
fi

echo "Website removed: $DOMAIN"
