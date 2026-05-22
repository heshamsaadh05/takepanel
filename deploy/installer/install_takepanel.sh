#!/usr/bin/env bash
set -euo pipefail

# Compatibility wrapper for older links.
# The real installer is now install_hostmaster.sh.

RAW_URL="https://raw.githubusercontent.com/heshamsaadh05/takepanel/main/deploy/installer/install_hostmaster.sh"
TMP_SCRIPT="$(mktemp -t hostmaster-install-XXXXXX.sh)"

cleanup() {
  rm -f "$TMP_SCRIPT"
}
trap cleanup EXIT

curl -fsSL "$RAW_URL" -o "$TMP_SCRIPT"
chmod 0755 "$TMP_SCRIPT"
bash "$TMP_SCRIPT" "$@"
