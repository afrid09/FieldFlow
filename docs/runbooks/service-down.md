# Runbook: Service Down

## Trigger
Alert: ServiceDown

## Immediate Actions
1. Check pod status in namespace.
2. Inspect logs for crash loops.
3. Restart deployment if needed.

## Escalation
- On-call SRE
- Product owner if outage > 30 minutes
