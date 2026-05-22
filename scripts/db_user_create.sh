#!/usr/bin/env bash
set -euo pipefail

DB_ADMIN_USER="${1:-root}"
DB_ADMIN_PASSWORD="${2:-}"
DB_USER="${3:-}"
DB_PASS="${4:-}"
DB_HOST="${5:-%}"

if [[ -z "$DB_USER" || -z "$DB_PASS" ]]; then
  echo "Usage: db_user_create.sh <admin_user> <admin_password> <db_user> <db_pass> [db_host]"
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

"${MYSQL_CMD[@]}" -e "CREATE USER IF NOT EXISTS '$DB_USER'@'$DB_HOST' IDENTIFIED BY '$DB_PASS'; FLUSH PRIVILEGES;"
echo "DB user created: $DB_USER@$DB_HOST"
