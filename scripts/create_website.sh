#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-}"
WEB_ROOT="${2:-}"

detect_web_identity() {
  if [[ -n "${WEB_USER:-}" && -n "${WEB_GROUP:-}" ]]; then
    return
  fi

  if id apache >/dev/null 2>&1; then
    WEB_USER="${WEB_USER:-apache}"
    WEB_GROUP="${WEB_GROUP:-apache}"
    return
  fi

  if id nginx >/dev/null 2>&1; then
    WEB_USER="${WEB_USER:-nginx}"
    WEB_GROUP="${WEB_GROUP:-nginx}"
    return
  fi

  if id www-data >/dev/null 2>&1; then
    WEB_USER="${WEB_USER:-www-data}"
    WEB_GROUP="${WEB_GROUP:-www-data}"
    return
  fi

  WEB_USER="${WEB_USER:-root}"
  WEB_GROUP="${WEB_GROUP:-root}"
}

if [[ -z "$DOMAIN" || -z "$WEB_ROOT" ]]; then
  echo "Usage: create_website.sh <domain> <web_root>"
  exit 1
fi

detect_web_identity

mkdir -p "$WEB_ROOT"
mkdir -p "$(dirname "$WEB_ROOT")/logs"

if [[ ! -f "$WEB_ROOT/index.html" ]]; then
  cat > "$WEB_ROOT/index.html" <<EOF
<!doctype html>
<html><head><title>$DOMAIN</title></head><body><h1>$DOMAIN is ready</h1></body></html>
EOF
fi

bash "$(dirname "$0")/set_permissions.sh" "$WEB_ROOT" "$WEB_USER" "$WEB_GROUP"
chmod 755 "$(dirname "$WEB_ROOT")"
echo "Website provisioned for $DOMAIN at $WEB_ROOT"
