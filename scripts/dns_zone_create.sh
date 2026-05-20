#!/usr/bin/env bash
set -euo pipefail

PROVIDER="${1:-bind}"
DOMAIN="${2:-}"

if [[ -z "$DOMAIN" ]]; then
  echo "Usage: dns_zone_create.sh <bind|powerdns> <domain>"
  exit 1
fi

if [[ "$PROVIDER" == "bind" ]]; then
  ZONE_FILE="/var/named/${DOMAIN}.zone"
  cat > "$ZONE_FILE" <<EOF
$TTL 3600
@ IN SOA ns1.$DOMAIN. admin.$DOMAIN. (
  2026010101
  3600
  1800
  604800
  86400
)
@ IN NS ns1.$DOMAIN.
@ IN A 127.0.0.1
ns1 IN A 127.0.0.1
EOF
  echo "zone \"$DOMAIN\" { type master; file \"$ZONE_FILE\"; };" >> /etc/named/takepanel-zones.conf
  named-checkzone "$DOMAIN" "$ZONE_FILE"
  systemctl reload named || systemctl reload bind9
elif [[ "$PROVIDER" == "powerdns" ]]; then
  pdnsutil create-zone "$DOMAIN"
  pdns_control reload
else
  echo "Unsupported provider: $PROVIDER"
  exit 1
fi

echo "DNS zone created: $DOMAIN ($PROVIDER)"
