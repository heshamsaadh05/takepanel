#!/usr/bin/env bash
set -euo pipefail

MAIL_DOMAIN="${1:-}"
LOCAL_PART="${2:-}"
ENABLED="${3:-1}"

if [[ -z "$MAIL_DOMAIN" || -z "$LOCAL_PART" ]]; then
  echo "Usage: email_set_status.sh <domain> <local_part> <1|0>"
  exit 1
fi

EMAIL="$LOCAL_PART@$MAIL_DOMAIN"

if [[ ! -f /etc/postfix/virtual_mailboxes ]]; then
  echo "Mail account map missing"
  exit 1
fi

awk -F'|' -v target="$EMAIL" -v status="$ENABLED" 'BEGIN{OFS="|"} {if($1==target){$4=status} print}' /etc/postfix/virtual_mailboxes > /tmp/virtual_mailboxes.tmp
mv /tmp/virtual_mailboxes.tmp /etc/postfix/virtual_mailboxes

postmap /etc/postfix/virtual_mailboxes || true
systemctl reload postfix || true
systemctl reload dovecot || true

echo "Email account status updated: $EMAIL => $ENABLED"
