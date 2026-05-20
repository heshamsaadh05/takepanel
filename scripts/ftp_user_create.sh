#!/usr/bin/env bash
set -euo pipefail

USERNAME="${1:-}"
PASSWORD="${2:-}"
PROTOCOL="${3:-vsftpd}"
HOME_DIR="${4:-}"
PERMISSIONS="${5:-rw}"

if [[ -z "$USERNAME" || -z "$PASSWORD" || -z "$HOME_DIR" ]]; then
  echo "Usage: ftp_user_create.sh <username> <password> <vsftpd|proftpd|openssh-sftp> <home_dir> [r|rw]"
  exit 1
fi

# Create a system account used by FTP/SFTP daemons.
if ! id "$USERNAME" >/dev/null 2>&1; then
  useradd -m -d "$HOME_DIR" -s /sbin/nologin "$USERNAME"
fi

echo "$USERNAME:$PASSWORD" | chpasswd
mkdir -p "$HOME_DIR"
chown -R "$USERNAME":"$USERNAME" "$HOME_DIR"

if [[ "$PERMISSIONS" == "rw" ]]; then
  chmod -R 750 "$HOME_DIR"
else
  chmod -R 550 "$HOME_DIR"
fi

if [[ "$PROTOCOL" == "vsftpd" ]]; then
  grep -qxF "$USERNAME" /etc/vsftpd/userlist || echo "$USERNAME" >> /etc/vsftpd/userlist
  systemctl reload vsftpd || true
elif [[ "$PROTOCOL" == "proftpd" ]]; then
  systemctl reload proftpd || true
elif [[ "$PROTOCOL" == "openssh-sftp" ]]; then
  systemctl reload sshd || systemctl reload ssh || true
else
  echo "Unsupported protocol: $PROTOCOL"
  exit 1
fi

echo "FTP/SFTP account created: $USERNAME ($PROTOCOL)"
