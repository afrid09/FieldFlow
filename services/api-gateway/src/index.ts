import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';

const app = express();
const port = process.env.PORT || 3000;

const COMMAND_SERVICE_URL = process.env.COMMAND_SERVICE_URL || 'http://command-service:3001';
const READ_SERVICE_URL = process.env.READ_SERVICE_URL || 'http://read-service:3003';
const INTERNAL_EVENT_SECRET = process.env.INTERNAL_EVENT_SECRET;
const WS_AUTH_TOKEN = process.env.WS_AUTH_TOKEN;
const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET;

type Role = 'admin' | 'manager' | 'farmer';
type AuthUser = { userId: string; role: Role; email?: string };

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const wsClients = new Set<WebSocket>();

wss.on('connection', (socket, request) => {
  if (WS_AUTH_TOKEN) {
    const requestUrl = new URL(request.url ?? '', 'http://localhost');
    const token = requestUrl.searchParams.get('token');
    if (token !== WS_AUTH_TOKEN) {
      socket.close(1008, 'Unauthorized');
      return;
    }
  }

  wsClients.add(socket);
  socket.on('close', () => wsClients.delete(socket));
});

const broadcast = (payload: unknown) => {
  const message = JSON.stringify(payload);
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
};

app.get('/', (req, res) => res.send('FieldFlow API Gateway'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'healthy' }));

const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!AUTH_JWT_SECRET) {
    return res.status(500).json({ error: 'AUTH_JWT_SECRET is not configured' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization token' });
  }

  try {
    const payload = jwt.verify(token, AUTH_JWT_SECRET) as jwt.JwtPayload;
    const role = payload.role as Role | undefined;
    if (!payload.sub || !role) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }
    (req as express.Request & { user: AuthUser }).user = {
      userId: String(payload.sub),
      role,
      email: typeof payload.email === 'string' ? payload.email : undefined,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const authedProxy = (target: string) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
      const user = (req as express.Request & { user?: AuthUser }).user;
      if (!user) {
        return;
      }
      proxyReq.setHeader('x-user-id', user.userId);
      proxyReq.setHeader('x-user-role', user.role);
      if (user.email) {
        proxyReq.setHeader('x-user-email', user.email);
      }
    },
  });

// Internal event fan-out for realtime clients
app.post('/internal/events', (req, res) => {
  if (INTERNAL_EVENT_SECRET && req.headers['x-internal-secret'] !== INTERNAL_EVENT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  broadcast(req.body);
  res.json({ status: 'ok' });
});

// Auth endpoints
app.use('/api/auth', authedProxy(COMMAND_SERVICE_URL));

// Protect API routes
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/')) {
    return next();
  }
  return authMiddleware(req, res, next);
});

// Proxy Command Routes (POST, PUT, DELETE)
app.use('/api/fields', (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    return authedProxy(COMMAND_SERVICE_URL)(req, res, next);
  }
  next();
});

// Proxy Read Routes (GET)
app.use('/api', authedProxy(READ_SERVICE_URL));

server.listen(port, () => {
  console.log(`✓ API Gateway listening on port ${port}`);
});
