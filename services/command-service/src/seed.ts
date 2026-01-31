import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@postgres:5432/fieldflow';
const SEED_ENV = process.env.SEED_ENV || 'dev';
const SEEDS_DIR = process.env.SEEDS_DIR || path.resolve(__dirname, '../../infra/seeds');

const pool = new Pool({ connectionString: DATABASE_URL });

const seedFile = path.join(SEEDS_DIR, `${SEED_ENV}.sql`);

const main = async () => {
  try {
    if (!fs.existsSync(seedFile)) {
      throw new Error(`Seed file not found: ${seedFile}`);
    }
    const sql = fs.readFileSync(seedFile, 'utf8');
    if (!sql.trim()) {
      console.log(`No seed statements in ${seedFile}`);
      return;
    }
    await pool.query(sql);
    console.log(`✓ Seeded ${SEED_ENV}`);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

void main();
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@postgres:5432/fieldflow';
const SEED_FILE = process.env.SEED_FILE;

if (!SEED_FILE) {
  console.error('SEED_FILE is required');
  process.exit(1);
}

const seedPath = path.resolve(SEED_FILE);
const pool = new Pool({ connectionString: DATABASE_URL });

const main = async () => {
  try {
    const sql = fs.readFileSync(seedPath, 'utf8');
    await pool.query(sql);
    console.log(`✓ Seeded from ${seedPath}`);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

void main();
