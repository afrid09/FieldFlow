# Testing Strategy

This project uses a layered testing approach: unit tests for logic, integration tests for DB/service behavior, and E2E tests for user flows.

## Test Levels

### Unit Tests
- Focus on pure logic (auth, validation, geo helpers).
- Run with Jest in each service + frontend.
- Coverage: auth module has 90% thresholds; overall target is 80% as tests expand.

### Integration Tests
- Real Postgres/PostGIS using Docker.
- Validate auth flows, CRUD, and geo queries against the DB.
- Tests are skipped locally if `TEST_DATABASE_URL` is not set.

### End-to-End (E2E)
- Playwright tests against a running frontend + backend stack.
- Covers login, registration, and role-based UI visibility.

## Local Usage

### Unit Tests
```
npm test --prefix services/api-gateway
npm test --prefix services/command-service
npm test --prefix services/read-service
npm test --prefix frontend
```

### Integration Tests
```
docker compose -f docker-compose.test.yml up -d

DATABASE_URL=postgres://test_user:test_pass@localhost:5433/fieldflow_test \
npm run migrate --prefix services/command-service

TEST_DATABASE_URL=postgres://test_user:test_pass@localhost:5433/fieldflow_test \
AUTH_JWT_SECRET=test-secret \
npm test --prefix services/command-service -- --runTestsByPath src/__tests__/integration/auth.integration.test.ts

TEST_DATABASE_URL=postgres://test_user:test_pass@localhost:5433/fieldflow_test \
AUTH_JWT_SECRET=test-secret \
npm test --prefix services/read-service -- --runTestsByPath src/__tests__/integration/geo.integration.test.ts
```

### E2E Tests
```
docker compose -f docker-compose.e2e.yml up -d --build
E2E_BASE_URL=http://localhost:3002 npm run test:e2e --prefix frontend
```

## Coverage
- Jest collects coverage automatically for services and frontend.
- Coverage is uploaded in CI as artifacts.

## Troubleshooting
- If Jest can’t find `jest` globals, ensure `types` include `node` and `jest` in `tsconfig.json`.
- If integration tests fail, verify migrations ran and PostGIS is available.
- If E2E tests fail to start, ensure `docker compose` is running and the frontend is reachable on `:3002`.
