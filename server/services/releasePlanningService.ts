/**
 * releasePlanningService.ts
 *
 * Backend service for planned-release creation and deletion. Extracted from the
 * two fat mutation handlers in server/routes/releases.ts (Phase 1, PR-17):
 *   - POST /api/game/:gameId/releases/plan   (was routes/releases.ts:435-666)
 *   - DELETE /api/game/:gameId/releases/:releaseId (was routes/releases.ts:843-906)
 *
 * Follows the class+singleton convention of gameCreationService.ts. The service
 * throws coded ReleaseServiceError instances; the route layer keeps ALL HTTP
 * status mapping with byte-identical response bodies (each error carries the
 * exact JSON body the original handler returned).
 *
 * Behavior is intentionally equivalent to the pre-extraction handlers, with two
 * deliberate hardening additions flagged in the PR-17 report:
 *   1. Marketing-budget validation: every channel value (and lead-single budget
 *      value) must be a finite number >= 0. Previously a negative channel value
 *      would REDUCE totalBudget (and, at the extreme, could credit money) — this
 *      is now rejected with INVALID_MARKETING_BUDGET (400).
 *   2. deleteRelease refunds strictly from the STORED release.marketingBudget,
 *      never from client input (already true pre-extraction; preserved).
 */
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db as dbSingleton } from '../db';
import { gameStates, releases, releaseSongs, songs } from '@shared/schema';

/**
 * A coded error whose `body` is the EXACT JSON payload the original route
 * returned for this failure mode, and whose `status` is the HTTP status the
 * route must send. The route layer maps: res.status(err.status).json(err.body).
 */
export class ReleaseServiceError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly body: Record<string, unknown>,
  ) {
    super(code);
    this.name = 'ReleaseServiceError';
  }
}

/**
 * Sum a per-channel budget object, validating every value is a finite number
 * >= 0. Throws INVALID_MARKETING_BUDGET (400) on any negative / non-finite
 * value. `label` distinguishes the marketing vs. lead-single budget in the
 * error field for debuggability.
 */
function sumValidatedBudget(budget: Record<string, unknown> | undefined | null, label: string): number {
  if (!budget) return 0;
  let total = 0;
  for (const [channel, raw] of Object.entries(budget)) {
    const value = raw as number;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new ReleaseServiceError('INVALID_MARKETING_BUDGET', 400, {
        error: 'INVALID_MARKETING_BUDGET',
        message: 'Marketing budget values must be finite numbers greater than or equal to zero',
        details: [
          { field: `${label}.${channel}`, error: 'Must be a finite number >= 0' },
        ],
      });
    }
    total += value;
  }
  return total;
}

export class ReleasePlanningService {
  constructor(private db = dbSingleton) {}

  /**
   * Create a planned release: validate inputs, funds, and creative capital;
   * then in a single transaction deduct marketing budget + 1 creative capital,
   * insert the release + release_songs junction rows, and reserve the songs.
   *
   * `gameState` is the owner-verified game row (from requireGameOwner). It is
   * used for the money/creativeCapital/currentWeek reads; the transaction still
   * writes against gameStates by id.
   *
   * Returns the exact response payload the original POST .../plan handler sent
   * (the route wraps it as res.status(201).json(payload)).
   */
  async planRelease(userId: string | undefined, gameId: string, gameState: typeof gameStates.$inferSelect, body: any) {
    const {
      artistId,
      title,
      type,
      songIds,
      leadSingleId,
      seasonalTiming,
      scheduledReleaseWeek,
      marketingBudget,
      leadSingleStrategy,
      metadata,
    } = body;

    // Validate inputs
    if (!artistId || !title || !type || !songIds || songIds.length === 0) {
      throw new ReleaseServiceError('VALIDATION_ERROR', 400, {
        error: 'VALIDATION_ERROR',
        message: 'Release validation failed',
        details: [
          { field: 'artistId', error: 'Required' },
          { field: 'title', error: 'Required' },
          { field: 'type', error: 'Required' },
          { field: 'songIds', error: 'Must have at least one song' },
        ],
      });
    }

    // HARDENING (PR-17): reject negative / non-finite budget values BEFORE any
    // totals are summed (a negative channel would otherwise reduce totalBudget
    // and could credit money).
    const marketingTotal = sumValidatedBudget(marketingBudget, 'marketingBudget');
    const leadSingleTotal = leadSingleStrategy
      ? sumValidatedBudget(leadSingleStrategy.leadSingleBudget, 'leadSingleBudget')
      : 0;

    // Validate release week is in the future
    const currentWeek = gameState.currentWeek || 1;
    if (scheduledReleaseWeek && scheduledReleaseWeek <= currentWeek) {
      throw new ReleaseServiceError('INVALID_RELEASE_WEEK', 400, {
        error: 'INVALID_RELEASE_WEEK',
        message: 'Cannot plan releases for current or past weeks',
        currentWeek,
        scheduledReleaseWeek,
        details: [
          { field: 'scheduledReleaseWeek', error: `Must be greater than current week (${currentWeek})` },
        ],
      });
    }

    // Validate lead single week if provided
    if (leadSingleStrategy?.leadSingleReleaseWeek) {
      if (leadSingleStrategy.leadSingleReleaseWeek <= currentWeek) {
        throw new ReleaseServiceError('INVALID_LEAD_SINGLE_WEEK', 400, {
          error: 'INVALID_LEAD_SINGLE_WEEK',
          message: 'Cannot plan lead single for current or past weeks',
          currentWeek,
          leadSingleReleaseWeek: leadSingleStrategy.leadSingleReleaseWeek,
          details: [
            { field: 'leadSingleReleaseWeek', error: `Must be greater than current week (${currentWeek})` },
          ],
        });
      }
    }

    const totalBudget = marketingTotal + leadSingleTotal;

    // Check if user has sufficient creative capital
    const currentCreativeCapital = gameState.creativeCapital || 0;
    if (currentCreativeCapital < 1) {
      throw new ReleaseServiceError('INSUFFICIENT_CREATIVE_CAPITAL', 402, {
        error: 'INSUFFICIENT_CREATIVE_CAPITAL',
        message: 'Insufficient creative capital. You need 1 creative capital to plan a release.',
        required: 1,
        available: currentCreativeCapital,
      });
    }

    if ((gameState.money || 0) < totalBudget) {
      throw new ReleaseServiceError('INSUFFICIENT_FUNDS', 402, {
        error: 'INSUFFICIENT_FUNDS',
        message: 'Not enough money for marketing budget',
        required: totalBudget,
        available: gameState.money || 0,
        suggestions: [
          { action: 'REDUCE_BUDGET', description: 'Reduce marketing allocation', potentialSavings: totalBudget - (gameState.money || 0) },
        ],
      });
    }

    // Check for song conflicts (songs already scheduled for release)
    const conflictingSongs = await this.db
      .select()
      .from(songs)
      .where(and(
        eq(songs.gameId, gameId),
        inArray(songs.id, songIds),
        sql`${songs.releaseId} IS NOT NULL`
      ));

    if (conflictingSongs.length > 0) {
      throw new ReleaseServiceError('SONG_ALREADY_SCHEDULED', 409, {
        error: 'SONG_ALREADY_SCHEDULED',
        message: 'Some songs are already part of a planned release',
        conflictingSongs: conflictingSongs.map(c => ({
          songId: c.id,
          songTitle: c.title,
          conflictingReleaseId: c.releaseId,
          conflictingReleaseTitle: 'Unknown Release',
        })),
        resolutionOptions: [
          { action: 'CHOOSE_DIFFERENT_SONGS', description: 'Select different songs for this release' },
        ],
      });
    }

    // Create the planned release in a transaction
    const result = await this.db.transaction(async (tx) => {
      // CRITICAL FIX: Single deduction of marketing budget and creative capital
      await tx.update(gameStates)
        .set({
          money: (gameState.money || 0) - totalBudget,
          creativeCapital: currentCreativeCapital - 1,
        })
        .where(eq(gameStates.id, gameId));

      console.log(`[PLAN RELEASE] Deducted $${totalBudget} and 1 creative capital for release planning`);

      // Create release record
      const [newRelease] = await tx.insert(releases).values({
        gameId,
        artistId,
        title,
        type,
        releaseWeek: scheduledReleaseWeek,
        status: 'planned',
        marketingBudget: totalBudget,
        metadata: {
          ...metadata,
          seasonalTiming,
          scheduledReleaseWeek,
          marketingChannels: Object.keys(marketingBudget || {}),
          marketingBudgetBreakdown: marketingBudget || {}, // CRITICAL FIX: Store per-channel budgets for release execution
          leadSingleStrategy: leadSingleStrategy ? {
            ...leadSingleStrategy,
            leadSingleBudgetBreakdown: leadSingleStrategy.leadSingleBudget || {}, // Store per-channel breakdown for lead single too
          } : null,
        },
      }).returning();

      // Update songs to mark them as reserved for this release
      await tx.update(songs)
        .set({ releaseId: newRelease.id })
        .where(inArray(songs.id, songIds));

      // CRITICAL FIX: Also create entries in the junction table for proper song-release association
      // This ensures songs are properly linked when releases are executed
      const releaseSongEntries = songIds.map((songId: string, index: number) => ({
        id: crypto.randomUUID(),
        releaseId: newRelease.id,
        songId: songId,
        trackNumber: index + 1, // Track order based on selection order
        createdAt: new Date(),
      }));

      await tx.insert(releaseSongs).values(releaseSongEntries);
      console.log(`[PLAN RELEASE] Created ${releaseSongEntries.length} junction table entries for release ${newRelease.id}`);

      return newRelease;
    });

    // Get updated game state and planned releases
    const [updatedGameState] = await this.db.select().from(gameStates).where(eq(gameStates.id, gameId));
    const plannedReleases = await this.db.select().from(releases)
      .where(and(eq(releases.gameId, gameId), eq(releases.status, 'planned')));

    return {
      success: true,
      release: {
        id: result.id,
        title: result.title,
        type: result.type,
        artistId: result.artistId,
        artistName: 'Artist Name', // Would need artist lookup
        songIds,
        leadSingleId,
        scheduledReleaseWeek,
        status: 'planned',
        estimatedMetrics: {
          streams: metadata?.estimatedStreams || 0,
          revenue: metadata?.estimatedRevenue || 0,
          roi: metadata?.projectedROI || 0,
          chartPotential: 50,
        },
        createdAt: result.createdAt?.toISOString(),
        createdByWeek: updatedGameState.currentWeek,
      },
      updatedGameState: {
        money: updatedGameState.money,
        plannedReleases: plannedReleases.map(r => ({
          id: r.id,
          title: r.title,
          artistName: 'Artist Name', // Would need artist lookup
          type: r.type,
          scheduledWeek: r.releaseWeek,
          status: r.status,
        })),
        artistsAffected: [{
          artistId,
          songsReserved: songIds.length,
          moodImpact: 5, // Positive mood boost from planned release
        }],
      },
    };
  }

  /**
   * Delete a planned release and free up its songs, refunding the STORED
   * marketing budget (never a client-supplied amount) back to the game's money.
   *
   * Returns the exact response payload the original DELETE handler sent (the
   * route wraps it as res.json(payload)).
   */
  async deleteRelease(userId: string | undefined, gameId: string, releaseId: string) {
    // Get the release to return marketing budget
    const [release] = await this.db.select().from(releases)
      .where(and(eq(releases.id, releaseId), eq(releases.gameId, gameId)));

    if (!release) {
      throw new ReleaseServiceError('RELEASE_NOT_FOUND', 404, {
        error: 'RELEASE_NOT_FOUND',
        message: 'Planned release not found',
      });
    }

    if (release.status !== 'planned') {
      throw new ReleaseServiceError('CANNOT_DELETE_RELEASED', 400, {
        error: 'CANNOT_DELETE_RELEASED',
        message: 'Cannot delete a release that has already been executed',
      });
    }

    // Execute deletion in transaction
    const result = await this.db.transaction(async (tx) => {
      // Free up songs reserved for this release
      const freedSongs = await tx.update(songs)
        .set({ releaseId: null })
        .where(eq(songs.releaseId, releaseId))
        .returning();

      // Return marketing budget to player (from STORED release data, not client)
      const [gameState] = await tx.select().from(gameStates)
        .where(eq(gameStates.id, gameId));

      if (gameState) {
        await tx.update(gameStates)
          .set({ money: (gameState.money || 0) + (release.marketingBudget || 0) })
          .where(eq(gameStates.id, gameId));
      }

      // Delete the planned release
      await tx.delete(releases).where(eq(releases.id, releaseId));

      return { freedSongs, refundedAmount: release.marketingBudget || 0 };
    });

    return {
      success: true,
      message: `Deleted planned release "${release.title}"`,
      freedSongs: result.freedSongs.map(s => ({
        songId: s.id,
        songTitle: s.title,
      })),
      refundedAmount: result.refundedAmount,
    };
  }
}

// Export singleton instance
export const releasePlanningService = new ReleasePlanningService();
