import request from 'supertest';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const describeIntegration = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeIntegration('read-service integration', () => {
  let pool: Pool;
  let app: any;

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
      ['user-1', 'farmer@example.com', 'Farmer One', 'farmer', 'hash']
    );
    await pool.query(
      `
        INSERT INTO fields (field_id, user_id, field_name, location, area_hectares, status)
        VALUES ($1, $2, $3, ST_GeographyFromText('POINT(-95.7129 37.0902)'), $4, $5)
      `,
      ['field-1', 'user-1', 'Test Field', 10.5, 'active']
    );

    const mod = await import('../../index');
    app = mod.app;
  });

  afterAll(async () => {
    await pool.end();
  });

  it('returns nearby fields for a valid token', async () => {
    const token = jwt.sign({ role: 'farmer', email: 'farmer@example.com' }, 'test-secret', { subject: 'user-1' });
    const response = await request(app)
      .get('/api/fields/nearby')
      .set('Authorization', `Bearer ${token}`)
      .query({ lat: 37.0902, lon: -95.7129, radiusMeters: 5000 });

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].fieldId).toBe('field-1');
  });
});
