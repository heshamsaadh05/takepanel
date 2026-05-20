#!/usr/bin/env bash
set -euo pipefail

# Linux-only metrics collection script.
CPU=$(top -bn1 | awk '/Cpu\(s\)/{print 100-$8}')
RAM=$(free | awk '/Mem:/ {printf("%.2f", ($3/$2)*100)}')
DISK=$(df / | awk 'END {gsub(/%/,"",$5); print $5}')
NET_RX=$(cat /proc/net/dev | awk '/:/ {sum+=$2} END{print sum}')
NET_TX=$(cat /proc/net/dev | awk '/:/ {sum+=$10} END{print sum}')

echo "CPU=$CPU"
echo "RAM=$RAM"
echo "DISK=$DISK"
echo "NET_RX_BYTES=$NET_RX"
echo "NET_TX_BYTES=$NET_TX"
