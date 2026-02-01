// Purpose: API gateway routing, auth, and realtime fan-out.
import './otel'; // OpenTelemetry tracing (disabled if OTEL_ENABLED=false)
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import http from 'http';
import { randomUUID } from 'crypto';
import WebSocket, { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import client from 'prom-client';

const app = express();
const port = process.env.PORT || 3000;

const COMMAND_SERVICE_URL = process.env.COMMAND_SERVICE_URL || 'http://command-service:3001';
const READ_SERVICE_URL = process.env.READ_SERVICE_URL || 'http://read-service:3003';
const INTERNAL_EVENT_SECRET = process.env.INTERNAL_EVENT_SECRET;
const WS_AUTH_TOKEN = process.env.WS_AUTH_TOKEN;
const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 300);

const httpLogger = pinoHttp({
  level: process.env.LOG_LEVEL || 'info',
  genReqId: (req) => (req.headers['x-request-id'] as string) || randomUUID(),
});

type Role = 'admin' | 'manager' | 'farmer';
type AuthUser = { userId: string; role: Role; email?: string };

// Trust proxy headers (required for correct client IPs behind ingress)
app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(','),
  })
);
app.use((req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  res.setHeader('x-request-id', requestId);
  (req as express.Request & { id?: string }).id = requestId;
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(httpLogger);

// Basic rate limit for all requests at the gateway edge.
const limiter = rateLimit({
  windowMs: Number.isFinite(RATE_LIMIT_WINDOW_MS) ? RATE_LIMIT_WINDOW_MS : 60000,
  max: Number.isFinite(RATE_LIMIT_MAX) ? RATE_LIMIT_MAX : 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Metrics registry for Prometheus.
const metricsRegister = new client.Registry();
client.collectDefaultMetrics({ register: metricsRegister });
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [metricsRegister],
});
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  registers: [metricsRegister],
});

// Track request counts and durations for RED metrics.
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    const route = req.route?.path ? String(req.route.path) : req.path;
    httpRequestsTotal.inc({ method: req.method, route, status: res.statusCode });
    httpRequestDuration.observe({ method: req.method, route, status: res.statusCode }, durationSeconds);
  });
  next();
});

// HTTP server + WS server share the same port.
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const wsClients = new Set<WebSocket>();
const WS_HEARTBEAT_MS = Number(process.env.WS_HEARTBEAT_MS || 30000);

// Realtime WS connections; optional shared token gate.
wss.on('connection', (socket, request) => {
  if (WS_AUTH_TOKEN) {
    const requestUrl = new URL(request.url ?? '', 'http://localhost');
    const token = requestUrl.searchParams.get('token');
    if (token !== WS_AUTH_TOKEN) {
      socket.close(1008, 'Unauthorized');
      return;
    }
  }

  const client = socket as WebSocket & { isAlive?: boolean };
  client.isAlive = true;
  client.on('pong', () => {
    client.isAlive = true;
  });

  wsClients.add(socket);
  socket.on('close', () => wsClients.delete(socket));
});

const heartbeat = setInterval(() => {
  for (const client of wsClients) {
    const tracked = client as WebSocket & { isAlive?: boolean };
    if (tracked.isAlive === false) {
      client.terminate();
      wsClients.delete(client);
      continue;
    }
    tracked.isAlive = false;
    client.ping();
  }
}, Number.isFinite(WS_HEARTBEAT_MS) ? WS_HEARTBEAT_MS : 30000);

wss.on('close', () => clearInterval(heartbeat));
wss.on('error', (err) => {
  console.error('WebSocket server error:', err);
});

// Broadcast internal events to all connected realtime clients.
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

// Metrics
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', metricsRegister.contentType);
  res.end(await metricsRegister.metrics());
});

// JWT auth gate for protected API routes.
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
    // Attach user context for downstream proxy headers.
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

// Proxy helper that injects authenticated user headers downstream.
const sendProxyError = (res: http.ServerResponse) => {
  if (res.headersSent) {
    return;
  }
  res.writeHead(502, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Bad gateway' }));
};

const authedProxy = (target: string) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    xfwd: true,
    timeout: 15000,
    proxyTimeout: 15000,
    onProxyReq: (proxyReq, req) => {
      const user = (req as express.Request & { user?: AuthUser }).user;
      if (!user) {
        return;
      }
      // Forward user identity to downstream services for authZ checks.
      proxyReq.setHeader('x-user-id', user.userId);
      proxyReq.setHeader('x-user-role', user.role);
      if (user.email) {
        proxyReq.setHeader('x-user-email', user.email);
      }
      const requestId = (req as express.Request & { id?: string }).id;
      if (requestId) {
        proxyReq.setHeader('x-request-id', requestId);
      }
    },
    onError: (_err, _req, res) => {
      sendProxyError(res);
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
// Admin endpoints
app.use('/api/admin', authedProxy(COMMAND_SERVICE_URL));

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

if (require.main === module) {
  server.listen(port, () => {
    console.log(`✓ API Gateway listening on port ${port}`);
  });
}

export { app, server };
