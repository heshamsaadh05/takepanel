#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"

if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
  echo "Usage: security_ssl_setup.sh <domain> <email>"
  exit 1
fi

certbot --non-interactive --agree-tos --email "$EMAIL" --nginx -d "$DOMAIN" -d "www.$DOMAIN"

echo "SSL_SETUP_DONE=1"
