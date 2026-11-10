import request from 'supertest';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const describeIntegration = process.env.TEST_DATABASE_URL ? describe : describe.skip;

// Both columns are UUIDs in the schema
const USER_ID = '00000000-0000-4000-8000-000000000001';
const FIELD_ID = '00000000-0000-4000-8000-000000000101';

describeIntegration('read-service integration', () => {
  let pool: Pool;
  let app: any;
  let appPool: Pool;

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.AUTH_JWT_SECRET = 'test-secret';

    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(`
      TRUNCATE TABLE
        notifications,
        ai_analysis,
        weather_data,
        soil_data,
        fields,
        events,
        users,
        audit_logs
      RESTART IDENTITY CASCADE;
    `);

    await pool.query(
      `
        INSERT INTO users (user_id, email, full_name, role, password_hash)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [USER_ID, 'farmer@example.com', 'Farmer One', 'farmer', 'hash']
    );
    await pool.query(
      `
        INSERT INTO fields (field_id, user_id, field_name, location, area_hectares, status)
        VALUES ($1, $2, $3, ST_GeographyFromText('POINT(-95.7129 37.0902)'), $4, $5)
      `,
      [FIELD_ID, USER_ID, 'Test Field', 10.5, 'active']
    );

    const mod = await import('../../index');
    app = mod.app;
    appPool = mod.pool;
  });

  afterAll(async () => {
    // Close the service's own pool too, otherwise Jest never exits
    await appPool?.end();
    await pool.end();
  });

  it('returns nearby fields for a valid token', async () => {
    const token = jwt.sign({ role: 'farmer', email: 'farmer@example.com' }, 'test-secret', { subject: USER_ID });
    const response = await request(app)
      .get('/api/fields/nearby')
      .set('Authorization', `Bearer ${token}`)
      .query({ lat: 37.0902, lon: -95.7129, radiusMeters: 5000 });

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].fieldId).toBe(FIELD_ID);
  });
});
