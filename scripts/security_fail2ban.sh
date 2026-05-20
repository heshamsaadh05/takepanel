#!/usr/bin/env bash
set -euo pipefail

cat > /etc/fail2ban/jail.d/takepanel.local <<EOF
[sshd]
enabled = true
maxretry = 5
findtime = 10m
bantime = 1h
EOF

systemctl restart fail2ban
systemctl enable fail2ban

echo "FAIL2BAN_APPLIED=1"
