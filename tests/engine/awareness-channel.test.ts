/**
 * Exec-meetings-revival PR-5 (C3) — next-release awareness channel unit tests.
 *
 * Covers:
 *  (a) awareness_boost is in LIVE_EFFECT_KEYS.
 *  (b) ActionProcessor.applyEffects: awareness_boost accumulates (signed) into
 *      flags.pendingAwarenessBoost and stamps flags.pendingAwarenessBoostWeek;
 *      pushes a single 'hype_banked' change carrying appliedEffects (so badges
 *      render) — C81 folded the old duplicate 'meeting' entry into it.
 *  (c) ActionProcessor.processDelayedEffects: an unconsumed bank expires after
 *      pending_awareness_boost_expiry_weeks weeks (default 8, data/balance/markets.json);
 *      it survives if still within the window; games with no bank in play are
 *      untouched (no stray flags keys added).
 *  (d) ReleaseProcessor.processPlannedReleases: the banked boost seeds each
 *      released song's initial awareness (× awareness_boost_points_per_unit, ×8),
 *      clamped at 0 (a negative pool never drives awareness below zero), consumed
 *      by the FIRST release that releases songs this week, then zeroed. Draw-count
 *      invariance is asserted at the consumption site (no RNG added/reordered).
 *  (e) THE TRILEMMA (data-driven): no platform_exclusive_bidding (v3 successor
 *      of cmo_platform_exclusive) choice's live payoff strictly dominates the
 *      others across the live axes (money, awareness_boost, reputation).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ActionProcessor, LIVE_EFFECT_KEYS } from '@shared/engine/processors/ActionProcessor';
import { ReleaseProcessor } from '@shared/engine/processors/ReleaseProcessor';
import type { WeekContext } from '@shared/engine/processors/types';
import { createTestWeekSummary } from '../helpers/test-factories';

const markets = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'balance', 'markets.json'), 'utf-8'),
);
const actions = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'actions.json'), 'utf-8'),
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

describe('LIVE_EFFECT_KEYS — PR-5 awareness channel key', () => {
  it('includes awareness_boost', () => {
    expect(LIVE_EFFECT_KEYS.has('awareness_boost')).toBe(true);
  });
});

describe('ActionProcessor.applyEffects — awareness_boost', () => {
  it('accumulates (signed) into flags.pendingAwarenessBoost and stamps the week', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();

    await processor.applyEffects(ctx, { awareness_boost: 2 }, undefined, 'global', 'cmo_platform_exclusive', 'spotify_exclusive');
    expect((ctx.gameState.flags as any).pendingAwarenessBoost).toBe(2);
    expect((ctx.gameState.flags as any).pendingAwarenessBoostWeek).toBe(5);

    await processor.applyEffects(ctx, { awareness_boost: -1 }, undefined, 'global');
    expect((ctx.gameState.flags as any).pendingAwarenessBoost).toBe(1);
  });

  // C81: banking no longer double-lists — the generic 'meeting' entry was folded
  // into the structured hype_banked entry, which now carries the appliedEffects
  // payload that drives the effect badge.
  it('pushes a single hype_banked change carrying appliedEffects so badges render (no duplicate meeting entry)', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();

    await processor.applyEffects(ctx, { awareness_boost: 3 }, undefined, 'global');
    const entry = (ctx.summary.changes as any[]).find(
      (c) => c.type === 'hype_banked' && c.appliedEffects?.awareness_boost === 3,
    );
    expect(entry).toBeDefined();
    expect((ctx.summary.changes as any[]).filter((c) => c.type === 'meeting')).toHaveLength(0);
  });

  it('stacks two positive meeting boosts across the same week', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();

    await processor.applyEffects(ctx, { awareness_boost: 2 }, undefined, 'global');
    await processor.applyEffects(ctx, { awareness_boost: 4 }, undefined, 'global');

    expect((ctx.gameState.flags as any).pendingAwarenessBoost).toBe(6);
  });

  it('re-stamps pendingAwarenessBoostWeek to the CURRENT week on a later accumulation', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();

    await processor.applyEffects(ctx, { awareness_boost: 2 }, undefined, 'global');
    expect((ctx.gameState.flags as any).pendingAwarenessBoostWeek).toBe(5);

    ctx.gameState.currentWeek = 7;
    await processor.applyEffects(ctx, { awareness_boost: 1 }, undefined, 'global');
    expect((ctx.gameState.flags as any).pendingAwarenessBoostWeek).toBe(7);
    expect((ctx.gameState.flags as any).pendingAwarenessBoost).toBe(3);
  });
});

describe('ActionProcessor.processDelayedEffects — pendingAwarenessBoost expiry', () => {
  function gameDataWithExpiry(weeks: number) {
    return awarenessGameData({
      getAwarenessBoostConfigSync: () => ({
        awareness_boost_points_per_unit: POINTS_PER_UNIT,
        pending_awareness_boost_expiry_weeks: weeks,
      }),
    });
  }

  it(`clears an unconsumed bank at exactly ${EXPIRY_WEEKS} weeks unconsumed (default balance knob)`, async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext({ gameData: gameDataWithExpiry(EXPIRY_WEEKS) });
    (ctx.gameState.flags as any).pendingAwarenessBoost = 3;
    (ctx.gameState.flags as any).pendingAwarenessBoostWeek = 5;
    ctx.gameState.currentWeek = 5 + EXPIRY_WEEKS;

    await processor.processDelayedEffects(ctx);

    expect((ctx.gameState.flags as any).pendingAwarenessBoost).toBe(0);
    expect((ctx.gameState.flags as any).pendingAwarenessBoostWeek).toBeUndefined();
  });

  it('leaves the bank intact one week before expiry', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext({ gameData: gameDataWithExpiry(EXPIRY_WEEKS) });
    (ctx.gameState.flags as any).pendingAwarenessBoost = 3;
    (ctx.gameState.flags as any).pendingAwarenessBoostWeek = 5;
    ctx.gameState.currentWeek = 5 + EXPIRY_WEEKS - 1;

    await processor.processDelayedEffects(ctx);

    expect((ctx.gameState.flags as any).pendingAwarenessBoost).toBe(3);
  });

  it('expires a negative pool too (symmetric with positive)', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext({ gameData: gameDataWithExpiry(EXPIRY_WEEKS) });
    (ctx.gameState.flags as any).pendingAwarenessBoost = -2;
    (ctx.gameState.flags as any).pendingAwarenessBoostWeek = 5;
    ctx.gameState.currentWeek = 5 + EXPIRY_WEEKS;

    await processor.processDelayedEffects(ctx);

    expect((ctx.gameState.flags as any).pendingAwarenessBoost).toBe(0);
  });

  it('does not touch flags at all when no boost is banked (no-flags games stay byte-stable)', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext({ gameData: gameDataWithExpiry(EXPIRY_WEEKS) });

    await processor.processDelayedEffects(ctx);

    expect('pendingAwarenessBoost' in (ctx.gameState.flags as any)).toBe(false);
    expect('pendingAwarenessBoostWeek' in (ctx.gameState.flags as any)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Consumption site: ReleaseProcessor.processPlannedReleases
// ---------------------------------------------------------------------------

/**
 * Builds a minimal gameData/context that drives one planned release with a
 * single unreleased song through processPlannedReleases. calculateSophisticatedReleaseOutcome
 * is stubbed to a fixed per-song breakdown so no RNG is involved and we can
 * assert the awareness seed written into the song update precisely.
 */
function buildReleaseCtx(opts: {
  flags: Record<string, any>;
  songAwareness?: number;
  rng?: () => number;
}) {
  const capturedUpdates: any[][] = [];
  let drawCount = 0;
  const rng = opts.rng ?? (() => { drawCount++; return 0.5; });

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
        title: 'Planned Single',
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
    storage: {
      getArtist: async () => ({ id: 'artist-1', popularity: 50, name: 'A' }),
    } as any,
    financialSystem: {
      investmentTracker: null,
    } as any,
    getRandom: (min: number, max: number) => min + rng() * (max - min),
    dbTransaction: undefined,
  };

  return { ctx, capturedUpdates, getDrawCount: () => drawCount };
}

// Stub the sophisticated-outcome method so the release path is RNG-free and
// deterministic. We only care about the awareness seed here, not stream math.
function stubOutcome(proc: ReleaseProcessor) {
  (proc as any).calculateSophisticatedReleaseOutcome = () => ({
    perSongBreakdown: [{ songId: 'song-1', streams: 1000, revenue: 50 }],
    totalStreams: 1000,
    totalRevenue: 50,
  });
}

// NOTE (buzz-v2 slice 2): as of slice 2, hype attaches at PLAN time
// (release.metadata.attachedHype) and ReleaseProcessor seeds from that number.
// The releases in THIS block carry `metadata: {}` (no attachedHype), so they
// exercise the LEGACY FALLBACK path — a release planned before slice 2 still
// consumes the label-wide flags.pendingAwarenessBoost pool with the original
// "first-planned takes all" semantics. These assertions are intentionally
// preserved to lock that safety net. The attached-hype path is covered in
// hype-scoping-slice2.test.ts.
describe('ReleaseProcessor.processPlannedReleases — awareness_boost consumption (legacy fallback)', () => {
  it('seeds released song awareness by boost × points-per-unit, then zeroes the pool', async () => {
    const proc = new ReleaseProcessor();
    stubOutcome(proc);
    const { ctx, capturedUpdates } = buildReleaseCtx({
      flags: { pendingAwarenessBoost: 3, pendingAwarenessBoostWeek: 4 },
    });

    await proc.processPlannedReleases(ctx, ctx.summary, undefined);

    const update = capturedUpdates.flat().find((u) => u.songId === 'song-1');
    expect(update.awareness).toBe(3 * POINTS_PER_UNIT); // 24
    expect(update.peak_awareness).toBe(3 * POINTS_PER_UNIT);
    expect((ctx.gameState.flags as any).pendingAwarenessBoost).toBe(0);
    expect((ctx.gameState.flags as any).pendingAwarenessBoostWeek).toBeUndefined();
  });

  it('adds the seed on top of any pre-existing song awareness', async () => {
    const proc = new ReleaseProcessor();
    stubOutcome(proc);
    const { ctx, capturedUpdates } = buildReleaseCtx({
      flags: { pendingAwarenessBoost: 2, pendingAwarenessBoostWeek: 4 },
      songAwareness: 5,
    });

    await proc.processPlannedReleases(ctx, ctx.summary, undefined);

    const update = capturedUpdates.flat().find((u) => u.songId === 'song-1');
    expect(update.awareness).toBe(5 + 2 * POINTS_PER_UNIT); // 21
  });

  it('floors a negative pool at 0 awareness (never below zero)', async () => {
    const proc = new ReleaseProcessor();
    stubOutcome(proc);
    const { ctx, capturedUpdates } = buildReleaseCtx({
      flags: { pendingAwarenessBoost: -2, pendingAwarenessBoostWeek: 4 },
      songAwareness: 5, // 5 + (-2*8) = -11 -> floored to 0
    });

    await proc.processPlannedReleases(ctx, ctx.summary, undefined);

    const update = capturedUpdates.flat().find((u) => u.songId === 'song-1');
    expect(update.awareness).toBe(0);
    expect((ctx.gameState.flags as any).pendingAwarenessBoost).toBe(0);
  });

  it('does not touch flags or write awareness when no boost is banked (byte-stable)', async () => {
    const proc = new ReleaseProcessor();
    stubOutcome(proc);
    const flags: any = {};
    const { ctx, capturedUpdates } = buildReleaseCtx({ flags });

    await proc.processPlannedReleases(ctx, ctx.summary, undefined);

    const update = capturedUpdates.flat().find((u) => u.songId === 'song-1');
    expect('awareness' in update).toBe(false);
    expect('pendingAwarenessBoost' in flags).toBe(false);
  });

  it('does not change the RNG draw count regardless of boost presence (draw invariance)', async () => {
    const procNo = new ReleaseProcessor();
    stubOutcome(procNo);
    const ctxNo = buildReleaseCtx({ flags: {} });
    await procNo.processPlannedReleases(ctxNo.ctx, ctxNo.ctx.summary, undefined);

    const procYes = new ReleaseProcessor();
    stubOutcome(procYes);
    const ctxYes = buildReleaseCtx({ flags: { pendingAwarenessBoost: 3, pendingAwarenessBoostWeek: 4 } });
    await procYes.processPlannedReleases(ctxYes.ctx, ctxYes.ctx.summary, undefined);

    // The awareness seed is a pure arithmetic post-step — it must not draw RNG.
    expect(ctxYes.getDrawCount()).toBe(ctxNo.getDrawCount());
  });
});

// ---------------------------------------------------------------------------
// C80 — structured fields on awareness lifecycle entries.
// breakthrough / awareness_gain / awareness_decay used to ship description-only
// (amount: 0); they now also carry songId/artistId/songTitle/awarenessChange
// (additive — amount stays 0, descriptions unchanged).
// ---------------------------------------------------------------------------
describe('C80 — awareness entries carry structured fields', () => {
  function buildCatalogCtx(opts: {
    song: Record<string, any>;
    currentWeek: number;
    awarenessGain?: number;
  }) {
    const summary: any = {
      week: opts.currentWeek, changes: [], revenue: 0, expenses: 0, streams: 0,
      reputationChanges: {}, artistChanges: {},
    };
    const ctx: WeekContext = {
      gameState: { id: 'game-1', currentWeek: opts.currentWeek } as any,
      summary,
      gameData: {
        getReleasedSongs: async () => [opts.song],
        getBalanceConfigSync: () => ({ market_formulas: markets.market_formulas }),
        getStreamingConfigSync: () => markets.market_formulas.streaming_calculation,
        updateSongs: async () => {},
      } as any,
      storage: {
        getArtistsByGame: async () => [{ id: opts.song.artistId, name: 'Sol', popularity: 50 }],
        getReleasesByGame: async () => [
          { id: 'release-1', metadata: { marketingBudgetBreakdown: { radio: 1000 } } },
        ],
      } as any,
      financialSystem: {
        calculateOngoingSongRevenue: async () => 0,
        calculateAwarenessGain: async () => opts.awarenessGain ?? 0,
      } as any,
      getRandom: () => 0.5,
      dbTransaction: undefined,
    };
    return { ctx, summary };
  }

  it('awareness_gain carries songId/artistId/songTitle and the APPLIED delta', async () => {
    const proc = new ReleaseProcessor();
    const song = {
      id: 'song-1', artistId: 'artist-1', title: 'Anthem', quality: 50,
      awareness: 10, peak_awareness: 10, breakthrough_achieved: false,
      releaseId: 'release-1', releaseWeek: 1, totalStreams: 0, totalRevenue: 0,
    };
    // weeksSinceRelease 1 (build phase, below the week-3 breakthrough window).
    const { ctx, summary } = buildCatalogCtx({ song, currentWeek: 2, awarenessGain: 4.2 });

    await proc.processReleasedProjects(ctx, summary);

    const entry = (summary.changes as any[]).find((c) => c.type === 'awareness_gain');
    expect(entry).toBeDefined();
    expect(entry.amount).toBe(0); // unchanged — renderers key off description/amount
    expect(entry.songId).toBe('song-1');
    expect(entry.artistId).toBe('artist-1');
    expect(entry.songTitle).toBe('Anthem');
    // applied delta: round(min(10 + 4.2, 100)) − 10 = 4 (NOT the raw 4.2)
    expect(entry.awarenessChange).toBe(4);
  });

  it('awareness_decay carries the structured fields with a negative delta', async () => {
    const proc = new ReleaseProcessor();
    const song = {
      id: 'song-2', artistId: 'artist-2', title: 'Fade', quality: 50,
      awareness: 40, peak_awareness: 40, breakthrough_achieved: false,
      releaseId: 'release-1', releaseWeek: 1, totalStreams: 0, totalRevenue: 0,
    };
    // weeksSinceRelease 5 → decay phase; standard decay rate.
    const { ctx, summary } = buildCatalogCtx({ song, currentWeek: 6 });

    await proc.processReleasedProjects(ctx, summary);

    const entry = (summary.changes as any[]).find((c) => c.type === 'awareness_decay');
    expect(entry).toBeDefined();
    expect(entry.amount).toBe(0);
    expect(entry.songId).toBe('song-2');
    expect(entry.artistId).toBe('artist-2');
    expect(entry.songTitle).toBe('Fade');
    const standardRate = markets.market_formulas.awareness_system.awareness_decay_rates.standard_songs;
    const expected = Math.round(Math.max(0, 40 * (1 - standardRate))) - 40;
    expect(entry.awarenessChange).toBe(expected);
    expect(entry.awarenessChange).toBeLessThan(0);
  });

  it('breakthrough carries the structured fields with the explosion delta', async () => {
    const proc = new ReleaseProcessor();
    // Deterministic sin-seed breakthrough (mirrors mood-outcomes.test.ts):
    // artistId '...00' → suffix 0, quality 80, week 4 (weeksSinceRelease 3),
    // awareness 40, gain 0 → potential 0.65, random ≈ 0.002 → fires.
    const song = {
      id: 'song-3', artistId: 'artist-00', title: 'Anthem', quality: 80,
      awareness: 40, peak_awareness: 40, breakthrough_achieved: false,
      releaseId: 'release-1', releaseWeek: 1, totalStreams: 0, totalRevenue: 0,
    };
    const { ctx, summary } = buildCatalogCtx({ song, currentWeek: 4, awarenessGain: 0 });

    await proc.processReleasedProjects(ctx, summary);

    const entry = (summary.changes as any[]).find((c) => c.type === 'breakthrough');
    expect(entry).toBeDefined();
    expect(entry.amount).toBe(0);
    expect(entry.songId).toBe('song-3');
    expect(entry.artistId).toBe('artist-00');
    expect(entry.songTitle).toBe('Anthem');
    // pre-multiplier 40 → round(min(40 × multiplier, 100)) − 40
    const multiplier = markets.market_formulas.awareness_system.breakthrough_effects.awareness_multiplier || 2.5;
    const expected = Math.round(Math.min(40 * multiplier, 100)) - 40;
    expect(entry.awarenessChange).toBe(expected);
    expect(entry.awarenessChange).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// THE TRILEMMA — platform_exclusive_bidding non-dominance (data-driven).
// v3 pool load (2026-07-20): cmo_platform_exclusive was replaced by its v3
// successor platform_exclusive_bidding; same three-axis tradeoff contract.
// ---------------------------------------------------------------------------
describe('platform_exclusive_bidding trilemma — no choice strictly dominates', () => {
  const meeting = actions.weekly_actions.find((a: any) => a.id === 'platform_exclusive_bidding');

  it('has exactly three choices (check / reach / refuse)', () => {
    expect(meeting).toBeDefined();
    expect(meeting.choices.map((c: any) => c.id).sort()).toEqual(
      ['refuse_windows', 'take_the_check', 'take_the_reach'],
    );
  });

  // Live payoff axes for this meeting: money (immediate), awareness_boost
  // (delayed → seeds next-release awareness), reputation (immediate or delayed).
  function payoff(choice: any) {
    const imm = choice.effects_immediate || {};
    const del = choice.effects_delayed || {};
    return {
      money: (imm.money || 0) + (del.money || 0),
      awareness: (imm.awareness_boost || 0) + (del.awareness_boost || 0),
      reputation: (imm.reputation || 0) + (del.reputation || 0),
    };
  }

  // A dominates B iff A >= B on every live axis AND strictly > on at least one.
  function dominates(a: any, b: any) {
    const ge = a.money >= b.money && a.awareness >= b.awareness && a.reputation >= b.reputation;
    const strict = a.money > b.money || a.awareness > b.awareness || a.reputation > b.reputation;
    return ge && strict;
  }

  it('no choice strictly dominates another across (money, awareness, reputation)', () => {
    const payoffs = meeting.choices.map((c: any) => ({ id: c.id, p: payoff(c) }));
    for (const x of payoffs) {
      for (const y of payoffs) {
        if (x.id === y.id) continue;
        expect(dominates(x.p, y.p)).toBe(false);
      }
    }
  });

  it('each choice wins on a distinct axis (a genuine tradeoff triangle)', () => {
    const byId = Object.fromEntries(meeting.choices.map((c: any) => [c.id, payoff(c)]));
    // take_the_check: highest money; take_the_reach: highest awareness;
    // refuse_windows: highest reputation.
    expect(byId.take_the_check.money).toBeGreaterThan(byId.take_the_reach.money);
    expect(byId.take_the_check.money).toBeGreaterThan(byId.refuse_windows.money);
    expect(byId.take_the_reach.awareness).toBeGreaterThan(byId.take_the_check.awareness);
    expect(byId.take_the_reach.awareness).toBeGreaterThan(byId.refuse_windows.awareness);
    expect(byId.refuse_windows.reputation).toBeGreaterThan(byId.take_the_check.reputation);
    expect(byId.refuse_windows.reputation).toBeGreaterThan(byId.take_the_reach.reputation);
  });
});
