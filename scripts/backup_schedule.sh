#!/usr/bin/env bash
set -euo pipefail

CRON_EXPR="${1:-}"
SCRIPT_PATH="${2:-}"

if [[ -z "$CRON_EXPR" || -z "$SCRIPT_PATH" ]]; then
  echo "Usage: backup_schedule.sh \"<cron_expression>\" <script_path>"
  exit 1
fi

TMP_FILE="$(mktemp)"
crontab -l > "$TMP_FILE" 2>/dev/null || true

grep -v "# TAKEPANEL_BACKUP_JOB" "$TMP_FILE" | grep -v "$SCRIPT_PATH" > "${TMP_FILE}.clean" || true
mv "${TMP_FILE}.clean" "$TMP_FILE"

echo "$CRON_EXPR $SCRIPT_PATH # TAKEPANEL_BACKUP_JOB" >> "$TMP_FILE"
crontab "$TMP_FILE"
rm -f "$TMP_FILE"

echo "BACKUP_SCHEDULE_UPDATED=1"
