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
import { serverGameData } from '../data/gameData';

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
      preCampaignPct,
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

    // Buzz-v2 slice 3 — pre-release campaign share validation. `preCampaignPct` is
    // the share of the MAIN marketing budget diverted to a pre-release anticipation
    // ramp (0/10/20/30/40/50; hard-capped at the balance knob max_pct). Default 0 =
    // exact current behavior (no preCampaign key stored, launch path unscaled). A
    // nonzero pct requires at least one lead-up week (plan → release), because a
    // release shipping the very next week has no pre-release window — its pre-campaign
    // would have nowhere to convert.
    const preCampaignConfig = serverGameData.getPreCampaignConfigSync();
    const rawPct = typeof preCampaignPct === 'number' && Number.isFinite(preCampaignPct)
      ? Math.round(preCampaignPct)
      : 0;
    if (rawPct !== 0) {
      const validStep = rawPct % 10 === 0;
      if (!validStep || rawPct < 0 || rawPct > preCampaignConfig.max_pct) {
        throw new ReleaseServiceError('INVALID_PRE_CAMPAIGN_PCT', 400, {
          error: 'INVALID_PRE_CAMPAIGN_PCT',
          message: `preCampaignPct must be 0 or a multiple of 10 up to ${preCampaignConfig.max_pct}`,
          details: [
            { field: 'preCampaignPct', error: `Must be 0 or a 10-step share, 0..${preCampaignConfig.max_pct}` },
          ],
        });
      }
      // Lead-up weeks = scheduledReleaseWeek − currentWeek. A next-week release
      // (gap of 1, i.e. no full lead-up week before the release week) cannot carry
      // a pre-campaign. scheduledReleaseWeek is already validated > currentWeek above.
      const leadUpWeeks = (scheduledReleaseWeek || 0) - currentWeek;
      if (leadUpWeeks < 2) {
        throw new ReleaseServiceError('PRE_CAMPAIGN_NO_LEADUP', 400, {
          error: 'PRE_CAMPAIGN_NO_LEADUP',
          message: 'A pre-release campaign needs at least one lead-up week before the release week',
          currentWeek,
          scheduledReleaseWeek,
          details: [
            { field: 'preCampaignPct', error: 'Set 0 when the release is scheduled for next week' },
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

    // Buzz-v2 slice 3 — build the pre-campaign metadata block (only when pct > 0;
    // pct 0 stores NOTHING, keeping the golden-master path byte-identical). This
    // block is what the engine's weekly pre-campaign pass reads (ReleaseProcessor):
    //   - pct: the diverted share (10..max_pct)
    //   - totalBudget: round(pct% of the MAIN marketing total) — the anticipation
    //     pot, converted over the lead-up weeks
    //   - budgetPerChannel: each MAIN channel scaled by pct% (the per-channel mix the
    //     ramp uses, so the anticipation build honors channel coefficients)
    //   - weeklySpend: totalBudget / leadUpWeeks, computed ONCE at plan time to
    //     avoid week-to-week drift (final week spends the remainder)
    //   - spentToDate: 0 — advances each week the ramp fires
    // The launch-phase (weeks 1-4) conversion scales its breakdown DOWN by (1-pct)
    // at READ time (ReleaseProcessor), never mutating the stored marketingBudgetBreakdown.
    let preCampaign: {
      pct: number;
      totalBudget: number;
      budgetPerChannel: Record<string, number>;
      weeklySpend: number;
      spentToDate: number;
    } | null = null;
    if (rawPct > 0) {
      const share = rawPct / 100;
      const preTotalBudget = Math.round(marketingTotal * share);
      const budgetPerChannel: Record<string, number> = {};
      for (const [channel, raw] of Object.entries(marketingBudget || {})) {
        budgetPerChannel[channel] = (raw as number) * share;
      }
      const leadUpWeeks = (scheduledReleaseWeek || 0) - currentWeek;
      preCampaign = {
        pct: rawPct,
        totalBudget: preTotalBudget,
        budgetPerChannel,
        weeklySpend: leadUpWeeks > 0 ? preTotalBudget / leadUpWeeks : preTotalBudget,
        spentToDate: 0,
      };
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

      // Buzz-v2 slice 2 — ATTACH-AT-PLAN. Drain the planning artist's hype pool
      // (flags.hypeArtistPools[artistId]) PLUS the entire label pool
      // (flags.pendingAwarenessBoost, fork B: first-planned takes all) onto this
      // release NOW, stored on release.metadata.attachedHype (signed units). At
      // ship time ReleaseProcessor seeds starting Buzz from this attached number,
      // NOT from reading global flags — so attached hype never expires and can't be
      // stolen by a later release. flags live in a jsonb COLUMN on game_states.
      // Re-read flags off the owner-verified gameState row (not a stale copy).
      const flags = (gameState.flags && typeof gameState.flags === 'object')
        ? { ...(gameState.flags as Record<string, any>) }
        : {};
      // Follow-up guard: only drain (and only WRITE flags) when there is actually
      // something to drain — never-banked games keep byte-stable flags (no stray
      // `pendingAwarenessBoost: 0` key) and skip a pointless gameStates UPDATE.
      const hasLabelPool = typeof flags.pendingAwarenessBoost === 'number' && flags.pendingAwarenessBoost !== 0;
      const artistPools = (flags.hypeArtistPools && typeof flags.hypeArtistPools === 'object')
        ? flags.hypeArtistPools as Record<string, { amount: number; week: number }>
        : null;
      const artistPool = artistPools ? artistPools[artistId] : undefined;
      const hasArtistPool = !!artistPool && typeof artistPool.amount === 'number' && artistPool.amount !== 0;
      let attachedHype = 0;
      if (hasLabelPool || hasArtistPool) {
        // Label pool (whole, fork B: first-planned takes all).
        if (hasLabelPool) {
          attachedHype += flags.pendingAwarenessBoost;
          flags.pendingAwarenessBoost = 0;
          delete flags.pendingAwarenessBoostWeek;
        }
        // This artist's pool (drained; other artists' pools untouched).
        if (hasArtistPool && artistPools) {
          attachedHype += artistPool!.amount;
          delete artistPools[artistId];
          if (Object.keys(artistPools).length === 0) delete flags.hypeArtistPools;
        }
        // Persist the drained flags back onto the game state row.
        await tx.update(gameStates).set({ flags }).where(eq(gameStates.id, gameId));
      }

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
          // Buzz-v2 slice 2: hype attached at plan time (signed units). Presence of
          // this field routes ReleaseProcessor to seed from it (attached, never
          // expires) instead of the legacy label-pool fallback. Stored even when 0
          // so the release is unambiguously "slice-2 planned".
          attachedHype,
          // Buzz-v2 slice 3: pre-release campaign block. ONLY present when pct > 0 —
          // its ABSENCE is the golden-master containment (releases without a
          // pre-campaign never enter the new engine path, and the launch-phase
          // awareness conversion reads the full unscaled breakdown).
          ...(preCampaign ? { preCampaign } : {}),
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

      return { newRelease, attachedHype };
    });

    const { newRelease: resultRelease, attachedHype } = result;

    // Buzz-v2 slice 2 — plan-summary attribution. There is no weekly summary at
    // plan time, so surface the applied hype in the plan response instead: the
    // client shows "Hype applied: +N starting Buzz" in the planning confirmation.
    // `units` is the raw pool (signed); `buzzPoints` is units × points-per-unit,
    // exactly what ReleaseProcessor seeds at ship time. serverGameData's sync
    // accessor has a safe hardcoded fallback if balance data isn't loaded.
    const pointsPerUnit = serverGameData.getAwarenessBoostConfigSync().awareness_boost_points_per_unit;
    const hypeApplied = attachedHype !== 0
      ? { units: attachedHype, buzzPoints: attachedHype * pointsPerUnit }
      : null;

    // Get updated game state and planned releases
    const [updatedGameState] = await this.db.select().from(gameStates).where(eq(gameStates.id, gameId));
    const plannedReleases = await this.db.select().from(releases)
      .where(and(eq(releases.gameId, gameId), eq(releases.status, 'planned')));

    return {
      success: true,
      hypeApplied,
      release: {
        id: resultRelease.id,
        title: resultRelease.title,
        type: resultRelease.type,
        artistId: resultRelease.artistId,
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
        createdAt: resultRelease.createdAt?.toISOString(),
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
   * Buzz-v2 slice 4 (C43) — fork E cancel semantics. The pre-existing rule
   * refunded ONLY `release.marketingBudget` (the LAUNCH-phase pot). A planned
   * release can now also carry a pre-campaign pot (metadata.preCampaign) which
   * is a SEPARATE reservation the plan handler did NOT add to marketingBudget —
   * it is the diverted anticipation share, converted week-by-week over the
   * lead-up. On cancel:
   *   - the UNSPENT pre-campaign share (totalBudget − spentToDate) is refunded on
   *     top of the launch budget; the SPENT share is gone (already converted to
   *     awareness that we are about to destroy — fork E: pre-buzz dies).
   *   - the release's still-unreleased songs have their `awareness` and
   *     `peak_awareness` ZEROED. Those points were built purely by this release's
   *     pre-campaign; leaving them would recreate the buzz-farming exploit fork E
   *     rejected. (Songs are unreleased/unreserved here — they only re-enter the
   *     awareness economy via a fresh plan.)
   *   - attached hype (metadata.attachedHype) dies implicitly: it lives only on
   *     this release row, which is deleted, and nothing re-credits any pool.
   * Everything below runs in ONE transaction with the refund.
   *
   * Returns the same payload shape the original DELETE handler sent, with
   * `refundedAmount` now the COMBINED total (launch + unspent pre-campaign).
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

    // Fork E: compute the UNSPENT pre-campaign refund component. Absent
    // preCampaign (pct 0 / legacy release) contributes 0 — byte-identical to the
    // old launch-only refund. Clamp to >= 0 so a drifted spentToDate can never
    // credit more than was reserved.
    const preCampaign = (release.metadata as any)?.preCampaign;
    const unspentPreCampaign = preCampaign
      ? Math.max(
          0,
          (typeof preCampaign.totalBudget === 'number' ? preCampaign.totalBudget : 0)
            - (typeof preCampaign.spentToDate === 'number' ? preCampaign.spentToDate : 0),
        )
      : 0;
    const refundedAmount = (release.marketingBudget || 0) + unspentPreCampaign;

    // Execute deletion in transaction
    const result = await this.db.transaction(async (tx) => {
      // Free up songs reserved for this release AND zero the pre-buzz they were
      // seeded with (fork E: built pre-buzz dies with cancellation). These songs
      // are unreleased, so peak_awareness held only pre-campaign build too.
      const freedSongs = await tx.update(songs)
        .set({ releaseId: null, awareness: 0, peak_awareness: 0 })
        .where(eq(songs.releaseId, releaseId))
        .returning();

      // Refund launch budget + unspent pre-campaign (from STORED release data,
      // never client input).
      const [gameState] = await tx.select().from(gameStates)
        .where(eq(gameStates.id, gameId));

      if (gameState) {
        await tx.update(gameStates)
          .set({ money: (gameState.money || 0) + refundedAmount })
          .where(eq(gameStates.id, gameId));
      }

      // Delete the planned release. Attached hype dies here — it lives only on
      // this row and nothing re-credits any pool.
      await tx.delete(releases).where(eq(releases.id, releaseId));

      return { freedSongs, refundedAmount };
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
