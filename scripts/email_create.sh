#!/usr/bin/env bash
set -euo pipefail

MAIL_DOMAIN="${1:-}"
LOCAL_PART="${2:-}"
PASSWORD="${3:-}"
MAIL_BASE_DIR="${MAIL_BASE_DIR:-/var/mail/vhosts}"
VMAIL_USER="${VMAIL_USER:-vmail}"
VMAIL_GROUP="${VMAIL_GROUP:-vmail}"

if [[ -z "$MAIL_DOMAIN" || -z "$LOCAL_PART" || -z "$PASSWORD" ]]; then
  echo "Usage: email_create.sh <domain> <local_part> <password>"
  exit 1
fi

EMAIL="$LOCAL_PART@$MAIL_DOMAIN"
MAILDIR="$MAIL_BASE_DIR/$MAIL_DOMAIN/$LOCAL_PART"

mkdir -p "$MAILDIR/Maildir"/{cur,new,tmp}
chown -R "$VMAIL_USER":"$VMAIL_GROUP" "$MAIL_BASE_DIR/$MAIL_DOMAIN"
chmod -R 770 "$MAIL_BASE_DIR/$MAIL_DOMAIN"

PASS_HASH=$(doveadm pw -s SHA512-CRYPT -p "$PASSWORD")

echo "$EMAIL|$PASS_HASH|$MAILDIR|1" >> /etc/postfix/virtual_mailboxes
sort -u /etc/postfix/virtual_mailboxes -o /etc/postfix/virtual_mailboxes

postmap /etc/postfix/virtual_mailboxes || true
systemctl reload postfix || true
systemctl reload dovecot || true

echo "Email account created: $EMAIL"
