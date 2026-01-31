#!/usr/bin/env bash
set -euo pipefail

INTERVAL="${BACKUP_INTERVAL_SECONDS:-86400}"
BACKUP_DIR="/backups"

mkdir -p "$BACKUP_DIR"

while true; do
  TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
  FILE="$BACKUP_DIR/fieldflow_${TIMESTAMP}.dump"
  echo "Starting backup to $FILE"
  pg_dump -Fc -f "$FILE"
  echo "Backup complete"
  sleep "$INTERVAL"
done
