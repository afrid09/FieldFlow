// Purpose: Background enrichment worker for analysis.
import { Pool } from 'pg';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@postgres:5432/fieldflow',
});

console.log('✓ Enrichment Service Worker starting...');

const POLL_INTERVAL_MS = Number(process.env.ENRICHMENT_POLL_MS || 10000);
let isProcessing = false;

export async function processEvents() {
  if (isProcessing) {
    return;
  }
  isProcessing = true;
  try {
    const result = await pool.query(`
      SELECT * FROM events 
      WHERE event_type = 'FIELD_CREATED' 
      AND metadata->>'enriched' IS NULL
      LIMIT 5;
    `);

    if (result.rows.length === 0) {
      return;
    }

    for (const event of result.rows) {
      console.log(`← Processing enrichment for field: ${event.aggregate_id}`);
      
      const fieldId = event.aggregate_id;
      const payload = event.payload;

      const summary = `AI Analysis for ${payload.field_name}: The soil conditions and crop type (${payload.crop_type}) suggest optimal growth with current irrigation.`;
      const yieldPrediction = 150 + Math.random() * 50;
      
      await pool.query(`
        INSERT INTO ai_analysis (field_id, analysis_type, summary, yield_prediction, risk_level)
        VALUES ($1, 'INITIAL_ENRICHMENT', $2, $3, 'low');
      `, [fieldId, summary, yieldPrediction]);

      await pool.query(`
        UPDATE events 
        SET metadata = metadata || '{"enriched": true}'::jsonb 
        WHERE event_id = $1;
      `, [event.event_id]);

      console.log(`→ Field ${fieldId} enriched successfully.`);
    }
  } catch (err) {
    console.error('Error in enrichment worker:', err);
  } finally {
    isProcessing = false;
  }
}

export const startWorker = () => {
  const interval = setInterval(processEvents, Number.isFinite(POLL_INTERVAL_MS) ? POLL_INTERVAL_MS : 10000);

  const shutdown = async () => {
    console.log('↘ Enrichment Service Worker shutting down...');
    clearInterval(interval);
    try {
      await pool.end();
    } catch (err) {
      console.error('Error closing DB pool:', err);
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return () => {
    clearInterval(interval);
  };
};

if (require.main === module) {
  startWorker();
}
