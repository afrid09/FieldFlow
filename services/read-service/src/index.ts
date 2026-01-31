import express from 'express';
import { Pool } from 'pg';

const app = express();
const port = process.env.PORT || 3003;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@postgres:5432/fieldflow',
});

app.use(express.json());

app.get('/', (req, res) => res.send('FieldFlow Read Service'));

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: (err as Error).message });
  }
});

// Get all fields (using the field_summary view)
app.get('/api/fields', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM field_summary ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get dashboard stats
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM user_dashboard LIMIT 1');
    if (result.rows.length > 0) {
      const stats = result.rows[0];
      res.json({
        totalFields: parseInt(stats.total_fields),
        totalArea: parseFloat(stats.total_area),
        activeFields: parseInt(stats.active_fields),
        unreadNotifications: parseInt(stats.unread_notifications),
        fieldsAtRisk: 0
      });
    } else {
      res.json({ totalFields: 0, totalArea: 0, activeFields: 0, unreadNotifications: 0, fieldsAtRisk: 0 });
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.listen(port, () => {
  console.log(`✓ Read service listening on port ${port}`);
});
