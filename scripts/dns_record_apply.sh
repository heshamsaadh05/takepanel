#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-add}"
PROVIDER="${2:-bind}"
DOMAIN="${3:-}"
NAME="${4:-}"
TYPE="${5:-}"
VALUE="${6:-}"
TTL="${7:-3600}"
PRIORITY="${8:-}"

if [[ -z "$DOMAIN" || -z "$NAME" || -z "$TYPE" ]]; then
  echo "Usage: dns_record_apply.sh <add|delete|update> <bind|powerdns> <domain> <name> <type> <value> [ttl] [priority]"
  exit 1
fi

if [[ "$PROVIDER" == "bind" ]]; then
  ZONE_FILE="/var/named/${DOMAIN}.zone"
  [[ -f "$ZONE_FILE" ]] || { echo "Zone file missing"; exit 1; }

  FQDN="$NAME"
  [[ "$NAME" == "@" ]] || FQDN="$NAME.$DOMAIN."

  RECORD_LINE="$FQDN $TTL IN $TYPE"
  if [[ "$TYPE" == "MX" && -n "$PRIORITY" ]]; then
    RECORD_LINE="$RECORD_LINE $PRIORITY $VALUE"
  else
    RECORD_LINE="$RECORD_LINE $VALUE"
  fi

  if [[ "$ACTION" == "add" ]]; then
    echo "$RECORD_LINE" >> "$ZONE_FILE"
  elif [[ "$ACTION" == "delete" ]]; then
    grep -v -F "$RECORD_LINE" "$ZONE_FILE" > /tmp/${DOMAIN}.zone.tmp || true
    mv /tmp/${DOMAIN}.zone.tmp "$ZONE_FILE"
  elif [[ "$ACTION" == "update" ]]; then
    grep -v -E "^$FQDN[[:space:]]+[0-9]+[[:space:]]+IN[[:space:]]+$TYPE[[:space:]]+" "$ZONE_FILE" > /tmp/${DOMAIN}.zone.tmp || true
    echo "$RECORD_LINE" >> /tmp/${DOMAIN}.zone.tmp
    mv /tmp/${DOMAIN}.zone.tmp "$ZONE_FILE"
  else
    echo "Invalid action"
    exit 1
  fi

  named-checkzone "$DOMAIN" "$ZONE_FILE"
  systemctl reload named || systemctl reload bind9
elif [[ "$PROVIDER" == "powerdns" ]]; then
  CONTENT="$VALUE"
  [[ "$TYPE" == "MX" && -n "$PRIORITY" ]] && CONTENT="$PRIORITY $VALUE"

  if [[ "$ACTION" == "add" || "$ACTION" == "update" ]]; then
    pdnsutil replace-rrset "$DOMAIN" "$NAME" "$TYPE" "$TTL" "$CONTENT"
  elif [[ "$ACTION" == "delete" ]]; then
    pdnsutil delete-rrset "$DOMAIN" "$NAME" "$TYPE"
  else
    echo "Invalid action"
    exit 1
  fi
  pdns_control reload
else
  echo "Unsupported provider: $PROVIDER"
  exit 1
fi

echo "DNS record $ACTION applied for $NAME.$DOMAIN ($TYPE)"
