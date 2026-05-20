#!/usr/bin/env bash
set -euo pipefail

PROVIDER="${1:-bind}"
DOMAIN="${2:-}"

if [[ -z "$DOMAIN" ]]; then
  echo "Usage: dns_zone_delete.sh <bind|powerdns> <domain>"
  exit 1
fi

if [[ "$PROVIDER" == "bind" ]]; then
  ZONE_FILE="/var/named/${DOMAIN}.zone"
  rm -f "$ZONE_FILE"
  if [[ -f /etc/named/takepanel-zones.conf ]]; then
    grep -v "zone \"$DOMAIN\"" /etc/named/takepanel-zones.conf > /tmp/takepanel-zones.conf.tmp || true
    mv /tmp/takepanel-zones.conf.tmp /etc/named/takepanel-zones.conf
  fi
  systemctl reload named || systemctl reload bind9
elif [[ "$PROVIDER" == "powerdns" ]]; then
  pdnsutil delete-zone "$DOMAIN"
  pdns_control reload
else
  echo "Unsupported provider: $PROVIDER"
  exit 1
fi

echo "DNS zone deleted: $DOMAIN ($PROVIDER)"
