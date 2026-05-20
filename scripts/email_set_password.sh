#!/usr/bin/env bash
set -euo pipefail

MAIL_DOMAIN="${1:-}"
LOCAL_PART="${2:-}"
NEW_PASSWORD="${3:-}"

if [[ -z "$MAIL_DOMAIN" || -z "$LOCAL_PART" || -z "$NEW_PASSWORD" ]]; then
  echo "Usage: email_set_password.sh <domain> <local_part> <new_password>"
  exit 1
fi

EMAIL="$LOCAL_PART@$MAIL_DOMAIN"
PASS_HASH=$(doveadm pw -s SHA512-CRYPT -p "$NEW_PASSWORD")

awk -F'|' -v target="$EMAIL" -v newhash="$PASS_HASH" 'BEGIN{OFS="|"} {if($1==target){$2=newhash} print}' /etc/postfix/virtual_mailboxes > /tmp/virtual_mailboxes.tmp
mv /tmp/virtual_mailboxes.tmp /etc/postfix/virtual_mailboxes

postmap /etc/postfix/virtual_mailboxes || true
systemctl reload postfix || true
systemctl reload dovecot || true

echo "Email password updated: $EMAIL"
