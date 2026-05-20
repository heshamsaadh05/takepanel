#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-}"
WEB_ROOT="${2:-}"

if [[ -z "$DOMAIN" || -z "$WEB_ROOT" ]]; then
  echo "Usage: remove_website.sh <domain> <web_root>"
  exit 1
fi

rm -rf "$(dirname "$WEB_ROOT")"
rm -f "/etc/nginx/sites-available/$DOMAIN.conf" "/etc/nginx/sites-enabled/$DOMAIN.conf"
rm -f "/etc/httpd/conf.d/$DOMAIN.conf"

echo "Website removed: $DOMAIN"
