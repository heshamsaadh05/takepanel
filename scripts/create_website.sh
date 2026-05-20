#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-}"
WEB_ROOT="${2:-}"
WEB_USER="${WEB_USER:-www-data}"
WEB_GROUP="${WEB_GROUP:-www-data}"

if [[ -z "$DOMAIN" || -z "$WEB_ROOT" ]]; then
  echo "Usage: create_website.sh <domain> <web_root>"
  exit 1
fi

mkdir -p "$WEB_ROOT"
mkdir -p "$(dirname "$WEB_ROOT")/logs"

if [[ ! -f "$WEB_ROOT/index.html" ]]; then
  cat > "$WEB_ROOT/index.html" <<EOF
<!doctype html>
<html><head><title>$DOMAIN</title></head><body><h1>$DOMAIN is ready</h1></body></html>
EOF
fi

bash "$(dirname "$0")/set_permissions.sh" "$WEB_ROOT" "$WEB_USER" "$WEB_GROUP"
echo "Website provisioned for $DOMAIN at $WEB_ROOT"
