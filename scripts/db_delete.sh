#!/usr/bin/env bash
set -euo pipefail

ENGINE="${1:-mysql}"
DB_ADMIN_USER="${2:-root}"
DB_ADMIN_PASSWORD="${3:-}"
DB_NAME="${4:-}"

if [[ -z "$DB_NAME" ]]; then
  echo "Usage: db_delete.sh <mysql|mariadb> <admin_user> <admin_password> <db_name>"
  exit 1
fi

if ! command -v mysql >/dev/null 2>&1; then
  echo "mysql_client_missing"
  exit 1
fi

MYSQL_CMD=(mysql -u"$DB_ADMIN_USER")
if [[ -n "$DB_ADMIN_PASSWORD" ]]; then
  MYSQL_CMD+=( -p"$DB_ADMIN_PASSWORD" )
fi

"${MYSQL_CMD[@]}" -e "DROP DATABASE IF EXISTS \`$DB_NAME\`;"
echo "Database deleted: $DB_NAME ($ENGINE)"
