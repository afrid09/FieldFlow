import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@postgres:5432/fieldflow';
const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR || path.resolve(__dirname, '../../infra/migrations');
const MIGRATIONS_DOWN_DIR = process.env.MIGRATIONS_DOWN_DIR || MIGRATIONS_DIR;

const pool = new Pool({ connectionString: DATABASE_URL });

const ensureMigrationsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

const getAppliedMigrations = async () => {
  const result = await pool.query('SELECT filename FROM schema_migrations ORDER BY filename ASC');
  return result.rows.map((row) => row.filename as string);
};

const runMigration = async (filename: string, sql: string) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
    await client.query('COMMIT');
    console.log(`✓ Applied migration ${filename}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const rollbackMigration = async (filename: string, sql: string) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('DELETE FROM schema_migrations WHERE filename = $1', [filename]);
    await client.query('COMMIT');
    console.log(`✓ Rolled back migration ${filename}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const main = async () => {
  try {
    await ensureMigrationsTable();
    const applied = await getAppliedMigrations();
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.up.sql'))
      .sort();

    const mode = process.argv[2] || 'up';
    if (mode === 'down') {
      const appliedList = [...applied].sort();
      if (appliedList.length === 0) {
        console.log('No migrations to rollback');
        return;
      }
      const last = appliedList[appliedList.length - 1];
      const downFile = path.join(MIGRATIONS_DOWN_DIR, last.replace('.up.sql', '.down.sql'));
      if (!fs.existsSync(downFile)) {
        throw new Error(`Missing down migration for ${last}`);
      }
      const sql = fs.readFileSync(downFile, 'utf8');
      await rollbackMigration(last, sql);
      console.log('✓ Rollback complete');
      return;
    }

    for (const file of files) {
      if (applied.includes(file)) {
        continue;
      }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await runMigration(file, sql);
    }

    console.log('✓ Migrations complete');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

void main();
