import http from 'http';
import { AddressInfo } from 'net';
import request from 'supertest';

// Regression test: the gateway must forward request bodies to downstream services.
// A global JSON body parser used to consume the stream first, so POSTs through the
// proxy (such as login) hung until they were aborted.
describe('api-gateway proxy', () => {
  let upstream: http.Server;
  let app: any;

  beforeAll(async () => {
    upstream = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ path: req.url, received: body ? JSON.parse(body) : null }));
      });
    });
    await new Promise<void>((resolve) => upstream.listen(0, resolve));
    const { port } = upstream.address() as AddressInfo;
    process.env.COMMAND_SERVICE_URL = `http://127.0.0.1:${port}`;

    const mod = await import('../index');
    app = mod.app;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => upstream.close(() => resolve()));
  });

  it('forwards the JSON body of a login request', async () => {
    const credentials = { email: 'demo@fieldflow.com', password: 'demo123' };

    const response = await request(app).post('/api/auth/login').send(credentials).timeout(5000);

    expect(response.status).toBe(200);
    expect(response.body.received).toEqual(credentials);
  });
});
