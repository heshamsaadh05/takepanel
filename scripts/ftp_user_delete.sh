#!/usr/bin/env bash
set -euo pipefail

USERNAME="${1:-}"
PROTOCOL="${2:-vsftpd}"
HOME_DIR="${3:-}"
VSFTPD_LIST_PRIMARY="/etc/vsftpd/user_list"
VSFTPD_LIST_LEGACY="/etc/vsftpd/userlist"

if [[ -z "$USERNAME" || -z "$HOME_DIR" ]]; then
  echo "Usage: ftp_user_delete.sh <username> <vsftpd|proftpd|openssh-sftp> <home_dir>"
  exit 1
fi

if id "$USERNAME" >/dev/null 2>&1; then
  userdel "$USERNAME" || true
fi

rm -rf "$HOME_DIR"

if [[ "$PROTOCOL" == "vsftpd" ]]; then
  mkdir -p /etc/vsftpd
  touch "$VSFTPD_LIST_PRIMARY" "$VSFTPD_LIST_LEGACY"
  for list_file in "$VSFTPD_LIST_PRIMARY" "$VSFTPD_LIST_LEGACY"; do
    grep -vxF "$USERNAME" "$list_file" > /tmp/vsftpd_userlist.tmp || true
    mv /tmp/vsftpd_userlist.tmp "$list_file"
  done
  systemctl reload vsftpd || true
elif [[ "$PROTOCOL" == "proftpd" ]]; then
  systemctl reload proftpd || true
elif [[ "$PROTOCOL" == "openssh-sftp" ]]; then
  systemctl reload sshd || systemctl reload ssh || true
else
  echo "Unsupported protocol: $PROTOCOL"
  exit 1
fi

echo "FTP/SFTP account deleted: $USERNAME ($PROTOCOL)"
