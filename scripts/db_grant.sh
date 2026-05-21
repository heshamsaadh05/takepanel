#!/usr/bin/env bash
set -euo pipefail

DB_ADMIN_USER="${1:-root}"
DB_ADMIN_PASSWORD="${2:-}"
DB_NAME="${3:-}"
DB_USER="${4:-}"
DB_HOST="${5:-%}"
PRIVILEGES="${6:-ALL PRIVILEGES}"

if [[ -z "$DB_NAME" || -z "$DB_USER" ]]; then
  echo "Usage: db_grant.sh <admin_user> <admin_password> <db_name> <db_user> [db_host] [privileges]"
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

"${MYSQL_CMD[@]}" -e "GRANT $PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'$DB_HOST'; FLUSH PRIVILEGES;"
echo "Granted $PRIVILEGES on $DB_NAME to $DB_USER@$DB_HOST"
