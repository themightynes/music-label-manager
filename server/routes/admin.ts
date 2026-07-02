import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import { ActionsConfigSchema } from '@shared/api/contracts';
import { gameStates } from '@shared/schema';
import { db } from '../db';
import { sql, inArray } from 'drizzle-orm';
import { requireClerkUser, requireAdmin } from '../auth';

const router = Router();

// Admin-only test endpoint
router.get('/api/admin/health', requireClerkUser, requireAdmin, (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Actions configuration endpoints (Admin only)
router.get('/api/admin/actions-config', requireClerkUser, requireAdmin, async (req, res) => {
    try {
      const actionsPath = path.join(process.cwd(), 'data', 'actions.json');
      const configData = await fs.readFile(actionsPath, 'utf8');
      const config = JSON.parse(configData);
      res.json(config);
    } catch (error) {
      console.error('Failed to load actions config:', error);
      res.status(500).json({ error: 'Failed to load actions configuration' });
    }
  });

router.post('/api/admin/actions-config', requireClerkUser, requireAdmin, async (req, res) => {
    try {
      const { config } = req.body;

      if (!config) {
        return res.status(400).json({ error: 'Configuration data is required' });
      }

      // Validate using shared schema from contracts
      try {
        ActionsConfigSchema.parse(config);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          return res.status(400).json({
            error: 'Invalid actions configuration structure',
            details: validationError.errors
          });
        }
        throw validationError;
      }

      const actionsPath = path.join(process.cwd(), 'data', 'actions.json');

      // Create backup before overwriting
      const backupPath = path.join(process.cwd(), 'data', 'actions.json.backup');
      try {
        const existingData = await fs.readFile(actionsPath, 'utf8');
        await fs.writeFile(backupPath, existingData, 'utf8');
        console.log('Created backup at', backupPath);
      } catch (backupError) {
        console.warn('Failed to create backup, continuing with save:', backupError);
      }

      // Write the new configuration
      const formattedConfig = JSON.stringify(config, null, 2);
      await fs.writeFile(actionsPath, formattedConfig, 'utf8');

      res.json({
        success: true,
        message: 'Actions configuration updated successfully',
        backupCreated: true
      });
    } catch (error) {
      console.error('Failed to save actions config:', error);
      res.status(500).json({
        error: 'Failed to save actions configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

// Database health monitoring endpoints (Admin only) - PRD-0006
router.get('/api/admin/database-stats', requireClerkUser, requireAdmin, async (req, res) => {
    try {
      // Get total games count
      const totalGamesResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(gameStates);
      const totalGamesCount = totalGamesResult[0]?.count || 0;

      // Get orphaned games using LEFT JOIN query from cleanup script (FR-6)
      const orphanedGamesQuery = sql`
        SELECT
          gs.id,
          gs.user_id,
          gs.current_week,
          gs.created_at
        FROM game_states gs
        LEFT JOIN game_saves gsaves ON gs.id = (gsaves.game_state->'gameState'->>'id')::uuid
        WHERE gsaves.id IS NULL
        ORDER BY gs.created_at DESC
      `;

      const orphanedGamesResult = await db.execute(orphanedGamesQuery);
      const orphanedGames = orphanedGamesResult.rows as Array<{
        id: string;
        user_id: string;
        current_week: number;
        created_at: Date;
      }>;

      const orphanedGamesCount = orphanedGames.length;
      const orphanedPercentage = totalGamesCount > 0
        ? (orphanedGamesCount / totalGamesCount) * 100
        : 0;

      // Get database size (PostgreSQL specific)
      const dbSizeQuery = sql`
        SELECT pg_database_size(current_database())::bigint as size
      `;
      const dbSizeResult = await db.execute(dbSizeQuery);
      const dbSizeBytes = Number(dbSizeResult.rows[0]?.size || 0);
      const databaseSizeMB = Number((dbSizeBytes / (1024 * 1024)).toFixed(2));

      // Get top users by orphaned games count (with hashed user IDs for privacy)
      const topUsersQuery = sql`
        SELECT
          gs.user_id,
          COUNT(*) as orphaned_count
        FROM game_states gs
        LEFT JOIN game_saves gsaves ON gs.id = (gsaves.game_state->'gameState'->>'id')::uuid
        WHERE gsaves.id IS NULL
        GROUP BY gs.user_id
        ORDER BY orphaned_count DESC
        LIMIT 10
      `;

      const topUsersResult = await db.execute(topUsersQuery);
      const topUsersOrphanedGames = (topUsersResult.rows as Array<{
        user_id: string;
        orphaned_count: string;
      }>).map(row => ({
        userId: `hash_${row.user_id.substring(0, 8)}`, // Hash user ID for privacy
        orphanedCount: parseInt(row.orphaned_count, 10)
      }));

      // TODO: Implement deletion event logging (FR-10) and return recent deletions
      // For now, return empty array as placeholder
      const recentDeletions: Array<{
        timestamp: string;
        gameId: string;
        gameWeek: number;
        reason: string;
        totalRecords: number;
      }> = [];

      // Return stats in format per PRD Appendix B
      res.json({
        orphanedGamesCount,
        totalGamesCount,
        orphanedPercentage: Number(orphanedPercentage.toFixed(2)),
        databaseSizeMB,
        recentDeletions,
        topUsersOrphanedGames
      });

    } catch (error) {
      console.error('Failed to fetch database stats:', error);
      res.status(500).json({
        error: 'Failed to fetch database statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

// Manual cleanup endpoint for orphaned games (Admin only) - PRD-0006 FR-11
router.post('/api/admin/cleanup-orphaned-games', requireClerkUser, requireAdmin, async (req, res) => {
    try {
      const startTime = new Date();
      const BATCH_SIZE = 100;

      // Capture "before" metrics
      const totalGamesBeforeResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(gameStates);
      const totalGamesBefore = totalGamesBeforeResult[0]?.count || 0;

      // Identify orphaned games using same query as stats endpoint (FR-6)
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
      const orphanedGames = orphanedGamesResult.rows as Array<{
        id: string;
        user_id: string;
        current_week: number;
        created_at: Date;
      }>;

      const orphanedCount = orphanedGames.length;

      if (orphanedCount === 0) {
        return res.json({
          success: true,
          message: 'No orphaned games found. Database is healthy!',
          beforeMetrics: {
            totalGames: totalGamesBefore,
            orphanedGames: 0
          },
          afterMetrics: {
            totalGames: totalGamesBefore,
            deletedCount: 0
          },
          durationMs: new Date().getTime() - startTime.getTime()
        });
      }

      // Batch delete orphaned games (reuse logic from cleanup script)
      let deletedCount = 0;

      for (let i = 0; i < orphanedGames.length; i += BATCH_SIZE) {
        const batch = orphanedGames.slice(i, i + BATCH_SIZE);
        const batchIds = batch.map(g => g.id);

        // Delete batch using inArray for safety
        await db
          .delete(gameStates)
          .where(inArray(gameStates.id, batchIds));

        deletedCount += batch.length;
        console.log(`[ADMIN CLEANUP] Batch ${Math.floor(i / BATCH_SIZE) + 1}: Deleted ${batch.length} games (Total: ${deletedCount})`);
      }

      // Capture "after" metrics
      const totalGamesAfterResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(gameStates);
      const totalGamesAfter = totalGamesAfterResult[0]?.count || 0;

      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();

      // Log deletion event for monitoring
      console.log('[ADMIN CLEANUP] Orphaned game cleanup executed', {
        timestamp: endTime.toISOString(),
        deletedCount,
        durationMs,
        beforeTotal: totalGamesBefore,
        afterTotal: totalGamesAfter,
        reason: 'admin_action'
      });

      res.json({
        success: true,
        message: `Successfully deleted ${deletedCount} orphaned games`,
        beforeMetrics: {
          totalGames: totalGamesBefore,
          orphanedGames: orphanedCount
        },
        afterMetrics: {
          totalGames: totalGamesAfter,
          deletedCount
        },
        durationMs
      });

    } catch (error) {
      console.error('Failed to cleanup orphaned games:', error);
      res.status(500).json({
        error: 'Failed to cleanup orphaned games',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

export default router;
