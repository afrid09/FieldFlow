// Purpose: Service module: seed.
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@postgres:5432/fieldflow';
const SEED_FILE = process.env.SEED_FILE;
const SEED_ENV = process.env.SEED_ENV || 'dev';
const SEEDS_DIR = process.env.SEEDS_DIR || path.resolve(__dirname, '../../infra/seeds');

const resolveSeedPath = () => {
  if (SEED_FILE) {
    return path.resolve(SEED_FILE);
  }
  return path.join(SEEDS_DIR, `${SEED_ENV}.sql`);
};

const pool = new Pool({ connectionString: DATABASE_URL });

const main = async () => {
  const seedPath = resolveSeedPath();
  try {
    if (!fs.existsSync(seedPath)) {
      throw new Error(`Seed file not found: ${seedPath}`);
    }
    const sql = fs.readFileSync(seedPath, 'utf8');
    if (!sql.trim()) {
      console.log(`No seed statements in ${seedPath}`);
      return;
    }
    await pool.query(sql);
    console.log(`✓ Seeded from ${seedPath}`);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

void main();
