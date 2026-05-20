#!/usr/bin/env bash
set -euo pipefail

BACKUP_PATH="${1:-}"
WEB_ROOT_BASE="${WEB_ROOT_BASE:-/var/www}"
MAIL_BASE_DIR="${MAIL_BASE_DIR:-/var/mail/vhosts}"
MYSQL_USER="${DB_ADMIN_USER:-root}"
MYSQL_PASS="${DB_ADMIN_PASSWORD:-}"

if [[ -z "$BACKUP_PATH" || ! -f "$BACKUP_PATH" ]]; then
  echo "Usage: backup_restore.sh <backup_archive_path>"
  exit 1
fi

TMP_DIR="$(mktemp -d)"
tar -xzf "$BACKUP_PATH" -C "$TMP_DIR"

if [[ -d "$TMP_DIR/web" ]]; then
  mkdir -p "$WEB_ROOT_BASE"
  cp -a "$TMP_DIR/web/." "$WEB_ROOT_BASE/"
fi

if [[ -f "$TMP_DIR/db/all_databases.sql" ]]; then
  MYSQL_CMD=(mysql -u"$MYSQL_USER")
  if [[ -n "$MYSQL_PASS" ]]; then
    MYSQL_CMD+=( -p"$MYSQL_PASS" )
  fi
  "${MYSQL_CMD[@]}" < "$TMP_DIR/db/all_databases.sql" || true
fi

if [[ -d "$TMP_DIR/mail" ]]; then
  mkdir -p "$MAIL_BASE_DIR"
  cp -a "$TMP_DIR/mail/." "$MAIL_BASE_DIR/"
fi

rm -rf "$TMP_DIR"
echo "RESTORE_COMPLETED=1"
