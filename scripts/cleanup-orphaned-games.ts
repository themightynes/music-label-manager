/**
 * Orphaned Game Cleanup Script
 *
 * **Purpose:** DevOps maintenance tool for identifying and cleaning up orphaned game data
 *
 * **Context (Post-Database Wipe):**
 * - Both test and Railway production databases were wiped clean on 2025-10-15
 * - All foreign keys now have proper CASCADE delete constraints
 * - This script will find **0 orphaned games** on first run - THIS IS EXPECTED!
 * - Script remains valuable as future-proof maintenance tool for ongoing database health
 *
 * **What Are Orphaned Games?**
 * Orphaned games are game_states records that have no corresponding save files.
 * These accumulate when users:
 * - Start a game but never save it
 * - Navigate away without completing the game
 * - Experience browser crashes or data loss
 *
 * **When to Run This Script:**
 * - Periodic maintenance (weekly/monthly)
 * - After significant user activity spikes
 * - When database size grows unexpectedly
 * - As part of regular DevOps health checks
 *
 * **Safety Features:**
 * - Dry-run mode by default (use --execute to actually delete)
 * - Batch processing (100 games at a time)
 * - Transaction-based (atomic per batch)
 * - Idempotent (safe to run multiple times)
 * - Detailed metrics logging
 *
 * **Usage:**
 * ```bash
 * # Preview orphaned games (dry-run mode - default)
 * npm run db:cleanup-orphaned
 *
 * # Actually delete orphaned games
 * npm run db:cleanup-orphaned -- --execute
 * ```
 *
 * **Expected Output (Post-Wipe):**
 * ```
 * [CLEANUP] Starting orphaned game cleanup (DRY RUN)
 * [CLEANUP] Total games: 0
 * [CLEANUP] Orphaned games found: 0
 * [CLEANUP] No orphaned games to clean up. Database is healthy!
 * ```
 *
 * **PRD Reference:** Tasks/0006-prd-database-maintenance-orphaned-games.md (FR-6, FR-7, FR-8)
 * **Implementation Date:** 2025-10-15
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, sql } from 'drizzle-orm';
import pkg from 'pg';
const { Pool } = pkg;
import { gameStates, gameSaves } from '../shared/schema.js';

// Parse command-line arguments
const args = process.argv.slice(2);
const executeMode = args.includes('--execute');
const BATCH_SIZE = 100;

interface OrphanedGame {
  id: string;
  userId: string;
  currentWeek: number;
  createdAt: Date;
}

interface CleanupMetrics {
  totalGames: number;
  orphanedCount: number;
  deletedCount: number;
  sampleOrphanedIds: string[];
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
}

/**
 * Main cleanup function
 */
async function cleanupOrphanedGames() {
  const startTime = new Date();
  console.log('\n=== ORPHANED GAME CLEANUP ===');
  console.log(`Mode: ${executeMode ? 'EXECUTE' : 'DRY RUN'}`);
  console.log(`Start time: ${startTime.toISOString()}`);
  console.log('---');

  // Initialize database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  const db = drizzle(pool);

  try {
    // Task 3.5: Capture "before" metrics
    const metrics: CleanupMetrics = {
      totalGames: 0,
      orphanedCount: 0,
      deletedCount: 0,
      sampleOrphanedIds: [],
      startTime
    };

    // Get total game count
    const totalGamesResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(gameStates);
    metrics.totalGames = totalGamesResult[0]?.count || 0;

    console.log(`[BEFORE] Total games in database: ${metrics.totalGames}`);

    // Task 3.3: Identify orphaned games using LEFT JOIN
    // Orphaned games are those with NO corresponding save files
    // Note: game_saves.game_state is JSONB, we extract gameId from it
    const orphanedGamesQuery = sql`
      SELECT
        gs.id,
        gs.user_id,
        gs.current_week,
        gs.created_at
      FROM game_states gs
      LEFT JOIN game_saves gsaves ON gs.id = (gsaves.game_state->'gameState'->>'id')::uuid
      WHERE gsaves.id IS NULL
      ORDER BY gs.created_at ASC
    `;

    const orphanedGamesResult = await db.execute(orphanedGamesQuery);
    const orphanedGames = orphanedGamesResult.rows as OrphanedGame[];

    metrics.orphanedCount = orphanedGames.length;
    metrics.sampleOrphanedIds = orphanedGames.slice(0, 5).map(g => g.id);

    console.log(`[FOUND] Orphaned games: ${metrics.orphanedCount}`);

    if (metrics.orphanedCount === 0) {
      console.log('\n✅ No orphaned games found. Database is healthy!');
      console.log('\n📝 Note: This is expected immediately after the database wipe (2025-10-15).');
      console.log('   Orphaned games will accumulate over time as users start games without saving.');

      const endTime = new Date();
      console.log(`\nCompleted in ${endTime.getTime() - startTime.getTime()}ms`);
      await pool.end();
      return;
    }

    // Show sample of orphaned games
    console.log('\n[SAMPLE] First 5 orphaned games:');
    metrics.sampleOrphanedIds.forEach((id, index) => {
      const game = orphanedGames[index];
      console.log(`  ${index + 1}. Game ${id} (Week ${game.currentWeek}, Created: ${game.createdAt.toISOString()})`);
    });

    if (!executeMode) {
      console.log('\n⚠️  DRY RUN MODE - No deletions performed');
      console.log(`   Run with --execute flag to delete ${metrics.orphanedCount} orphaned games`);

      const endTime = new Date();
      console.log(`\nCompleted in ${endTime.getTime() - startTime.getTime()}ms`);
      await pool.end();
      return;
    }

    // Task 3.6 & 3.7: Batch delete orphaned games in transactions
    console.log('\n[DELETE] Starting batch deletion...');

    for (let i = 0; i < orphanedGames.length; i += BATCH_SIZE) {
      const batch = orphanedGames.slice(i, i + BATCH_SIZE);
      const batchIds = batch.map(g => g.id);

      // Delete batch in a transaction
      await pool.query('BEGIN');
      try {
        const deleteResult = await db
          .delete(gameStates)
          .where(sql`${gameStates.id} = ANY(${batchIds})`);

        await pool.query('COMMIT');

        metrics.deletedCount += batch.length;
        console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: Deleted ${batch.length} games (Total: ${metrics.deletedCount})`);
      } catch (error) {
        await pool.query('ROLLBACK');
        console.error(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: FAILED - ${(error as Error).message}`);
        throw error;
      }
    }

    // Task 3.8: Capture "after" metrics
    const totalGamesAfterResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(gameStates);
    const totalGamesAfter = totalGamesAfterResult[0]?.count || 0;

    metrics.endTime = new Date();
    metrics.durationMs = metrics.endTime.getTime() - metrics.startTime.getTime();

    // Task 3.9: Log results summary
    console.log('\n=== CLEANUP COMPLETE ===');
    console.log(`[AFTER] Total games remaining: ${totalGamesAfter}`);
    console.log(`[DELETED] Orphaned games removed: ${metrics.deletedCount}`);
    console.log(`[DURATION] ${metrics.durationMs}ms`);
    console.log(`[EXPECTED] 0 orphaned games on first run after database wipe`);

    if (metrics.deletedCount > 0) {
      console.log('\n✅ Database cleanup successful!');
    }

    await pool.end();

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run the cleanup
cleanupOrphanedGames();
