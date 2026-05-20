#!/usr/bin/env bash
set -euo pipefail

MAIL_DOMAIN="${1:-}"
LOCAL_PART="${2:-}"
MAIL_BASE_DIR="${MAIL_BASE_DIR:-/var/mail/vhosts}"

if [[ -z "$MAIL_DOMAIN" || -z "$LOCAL_PART" ]]; then
  echo "Usage: email_delete.sh <domain> <local_part>"
  exit 1
fi

EMAIL="$LOCAL_PART@$MAIL_DOMAIN"
MAILDIR="$MAIL_BASE_DIR/$MAIL_DOMAIN/$LOCAL_PART"

if [[ -f /etc/postfix/virtual_mailboxes ]]; then
  grep -v "^$EMAIL|" /etc/postfix/virtual_mailboxes > /tmp/virtual_mailboxes.tmp || true
  mv /tmp/virtual_mailboxes.tmp /etc/postfix/virtual_mailboxes
fi

rm -rf "$MAILDIR"
postmap /etc/postfix/virtual_mailboxes || true
systemctl reload postfix || true
systemctl reload dovecot || true

echo "Email account deleted: $EMAIL"
