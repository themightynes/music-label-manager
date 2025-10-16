/**
 * Check CASCADE Constraints
 *
 * Queries PostgreSQL to show actual foreign key constraints and their CASCADE settings
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkCascadeConstraints() {
  console.log('🔍 Checking CASCADE constraints in database...\n');

  try {
    // Query to show all foreign key constraints with their DELETE actions
    const result = await db.execute(sql`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND (ccu.table_name = 'game_states' OR ccu.table_name = 'artists')
      ORDER BY tc.table_name, kcu.column_name;
    `);

    console.log('Foreign Key Constraints:\n');
    console.table(result.rows);

    console.log('\n✅ Check complete!');
    console.log('\n📝 Expected: delete_rule should be "CASCADE" for gameId and artistId foreign keys');

  } catch (error) {
    console.error('❌ Error checking constraints:', error);
    throw error;
  } finally {
    await db.$client.end();
  }
}

checkCascadeConstraints();
