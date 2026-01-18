#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="/home/pi/FaceRecognization-120725/RPI5-FR"
PYTHON="$BASE_DIR/.venv/bin/python"
LOG_FILE="$BASE_DIR/backend.out"

cd "$BASE_DIR"

while true; do
  "$PYTHON" api_server.py >> "$LOG_FILE" 2>&1 || true
  sleep 2
done
