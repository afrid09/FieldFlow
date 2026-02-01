#!/usr/bin/env bash
set -euo pipefail

BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: restore.sh /backups/daily/fieldflow_YYYYmmdd_HHMMSS.dump"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "Restoring from $BACKUP_FILE"
pg_restore --clean --if-exists -d "$PGDATABASE" "$BACKUP_FILE"
echo "Restore complete"
