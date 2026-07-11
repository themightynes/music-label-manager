/**
 * Buzz-v2 (Hype & Pre-Marketing) — Slice 2: artist scoping + attach-at-plan.
 *
 * Slice 1 made the label-global hype pool visible/attributed. Slice 2 adds:
 *   - Fork A: user_selected meetings bank to a per-ARTIST pool
 *     (flags.hypeArtistPools[artistId] = { amount, week }); untargeted/global
 *     meetings keep banking to the label pool (flags.pendingAwarenessBoost).
 *   - Attach-at-PLAN: releasePlanningService drains the planning artist's pool +
 *     the whole label pool onto release.metadata.attachedHype (tested in the
 *     endpoints suite; here we test the SHIP-time consumption of attachedHype).
 *   - Fork C: per-pool 8-week expiry for UNATTACHED pools, artist pools named.
 *   - Legacy fallback: a release with NO attachedHype field consumes the label
 *     pool (old "first-planned takes all" behavior) as a safety net.
 *
 * Processor-level, DB-free tests (mirrors awareness-channel.test.ts's harness).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ActionProcessor } from '@shared/engine/processors/ActionProcessor';
import { ReleaseProcessor } from '@shared/engine/processors/ReleaseProcessor';
import type { WeekContext } from '@shared/engine/processors/types';
import { createTestWeekSummary } from '../helpers/test-factories';

const markets = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'balance', 'markets.json'), 'utf-8'),
);
const awarenessCfg = markets.market_formulas.awareness_system;
const POINTS_PER_UNIT = awarenessCfg.awareness_boost_points_per_unit;
const EXPIRY_WEEKS = awarenessCfg.pending_awareness_boost_expiry_weeks;

function awarenessGameData(overrides: Record<string, any> = {}) {
  return {
    getAwarenessBoostConfigSync: () => ({
      awareness_boost_points_per_unit: POINTS_PER_UNIT,
      pending_awareness_boost_expiry_weeks: EXPIRY_WEEKS,
    }),
    ...overrides,
  } as any;
}

function buildContext(overrides: Partial<WeekContext> = {}): WeekContext {
  const gameState: any = {
    id: 'test-game-state',
    currentWeek: 5,
    reputation: 50,
    creativeCapital: 10,
    flags: {},
  };
  return {
    gameState,
    summary: createTestWeekSummary({ week: 5 }),
    gameData: awarenessGameData(),
    storage: {
      // Named artist so the attribution copy can be asserted.
      getArtist: async (id: string) => ({ id, name: id === 'artist-1' ? 'Nova' : 'Other', popularity: 50 }),
    } as any,
    financialSystem: {} as any,
    getRandom: () => 0.5,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Fork A — artist-scoped vs label bank
// ---------------------------------------------------------------------------
describe('Buzz-v2 slice 2 — bank scoping (ActionProcessor.applyEffects)', () => {
  it('banks a user_selected boost to the ARTIST pool, not the label pool', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();

    await processor.applyEffects(ctx, { awareness_boost: 4 }, 'artist-1', 'user_selected');

    const flags = ctx.gameState.flags as any;
    expect(flags.hypeArtistPools['artist-1']).toEqual({ amount: 4, week: 5 });
    // Label pool untouched.
    expect('pendingAwarenessBoost' in flags).toBe(false);
  });

  it('names the artist in the hype_banked attribution entry', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();

    await processor.applyEffects(ctx, { awareness_boost: 4 }, 'artist-1', 'user_selected');

    const entry = (ctx.summary.changes as any[]).find((c) => c.type === 'hype_banked');
    expect(entry).toBeDefined();
    expect(entry.description).toContain('Nova');
    expect(entry.hypeTotal).toBe(4);
    expect(entry.description).not.toMatch(/[×x]\s*\d/);
  });

  it('banks a global boost to the LABEL pool (unchanged behavior)', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();

    await processor.applyEffects(ctx, { awareness_boost: 3 }, undefined, 'global');

    const flags = ctx.gameState.flags as any;
    expect(flags.pendingAwarenessBoost).toBe(3);
    expect(flags.pendingAwarenessBoostWeek).toBe(5);
    expect('hypeArtistPools' in flags).toBe(false);
    const entry = (ctx.summary.changes as any[]).find((c) => c.type === 'hype_banked');
    expect(entry.description).toContain('label');
  });

  it('accumulates two banks for the same artist and re-stamps the week', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();

    await processor.applyEffects(ctx, { awareness_boost: 2 }, 'artist-1', 'user_selected');
    ctx.gameState.currentWeek = 7;
    await processor.applyEffects(ctx, { awareness_boost: 3 }, 'artist-1', 'user_selected');

    expect((ctx.gameState.flags as any).hypeArtistPools['artist-1']).toEqual({ amount: 5, week: 7 });
  });

  it('keeps separate pools for different artists', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();

    await processor.applyEffects(ctx, { awareness_boost: 2 }, 'artist-1', 'user_selected');
    await processor.applyEffects(ctx, { awareness_boost: 5 }, 'artist-2', 'user_selected');

    const pools = (ctx.gameState.flags as any).hypeArtistPools;
    expect(pools['artist-1'].amount).toBe(2);
    expect(pools['artist-2'].amount).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Fork C — per-pool expiry (unattached pools only)
// ---------------------------------------------------------------------------
describe('Buzz-v2 slice 2 — per-artist-pool expiry (processDelayedEffects)', () => {
  it('expires an aged-out artist pool and names the artist', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();
    (ctx.gameState.flags as any).hypeArtistPools = { 'artist-1': { amount: 3, week: 5 } };
    ctx.gameState.currentWeek = 5 + EXPIRY_WEEKS;

    await processor.processDelayedEffects(ctx);

    // Pool dropped; container removed when empty.
    expect('hypeArtistPools' in (ctx.gameState.flags as any)).toBe(false);
    const entry = (ctx.summary.changes as any[]).find((c) => c.type === 'hype_expired');
    expect(entry).toBeDefined();
    expect(entry.amount).toBe(3);
    expect(entry.description).toContain('Nova');
    expect(entry.description.startsWith('💨')).toBe(true);
  });

  it('leaves an artist pool intact one week before expiry', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();
    (ctx.gameState.flags as any).hypeArtistPools = { 'artist-1': { amount: 3, week: 5 } };
    ctx.gameState.currentWeek = 5 + EXPIRY_WEEKS - 1;

    await processor.processDelayedEffects(ctx);

    expect((ctx.gameState.flags as any).hypeArtistPools['artist-1'].amount).toBe(3);
    expect((ctx.summary.changes as any[]).some((c) => c.type === 'hype_expired')).toBe(false);
  });

  it('expires each pool independently by its own last-bank week', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();
    (ctx.gameState.flags as any).hypeArtistPools = {
      'artist-1': { amount: 3, week: 1 },  // aged out
      'artist-2': { amount: 4, week: 5 },  // still fresh
    };
    ctx.gameState.currentWeek = 1 + EXPIRY_WEEKS; // artist-1 expires, artist-2 does not

    await processor.processDelayedEffects(ctx);

    const pools = (ctx.gameState.flags as any).hypeArtistPools;
    expect('artist-1' in pools).toBe(false);
    expect(pools['artist-2'].amount).toBe(4);
    const expired = (ctx.summary.changes as any[]).filter((c) => c.type === 'hype_expired');
    expect(expired).toHaveLength(1);
    expect(expired[0].amount).toBe(3);
  });

  it('leaves flags byte-stable when no pools are banked', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();

    await processor.processDelayedEffects(ctx);

    expect('hypeArtistPools' in (ctx.gameState.flags as any)).toBe(false);
    expect('pendingAwarenessBoost' in (ctx.gameState.flags as any)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Ship-time consumption: attached hype vs legacy label pool
// ---------------------------------------------------------------------------
function buildReleaseCtx(opts: {
  flags: Record<string, any>;
  releaseMetadata?: Record<string, any>;
  songAwareness?: number;
}) {
  const capturedUpdates: any[][] = [];

  const song = {
    id: 'song-1',
    artistId: 'artist-1',
    title: 'Track',
    quality: 75,
    awareness: opts.songAwareness ?? 0,
    peak_awareness: 0,
    isReleased: false,
    totalStreams: 0,
    totalRevenue: 0,
  };

  const gameData: any = {
    getAwarenessBoostConfigSync: () => ({
      awareness_boost_points_per_unit: POINTS_PER_UNIT,
      pending_awareness_boost_expiry_weeks: EXPIRY_WEEKS,
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
        marketingBudget: 0,
        metadata: opts.releaseMetadata ?? {},
      },
    ],
    getSongsByRelease: async () => [song],
    updateReleaseStatus: async () => {},
    updateSongs: async (updates: any[]) => { capturedUpdates.push(updates); },
  };

  const ctx: WeekContext = {
    gameState: { id: 'game-1', currentWeek: 5, reputation: 10, flags: opts.flags } as any,
    summary: { changes: [], revenue: 0, expenses: 0, streams: 0, reputationChanges: {} } as any,
    gameData,
    storage: { getArtist: async () => ({ id: 'artist-1', popularity: 50, name: 'Nova' }) } as any,
    financialSystem: { investmentTracker: null } as any,
    getRandom: (min: number, max: number) => min + 0.5 * (max - min),
    dbTransaction: undefined,
  };

  return { ctx, capturedUpdates };
}

function stubOutcome(proc: ReleaseProcessor) {
  (proc as any).calculateSophisticatedReleaseOutcome = () => ({
    perSongBreakdown: [{ songId: 'song-1', streams: 1000, revenue: 50 }],
    totalStreams: 1000,
    totalRevenue: 50,
  });
}

describe('Buzz-v2 slice 2 — ship-time seeding (ReleaseProcessor.processPlannedReleases)', () => {
  it('seeds from attachedHype and does NOT touch the label pool', async () => {
    const proc = new ReleaseProcessor();
    stubOutcome(proc);
    // Label pool present but should be IGNORED because the release has attachedHype.
    const { ctx, capturedUpdates } = buildReleaseCtx({
      flags: { pendingAwarenessBoost: 99, pendingAwarenessBoostWeek: 4 },
      releaseMetadata: { attachedHype: 3 },
    });

    await proc.processPlannedReleases(ctx, ctx.summary, undefined);

    const update = capturedUpdates.flat().find((u) => u.songId === 'song-1');
    expect(update.awareness).toBe(3 * POINTS_PER_UNIT);
    // Legacy label pool left completely untouched (attached-hype releases never
    // consume it).
    expect((ctx.gameState.flags as any).pendingAwarenessBoost).toBe(99);
    const entry = (ctx.summary.changes as any[]).find((c) => c.type === 'hype_applied');
    expect(entry.hypeUnits).toBe(3);
    expect(entry.releaseName).toBe('Neon Nights');
  });

  it('attachedHype of 0 seeds nothing and does not fall back to the label pool', async () => {
    const proc = new ReleaseProcessor();
    stubOutcome(proc);
    const { ctx, capturedUpdates } = buildReleaseCtx({
      flags: { pendingAwarenessBoost: 5, pendingAwarenessBoostWeek: 4 },
      releaseMetadata: { attachedHype: 0 },
    });

    await proc.processPlannedReleases(ctx, ctx.summary, undefined);

    const update = capturedUpdates.flat().find((u) => u.songId === 'song-1');
    expect('awareness' in update).toBe(false);
    // Label pool untouched — an attached (even 0) release never touches it.
    expect((ctx.gameState.flags as any).pendingAwarenessBoost).toBe(5);
    expect((ctx.summary.changes as any[]).some((c) => c.type === 'hype_applied')).toBe(false);
  });

  it('a negative attachedHype suppresses starting Buzz, floored at 0', async () => {
    const proc = new ReleaseProcessor();
    stubOutcome(proc);
    const { ctx, capturedUpdates } = buildReleaseCtx({
      flags: {},
      releaseMetadata: { attachedHype: -2 },
      songAwareness: 5, // 5 + (-2*8) = -11 -> 0
    });

    await proc.processPlannedReleases(ctx, ctx.summary, undefined);

    const update = capturedUpdates.flat().find((u) => u.songId === 'song-1');
    expect(update.awareness).toBe(0);
  });

  it('LEGACY: a release with no attachedHype field consumes the label pool', async () => {
    const proc = new ReleaseProcessor();
    stubOutcome(proc);
    const { ctx, capturedUpdates } = buildReleaseCtx({
      flags: { pendingAwarenessBoost: 3, pendingAwarenessBoostWeek: 4 },
      releaseMetadata: {}, // no attachedHype -> legacy path
    });

    await proc.processPlannedReleases(ctx, ctx.summary, undefined);

    const update = capturedUpdates.flat().find((u) => u.songId === 'song-1');
    expect(update.awareness).toBe(3 * POINTS_PER_UNIT);
    // Legacy path zeroes the label pool ("first-planned takes all").
    expect((ctx.gameState.flags as any).pendingAwarenessBoost).toBe(0);
    expect((ctx.gameState.flags as any).pendingAwarenessBoostWeek).toBeUndefined();
    const entry = (ctx.summary.changes as any[]).find((c) => c.type === 'hype_applied');
    expect(entry.hypeUnits).toBe(3);
  });
});
