#!/usr/bin/env bash
set -euo pipefail

TARGET_PATH="${1:-}"
OWNER="${2:-www-data}"
GROUP="${3:-www-data}"

if [[ -z "$TARGET_PATH" ]]; then
  echo "Usage: set_permissions.sh <path> [owner] [group]"
  exit 1
fi

chown -R "$OWNER":"$GROUP" "$TARGET_PATH"
find "$TARGET_PATH" -type d -exec chmod 755 {} \;
find "$TARGET_PATH" -type f -exec chmod 644 {} \;

echo "Permissions applied to $TARGET_PATH"
