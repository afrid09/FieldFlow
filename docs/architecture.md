# Architecture

FieldFlow uses a service-oriented architecture with a thin API gateway in front of dedicated read and command services.

## Components
- **Frontend (Next.js)**: UI that talks to the gateway for REST APIs and WebSocket events.
- **API Gateway (Express + http-proxy-middleware)**: Routes requests to read/command services and broadcasts realtime events to clients.
- **Command Service (Express)**: Write APIs for fields, soil, weather, and analysis. Emits events to the gateway.
- **Read Service (Express)**: Read APIs for fields, dashboards, notifications, and geo queries (PostGIS).
- **PostgreSQL + PostGIS**: Primary data store with geospatial indexing.

## Request Flow
1. **Client → API Gateway**: REST requests go to `/api/*`.
2. **Gateway → Service**: Gateway proxies to the command service for writes and read service for reads.
3. **Service → DB**: Service runs SQL queries against Postgres/PostGIS.
4. **Service → Gateway**: Services emit internal events to `/internal/events`.
5. **Gateway → Clients**: Gateway broadcasts realtime events over `/ws`.

## Realtime Events
- Backend services emit events like `FIELD_CREATED`, `FIELD_UPDATED`, `NOTIFICATIONS_UPDATED`.
- The frontend WebSocket client invalidates cached queries and refreshes UI data.

## Auth & Roles
- JWT-based auth enforced at the gateway.
- Roles: `admin`, `manager`, `farmer`.
- Farmers can only access their own fields; managers/admins have broader access.

## Geo Queries
- Uses PostGIS functions (`ST_DWithin`, `ST_Intersects`, `ST_MakeEnvelope`, `ST_GeomFromGeoJSON`).
- GIST indexes on `fields.location` and `fields.boundary` accelerate spatial filters.
