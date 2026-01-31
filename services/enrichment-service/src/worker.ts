import { Pool } from 'pg';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@postgres:5432/fieldflow',
});

console.log('✓ Enrichment Service Worker starting...');

async function processEvents() {
  try {
    const result = await pool.query(`
      SELECT * FROM events 
      WHERE event_type = 'FIELD_CREATED' 
      AND metadata->>'enriched' IS NULL
      LIMIT 5;
    `);

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
  }
}

setInterval(processEvents, 10000);
