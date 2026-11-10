# Configuration

Environment variables for each service. `docker-compose.yml` sets working defaults for local development.

## API Gateway
- `PORT` (default: 3000)
- `COMMAND_SERVICE_URL` (default: `http://command-service:3001`)
- `READ_SERVICE_URL` (default: `http://read-service:3003`)
- `AUTH_JWT_SECRET` (required)
- `INTERNAL_EVENT_SECRET` (optional, secures `/internal/events`)
- `WS_AUTH_TOKEN` (optional, secures `/ws`)

## Command Service
- `PORT` (default: 3001)
- `DATABASE_URL` (default: `postgres://postgres:postgres@postgres:5432/fieldflow`)
- `AUTH_JWT_SECRET` (required)
- `AUTH_TOKEN_TTL` (default: `7d`)
- `ALLOW_PUBLIC_REGISTER` (`true` to allow public registration)
- `GATEWAY_URL` (default: `http://api-gateway:3000`)
- `INTERNAL_EVENT_SECRET` (optional)

## Read Service
- `PORT` (default: 3003)
- `DATABASE_URL` (default: `postgres://postgres:postgres@postgres:5432/fieldflow`)
- `AUTH_JWT_SECRET` (required)
- `GATEWAY_URL` (default: `http://api-gateway:3000`)
- `INTERNAL_EVENT_SECRET` (optional)

## Enrichment Service
- `DATABASE_URL` (default: `postgres://postgres:postgres@postgres:5432/fieldflow`)
- `ENRICHMENT_POLL_MS` (default: `10000`)

## Frontend
- `NEXT_PUBLIC_API_URL` (default: `http://localhost:3000`)
- `NEXT_PUBLIC_WS_URL` (optional override for websocket base)
- `NEXT_PUBLIC_WS_TOKEN` (optional, must match `WS_AUTH_TOKEN`)
