#!/usr/bin/env bash
set -euo pipefail

USERNAME="${1:-}"
PROTOCOL="${2:-vsftpd}"
HOME_DIR="${3:-}"

if [[ -z "$USERNAME" || -z "$HOME_DIR" ]]; then
  echo "Usage: ftp_user_delete.sh <username> <vsftpd|proftpd|openssh-sftp> <home_dir>"
  exit 1
fi

if id "$USERNAME" >/dev/null 2>&1; then
  userdel "$USERNAME" || true
fi

rm -rf "$HOME_DIR"

if [[ "$PROTOCOL" == "vsftpd" ]]; then
  if [[ -f /etc/vsftpd/userlist ]]; then
    grep -vxF "$USERNAME" /etc/vsftpd/userlist > /tmp/vsftpd_userlist.tmp || true
    mv /tmp/vsftpd_userlist.tmp /etc/vsftpd/userlist
  fi
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
