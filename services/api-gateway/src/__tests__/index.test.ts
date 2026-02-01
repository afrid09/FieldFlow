import request from 'supertest';
import { app } from '../index';

describe('api-gateway', () => {
  it('returns health status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'healthy' });
  });

  it('exposes prometheus metrics', async () => {
    const response = await request(app).get('/metrics');
    expect(response.status).toBe(200);
    expect(response.text).toContain('http_requests_total');
  });

  it('accepts internal events when secret is not configured', async () => {
    const response = await request(app).post('/internal/events').send({ type: 'TEST_EVENT' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
