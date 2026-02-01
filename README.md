# FieldFlow

FieldFlow is a multi-service agriculture management app with a Next.js frontend, Express services, and a PostGIS-backed database.

## Services
- `services/api-gateway` - API gateway + WebSocket fan-out
- `services/command-service` - write APIs and auth endpoints
- `services/read-service` - read APIs and geo queries
- `services/enrichment-service` - background analysis worker
- `frontend` - Next.js UI

## Quick Start
1. Configure environment variables (see below).
2. Start the stack (Docker or local).
3. Open the frontend and sign in.

## Environment Variables
Set these in your environment or `.env` files for each service.

### API Gateway
- `PORT` (default: 3000)
- `COMMAND_SERVICE_URL` (default: `http://command-service:3001`)
- `READ_SERVICE_URL` (default: `http://read-service:3003`)
- `AUTH_JWT_SECRET` (required)
- `INTERNAL_EVENT_SECRET` (optional, secures `/internal/events`)
- `WS_AUTH_TOKEN` (optional, secures `/ws`)

### Command Service
- `PORT` (default: 3001)
- `DATABASE_URL` (default: `postgres://postgres:postgres@postgres:5432/fieldflow`)
- `AUTH_JWT_SECRET` (required)
- `AUTH_TOKEN_TTL` (default: `7d`)
- `ALLOW_PUBLIC_REGISTER` (`true` to allow public registration)
- `GATEWAY_URL` (default: `http://api-gateway:3000`)
- `INTERNAL_EVENT_SECRET` (optional)

### Read Service
- `PORT` (default: 3003)
- `DATABASE_URL` (default: `postgres://postgres:postgres@postgres:5432/fieldflow`)
- `AUTH_JWT_SECRET` (required)
- `GATEWAY_URL` (default: `http://api-gateway:3000`)
- `INTERNAL_EVENT_SECRET` (optional)

### Enrichment Service
- `DATABASE_URL` (default: `postgres://postgres:postgres@postgres:5432/fieldflow`)
- `ENRICHMENT_POLL_MS` (default: `10000`)

### Frontend
- `NEXT_PUBLIC_API_URL` (default: `http://localhost:3000`)
- `NEXT_PUBLIC_WS_URL` (optional override for websocket base)
- `NEXT_PUBLIC_WS_TOKEN` (optional, must match `WS_AUTH_TOKEN`)

## Auth
### Endpoints
- `POST /api/auth/login` `{ email, password }`
- `POST /api/auth/register` `{ email, fullName, password, role? }`

### Roles
- `admin`: full access
- `manager`: can create farmer accounts
- `farmer`: read/write only their own fields

### Demo Credentials
- Email: `demo@fieldflow.com`
- Password: `demo123`

## Frontend Routes
- `/login`
- `/register`
- `/admin` (admin only)

## Notes
- If `ALLOW_PUBLIC_REGISTER` is `false`, only admin/manager tokens can create users.
- Geo endpoints use PostGIS indexes (bbox, polygon, nearby, nearest).

## Migrations
- Run migrations with `npm run migrate` in `services/command-service`.
- Docker Compose includes a `db-migrate` service to apply migrations on startup.
- Roll back the latest migration with `npm run migrate:down`.
- Dev seeds are in `infra/seeds/dev.sql`, production seeds in `infra/seeds/prod.sql`.
- Run seeds with `npm run seed:dev` or `npm run seed:prod` in `services/command-service`.
- Roll back the last migration with `npm run migrate:down`.

## Seeds
- Dev seed: `SEED_FILE=../../infra/seeds/dev.sql npm run seed` (from `services/command-service`).
- Prod seed: `SEED_FILE=../../infra/seeds/prod.sql npm run seed` (minimal data).

## Observability
- Each service exposes `/metrics` for Prometheus-style metrics.
- Logs are structured via `pino`.
 - See `docs/observability.md` for the full stack (Prometheus/Grafana/Loki/Tempo).

## TLS
- Nginx terminates TLS and proxies to the API gateway.
- Generate dev certificates with `infra/nginx/generate-self-signed.sh`.

## Backups
- Docker Compose includes `db-backup`, writing daily `pg_dump` files to `./backups`.
 - See `docs/disaster-recovery.md` for retention and restore steps.
 - Kubernetes CronJob uploads backups to S3 (see `infra/k8s/backup-cronjob.yaml`).

## CI/CD
- GitHub Actions workflow runs type checks for frontend and services.

## Kubernetes/Helm
- Base manifests are in `infra/k8s/`.
- Helm chart scaffold is in `helm/fieldflow/`.
 - See `docs/infra-hardening.md` for TLS, probes, and policies.

## Secrets Management (AWS Secrets Manager + External Secrets)
- See `docs/secrets-management.md` for setup details.

## Production Templates (Placeholders)
- `infra/k8s/external-secrets/irsa-serviceaccount.yaml`
- `infra/aws/iam/fieldflow-external-secrets-policy.json`
- `infra/k8s/cert-manager-prod.yaml`
- `infra/k8s/ingress-prod.yaml`
- `infra/observability/alertmanager.yml`
- `infra/k8s/restore-validation-cronjob.yaml`
- `docs/runbooks/service-down.md`
- `docs/runbooks/backup-failure.md`