#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="/opt/takepanel"
SCRIPT_NAME="${1:-}"

if [[ -z "$SCRIPT_NAME" ]]; then
  echo "Usage: takepanel-script-runner.sh <script-name> [args...]"
  exit 1
fi

shift || true

case "$SCRIPT_NAME" in
  backup_restore.sh|backup_run.sh|backup_schedule.sh|create_website.sh|db_create.sh|db_delete.sh|db_grant.sh|db_user_create.sh|db_user_delete.sh|dns_record_apply.sh|dns_zone_create.sh|dns_zone_delete.sh|email_create.sh|email_delete.sh|email_set_password.sh|email_set_status.sh|ftp_user_create.sh|ftp_user_delete.sh|ftp_user_permissions.sh|generate_vhost.sh|monitor_metrics.sh|remove_website.sh|security_fail2ban.sh|security_firewall.sh|security_ssl_setup.sh|set_permissions.sh)
    ;;
  *)
    echo "Unsupported TakePanel script: $SCRIPT_NAME"
    exit 1
    ;;
esac

SCRIPT_PATH="$INSTALL_DIR/scripts/$SCRIPT_NAME"
if [[ ! -f "$SCRIPT_PATH" ]]; then
  echo "Script not found: $SCRIPT_PATH"
  exit 1
fi

exec /bin/bash "$SCRIPT_PATH" "$@"
