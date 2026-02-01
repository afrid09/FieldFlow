import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.mock('pg', () => {
  const query = jest.fn();
  return {
    Pool: jest.fn(() => ({ query })),
    __query: query,
  };
});

const setup = async () => {
  jest.resetModules();
  process.env.AUTH_JWT_SECRET = 'test-secret';
  const mod = await import('../index');
  const pg = await import('pg');
  return { app: mod.app, query: (pg as any).__query as jest.Mock };
};

const makeToken = () =>
  jwt.sign({ role: 'farmer', email: 'farmer@example.com' }, 'test-secret', { subject: 'user-1' });

describe('read-service', () => {
  it('returns health status when DB is reachable', async () => {
    const { app, query } = await setup();
    query.mockResolvedValueOnce({ rows: [] });

    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'healthy', database: 'connected' });
  });

  it('validates nearby query parameters', async () => {
    const { app } = await setup();
    const token = makeToken();

    const response = await request(app)
      .get('/api/fields/nearby')
      .set('Authorization', `Bearer ${token}`)
      .query({ lat: 'x', lon: 1, radiusMeters: 1000 });

    expect(response.status).toBe(400);
  });

  it('returns nearby fields for a valid request', async () => {
    const { app, query } = await setup();
    const token = makeToken();
    query.mockResolvedValueOnce({
      rows: [
        {
          field_id: 'field-1',
          field_name: 'Field One',
          crop_type: 'Wheat',
          area_hectares: 10,
          status: 'active',
          latitude: 1,
          longitude: 2,
          predicted_yield: 120,
          latest_ph: 6.5,
          latest_nitrogen: 10,
          latest_analysis: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    });

    const response = await request(app)
      .get('/api/fields/nearby')
      .set('Authorization', `Bearer ${token}`)
      .query({ lat: 1, lon: 2, radiusMeters: 1000 });

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].fieldId).toBe('field-1');
    expect(query.mock.calls[0][0]).toContain('ST_DWithin');
    expect(query.mock.calls[0][0]).toContain('FROM field_summary');
  });
});
