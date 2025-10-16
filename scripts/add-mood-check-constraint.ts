/**
 * Add CHECK constraint for artist mood (0-100 range)
 *
 * This constraint was defined in shared/schema.ts but wasn't applied
 * when the database was rebuilt after the wipe for Task 1.0 (CASCADE constraints)
 *
 * **Usage:**
 * - Test database:       npx tsx scripts/add-mood-check-constraint.ts --test
 * - Production database: npx tsx scripts/add-mood-check-constraint.ts
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pkg from 'pg';
const { Pool } = pkg;

async function addMoodCheckConstraint() {
  // Parse command-line arguments
  const args = process.argv.slice(2);
  const useTestDb = args.includes('--test');

  // Choose database URL
  const TEST_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/music_label_test';
  const dbUrl = useTestDb ? TEST_DATABASE_URL : process.env.DATABASE_URL;

  console.log('\n=== ADD MOOD CHECK CONSTRAINT ===');
  console.log(`Database: ${useTestDb ? 'Test (localhost:5433)' : (dbUrl?.includes('railway') ? 'Railway (Production)' : 'Production')}`);
  console.log('---');

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: !useTestDb && (process.env.NODE_ENV === 'production' || dbUrl?.includes('railway'))
      ? { rejectUnauthorized: false }
      : undefined,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  const db = drizzle(pool);

  try {
    // Check if constraint already exists
    console.log('[CHECK] Verifying existing constraints...');
    const checkExists = await pool.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'artists'
      AND constraint_type = 'CHECK'
      AND constraint_name = 'artists_mood_check';
    `);

    if (checkExists.rows.length > 0) {
      console.log('[CHECK] ✅ Constraint "artists_mood_check" already exists');
      await pool.end();
      return;
    }

    console.log('[CHECK] Constraint not found. Adding now...');

    // Add CHECK constraint
    await db.execute(sql`
      ALTER TABLE artists
      ADD CONSTRAINT artists_mood_check
      CHECK (mood >= 0 AND mood <= 100);
    `);

    console.log('[SUCCESS] ✅ Successfully added "artists_mood_check" constraint');
    console.log('[SUCCESS] Artist mood values are now constrained to 0-100 range');
    console.log('\n📝 Note: This applies to all future INSERT/UPDATE operations');
    console.log('   Existing rows with invalid mood values will NOT be affected');

  } catch (error) {
    console.error('\n[ERROR] ❌ Failed to add constraint:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
addMoodCheckConstraint();
