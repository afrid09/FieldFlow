# Database Migrations & Seeds

This project uses SQL migrations and environment-specific seed scripts.

## Structure
- `infra/migrations/*.up.sql`: forward migrations
- `infra/migrations/*.down.sql`: rollback migrations
- `infra/seeds/dev.sql`: development seed data
- `infra/seeds/prod.sql`: production seed data (minimal)

## Apply Migrations
```bash
cd services/command-service
npm run migrate
```

## Roll Back Last Migration
```bash
cd services/command-service
npm run migrate:down
```

## Seed (Development)
```bash
cd services/command-service
npm run seed:dev
```

## Seed (Production)
```bash
cd services/command-service
npm run seed:prod
```

## Notes
- Production seeds should be minimal and explicit.
- Keep dev/demo data only in `dev.sql`.
