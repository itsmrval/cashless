#!/bin/bash
set -e

pcscd --auto-exit
sleep 2

exec python3 app.py "${API_BASE_URL}" "${DEST_USERNAME}" "${DEST_PASSWORD}"
