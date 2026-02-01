import request from 'supertest';

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
  process.env.ALLOW_PUBLIC_REGISTER = 'true';
  const mod = await import('../index');
  const pg = await import('pg');
  return { app: mod.app, query: (pg as any).__query as jest.Mock };
};

describe('command-service', () => {
  it('returns health status when DB is reachable', async () => {
    const { app, query } = await setup();
    query.mockResolvedValueOnce({ rows: [] });

    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'healthy', database: 'connected' });
  });

  it('registers a new user when public registration is enabled', async () => {
    const { app, query } = await setup();
    query
      .mockResolvedValueOnce({ rows: [] }) // existing user lookup
      .mockResolvedValueOnce({
        rows: [
          { user_id: 'user-1', email: 'test@example.com', full_name: 'Test User', role: 'farmer' },
        ],
      }); // insert result

    const response = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      fullName: 'Test User',
      password: 'password123',
      role: 'farmer',
    });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      userId: 'user-1',
      email: 'test@example.com',
      role: 'farmer',
      fullName: 'Test User',
    });
    expect(response.body.token).toBeTruthy();
  });

  it('rejects duplicate registrations', async () => {
    const { app, query } = await setup();
    query.mockResolvedValueOnce({ rows: [{ exists: true }] });

    const response = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      fullName: 'Test User',
      password: 'password123',
      role: 'farmer',
    });

    expect(response.status).toBe(409);
  });
});
