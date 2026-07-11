/**
 * Buzz-v2 (Hype & Pre-Marketing) — Slice 1: hype visibility + attribution.
 *
 * The meeting "Buzz" channel banks awareness_boost into a label-global pool
 * (flags.pendingAwarenessBoost) that seeds the next shipped release and expires
 * unused after N weeks. Before this slice all three moments were console-log
 * only (bank/consume also pushed a generic 'meeting' entry, description-only).
 * This slice adds STRUCTURED lifecycle entries (C80 lesson — structured from
 * day one) at all three moments:
 *   - hype_banked   (ActionProcessor.applyEffects)          — routine
 *   - hype_applied  (ReleaseProcessor.processPlannedReleases) — notable
 *   - hype_expired  (ActionProcessor.processDelayedEffects)  — notable
 *
 * Processor-level, DB-free tests (mirrors awareness-channel.test.ts's harness).
 * Zero new RNG draws are asserted at the consumption site.
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
    gameData: {} as any,
    storage: {} as any,
    financialSystem: {} as any,
    getRandom: () => 0.5,
    ...overrides,
  };
}

function awarenessGameData(overrides: Record<string, any> = {}) {
  return {
    getAwarenessBoostConfigSync: () => ({
      awareness_boost_points_per_unit: POINTS_PER_UNIT,
      pending_awareness_boost_expiry_weeks: EXPIRY_WEEKS,
    }),
    ...overrides,
  } as any;
}

describe('Buzz-v2 slice 1 — hype_banked (ActionProcessor.applyEffects)', () => {
  it('pushes a structured hype_banked entry carrying amount + pool total', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();

    await processor.applyEffects(ctx, { awareness_boost: 3 }, undefined, 'global');

    const entry = (ctx.summary.changes as any[]).find((c) => c.type === 'hype_banked');
    expect(entry).toBeDefined();
    expect(entry.amount).toBe(3);
    expect(entry.hypeTotal).toBe(3); // pool after this bank
    expect(entry.description.startsWith('📦')).toBe(true);
    expect(entry.description).toContain('Hype');
  });

  it('reports the running pool total after stacking two banks', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();

    await processor.applyEffects(ctx, { awareness_boost: 2 }, undefined, 'global');
    await processor.applyEffects(ctx, { awareness_boost: 4 }, undefined, 'global');

    const banks = (ctx.summary.changes as any[]).filter((c) => c.type === 'hype_banked');
    expect(banks).toHaveLength(2);
    expect(banks[0].hypeTotal).toBe(2);
    expect(banks[1].hypeTotal).toBe(6);
  });

  it('renders a signed description for a negative (cooling) bank', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();

    await processor.applyEffects(ctx, { awareness_boost: -2 }, undefined, 'global');

    const entry = (ctx.summary.changes as any[]).find((c) => c.type === 'hype_banked');
    expect(entry).toBeDefined();
    expect(entry.amount).toBe(-2);
    expect(entry.description).toContain('-2 Hype');
  });

  it('emits NO hype_banked entry for a zero (no-op) boost (byte-stable)', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();

    await processor.applyEffects(ctx, { awareness_boost: 0 }, undefined, 'global');

    expect((ctx.summary.changes as any[]).some((c) => c.type === 'hype_banked')).toBe(false);
  });

  it('never leaks a multiplier number into the description (qualitative-only guard)', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();
    await processor.applyEffects(ctx, { awareness_boost: 4 }, undefined, 'global');
    const entry = (ctx.summary.changes as any[]).find((c) => c.type === 'hype_banked');
    expect(entry.description).not.toMatch(/[×x]\s*\d/);
  });
});

describe('Buzz-v2 slice 1 — hype_expired (ActionProcessor.processDelayedEffects)', () => {
  function gameDataWithExpiry(weeks: number) {
    return awarenessGameData({
      getAwarenessBoostConfigSync: () => ({
        awareness_boost_points_per_unit: POINTS_PER_UNIT,
        pending_awareness_boost_expiry_weeks: weeks,
      }),
    });
  }

  it('pushes a structured hype_expired entry when an unconsumed pool ages out', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext({ gameData: gameDataWithExpiry(EXPIRY_WEEKS) });
    (ctx.gameState.flags as any).pendingAwarenessBoost = 3;
    (ctx.gameState.flags as any).pendingAwarenessBoostWeek = 5;
    ctx.gameState.currentWeek = 5 + EXPIRY_WEEKS;

    await processor.processDelayedEffects(ctx);

    const entry = (ctx.summary.changes as any[]).find((c) => c.type === 'hype_expired');
    expect(entry).toBeDefined();
    expect(entry.amount).toBe(3); // the pool value BEFORE it was zeroed
    expect(entry.description.startsWith('💨')).toBe(true);
    expect(entry.description).toContain('faded away unused');
  });

  it('pushes NO hype_expired entry while still within the window', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext({ gameData: gameDataWithExpiry(EXPIRY_WEEKS) });
    (ctx.gameState.flags as any).pendingAwarenessBoost = 3;
    (ctx.gameState.flags as any).pendingAwarenessBoostWeek = 5;
    ctx.gameState.currentWeek = 5 + EXPIRY_WEEKS - 1;

    await processor.processDelayedEffects(ctx);

    expect((ctx.summary.changes as any[]).some((c) => c.type === 'hype_expired')).toBe(false);
  });

  it('pushes NO hype_expired entry when no pool is banked', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext({ gameData: gameDataWithExpiry(EXPIRY_WEEKS) });

    await processor.processDelayedEffects(ctx);

    expect((ctx.summary.changes as any[]).some((c) => c.type === 'hype_expired')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Consumption site: ReleaseProcessor.processPlannedReleases (hype_applied)
// ---------------------------------------------------------------------------

function buildReleaseCtx(opts: { flags: Record<string, any>; rng?: () => number }) {
  const capturedUpdates: any[][] = [];
  let drawCount = 0;
  const rng = opts.rng ?? (() => { drawCount++; return 0.5; });

  const song = {
    id: 'song-1',
    artistId: 'artist-1',
    title: 'Track',
    quality: 75,
    awareness: 0,
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
        metadata: {},
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
    storage: { getArtist: async () => ({ id: 'artist-1', popularity: 50, name: 'A' }) } as any,
    financialSystem: { investmentTracker: null } as any,
    getRandom: (min: number, max: number) => min + rng() * (max - min),
    dbTransaction: undefined,
  };

  return { ctx, capturedUpdates, getDrawCount: () => drawCount };
}

function stubOutcome(proc: ReleaseProcessor) {
  (proc as any).calculateSophisticatedReleaseOutcome = () => ({
    perSongBreakdown: [{ songId: 'song-1', streams: 1000, revenue: 50 }],
    totalStreams: 1000,
    totalRevenue: 50,
  });
}

describe('Buzz-v2 slice 1 — hype_applied (ReleaseProcessor.processPlannedReleases)', () => {
  it('pushes a structured hype_applied entry naming the seeded release', async () => {
    const proc = new ReleaseProcessor();
    stubOutcome(proc);
    const { ctx } = buildReleaseCtx({
      flags: { pendingAwarenessBoost: 3, pendingAwarenessBoostWeek: 4 },
    });

    await proc.processPlannedReleases(ctx, ctx.summary, undefined);

    const entry = (ctx.summary.changes as any[]).find((c) => c.type === 'hype_applied');
    expect(entry).toBeDefined();
    expect(entry.amount).toBe(3 * POINTS_PER_UNIT); // seeded Buzz points
    expect(entry.hypeUnits).toBe(3); // raw pool consumed
    expect(entry.releaseId).toBe('release-1');
    expect(entry.releaseName).toBe('Neon Nights');
    expect(entry.description.startsWith('🚀')).toBe(true);
    expect(entry.description).toContain('Neon Nights');
    expect(entry.description).toContain('starting Buzz');
  });

  it('pushes NO hype_applied entry when no pool is banked (byte-stable)', async () => {
    const proc = new ReleaseProcessor();
    stubOutcome(proc);
    const { ctx } = buildReleaseCtx({ flags: {} });

    await proc.processPlannedReleases(ctx, ctx.summary, undefined);

    expect((ctx.summary.changes as any[]).some((c) => c.type === 'hype_applied')).toBe(false);
  });

  it('adds zero RNG draws relative to the no-boost path (draw invariance)', async () => {
    const procNo = new ReleaseProcessor();
    stubOutcome(procNo);
    const ctxNo = buildReleaseCtx({ flags: {} });
    await procNo.processPlannedReleases(ctxNo.ctx, ctxNo.ctx.summary, undefined);

    const procYes = new ReleaseProcessor();
    stubOutcome(procYes);
    const ctxYes = buildReleaseCtx({ flags: { pendingAwarenessBoost: 3, pendingAwarenessBoostWeek: 4 } });
    await procYes.processPlannedReleases(ctxYes.ctx, ctxYes.ctx.summary, undefined);

    expect(ctxYes.getDrawCount()).toBe(ctxNo.getDrawCount());
  });

  it('never leaks a multiplier number into the description (qualitative-only guard)', async () => {
    const proc = new ReleaseProcessor();
    stubOutcome(proc);
    const { ctx } = buildReleaseCtx({
      flags: { pendingAwarenessBoost: 3, pendingAwarenessBoostWeek: 4 },
    });
    await proc.processPlannedReleases(ctx, ctx.summary, undefined);
    const entry = (ctx.summary.changes as any[]).find((c) => c.type === 'hype_applied');
    expect(entry.description).not.toMatch(/[×x]\s*\d/);
  });
});
