import express from 'express';
import { Pool } from 'pg';

const app = express();
const port = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@postgres:5432/fieldflow',
});

app.use(express.json());

app.get('/', (req, res) => res.send('FieldFlow Command Service'));

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: (err as Error).message });
  }
});

// Create a new field
app.post('/api/fields', async (req, res) => {
  const { fieldName, cropType, areaHectares, latitude, longitude, userId } = req.body;
  
  try {
    const query = `
      INSERT INTO fields (user_id, field_name, crop_type, area_hectares, location)
      VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326))
      RETURNING *;
    `;
    const values = [
      userId || '00000000-0000-0000-0000-000000000001',
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

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating field:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.listen(port, () => {
  console.log(`✓ Command service listening on port ${port}`);
});
