/**
 * Balance-integrity slice 2 — FLOP PENALTY (reputation becomes two-way).
 *
 * Wires the previously-dead progression.json reputation_system.flop_penalty (3)
 * into release-week processing (ReleaseProcessor.processPlannedReleases). A
 * released record FLOPS when its release-week revenue falls below
 * flop_revenue_ratio (0.10) of its totalInvestment (Σ song.productionBudget +
 * release.marketingBudget), but ONLY when totalInvestment clears
 * flop_investment_floor (10000) — zero/low-budget drops are exempt. On a flop:
 * reputation −flop_penalty (clamp ≥0), the delta accumulated into
 * summary.reputationChanges (feeds the aggregated ⭐ line), one structured
 * 'flop' change entry pushed, and a once-only flag set
 * (flags.flop_penalty_applied_<releaseId>). DETERMINISTIC — zero RNG draws.
 *
 * Processor-level, DB-free tests (mirrors hype-scoping-slice2.test.ts's harness).
 * The tier-downgrade sanity test drives ProgressionProcessor.updateAccessTiers
 * directly against the real progression.json access tiers.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ReleaseProcessor } from '@shared/engine/processors/ReleaseProcessor';
import { ProgressionProcessor } from '@shared/engine/processors/ProgressionProcessor';
import type { WeekContext } from '@shared/engine/processors/types';

const progression = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'balance', 'progression.json'), 'utf-8'),
);
const repSystem = progression.reputation_system;
const FLOP_PENALTY: number = repSystem.flop_penalty;               // 3
const FLOP_REVENUE_RATIO: number = repSystem.flop_revenue_ratio;   // 0.10
const FLOP_INVESTMENT_FLOOR: number = repSystem.flop_investment_floor; // 10000

/**
 * Builds a DB-free WeekContext with a single planned release shipping this week.
 * `productionBudget` is placed on the song and `marketingBudget` on the release
 * (marketing 0 by default so the press path — which needs financialSystem — is
 * skipped and the test isolates the flop mechanism).
 */
function buildReleaseCtx(opts: {
  productionBudget: number;
  marketingBudget?: number;
  revenue: number;
  reputation?: number;
  flags?: Record<string, any>;
}) {
  const marketingBudget = opts.marketingBudget ?? 0;

  const song = {
    id: 'song-1',
    artistId: 'artist-1',
    title: 'Track',
    quality: 70,
    productionBudget: opts.productionBudget,
    awareness: 0,
    peak_awareness: 0,
    isReleased: false,
    totalStreams: 0,
    totalRevenue: 0,
  };

  const gameData: any = {
    getBalanceConfigSync: () => ({ reputation_system: repSystem }),
    getAwarenessBoostConfigSync: () => ({
      awareness_boost_points_per_unit: 8,
      pending_awareness_boost_expiry_weeks: 8,
    }),
    getPlannedReleases: async () => [
      {
        id: 'release-1',
        gameId: 'game-1',
        artistId: 'artist-1',
        title: 'Neon Nights',
        type: 'single',
        status: 'planned',
        releaseWeek: 5,
        marketingBudget,
        // metadata absent → no attachedHype, no totalInvestment → press path skipped
        metadata: {},
      },
    ],
    getSongsByRelease: async () => [song],
    updateReleaseStatus: async () => {},
    updateSongs: async () => {},
  };

  const ctx: WeekContext = {
    gameState: {
      id: 'game-1',
      currentWeek: 5,
      reputation: opts.reputation ?? 50,
      flags: opts.flags ?? {},
    } as any,
    summary: {
      week: 5,
      changes: [],
      revenue: 0,
      expenses: 0,
      streams: 0,
      reputationChanges: {},
    } as any,
    gameData,
    storage: { getArtist: async () => ({ id: 'artist-1', popularity: 50, name: 'Nova' }) } as any,
    financialSystem: { investmentTracker: null } as any,
    getRandom: (min: number, max: number) => min + 0.5 * (max - min),
    dbTransaction: undefined,
  };

  return { ctx };
}

function stubOutcome(proc: ReleaseProcessor, revenue: number) {
  (proc as any).calculateSophisticatedReleaseOutcome = () => ({
    perSongBreakdown: [{ songId: 'song-1', streams: 1000, revenue }],
    totalStreams: 1000,
    totalRevenue: revenue,
  });
}

describe('Balance-integrity slice 2 — flop penalty (ReleaseProcessor.processPlannedReleases)', () => {
  it('FLOP FIRES: low revenue vs investment above the floor → rep −penalty, flag set, change entry, reputationChanges accumulated', async () => {
    const proc = new ReleaseProcessor();
    // investment = 12000 (≥ floor); revenue 500 < 0.10 × 12000 (=1200) → flop
    stubOutcome(proc, 500);
    const { ctx } = buildReleaseCtx({
      productionBudget: 12000,
      revenue: 500,
      reputation: 50,
    });

    await proc.processPlannedReleases(ctx, ctx.summary, undefined);

    // Reputation dropped by exactly flop_penalty (clamped ≥ 0)
    expect(ctx.gameState.reputation).toBe(50 - FLOP_PENALTY);
    // Once-only flag recorded (deterministic key)
    expect((ctx.gameState.flags as any)['flop_penalty_applied_release-1']).toBe(true);
    // Structured 'flop' change entry present, carrying the signed delta
    const flopEntry = (ctx.summary.changes as any[]).find((c) => c.type === 'flop');
    expect(flopEntry).toBeDefined();
    expect(flopEntry.amount).toBe(-FLOP_PENALTY);
    expect(flopEntry.description).toContain('flopped');
    expect(flopEntry.description).toContain(`${-FLOP_PENALTY} reputation`);
    expect(flopEntry.releaseName).toBe('Neon Nights');
    // Delta accumulated into reputationChanges (feeds the aggregated ⭐ line)
    expect(ctx.summary.reputationChanges['artist-1']).toBe(-FLOP_PENALTY);
  });

  it('BELOW FLOOR: tiny investment + terrible revenue → NO penalty', async () => {
    const proc = new ReleaseProcessor();
    // investment = 500 (< floor 10000); revenue 0 → exempt despite awful ratio
    stubOutcome(proc, 0);
    const { ctx } = buildReleaseCtx({
      productionBudget: 500,
      revenue: 0,
      reputation: 50,
    });

    await proc.processPlannedReleases(ctx, ctx.summary, undefined);

    expect(ctx.gameState.reputation).toBe(50);
    expect('flop_penalty_applied_release-1' in (ctx.gameState.flags as any)).toBe(false);
    expect((ctx.summary.changes as any[]).some((c) => c.type === 'flop')).toBe(false);
    expect(ctx.summary.reputationChanges['artist-1']).toBeUndefined();
  });

  it('NOT A FLOP: revenue ≥ ratio × investment → no penalty', async () => {
    const proc = new ReleaseProcessor();
    // investment = 12000 (≥ floor); revenue 5000 ≥ 0.10 × 12000 (=1200) → healthy
    stubOutcome(proc, 5000);
    const { ctx } = buildReleaseCtx({
      productionBudget: 12000,
      revenue: 5000,
      reputation: 50,
    });

    await proc.processPlannedReleases(ctx, ctx.summary, undefined);

    expect(ctx.gameState.reputation).toBe(50);
    expect('flop_penalty_applied_release-1' in (ctx.gameState.flags as any)).toBe(false);
    expect((ctx.summary.changes as any[]).some((c) => c.type === 'flop')).toBe(false);
  });

  it('ONCE-ONLY: a second processing pass with the flag already set applies no further penalty', async () => {
    const proc = new ReleaseProcessor();
    stubOutcome(proc, 500);
    // Flag pre-set as if a prior pass already penalized this release.
    const { ctx } = buildReleaseCtx({
      productionBudget: 12000,
      revenue: 500,
      reputation: 47,
      flags: { 'flop_penalty_applied_release-1': true },
    });

    await proc.processPlannedReleases(ctx, ctx.summary, undefined);

    expect(ctx.gameState.reputation).toBe(47); // unchanged
    expect((ctx.summary.changes as any[]).some((c) => c.type === 'flop')).toBe(false);
    expect(ctx.summary.reputationChanges['artist-1']).toBeUndefined();
  });

  it('clamps reputation at 0 (never negative) when the penalty exceeds current reputation', async () => {
    const proc = new ReleaseProcessor();
    stubOutcome(proc, 500);
    const { ctx } = buildReleaseCtx({
      productionBudget: 12000,
      revenue: 500,
      reputation: 2, // 2 - 3 would be -1 → clamps to 0, delta -2
    });

    await proc.processPlannedReleases(ctx, ctx.summary, undefined);

    expect(ctx.gameState.reputation).toBe(0);
    expect(ctx.summary.reputationChanges['artist-1']).toBe(-2);
  });
});

describe('Balance-integrity slice 2 — tier downgrade sanity (ProgressionProcessor.updateAccessTiers)', () => {
  it('a −flop_penalty drop that crosses a tier threshold downgrades gracefully (new tier, no crash)', () => {
    const proc = new ProgressionProcessor();
    const gameData: any = {
      getAccessTiersSync: () => progression.access_tier_system,
    };
    // playlist 'mid' threshold is 30; start just above at 31 with mid unlocked,
    // then a −3 flop puts reputation at 28 → must downgrade to 'niche' (thr 10).
    const ctx: WeekContext = {
      gameState: {
        id: 'game-1',
        currentWeek: 10,
        reputation: 31 - FLOP_PENALTY, // 28
        playlistAccess: 'mid',
        pressAccess: 'blogs',
        venueAccess: 'clubs',
      } as any,
      summary: { changes: [], reputationChanges: {} } as any,
      gameData,
      storage: {} as any,
      financialSystem: {} as any,
      getRandom: () => 0.5,
    };

    const midThreshold = progression.access_tier_system.playlist_access.mid.threshold;
    expect(28).toBeLessThan(midThreshold); // guard: the crossing is real

    expect(() => {
      proc.updateAccessTiers(ctx);
    }).not.toThrow();

    // Downgraded to the highest tier still cleared by rep 28 (niche, threshold 10).
    // (updateAccessTiers reassigns to the highest tier ≤ reputation on every pass,
    // so a reputation drop steps the tier DOWN without any special-casing — the
    // downgrade path is reachable now that flop penalties can lower reputation.)
    expect(ctx.gameState.playlistAccess).toBe('niche');
  });
});
