import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import {
  ActionsConfigSchema,
  EventsConfigSchema,
  AnyPlaytestFeedbackResponsesSchema,
  PLAYTEST_FEEDBACK_FORM_ID,
  PLAYTEST_FEEDBACK_FORM_ID_V2,
  PLAYTEST_FEEDBACK_FORM_ID_V3,
  PLAYTEST_FORM_REGISTRY,
  ACTIVE_PLAYTEST_FORM_ID,
  isPlaytestFormId,
  buildEmptyPlaytestFeedbackResponsesFor,
  type AnyPlaytestFeedbackResponses,
  type PlaytestFormId,
} from '@shared/api/contracts';
import { gameStates } from '@shared/schema';
import { db } from '../db';
import { sql, inArray } from 'drizzle-orm';
import { requireClerkUser, requireAdmin } from '../auth';
import { gameDataLoader } from '@shared/utils/dataLoader';
import { diffContentById, appendContentChangelogEntry } from '../utils/contentChangelog';

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

      // Create backup before overwriting (also gives us the pre-save data
      // for the changelog diff below).
      const backupPath = path.join(process.cwd(), 'data', 'actions.json.backup');
      let previousConfig: any = null;
      try {
        const existingData = await fs.readFile(actionsPath, 'utf8');
        previousConfig = JSON.parse(existingData);
        await fs.writeFile(backupPath, existingData, 'utf8');
        console.log('Created backup at', backupPath);
      } catch (backupError) {
        console.warn('Failed to create backup, continuing with save:', backupError);
      }

      // Write the new configuration
      const formattedConfig = JSON.stringify(config, null, 2);
      await fs.writeFile(actionsPath, formattedConfig, 'utf8');

      // Clear the shared data-loader cache so a running dev server picks up
      // the saved content on the next request instead of serving stale data
      // until restart (see spec §2.4 / finding 5b — events.json already hits
      // this cache; actions.json is future-proofed the same way here).
      gameDataLoader.clearCache();

      // Changelog (fork A3): diff old vs new weekly_actions by id, append to
      // data/content-changelog.json. Never fails the save.
      if (previousConfig) {
        const diff = diffContentById(
          previousConfig.weekly_actions ?? [],
          config.weekly_actions ?? []
        );
        await appendContentChangelogEntry('actions.json', diff);
      }

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

// Events configuration endpoints (Admin only)
router.get('/api/admin/events-config', requireClerkUser, requireAdmin, async (req, res) => {
    try {
      const eventsPath = path.join(process.cwd(), 'data', 'events.json');
      const configData = await fs.readFile(eventsPath, 'utf8');
      const config = JSON.parse(configData);
      res.json(config);
    } catch (error) {
      console.error('Failed to load events config:', error);
      res.status(500).json({ error: 'Failed to load events configuration' });
    }
  });

router.post('/api/admin/events-config', requireClerkUser, requireAdmin, async (req, res) => {
    try {
      const { config } = req.body;

      if (!config) {
        return res.status(400).json({ error: 'Configuration data is required' });
      }

      // Validate using shared schema from contracts
      try {
        EventsConfigSchema.parse(config);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          return res.status(400).json({
            error: 'Invalid events configuration structure',
            details: validationError.errors
          });
        }
        throw validationError;
      }

      const eventsPath = path.join(process.cwd(), 'data', 'events.json');

      // Create backup before overwriting (also gives us the pre-save data
      // for the changelog diff below).
      const backupPath = path.join(process.cwd(), 'data', 'events.json.backup');
      let previousConfig: any = null;
      try {
        const existingData = await fs.readFile(eventsPath, 'utf8');
        previousConfig = JSON.parse(existingData);
        await fs.writeFile(backupPath, existingData, 'utf8');
        console.log('Created backup at', backupPath);
      } catch (backupError) {
        console.warn('Failed to create backup, continuing with save:', backupError);
      }

      // Write the new configuration
      const formattedConfig = JSON.stringify(config, null, 2);
      await fs.writeFile(eventsPath, formattedConfig, 'utf8');

      // Clear the shared data-loader cache so a running dev server picks up
      // the saved content on the next request instead of serving stale data
      // until restart (spec §2.4 / finding 5b: events.json goes through
      // dataLoader's cache, unlike actions.json's per-call re-read).
      gameDataLoader.clearCache();

      // Changelog (fork A3): diff old vs new events by id, append to
      // data/content-changelog.json. Never fails the save.
      if (previousConfig) {
        const diff = diffContentById(
          previousConfig.events ?? [],
          config.events ?? []
        );
        await appendContentChangelogEntry('events.json', diff);
      }

      res.json({
        success: true,
        message: 'Events configuration updated successfully',
        backupCreated: true
      });
    } catch (error) {
      console.error('Failed to save events config:', error);
      res.status(500).json({
        error: 'Failed to save events configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

// Playtest feedback endpoints (Admin only) — versioned recording surface for
// the playtest forms (round 1: PLAYTEST_FEEDBACK_2026-07-11.md, round 2:
// PLAYTEST_FEEDBACK_2026-07-12.md, round 3: PLAYTEST_FEEDBACK_2026-07-12-delegation.md).
// Mirrors the actions-config pattern (validate → backup → write). The SAME
// endpoint pair serves every form, keyed by a validated formId from the fixed
// allowlist below (GET ?formId=… defaulting to the active form; POST reads
// responses.formId). Each form persists to its OWN responses file — rounds 1
// and 2 are HISTORICAL RECORDS that a round-3 save must never touch (round
// 3's filename deliberately does not collide with round 2's despite sharing a
// calendar date). The markdown forms stay untouched as the printable sources.
// No dataLoader cache clear or content changelog here — this is not game content.

const PLAYTEST_RESPONSES_FILENAMES: Record<PlaytestFormId, string> = {
  [PLAYTEST_FEEDBACK_FORM_ID_V3]: 'playtest-feedback-2026-07-12-r3.responses.json',
  [PLAYTEST_FEEDBACK_FORM_ID_V2]: 'playtest-feedback-2026-07-12.responses.json',
  [PLAYTEST_FEEDBACK_FORM_ID]: 'playtest-feedback-2026-07-11.responses.json',
};

function playtestResponsesPath(formId: PlaytestFormId): string {
  return path.join(process.cwd(), 'docs', '01-planning', PLAYTEST_RESPONSES_FILENAMES[formId]);
}

// Rebuilds the response document with keys in canonical order (formId first,
// sections/knobs in the given form's order, extras appended) so the
// pretty-printed JSON file is stable and diffable across saves.
function stablePlaytestResponses(
  parsed: AnyPlaytestFeedbackResponses
): AnyPlaytestFeedbackResponses {
  const registry = PLAYTEST_FORM_REGISTRY[parsed.formId];
  const sections: AnyPlaytestFeedbackResponses['sections'] = {};
  for (const id of registry.sectionIds) {
    if (parsed.sections[id]) sections[id] = parsed.sections[id];
  }
  for (const id of Object.keys(parsed.sections)) {
    if (!(id in sections)) sections[id] = parsed.sections[id];
  }
  const knobStrength: AnyPlaytestFeedbackResponses['knobStrength'] = {};
  for (const id of registry.knobIds) {
    if (id in parsed.knobStrength) knobStrength[id] = parsed.knobStrength[id];
  }
  for (const id of Object.keys(parsed.knobStrength)) {
    if (!(id in knobStrength)) knobStrength[id] = parsed.knobStrength[id];
  }
  return {
    formId: parsed.formId,
    savedAt: parsed.savedAt,
    sections,
    knobStrength,
    oneKnobChange: parsed.oneKnobChange,
    topPriorities: parsed.topPriorities,
    pullBack: parsed.pullBack,
    gutCheck: parsed.gutCheck,
  } as AnyPlaytestFeedbackResponses;
}

router.get('/api/admin/playtest-feedback', requireClerkUser, requireAdmin, async (req, res) => {
  try {
    // Optional ?formId=… selects which round to load; defaults to the active
    // form. Anything outside the fixed allowlist is rejected.
    const requestedFormId =
      typeof req.query.formId === 'string' ? req.query.formId : ACTIVE_PLAYTEST_FORM_ID;
    if (!isPlaytestFormId(requestedFormId)) {
      return res.status(400).json({ error: `Unknown playtest form id: ${requestedFormId}` });
    }
    const responsesPath = playtestResponsesPath(requestedFormId);
    let raw: string;
    try {
      raw = await fs.readFile(responsesPath, 'utf8');
    } catch (readError: any) {
      if (readError?.code === 'ENOENT') {
        // No responses saved yet — return the empty default so the page can
        // prefill every field.
        return res.json(buildEmptyPlaytestFeedbackResponsesFor(requestedFormId));
      }
      throw readError;
    }
    const responses = AnyPlaytestFeedbackResponsesSchema.parse(JSON.parse(raw));
    res.json(responses);
  } catch (error) {
    console.error('Failed to load playtest feedback responses:', error);
    res.status(500).json({ error: 'Failed to load playtest feedback responses' });
  }
});

router.post('/api/admin/playtest-feedback', requireClerkUser, requireAdmin, async (req, res) => {
  try {
    const { responses } = req.body;

    if (!responses) {
      return res.status(400).json({ error: 'Responses data is required' });
    }

    // Validate using shared schema from contracts. The validated formId (a
    // closed two-literal union) keys the target file — a v2 save can never
    // reach the round-1 historical file and vice versa.
    let parsed: AnyPlaytestFeedbackResponses;
    try {
      parsed = AnyPlaytestFeedbackResponsesSchema.parse(responses);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid playtest feedback structure',
          details: validationError.errors
        });
      }
      throw validationError;
    }

    const responsesPath = playtestResponsesPath(parsed.formId);

    // Create backup before overwriting (actions-config precedent; the very
    // first save has nothing to back up, which is fine).
    const backupPath = `${responsesPath}.backup`;
    let backupCreated = false;
    try {
      const existingData = await fs.readFile(responsesPath, 'utf8');
      await fs.writeFile(backupPath, existingData, 'utf8');
      backupCreated = true;
      console.log('Created backup at', backupPath);
    } catch (backupError: any) {
      if (backupError?.code !== 'ENOENT') {
        console.warn('Failed to create backup, continuing with save:', backupError);
      }
    }

    // Stamp savedAt server-side and write pretty-printed, stable key order.
    const savedAt = new Date().toISOString();
    const stable = stablePlaytestResponses({ ...parsed, savedAt });
    await fs.writeFile(responsesPath, JSON.stringify(stable, null, 2), 'utf8');

    res.json({
      success: true,
      message: 'Playtest feedback saved',
      backupCreated,
      savedAt
    });
  } catch (error) {
    console.error('Failed to save playtest feedback responses:', error);
    res.status(500).json({
      error: 'Failed to save playtest feedback responses',
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
