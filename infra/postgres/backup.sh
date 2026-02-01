#!/usr/bin/env bash
set -euo pipefail

INTERVAL="${BACKUP_INTERVAL_SECONDS:-86400}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
RETENTION_WEEKS="${RETENTION_WEEKS:-4}"
RETENTION_MONTHS="${RETENTION_MONTHS:-12}"

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly" "$BACKUP_DIR/monthly"

backup_once() {
  local timestamp
  local day
  local week
  local month
  local daily_file
  local weekly_file
  local monthly_file

  timestamp="$(date +%Y%m%d_%H%M%S)"
  day="$(date +%Y%m%d)"
  week="$(date +%G-W%V)"
  month="$(date +%Y-%m)"

  daily_file="$BACKUP_DIR/daily/fieldflow_${timestamp}.dump"
  weekly_file="$BACKUP_DIR/weekly/fieldflow_${week}.dump"
  monthly_file="$BACKUP_DIR/monthly/fieldflow_${month}.dump"

  echo "Starting daily backup to $daily_file"
  pg_dump -Fc -f "$daily_file"

  if [ ! -f "$weekly_file" ]; then
    echo "Creating weekly backup $weekly_file"
    cp "$daily_file" "$weekly_file"
  fi

  if [ ! -f "$monthly_file" ]; then
    echo "Creating monthly backup $monthly_file"
    cp "$daily_file" "$monthly_file"
  fi

  # Retention
  find "$BACKUP_DIR/daily" -type f -mtime +"$RETENTION_DAYS" -name "*.dump" -delete
  find "$BACKUP_DIR/weekly" -type f -mtime +"$((RETENTION_WEEKS * 7))" -name "*.dump" -delete
  find "$BACKUP_DIR/monthly" -type f -mtime +"$((RETENTION_MONTHS * 30))" -name "*.dump" -delete
}

while true; do
  backup_once
  echo "Backup complete, sleeping for $INTERVAL seconds"
  sleep "$INTERVAL"
done
