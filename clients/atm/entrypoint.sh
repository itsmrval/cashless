#!/bin/bash
set -e

echo "Starting pcscd..."
pcscd --foreground --auto-exit &
PCSCD_PID=$!
sleep 5

echo "Checking pcscd status..."
if ps -p $PCSCD_PID > /dev/null; then
    echo "pcscd is running (PID: $PCSCD_PID)"
else
    echo "ERROR: pcscd failed to start"
    exit 1
fi

echo "Checking for readers..."
pcsc_scan -n 2>&1 || echo "pcsc_scan check completed"

echo "Starting ATM..."
exec ./atm atm.conf
