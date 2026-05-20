#!/usr/bin/env bash
set -euo pipefail

BACKUP_BASE_DIR="${BACKUP_BASE_DIR:-/var/backups/takepanel}"
WEB_ROOT_BASE="${WEB_ROOT_BASE:-/var/www}"
MAIL_BASE_DIR="${MAIL_BASE_DIR:-/var/mail/vhosts}"
MYSQL_USER="${DB_ADMIN_USER:-root}"
MYSQL_PASS="${DB_ADMIN_PASSWORD:-}"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_NAME="takepanel_full_${STAMP}.tar.gz"
WORK_DIR="${BACKUP_BASE_DIR}/work_${STAMP}"
OUTPUT_PATH="${BACKUP_BASE_DIR}/${BACKUP_NAME}"

mkdir -p "$BACKUP_BASE_DIR" "$WORK_DIR/web" "$WORK_DIR/db" "$WORK_DIR/mail"

if [[ -d "$WEB_ROOT_BASE" ]]; then
  cp -a "$WEB_ROOT_BASE/." "$WORK_DIR/web/" || true
fi

MYSQL_CMD=(mysql -u"$MYSQL_USER")
MYSQLDUMP_CMD=(mysqldump -u"$MYSQL_USER" --all-databases --single-transaction)
if [[ -n "$MYSQL_PASS" ]]; then
  MYSQL_CMD+=( -p"$MYSQL_PASS" )
  MYSQLDUMP_CMD+=( -p"$MYSQL_PASS" )
fi

"${MYSQLDUMP_CMD[@]}" > "$WORK_DIR/db/all_databases.sql" || true

if [[ -d "$MAIL_BASE_DIR" ]]; then
  cp -a "$MAIL_BASE_DIR/." "$WORK_DIR/mail/" || true
fi

tar -czf "$OUTPUT_PATH" -C "$WORK_DIR" .
SIZE_BYTES=$(stat -c%s "$OUTPUT_PATH" 2>/dev/null || wc -c < "$OUTPUT_PATH")
rm -rf "$WORK_DIR"

echo "BACKUP_NAME=$BACKUP_NAME"
echo "BACKUP_PATH=$OUTPUT_PATH"
echo "SIZE_BYTES=$SIZE_BYTES"
