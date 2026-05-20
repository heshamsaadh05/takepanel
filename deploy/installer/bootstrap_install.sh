#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"
REPO_URL="${3:-}"

if [[ -z "$DOMAIN" || -z "$EMAIL" || -z "$REPO_URL" ]]; then
  echo "Usage: bash <(curl -fsSL <raw_script_url>) <domain> <email> <repo_url>"
  exit 1
fi

TMP_SCRIPT="/tmp/takepanel_install_$(date +%s).sh"
curl -fsSL "$REPO_URL/raw/main/deploy/installer/install_takepanel.sh" -o "$TMP_SCRIPT"
bash "$TMP_SCRIPT" "$DOMAIN" "$EMAIL" "$REPO_URL"
