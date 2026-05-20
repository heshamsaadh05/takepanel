#!/usr/bin/env bash
set -euo pipefail

DB_ADMIN_USER="${1:-root}"
DB_ADMIN_PASSWORD="${2:-}"
DB_USER="${3:-}"
DB_HOST="${4:-%}"

if [[ -z "$DB_USER" ]]; then
  echo "Usage: db_user_delete.sh <admin_user> <admin_password> <db_user> [db_host]"
  exit 1
fi

MYSQL_CMD=(mysql -u"$DB_ADMIN_USER")
if [[ -n "$DB_ADMIN_PASSWORD" ]]; then
  MYSQL_CMD+=( -p"$DB_ADMIN_PASSWORD" )
fi

"${MYSQL_CMD[@]}" -e "DROP USER IF EXISTS '$DB_USER'@'$DB_HOST'; FLUSH PRIVILEGES;"
echo "DB user deleted: $DB_USER@$DB_HOST"
