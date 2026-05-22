#!/usr/bin/env bash
set -euo pipefail

ENGINE="${1:-mysql}"
DB_ADMIN_USER="${2:-root}"
DB_ADMIN_PASSWORD="${3:-}"
DB_NAME="${4:-}"

if [[ -z "$DB_NAME" ]]; then
  echo "Usage: db_create.sh <mysql|mariadb> <admin_user> <admin_password> <db_name>"
  exit 1
fi

DB_CLIENT=""
if command -v mysql >/dev/null 2>&1; then
  DB_CLIENT="mysql"
elif command -v mariadb >/dev/null 2>&1; then
  DB_CLIENT="mariadb"
fi

if [[ -z "$DB_CLIENT" ]]; then
  echo "database_client_missing"
  exit 1
fi

MYSQL_CMD=("$DB_CLIENT" -u"$DB_ADMIN_USER")
if [[ -n "$DB_ADMIN_PASSWORD" ]]; then
  MYSQL_CMD+=( -p"$DB_ADMIN_PASSWORD" )
fi

"${MYSQL_CMD[@]}" -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
echo "Database created: $DB_NAME ($ENGINE)"
