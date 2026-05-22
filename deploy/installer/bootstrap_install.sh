#!/usr/bin/env bash
set -euo pipefail

# HostMaster one-shot bootstrap installer.
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/heshamsaadh05/takepanel/main/deploy/installer/bootstrap_install.sh | sudo bash

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root: curl ... | sudo bash"
  exit 1
fi

REPO_URL="https://github.com/heshamsaadh05/takepanel.git"
RAW_BASE="https://raw.githubusercontent.com/heshamsaadh05/takepanel/main"
INSTALLER_URL="$RAW_BASE/deploy/installer/install_hostmaster.sh"
TMP_DIR="$(mktemp -d)"
TMP_SCRIPT="$TMP_DIR/install_hostmaster.sh"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

log() { echo "[HostMaster Bootstrap] $*"; }

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required to download the installer."
  exit 1
fi

log "Downloading official installer from $REPO_URL"
curl -fsSL "$INSTALLER_URL" -o "$TMP_SCRIPT"
chmod 0755 "$TMP_SCRIPT"

log "Starting unattended installation"
bash "$TMP_SCRIPT"
