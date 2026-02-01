import './otel';
import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import client from 'prom-client';

const app = express();
const port = process.env.PORT || 3003;
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://api-gateway:3000';
const INTERNAL_EVENT_SECRET = process.env.INTERNAL_EVENT_SECRET;
const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 300);

const httpLogger = pinoHttp({ level: process.env.LOG_LEVEL || 'info' });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@postgres:5432/fieldflow',
});

app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(','),
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(httpLogger);

const limiter = rateLimit({
  windowMs: Number.isFinite(RATE_LIMIT_WINDOW_MS) ? RATE_LIMIT_WINDOW_MS : 60000,
  max: Number.isFinite(RATE_LIMIT_MAX) ? RATE_LIMIT_MAX : 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

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

type Req = Request;
type Res = Response;

type Role = 'admin' | 'manager' | 'farmer';
type AuthUser = { userId: string; role: Role; email?: string };

const getAuthUser = (req: Request): AuthUser | null => {
  if (!AUTH_JWT_SECRET) {
    return null;
  }
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return null;
  }
  const payload = jwt.verify(token, AUTH_JWT_SECRET) as jwt.JwtPayload;
  const role = payload.role as Role | undefined;
  if (!payload.sub || !role) {
    return null;
  }
  return {
    userId: String(payload.sub),
    role,
    email: typeof payload.email === 'string' ? payload.email : undefined,
  };
};

const authMiddleware = (req: Request, res: Response, next: () => void) => {
  if (!AUTH_JWT_SECRET) {
    return res.status(500).json({ error: 'AUTH_JWT_SECRET is not configured' });
  }
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Missing Authorization token' });
    }
    (req as Request & { user: AuthUser }).user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const getUser = (req: Request) => (req as Request & { user: AuthUser }).user;

const emitGatewayEvent = async (event: Record<string, unknown>) => {
  try {
    await fetch(`${GATEWAY_URL}/internal/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(INTERNAL_EVENT_SECRET ? { 'x-internal-secret': INTERNAL_EVENT_SECRET } : {}),
      },
      body: JSON.stringify(event),
    });
  } catch (err) {
    console.warn('Failed to emit gateway event:', err);
  }
};

const toNumber = (value: unknown) => Number(value);
const toOptionalNumber = (value: unknown) => (value === null || value === undefined ? undefined : Number(value));

const parseLimit = (value: unknown, fallback: number, max: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
};

const isLatLon = (lat: number, lon: number) =>
  Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;

const toFieldSummary = (row: any) => ({
  fieldId: row.field_id,
  userId: row.user_id,
  fieldName: row.field_name,
  cropType: row.crop_type ?? undefined,
  areaHectares: toNumber(row.area_hectares),
  status: row.status ?? 'active',
  location: {
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
  },
  latestPh: toOptionalNumber(row.latest_ph),
  latestNitrogen: toOptionalNumber(row.latest_nitrogen),
  latestTemperature: toOptionalNumber(row.latest_temperature),
  latestHumidity: toOptionalNumber(row.latest_humidity),
  latestAnalysis: row.latest_analysis ?? undefined,
  predictedYield: toOptionalNumber(row.predicted_yield),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toNotification = (row: any) => ({
  notificationId: row.notification_id,
  userId: row.user_id,
  fieldId: row.field_id ?? undefined,
  notificationType: row.notification_type,
  title: row.title,
  message: row.message,
  severity: row.severity ?? 'info',
  isRead: row.is_read,
  readAt: row.read_at ?? undefined,
  actionUrl: row.action_url ?? undefined,
  createdAt: row.created_at,
});

const toActivity = (row: any) => ({
  activityId: row.activity_id,
  fieldId: row.field_id,
  userId: row.user_id,
  activityType: row.activity_type,
  description: row.description ?? undefined,
  startTime: row.start_time,
  endTime: row.end_time ?? undefined,
  durationHours: toOptionalNumber(row.duration_hours),
  cost: toOptionalNumber(row.cost),
  notes: row.notes ?? undefined,
  createdAt: row.created_at,
});

const toSoilData = (row: any) => ({
  soilDataId: row.soil_data_id,
  fieldId: row.field_id,
  phLevel: toOptionalNumber(row.ph_level),
  nitrogenPpm: toOptionalNumber(row.nitrogen_ppm),
  phosphorusPpm: toOptionalNumber(row.phosphorus_ppm),
  potassiumPpm: toOptionalNumber(row.potassium_ppm),
  organicMatterPercent: toOptionalNumber(row.organic_matter_percent),
  moisturePercent: toOptionalNumber(row.moisture_percent),
  temperatureCelsius: toOptionalNumber(row.temperature_celsius),
  sampleDate: row.sample_date,
  labTested: row.lab_tested ?? false,
});

const toWeatherData = (row: any) => ({
  weatherDataId: row.weather_data_id,
  fieldId: row.field_id,
  temperatureCelsius: toOptionalNumber(row.temperature_celsius),
  humidityPercent: toOptionalNumber(row.humidity_percent),
  pressureHpa: toOptionalNumber(row.pressure_hpa),
  rainfallMm: toOptionalNumber(row.rainfall_mm),
  windSpeedKmh: toOptionalNumber(row.wind_speed_kmh),
  windDirectionDegrees: toOptionalNumber(row.wind_direction_degrees),
  solarRadiationWm2: toOptionalNumber(row.solar_radiation_wm2),
  recordedAt: row.recorded_at,
  dataSource: row.data_source,
});

const toAnalysis = (row: any) => ({
  analysisId: row.analysis_id,
  fieldId: row.field_id,
  analysisType: row.analysis_type,
  summary: row.summary,
  recommendations: row.recommendations ?? undefined,
  confidenceScore: toOptionalNumber(row.confidence_score),
  riskLevel: row.risk_level ?? undefined,
  riskFactors: row.risk_factors ?? undefined,
  yieldPrediction: toOptionalNumber(row.yield_prediction),
  qualityScore: toOptionalNumber(row.quality_score),
  modelVersion: row.model_version ?? undefined,
  analyzedAt: row.analyzed_at,
});

app.get('/', (_req: Req, res: Res) => res.send('FieldFlow Read Service'));

// Health check
app.get('/health', async (_req: Req, res: Res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: (err as Error).message });
  }
});

// Metrics
app.get('/metrics', async (_req: Req, res: Res) => {
  res.set('Content-Type', metricsRegister.contentType);
  res.end(await metricsRegister.metrics());
});

// Protect API routes
app.use('/api', (req, res, next) => authMiddleware(req, res, next));

// Get all fields (using the field_summary view)
app.get('/api/fields', async (req: Req, res: Res) => {
  try {
    const user = getUser(req);
    const result =
      user.role === 'farmer'
        ? await pool.query('SELECT * FROM field_summary WHERE user_id = $1 ORDER BY created_at DESC', [user.userId])
        : await pool.query('SELECT * FROM field_summary ORDER BY created_at DESC');
    res.json(result.rows.map(toFieldSummary));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get fields near a point (uses PostGIS index on fields.location)
app.get('/api/fields/nearby', async (req: Req, res: Res) => {
  const latitude = Number(req.query.lat);
  const longitude = Number(req.query.lon);
  const radiusMeters = Number(req.query.radiusMeters ?? 5000);
  const limit = parseLimit(req.query.limit, 50, 200);
  const user = getUser(req);

  if (!isLatLon(latitude, longitude) || !Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    return res.status(400).json({ error: 'lat, lon, and radiusMeters must be valid numbers' });
  }

  try {
    const filterClause = user.role === 'farmer' ? 'AND f.user_id = $5' : '';
    const params =
      user.role === 'farmer'
        ? [longitude, latitude, radiusMeters, limit, user.userId]
        : [longitude, latitude, radiusMeters, limit];
    const result = await pool.query(
      `
        SELECT fs.*
        FROM field_summary fs
        JOIN fields f ON fs.field_id = f.field_id
        WHERE ST_DWithin(
          f.location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
        ${filterClause}
        ORDER BY f.created_at DESC
        LIMIT $4
      `,
      params
    );
    res.json(result.rows.map(toFieldSummary));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get fields within a bounding box (uses PostGIS index on fields.location)
app.get('/api/fields/bbox', async (req: Req, res: Res) => {
  const minLat = Number(req.query.minLat);
  const minLon = Number(req.query.minLon);
  const maxLat = Number(req.query.maxLat);
  const maxLon = Number(req.query.maxLon);
  const limit = parseLimit(req.query.limit, 200, 500);
  const user = getUser(req);

  if (![minLat, minLon, maxLat, maxLon].every(Number.isFinite)) {
    return res.status(400).json({ error: 'minLat, minLon, maxLat, and maxLon must be valid numbers' });
  }
  if (!isLatLon(minLat, minLon) || !isLatLon(maxLat, maxLon) || minLat > maxLat || minLon > maxLon) {
    return res.status(400).json({ error: 'minLat/minLon must be <= maxLat/maxLon and within valid ranges' });
  }

  try {
    const filterClause = user.role === 'farmer' ? 'AND f.user_id = $6' : '';
    const params =
      user.role === 'farmer'
        ? [minLon, minLat, maxLon, maxLat, limit, user.userId]
        : [minLon, minLat, maxLon, maxLat, limit];
    const result = await pool.query(
      `
        SELECT fs.*
        FROM field_summary fs
        JOIN fields f ON fs.field_id = f.field_id
        WHERE ST_Intersects(
          f.location,
          ST_SetSRID(ST_MakeEnvelope($1, $2, $3, $4), 4326)::geography
        )
        ${filterClause}
        ORDER BY f.created_at DESC
        LIMIT $5
      `,
      params
    );
    res.json(result.rows.map(toFieldSummary));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get fields within a polygon (uses PostGIS index on fields.location)
app.post('/api/fields/polygon', async (req: Req, res: Res) => {
  const polygon = req.body?.polygon;
  const limit = parseLimit(req.body?.limit, 200, 500);
  const user = getUser(req);

  if (!polygon) {
    return res.status(400).json({ error: 'polygon is required (GeoJSON Polygon or MultiPolygon)' });
  }
  if (polygon?.type !== 'Polygon' && polygon?.type !== 'MultiPolygon') {
    return res.status(400).json({ error: 'polygon must be a GeoJSON Polygon or MultiPolygon' });
  }

  try {
    const filterClause = user.role === 'farmer' ? 'AND f.user_id = $3' : '';
    const params = user.role === 'farmer' ? [JSON.stringify(polygon), limit, user.userId] : [JSON.stringify(polygon), limit];
    const result = await pool.query(
      `
        SELECT fs.*
        FROM field_summary fs
        JOIN fields f ON fs.field_id = f.field_id
        WHERE ST_Intersects(
          f.location,
          ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)::geography
        )
        ${filterClause}
        ORDER BY f.created_at DESC
        LIMIT $2
      `,
      params
    );
    res.json(result.rows.map(toFieldSummary));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get nearest fields to a point (KNN search on fields.location)
app.get('/api/fields/nearest', async (req: Req, res: Res) => {
  const latitude = Number(req.query.lat);
  const longitude = Number(req.query.lon);
  const limit = parseLimit(req.query.limit, 20, 200);
  const user = getUser(req);

  if (!isLatLon(latitude, longitude)) {
    return res.status(400).json({ error: 'lat and lon must be valid numbers' });
  }

  try {
    const filterClause = user.role === 'farmer' ? 'WHERE f.user_id = $4' : '';
    const params = user.role === 'farmer' ? [longitude, latitude, limit, user.userId] : [longitude, latitude, limit];
    const result = await pool.query(
      `
        SELECT fs.*
        FROM field_summary fs
        JOIN fields f ON fs.field_id = f.field_id
        ${filterClause}
        ORDER BY f.location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        LIMIT $3
      `,
      params
    );
    res.json(result.rows.map(toFieldSummary));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get soil data for a field
app.get('/api/soil/:fieldId', async (req: Req, res: Res) => {
  try {
    const user = getUser(req);
    const filterClause = user.role === 'farmer' ? 'AND f.user_id = $2' : '';
    const params = user.role === 'farmer' ? [req.params.fieldId, user.userId] : [req.params.fieldId];
    const result = await pool.query(
      `
        SELECT sd.*
        FROM soil_data sd
        JOIN fields f ON sd.field_id = f.field_id
        WHERE sd.field_id = $1
        ${filterClause}
        ORDER BY sd.sample_date DESC
      `,
      params
    );
    res.json(result.rows.map(toSoilData));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get latest soil data for a field
app.get('/api/soil/:fieldId/latest', async (req: Req, res: Res) => {
  try {
    const user = getUser(req);
    const filterClause = user.role === 'farmer' ? 'AND f.user_id = $2' : '';
    const params = user.role === 'farmer' ? [req.params.fieldId, user.userId] : [req.params.fieldId];
    const result = await pool.query(
      `
        SELECT sd.*
        FROM soil_data sd
        JOIN fields f ON sd.field_id = f.field_id
        WHERE sd.field_id = $1
        ${filterClause}
        ORDER BY sd.sample_date DESC
        LIMIT 1
      `,
      params
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No soil data found' });
    }
    res.json(toSoilData(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get weather data for a field
app.get('/api/weather/:fieldId', async (req: Req, res: Res) => {
  try {
    const user = getUser(req);
    const filterClause = user.role === 'farmer' ? 'AND f.user_id = $2' : '';
    const params = user.role === 'farmer' ? [req.params.fieldId, user.userId] : [req.params.fieldId];
    const result = await pool.query(
      `
        SELECT wd.*
        FROM weather_data wd
        JOIN fields f ON wd.field_id = f.field_id
        WHERE wd.field_id = $1
        ${filterClause}
        ORDER BY wd.recorded_at DESC
      `,
      params
    );
    res.json(result.rows.map(toWeatherData));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get latest weather data for a field
app.get('/api/weather/:fieldId/latest', async (req: Req, res: Res) => {
  try {
    const user = getUser(req);
    const filterClause = user.role === 'farmer' ? 'AND f.user_id = $2' : '';
    const params = user.role === 'farmer' ? [req.params.fieldId, user.userId] : [req.params.fieldId];
    const result = await pool.query(
      `
        SELECT wd.*
        FROM weather_data wd
        JOIN fields f ON wd.field_id = f.field_id
        WHERE wd.field_id = $1
        ${filterClause}
        ORDER BY wd.recorded_at DESC
        LIMIT 1
      `,
      params
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No weather data found' });
    }
    res.json(toWeatherData(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get weather forecast (latest samples) for a field
app.get('/api/weather/:fieldId/forecast', async (req: Req, res: Res) => {
  const limit = Number(req.query.limit ?? 5);
  try {
    const user = getUser(req);
    const filterClause = user.role === 'farmer' ? 'AND f.user_id = $3' : '';
    const params =
      user.role === 'farmer'
        ? [req.params.fieldId, Number.isFinite(limit) ? limit : 5, user.userId]
        : [req.params.fieldId, Number.isFinite(limit) ? limit : 5];
    const result = await pool.query(
      `
        SELECT wd.*
        FROM weather_data wd
        JOIN fields f ON wd.field_id = f.field_id
        WHERE wd.field_id = $1
        ${filterClause}
        ORDER BY wd.recorded_at DESC
        LIMIT $2
      `,
      params
    );
    res.json(result.rows.map(toWeatherData));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get analysis history for a field
app.get('/api/analysis/:fieldId', async (req: Req, res: Res) => {
  try {
    const user = getUser(req);
    const filterClause = user.role === 'farmer' ? 'AND f.user_id = $2' : '';
    const params = user.role === 'farmer' ? [req.params.fieldId, user.userId] : [req.params.fieldId];
    const result = await pool.query(
      `
        SELECT aa.*
        FROM ai_analysis aa
        JOIN fields f ON aa.field_id = f.field_id
        WHERE aa.field_id = $1
        ${filterClause}
        ORDER BY aa.analyzed_at DESC
      `,
      params
    );
    res.json(result.rows.map(toAnalysis));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get latest analysis for a field
app.get('/api/analysis/:fieldId/latest', async (req: Req, res: Res) => {
  try {
    const user = getUser(req);
    const filterClause = user.role === 'farmer' ? 'AND f.user_id = $2' : '';
    const params = user.role === 'farmer' ? [req.params.fieldId, user.userId] : [req.params.fieldId];
    const result = await pool.query(
      `
        SELECT aa.*
        FROM ai_analysis aa
        JOIN fields f ON aa.field_id = f.field_id
        WHERE aa.field_id = $1
        ${filterClause}
        ORDER BY aa.analyzed_at DESC
        LIMIT 1
      `,
      params
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No analysis found' });
    }
    res.json(toAnalysis(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get a single field summary
app.get('/api/fields/:id', async (req: Req, res: Res) => {
  try {
    const user = getUser(req);
    const result =
      user.role === 'farmer'
        ? await pool.query('SELECT * FROM field_summary WHERE field_id = $1 AND user_id = $2', [
            req.params.id,
            user.userId,
          ])
        : await pool.query('SELECT * FROM field_summary WHERE field_id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Field not found' });
    }
    res.json(toFieldSummary(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get field summary (alias endpoint)
app.get('/api/fields/:id/summary', async (req: Req, res: Res) => {
  try {
    const user = getUser(req);
    const result =
      user.role === 'farmer'
        ? await pool.query('SELECT * FROM field_summary WHERE field_id = $1 AND user_id = $2', [
            req.params.id,
            user.userId,
          ])
        : await pool.query('SELECT * FROM field_summary WHERE field_id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Field not found' });
    }
    res.json(toFieldSummary(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get dashboard stats
app.get('/api/dashboard/stats', async (_req: Req, res: Res) => {
  try {
    const user = getUser(_req);
    const result = await pool.query('SELECT * FROM user_dashboard WHERE user_id = $1 LIMIT 1', [user.userId]);
    if (result.rows.length > 0) {
      const stats = result.rows[0];
      res.json({
        totalFields: Number(stats.total_fields ?? 0),
        totalArea: Number(stats.total_area ?? 0),
        activeFields: Number(stats.active_fields ?? 0),
        unreadNotifications: Number(stats.unread_notifications ?? 0),
        fieldsAtRisk: 0,
      });
    } else {
      res.json({ totalFields: 0, totalArea: 0, activeFields: 0, unreadNotifications: 0, fieldsAtRisk: 0 });
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get recent activity
app.get('/api/dashboard/activity', async (_req: Req, res: Res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM field_activities WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [getUser(_req).userId]
    );
    res.json(result.rows.map(toActivity));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get notifications
app.get('/api/notifications', async (_req: Req, res: Res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [getUser(_req).userId]
    );
    res.json(result.rows.map(toNotification));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Mark all notifications as read
app.put('/api/notifications/read-all', async (_req: Req, res: Res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false',
      [getUser(_req).userId]
    );
    void emitGatewayEvent({ type: 'NOTIFICATIONS_UPDATED' });
    return res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Mark a notification as read
app.put('/api/notifications/:id/read', async (req: Req, res: Res) => {
  try {
    const user = getUser(req);
    const result = await pool.query(
      `
        UPDATE notifications
        SET is_read = true, read_at = NOW()
        WHERE notification_id = $1 AND user_id = $2
        RETURNING *
      `,
      [req.params.id, user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    void emitGatewayEvent({ type: 'NOTIFICATIONS_UPDATED' });
    return res.json(toNotification(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.listen(port, () => {
  console.log(`✓ Read service listening on port ${port}`);
});
