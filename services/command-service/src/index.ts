import './otel';
import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import client from 'prom-client';

const app = express();
const port = process.env.PORT || 3001;
const DEFAULT_USER_ID = process.env.DEFAULT_USER_ID || '00000000-0000-0000-0000-000000000001';
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://api-gateway:3000';
const INTERNAL_EVENT_SECRET = process.env.INTERNAL_EVENT_SECRET;
const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET;
const AUTH_TOKEN_TTL = process.env.AUTH_TOKEN_TTL || '7d';
const ALLOW_PUBLIC_REGISTER = process.env.ALLOW_PUBLIC_REGISTER === 'true';
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

const requireRole = (allowed: Role[]) => (req: Request, res: Response, next: () => void) => {
  const user = (req as Request & { user?: AuthUser }).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!allowed.includes(user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

const getUser = (req: Request) => (req as Request & { user: AuthUser }).user;

const soilSchema = z.object({
  fieldId: z.string().min(1),
  phLevel: z.number().nullable().optional(),
  nitrogenPpm: z.number().nullable().optional(),
  phosphorusPpm: z.number().nullable().optional(),
  potassiumPpm: z.number().nullable().optional(),
  organicMatterPercent: z.number().nullable().optional(),
  moisturePercent: z.number().nullable().optional(),
  temperatureCelsius: z.number().nullable().optional(),
  sampleDate: z.string().nullable().optional(),
  labTested: z.boolean().nullable().optional(),
});

const weatherSchema = z.object({
  fieldId: z.string().min(1),
  temperatureCelsius: z.number().nullable().optional(),
  humidityPercent: z.number().nullable().optional(),
  pressureHpa: z.number().nullable().optional(),
  rainfallMm: z.number().nullable().optional(),
  windSpeedKmh: z.number().nullable().optional(),
  windDirectionDegrees: z.number().nullable().optional(),
  solarRadiationWm2: z.number().nullable().optional(),
  recordedAt: z.string().nullable().optional(),
  dataSource: z.string().nullable().optional(),
});

const analysisSchema = z.object({
  analysisType: z.string().optional(),
  summary: z.string().optional(),
  recommendations: z.array(z.any()).optional(),
  confidenceScore: z.number().nullable().optional(),
  riskLevel: z.string().nullable().optional(),
  riskFactors: z.array(z.any()).optional(),
  yieldPrediction: z.number().nullable().optional(),
  qualityScore: z.number().nullable().optional(),
  modelVersion: z.string().nullable().optional(),
});

const fieldCreateSchema = z.object({
  fieldName: z.string().min(1),
  cropType: z.string().nullable().optional(),
  areaHectares: z.coerce.number().nonnegative(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  userId: z.string().nullable().optional(),
});

const fieldUpdateSchema = z
  .object({
    fieldName: z.string().nullable().optional(),
    cropType: z.string().nullable().optional(),
    areaHectares: z.coerce.number().nullable().optional(),
    status: z.string().nullable().optional(),
    latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
    longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
  })
  .refine(
    (data) =>
      (data.latitude === null || data.latitude === undefined) &&
      (data.longitude === null || data.longitude === undefined)
        ? true
        : data.latitude !== null &&
          data.latitude !== undefined &&
          data.longitude !== null &&
          data.longitude !== undefined,
    { message: 'latitude and longitude must be provided together' }
  );

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

const authLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const authRegisterSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  password: z.string().min(6),
  role: z.enum(['admin', 'manager', 'farmer']).optional(),
});

const signToken = (user: { userId: string; role: Role; email?: string }) => {
  if (!AUTH_JWT_SECRET) {
    throw new Error('AUTH_JWT_SECRET is not configured');
  }
  const options: jwt.SignOptions = {
    subject: user.userId,
    expiresIn: AUTH_TOKEN_TTL as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign({ role: user.role, email: user.email }, AUTH_JWT_SECRET as jwt.Secret, options);
};

const assertFieldAccess = async (fieldId: string, user: AuthUser) => {
  const result = await pool.query('SELECT field_id, user_id FROM fields WHERE field_id = $1', [fieldId]);
  if (result.rows.length === 0) {
    return { ok: false as const, status: 404, error: 'Field not found' };
  }
  const ownerId = result.rows[0].user_id as string;
  if (user.role === 'farmer' && ownerId !== user.userId) {
    return { ok: false as const, status: 403, error: 'Forbidden' };
  }
  return { ok: true as const, ownerId };
};

app.get('/', (_req: Request, res: Response) => res.send('FieldFlow Command Service'));

// Health check
app.get('/health', async (_req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: (err as Error).message });
  }
});

// Metrics
app.get('/metrics', async (_req: Request, res: Response) => {
  res.set('Content-Type', metricsRegister.contentType);
  res.end(await metricsRegister.metrics());
});

// Auth endpoints
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const parsed = authLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid login payload', details: parsed.error.errors });
  }

  try {
    const userResult = await pool.query(
      'SELECT user_id, email, full_name, role, password_hash FROM users WHERE email = $1 AND is_active = true LIMIT 1',
      [parsed.data.email]
    );
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const userRow = userResult.rows[0];
    const passwordHash = userRow.password_hash as string | null;
    if (!passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const ok = await bcrypt.compare(parsed.data.password, passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const authUser: AuthUser = {
      userId: userRow.user_id,
      role: userRow.role,
      email: userRow.email,
    };
    const token = signToken(authUser);
    return res.json({
      token,
      user: {
        userId: authUser.userId,
        email: authUser.email,
        role: authUser.role,
        fullName: userRow.full_name,
      },
    });
  } catch (err) {
    console.error('Error during login:', err);
    return res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/auth/register', async (req: Request, res: Response) => {
  const parsed = authRegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid registration payload', details: parsed.error.errors });
  }

  if (!ALLOW_PUBLIC_REGISTER) {
    if (!AUTH_JWT_SECRET) {
      return res.status(403).json({ error: 'Registration disabled' });
    }
    try {
      const user = getAuthUser(req);
      if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
        return res.status(403).json({ error: 'Registration disabled' });
      }
    } catch {
      return res.status(403).json({ error: 'Registration disabled' });
    }
  }

  try {
    let creator: AuthUser | null = null;
    if (!ALLOW_PUBLIC_REGISTER) {
      try {
        creator = getAuthUser(req);
      } catch {
        return res.status(403).json({ error: 'Registration disabled' });
      }
    }

    let requestedRole: Role = parsed.data.role ?? 'farmer';
    if (ALLOW_PUBLIC_REGISTER) {
      requestedRole = 'farmer';
    }
    if (!ALLOW_PUBLIC_REGISTER) {
      if (creator?.role === 'manager' && requestedRole !== 'farmer') {
        return res.status(403).json({ error: 'Managers can only create farmer accounts' });
      }
      if (creator?.role !== 'admin' && requestedRole === 'admin') {
        return res.status(403).json({ error: 'Only admins can create admin accounts' });
      }
    }

    const existing = await pool.query('SELECT 1 FROM users WHERE email = $1', [parsed.data.email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const role: Role = requestedRole;
    const result = await pool.query(
      `
        INSERT INTO users (email, full_name, role, password_hash)
        VALUES ($1, $2, $3, $4)
        RETURNING user_id, email, full_name, role
      `,
      [parsed.data.email, parsed.data.fullName, role, passwordHash]
    );
    const row = result.rows[0];
    const token = signToken({ userId: row.user_id, role: row.role, email: row.email });
    return res.status(201).json({
      token,
      user: {
        userId: row.user_id,
        email: row.email,
        role: row.role,
        fullName: row.full_name,
      },
    });
  } catch (err) {
    console.error('Error during registration:', err);
    return res.status(500).json({ error: (err as Error).message });
  }
});

// Protect API routes
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/')) {
    return next();
  }
  return authMiddleware(req, res, next);
});

// Create a new field
app.post('/api/fields', async (req: Request, res: Response) => {
  const parsed = fieldCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid field payload', details: parsed.error.errors });
  }

  const { fieldName, cropType, areaHectares, latitude, longitude, userId } = parsed.data;
  const authUser = getUser(req);
  if (authUser.role === 'farmer' && userId && userId !== authUser.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const targetUserId =
    (authUser.role === 'admin' || authUser.role === 'manager') && userId ? userId : authUser.userId;
  
  try {
    const query = `
      INSERT INTO fields (user_id, field_name, crop_type, area_hectares, location)
      VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326))
      RETURNING *;
    `;
    const values = [
      targetUserId || DEFAULT_USER_ID,
      fieldName,
      cropType,
      areaHectares,
      longitude,
      latitude
    ];
    
    const result = await pool.query(query, values);
    
    await pool.query(`
      INSERT INTO events (aggregate_id, aggregate_type, event_type, payload)
      VALUES ($1, 'FIELD', 'FIELD_CREATED', $2)
    `, [result.rows[0].field_id, JSON.stringify(result.rows[0])]);

    void emitGatewayEvent({ type: 'FIELD_CREATED', fieldId: result.rows[0].field_id });
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating field:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// Update a field
app.put('/api/fields/:id', async (req: Request, res: Response) => {
  const parsed = fieldUpdateSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid field payload', details: parsed.error.errors });
  }

  const { fieldName, cropType, areaHectares, latitude, longitude, status } = parsed.data;

  try {
    const access = await assertFieldAccess(req.params.id, getUser(req));
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const updateQuery = `
      UPDATE fields
      SET
        field_name = COALESCE($2, field_name),
        crop_type = COALESCE($3, crop_type),
        area_hectares = COALESCE($4, area_hectares),
        status = COALESCE($5, status),
        location = CASE
          WHEN $6 IS NOT NULL AND $7 IS NOT NULL THEN ST_SetSRID(ST_MakePoint($6, $7), 4326)
          ELSE location
        END
      WHERE field_id = $1
      RETURNING *;
    `;

    const result = await pool.query(updateQuery, [
      req.params.id,
      fieldName ?? null,
      cropType ?? null,
      areaHectares ?? null,
      status ?? null,
      longitude ?? null,
      latitude ?? null,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Field not found' });
    }

    await pool.query(
      `
        INSERT INTO events (aggregate_id, aggregate_type, event_type, payload)
        VALUES ($1, 'FIELD', 'FIELD_UPDATED', $2)
      `,
      [result.rows[0].field_id, JSON.stringify(result.rows[0])]
    );

    void emitGatewayEvent({ type: 'FIELD_UPDATED', fieldId: result.rows[0].field_id });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating field:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// Delete a field
app.delete('/api/fields/:id', async (req: Request, res: Response) => {
  try {
    const access = await assertFieldAccess(req.params.id, getUser(req));
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const result = await pool.query('DELETE FROM fields WHERE field_id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Field not found' });
    }

    await pool.query(
      `
        INSERT INTO events (aggregate_id, aggregate_type, event_type, payload)
        VALUES ($1, 'FIELD', 'FIELD_DELETED', $2)
      `,
      [req.params.id, JSON.stringify(result.rows[0])]
    );

    void emitGatewayEvent({ type: 'FIELD_DELETED', fieldId: req.params.id });
    return res.status(204).send();
  } catch (err) {
    console.error('Error deleting field:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// Add soil data for a field
app.post('/api/soil', async (req: Request, res: Response) => {
  const parsed = soilSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid soil payload', details: parsed.error.errors });
  }
  const {
    fieldId,
    phLevel,
    nitrogenPpm,
    phosphorusPpm,
    potassiumPpm,
    organicMatterPercent,
    moisturePercent,
    temperatureCelsius,
    sampleDate,
    labTested,
  } = parsed.data;

  try {
    const access = await assertFieldAccess(fieldId, getUser(req));
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const result = await pool.query(
      `
        INSERT INTO soil_data (
          field_id,
          ph_level,
          nitrogen_ppm,
          phosphorus_ppm,
          potassium_ppm,
          organic_matter_percent,
          moisture_percent,
          temperature_celsius,
          sample_date,
          lab_tested
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, NOW()), COALESCE($10, false))
        RETURNING *;
      `,
      [
        fieldId,
        phLevel ?? null,
        nitrogenPpm ?? null,
        phosphorusPpm ?? null,
        potassiumPpm ?? null,
        organicMatterPercent ?? null,
        moisturePercent ?? null,
        temperatureCelsius ?? null,
        sampleDate ?? null,
        labTested ?? null,
      ]
    );

    await pool.query(
      `
        INSERT INTO events (aggregate_id, aggregate_type, event_type, payload)
        VALUES ($1, 'SOIL', 'SOIL_CREATED', $2)
      `,
      [fieldId, JSON.stringify(result.rows[0])]
    );

    void emitGatewayEvent({ type: 'SOIL_UPDATED', fieldId });
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating soil data:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// Add weather data for a field
app.post('/api/weather', async (req: Request, res: Response) => {
  const parsed = weatherSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid weather payload', details: parsed.error.errors });
  }
  const {
    fieldId,
    temperatureCelsius,
    humidityPercent,
    pressureHpa,
    rainfallMm,
    windSpeedKmh,
    windDirectionDegrees,
    solarRadiationWm2,
    recordedAt,
    dataSource,
  } = parsed.data;

  try {
    const access = await assertFieldAccess(fieldId, getUser(req));
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const result = await pool.query(
      `
        INSERT INTO weather_data (
          field_id,
          temperature_celsius,
          humidity_percent,
          pressure_hpa,
          rainfall_mm,
          wind_speed_kmh,
          wind_direction_degrees,
          solar_radiation_wm2,
          recorded_at,
          data_source
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, NOW()), COALESCE($10, 'api'))
        RETURNING *;
      `,
      [
        fieldId,
        temperatureCelsius ?? null,
        humidityPercent ?? null,
        pressureHpa ?? null,
        rainfallMm ?? null,
        windSpeedKmh ?? null,
        windDirectionDegrees ?? null,
        solarRadiationWm2 ?? null,
        recordedAt ?? null,
        dataSource ?? null,
      ]
    );

    await pool.query(
      `
        INSERT INTO events (aggregate_id, aggregate_type, event_type, payload)
        VALUES ($1, 'WEATHER', 'WEATHER_CREATED', $2)
      `,
      [fieldId, JSON.stringify(result.rows[0])]
    );

    void emitGatewayEvent({ type: 'WEATHER_UPDATED', fieldId });
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating weather data:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// Trigger analysis for a field
app.post('/api/analysis/:fieldId/trigger', async (req: Request, res: Response) => {
  const { fieldId } = req.params;
  if (!fieldId) {
    return res.status(400).json({ error: 'fieldId is required' });
  }

  const parsed = analysisSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid analysis payload', details: parsed.error.errors });
  }

  const {
    analysisType,
    summary,
    recommendations,
    confidenceScore,
    riskLevel,
    riskFactors,
    yieldPrediction,
    qualityScore,
    modelVersion,
  } = parsed.data;

  try {
    const access = await assertFieldAccess(fieldId, getUser(req));
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const computedSummary =
      summary ||
      `Analysis triggered for field ${fieldId}. Conditions appear stable with no critical risks detected.`;

    const result = await pool.query(
      `
        INSERT INTO ai_analysis (
          field_id,
          analysis_type,
          summary,
          recommendations,
          confidence_score,
          risk_level,
          risk_factors,
          yield_prediction,
          quality_score,
          model_version
        )
        VALUES ($1, $2, $3, COALESCE($4, '[]'::jsonb), $5, $6, COALESCE($7, '[]'::jsonb), $8, $9, $10)
        RETURNING *;
      `,
      [
        fieldId,
        analysisType ?? 'MANUAL_TRIGGER',
        computedSummary,
        recommendations ? JSON.stringify(recommendations) : null,
        confidenceScore ?? null,
        riskLevel ?? 'low',
        riskFactors ? JSON.stringify(riskFactors) : null,
        yieldPrediction ?? null,
        qualityScore ?? null,
        modelVersion ?? null,
      ]
    );

    await pool.query(
      `
        INSERT INTO events (aggregate_id, aggregate_type, event_type, payload)
        VALUES ($1, 'ANALYSIS', 'ANALYSIS_TRIGGERED', $2)
      `,
      [fieldId, JSON.stringify(result.rows[0])]
    );

    void emitGatewayEvent({ type: 'ANALYSIS_UPDATED', fieldId });
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error triggering analysis:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.listen(port, () => {
  console.log(`✓ Command service listening on port ${port}`);
});
