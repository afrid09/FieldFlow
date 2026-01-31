import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

const COMMAND_SERVICE_URL = process.env.COMMAND_SERVICE_URL || 'http://command-service:3001';
const READ_SERVICE_URL = process.env.READ_SERVICE_URL || 'http://read-service:3003';

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('FieldFlow API Gateway'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'healthy' }));

// Proxy Command Routes (POST, PUT, DELETE)
app.use('/api/fields', (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    return createProxyMiddleware({ target: COMMAND_SERVICE_URL, changeOrigin: true })(req, res, next);
  }
  next();
});

// Proxy Read Routes (GET)
app.use('/api', createProxyMiddleware({ target: READ_SERVICE_URL, changeOrigin: true }));

app.listen(port, () => {
  console.log(`✓ API Gateway listening on port ${port}`);
});
