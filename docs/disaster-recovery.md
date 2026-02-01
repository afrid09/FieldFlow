# Disaster Recovery Plan

## Objectives
- **RPO (Recovery Point Objective):** 24 hours
- **RTO (Recovery Time Objective):** 2 hours

## Backups
### Docker Compose
- Backups run via `db-backup` in `docker-compose.yml`.
- Retention policy:
  - 7 daily
  - 4 weekly
  - 12 monthly

### Kubernetes
- `infra/k8s/backup-cronjob.yaml` schedules nightly backups to a PVC.
- For production, mount an off-site storage volume (S3, GCS, etc).

## Restore Procedure
1. Stop application services.
2. Run restore with `infra/postgres/restore.sh`:
   ```bash
   PGHOST=postgres PGUSER=postgres PGPASSWORD=postgres PGDATABASE=fieldflow \
   ./infra/postgres/restore.sh /backups/daily/fieldflow_YYYYmmdd_HHMMSS.dump
   ```
3. Restart services.

## Validation
- After restore, verify:
  - `/health` endpoints for services
  - Sample dashboard loads
  - Audit logs count matches expected

## Monitoring
- Add alerting on backup failures (Prometheus/Alertmanager).
- Log backup success/failure to centralized logging.
