# Runbook: Backup Failure

## Trigger
Alert: BackupJobFailed

## Immediate Actions
1. Check CronJob status and logs.
2. Verify S3 credentials and bucket access.
3. Re-run job manually if needed.

## Escalation
- On-call SRE
- DBA if repeated failures
