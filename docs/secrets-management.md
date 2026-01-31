# Secrets Management (Kubernetes + AWS Secrets Manager)

This project uses **external-secrets-operator** to sync secrets from AWS Secrets Manager into Kubernetes Secrets.

## Overview
- **Source of truth:** AWS Secrets Manager
- **Sync controller:** external-secrets-operator
- **In-cluster usage:** Kubernetes Secrets mounted as env vars
- **Rotation:** handled in AWS (native rotation), synced via `refreshInterval`

## Prerequisites
1. Deploy external-secrets-operator to your cluster.
2. Create AWS Secrets Manager secrets with the required keys.
3. Provide AWS credentials to the operator (see options below).

## Required AWS Secrets
Create a secret in AWS Secrets Manager called `fieldflow/app` with:
```json
{
  "AUTH_JWT_SECRET": "replace-me",
  "INTERNAL_EVENT_SECRET": "replace-me",
  "WS_AUTH_TOKEN": "replace-me",
  "DATABASE_URL": "postgres://user:pass@postgres:5432/fieldflow"
}
```

## AWS Credentials Options
### Option A: Static IAM access keys (simpler, less secure)
Create a Kubernetes Secret with AWS credentials (see `infra/k8s/external-secrets/aws-credentials.yaml`).

### Option B: IAM Roles for Service Accounts (recommended)
Use IRSA/kiam/kube2iam depending on your environment, and remove static creds.

## Applying Manifests
```bash
kubectl apply -f infra/k8s/external-secrets/aws-credentials.yaml
kubectl apply -f infra/k8s/external-secrets/secret-store.yaml
kubectl apply -f infra/k8s/external-secrets/externalsecret-fieldflow.yaml
```

## Rotation
- Enable rotation in AWS Secrets Manager.
- External Secrets syncs at `refreshInterval` (default 1h in the manifest).

## Migration Guide (from env files)
1. Move existing env secrets into AWS Secrets Manager.
2. Apply the external-secrets manifests.
3. Update Kubernetes deployments to reference the generated Secret `fieldflow-secrets`.
4. Remove secrets from env files and repo.
