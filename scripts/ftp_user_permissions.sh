#!/usr/bin/env bash
set -euo pipefail

USERNAME="${1:-}"
HOME_DIR="${2:-}"
PERMISSIONS="${3:-rw}"

if [[ -z "$USERNAME" || -z "$HOME_DIR" ]]; then
  echo "Usage: ftp_user_permissions.sh <username> <home_dir> <r|rw>"
  exit 1
fi

mkdir -p "$HOME_DIR"
chown -R "$USERNAME":"$USERNAME" "$HOME_DIR"

if [[ "$PERMISSIONS" == "rw" ]]; then
  chmod -R 750 "$HOME_DIR"
else
  chmod -R 550 "$HOME_DIR"
fi

echo "Permissions updated for $USERNAME"
