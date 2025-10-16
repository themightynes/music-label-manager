/**
 * Cleanup Orphaned Data Before CASCADE Schema Migration
 *
 * This script cleans up orphaned records that reference non-existent game_states
 * BEFORE applying CASCADE foreign key constraints. This prevents the migration
 * from failing due to existing constraint violations.
 *
 * Tables to clean:
 * - artists (gameId references game_states)
 * - projects (gameId references game_states)
 * - roles (gameId references game_states)
 * - executives (gameId references game_states)
 * - moodEvents (gameId references game_states)
 * - weeklyActions (gameId references game_states)
 */

import { db } from '../server/db';
import { artists, projects, roles, executives, moodEvents, weeklyActions } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function cleanupOrphanedData() {
  console.log('🧹 Starting orphaned data cleanup before CASCADE migration...\n');

  try {
    // IMPORTANT: Delete in dependency order (child tables first, then parent tables)
    // Projects reference artists, so delete projects BEFORE artists

    // Clean up projects with orphaned gameId FIRST
    console.log('\nChecking projects...');
    const orphanedProjects = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM projects p
      LEFT JOIN game_states gs ON p.game_id = gs.id
      WHERE p.game_id IS NOT NULL AND gs.id IS NULL
    `);
    const projectCount = orphanedProjects.rows[0]?.count || 0;
    console.log(`  Found ${projectCount} orphaned project(s)`);

    if (projectCount > 0) {
      await db.execute(sql`
        DELETE FROM projects
        WHERE game_id IS NOT NULL
        AND game_id NOT IN (SELECT id FROM game_states)
      `);
      console.log(`  ✅ Deleted ${projectCount} orphaned project(s)`);
    }

    // Clean up roles with orphaned gameId
    console.log('\nChecking roles...');
    const orphanedRoles = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM roles r
      LEFT JOIN game_states gs ON r.game_id = gs.id
      WHERE r.game_id IS NOT NULL AND gs.id IS NULL
    `);
    const roleCount = orphanedRoles.rows[0]?.count || 0;
    console.log(`  Found ${roleCount} orphaned role(s)`);

    if (roleCount > 0) {
      await db.execute(sql`
        DELETE FROM roles
        WHERE game_id IS NOT NULL
        AND game_id NOT IN (SELECT id FROM game_states)
      `);
      console.log(`  ✅ Deleted ${roleCount} orphaned role(s)`);
    }

    // Clean up executives with orphaned gameId
    console.log('\nChecking executives...');
    const orphanedExecutives = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM executives e
      LEFT JOIN game_states gs ON e.game_id = gs.id
      WHERE e.game_id IS NOT NULL AND gs.id IS NULL
    `);
    const executiveCount = orphanedExecutives.rows[0]?.count || 0;
    console.log(`  Found ${executiveCount} orphaned executive(s)`);

    if (executiveCount > 0) {
      await db.execute(sql`
        DELETE FROM executives
        WHERE game_id IS NOT NULL
        AND game_id NOT IN (SELECT id FROM game_states)
      `);
      console.log(`  ✅ Deleted ${executiveCount} orphaned executive(s)`);
    }

    // Clean up mood_events with orphaned gameId
    console.log('\nChecking mood_events...');
    const orphanedMoodEvents = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM mood_events me
      LEFT JOIN game_states gs ON me.game_id = gs.id
      WHERE me.game_id IS NOT NULL AND gs.id IS NULL
    `);
    const moodEventCount = orphanedMoodEvents.rows[0]?.count || 0;
    console.log(`  Found ${moodEventCount} orphaned mood_event(s)`);

    if (moodEventCount > 0) {
      await db.execute(sql`
        DELETE FROM mood_events
        WHERE game_id IS NOT NULL
        AND game_id NOT IN (SELECT id FROM game_states)
      `);
      console.log(`  ✅ Deleted ${moodEventCount} orphaned mood_event(s)`);
    }

    // Clean up weekly_actions with orphaned gameId
    console.log('\nChecking weekly_actions...');
    const orphanedWeeklyActions = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM weekly_actions wa
      LEFT JOIN game_states gs ON wa.game_id = gs.id
      WHERE wa.game_id IS NOT NULL AND gs.id IS NULL
    `);
    const weeklyActionCount = orphanedWeeklyActions.rows[0]?.count || 0;
    console.log(`  Found ${weeklyActionCount} orphaned weekly_action(s)`);

    if (weeklyActionCount > 0) {
      await db.execute(sql`
        DELETE FROM weekly_actions
        WHERE game_id IS NOT NULL
        AND game_id NOT IN (SELECT id FROM game_states)
      `);
      console.log(`  ✅ Deleted ${weeklyActionCount} orphaned weekly_action(s)`);
    }

    const totalOrphaned = Number(artistCount) + Number(projectCount) + Number(roleCount) +
                         Number(executiveCount) + Number(moodEventCount) + Number(weeklyActionCount);

    console.log(`\n✅ Cleanup complete! Deleted ${totalOrphaned} total orphaned record(s)`);
    console.log('\n✅ You can now safely run: npm run db:push');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await db.$client.end();
  }
}

// Run cleanup
cleanupOrphanedData();
