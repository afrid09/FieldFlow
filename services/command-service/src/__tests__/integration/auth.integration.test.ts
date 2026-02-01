import request from 'supertest';
import { Pool } from 'pg';

const describeIntegration = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeIntegration('command-service integration', () => {
  let pool: Pool;
  let app: any;

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.AUTH_JWT_SECRET = 'test-secret';
    process.env.ALLOW_PUBLIC_REGISTER = 'true';

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

    const mod = await import('../../index');
    app = mod.app;
  });

  afterAll(async () => {
    await pool.end();
  });

  it('registers and logs in a user', async () => {
    const register = await request(app).post('/api/auth/register').send({
      email: 'user@example.com',
      fullName: 'Test User',
      password: 'password123',
      role: 'farmer',
    });
    expect(register.status).toBe(201);

    const login = await request(app).post('/api/auth/login').send({
      email: 'user@example.com',
      password: 'password123',
    });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();
  });

  it('creates a field with a valid token', async () => {
    const register = await request(app).post('/api/auth/register').send({
      email: 'owner@example.com',
      fullName: 'Owner',
      password: 'password123',
      role: 'farmer',
    });
    const token = register.body.token as string;

    const response = await request(app)
      .post('/api/fields')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fieldName: 'Integration Field',
        areaHectares: 12.5,
        latitude: 37.09,
        longitude: -95.71,
      });

    expect(response.status).toBe(201);
    expect(response.body.field_name || response.body.fieldName).toBeTruthy();
  });
});
