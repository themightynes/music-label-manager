import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway')
    ? { rejectUnauthorized: false }
    : undefined
});

const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: node scripts/apply-migration.mjs <migration-file>');
  process.exit(1);
}

try {
  const sql = fs.readFileSync(migrationFile, 'utf8');
  console.log(`Applying migration: ${migrationFile}`);
  console.log('SQL:\n', sql);

  await pool.query(sql);

  console.log('✓ Migration applied successfully');
} catch (error) {
  console.error('✗ Migration failed:', error.message);
  process.exit(1);
} finally {
  await pool.end();
}
