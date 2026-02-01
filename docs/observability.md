# Observability Stack

This project ships with Prometheus, Grafana, Loki, Promtail, and Tempo.

## Services
- **Prometheus**: metrics collection
- **Grafana**: dashboards (Prometheus + Loki + Tempo)
- **Loki**: log storage
- **Promtail**: log shipping
- **Tempo**: distributed tracing

## Docker Compose
Observability services are defined in `docker-compose.yml`. Start them with:
```bash
docker compose up -d prometheus grafana loki promtail tempo
```

## Access
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3004` (admin/admin)
- Loki: `http://localhost:3100`
- Tempo: `http://localhost:3200`

## Metrics
Each API service exposes `/metrics`. Prometheus scrapes:
- `api-gateway:3000/metrics`
- `command-service:3001/metrics`
- `read-service:3003/metrics`

## Logs
Promtail is configured to scrape Docker container logs. On Windows/macOS,
you may need to adjust mounts or run Promtail on the host.

## Tracing
Services emit OTLP traces to Tempo when `OTEL_ENABLED=true` and
`OTEL_EXPORTER_OTLP_ENDPOINT` is set.
