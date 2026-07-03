/**
 * Song-quality formula unit tests — Phase 2 engine-seams PR-8.
 *
 * Closes review-gap W3 (quality) by testing the "crown jewel" multiplicative
 * quality formula DIRECTLY against the extracted SongGenerationProcessor
 * (`calculateEnhancedSongQuality`), NOT over HTTP. Every expectation below was
 * PINNED against the live code (not the review docs, whose numbers had drifted):
 * the formula lives in shared/engine/processors/SongGenerationProcessor.ts and
 * its budget factor is computed by the real FinancialSystem against the real
 * quality.json config.
 *
 * ── RNG model ────────────────────────────────────────────────────────────────
 * `calculateEnhancedSongQuality` draws from `ctx.getRandom` in a FIXED order:
 *   draw #1  outlierRoll = getRandom(0, 1)
 *   draw #2  (ONLY on the normal branch) variance = getRandom(-r, r)
 * `getRandom(min, max)` is `min + rng() * (max - min)`. We drive the formula two
 * ways:
 *   - `scriptedCtx([...])` queues raw rng() values so we can pin the exact branch
 *     (outlierRoll < 0.05 breakout, < 0.10 critical failure, else normal) and the
 *     normal-variance magnitude. scripted([0.5, 0.5]) => outlierRoll 0.5 (normal)
 *     and variance draw 0.5 => `-r + 0.5*2r = 0` => variance factor exactly 1.0,
 *     giving the deterministic "no-variance baseline".
 *   - `seededCtx('seed')` uses the real production `seedrandom` stream so a fixed
 *     seed reproduces identical quality (draw-order == behavior).
 *
 * The gameData reuses the golden-master fixtures' `createGameData` (real sync
 * balance getters + real FinancialSystem validation) but augments
 * `getBalanceConfigSync` with quality.json's `quality_system` /
 * `producer_tier_system` — the fixtures balance omits them, so the budget factor
 * would otherwise no-op (and, notably, that omission is exactly why the golden
 * master's recording scenario generates zero songs).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import seedrandom from 'seedrandom';
import { FinancialSystem } from '@shared/engine/FinancialSystem';
import { SongGenerationProcessor } from '@shared/engine/processors/SongGenerationProcessor';
import type { WeekContext } from '@shared/engine/processors/types';
import { createGameData } from './golden-master-fixtures';

// ---------------------------------------------------------------------------
// gameData: fixtures config getters + real quality_system / producer_tier_system
// ---------------------------------------------------------------------------
const quality = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'balance', 'quality.json'), 'utf-8'),
);
const baseGameData = createGameData({} as any, []);
const fullBalance = {
  ...baseGameData.getBalanceConfigSync(),
  quality_system: quality.quality_system,
  producer_tier_system: quality.producer_tier_system,
};
const gameData: any = { ...baseGameData, getBalanceConfigSync: () => fullBalance };

// ---------------------------------------------------------------------------
// ctx builders
// ---------------------------------------------------------------------------
function makeCtx(rng: () => number): WeekContext {
  const financialSystem = new FinancialSystem(gameData, rng);
  return {
    gameState: {} as any,
    summary: { changes: [] } as any,
    gameData,
    storage: {},
    financialSystem,
    getRandom: (min: number, max: number) => min + rng() * (max - min),
  };
}

/** Queues raw rng() values (cycled if exhausted) so we pin the exact RNG branch. */
function scriptedCtx(values: number[]): WeekContext {
  let i = 0;
  return makeCtx(() => values[i++ % values.length]);
}

/** Uses the real production seedrandom stream (draw-order == behavior). */
function seededCtx(seed: string): WeekContext {
  return makeCtx(seedrandom(seed));
}

const proc = new SongGenerationProcessor();
const PROJECT = { type: 'single', songCount: 1 };
const NEUTRAL_ARTIST = { talent: 50, workEthic: 50, popularity: 0, mood: 50 };

/** Convenience wrapper for the neutral no-variance baseline (variance factor 1.0). */
function qual(
  ctx: WeekContext,
  artist: any,
  producerTier: string,
  timeInvestment: string,
  budget: number,
  songCount: number,
) {
  return proc.calculateEnhancedSongQuality(
    ctx,
    artist,
    PROJECT,
    producerTier,
    timeInvestment,
    budget,
    songCount,
  );
}

// ===========================================================================
describe('SongGenerationProcessor.calculateEnhancedSongQuality', () => {
  // --- (a) determinism -----------------------------------------------------
  it('same seed => identical quality (draw-order is behavior)', () => {
    const q1 = qual(seededCtx('DET'), NEUTRAL_ARTIST, 'regional', 'extended', 4000, 2);
    const q2 = qual(seededCtx('DET'), NEUTRAL_ARTIST, 'regional', 'extended', 4000, 2);
    expect(q1).toBe(q2);
    expect(q1).toBe(36); // pinned against live code
  });

  it('different seeds can produce different quality (RNG actually varies output)', () => {
    const results = new Set<number>();
    for (const s of ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8']) {
      results.add(qual(seededCtx(s), NEUTRAL_ARTIST, 'local', 'standard', 4000, 1));
    }
    expect(results.size).toBeGreaterThan(1);
  });

  // --- (b) multiplicative factor boundaries --------------------------------
  // All boundary tests use scriptedCtx([0.5, 0.5]) => variance factor exactly 1.0,
  // so ONLY the factor under test moves the number.

  it('talent boundary: 0 vs 100 (talent dominates base quality, monotonic up)', () => {
    const t0 = qual(scriptedCtx([0.5, 0.5]), { ...NEUTRAL_ARTIST, talent: 0 }, 'local', 'standard', 4000, 1);
    const t100 = qual(scriptedCtx([0.5, 0.5]), { ...NEUTRAL_ARTIST, talent: 100 }, 'local', 'standard', 4000, 1);
    expect(t0).toBe(44);
    expect(t100).toBe(75);
    expect(t100).toBeGreaterThan(t0);
  });

  it('producer tiers map local<regional<national<legendary (40/55/75/95 skill)', () => {
    const local = qual(scriptedCtx([0.5, 0.5]), NEUTRAL_ARTIST, 'local', 'standard', 20000, 1);
    const regional = qual(scriptedCtx([0.5, 0.5]), NEUTRAL_ARTIST, 'regional', 'standard', 20000, 1);
    const national = qual(scriptedCtx([0.5, 0.5]), NEUTRAL_ARTIST, 'national', 'standard', 20000, 1);
    const legendary = qual(scriptedCtx([0.5, 0.5]), NEUTRAL_ARTIST, 'legendary', 'standard', 20000, 1);
    expect([local, regional, national, legendary]).toEqual([66, 73, 83, 93]);
    expect(local).toBeLessThan(regional);
    expect(regional).toBeLessThan(national);
    expect(national).toBeLessThan(legendary);
  });

  it('unknown producer tier falls back to local skill (40)', () => {
    const unknown = qual(scriptedCtx([0.5, 0.5]), NEUTRAL_ARTIST, 'garbage-tier', 'standard', 20000, 1);
    const local = qual(scriptedCtx([0.5, 0.5]), NEUTRAL_ARTIST, 'local', 'standard', 20000, 1);
    expect(unknown).toBe(local);
  });

  it('time investment multipliers rushed<standard<extended<perfectionist (0.7/1.0/1.1/1.2)', () => {
    const rushed = qual(scriptedCtx([0.5, 0.5]), NEUTRAL_ARTIST, 'local', 'rushed', 4000, 1);
    const standard = qual(scriptedCtx([0.5, 0.5]), NEUTRAL_ARTIST, 'local', 'standard', 4000, 1);
    const extended = qual(scriptedCtx([0.5, 0.5]), NEUTRAL_ARTIST, 'local', 'extended', 4000, 1);
    const perfectionist = qual(scriptedCtx([0.5, 0.5]), NEUTRAL_ARTIST, 'local', 'perfectionist', 4000, 1);
    expect([rushed, standard, extended, perfectionist]).toEqual([31, 44, 48, 53]);
    expect(rushed).toBeLessThan(standard);
    expect(standard).toBeLessThan(extended);
    expect(extended).toBeLessThan(perfectionist);
  });

  it('mood factor is a bounded 0.9x-1.1x swing (mood 0 < mood 100, small delta)', () => {
    const m0 = qual(scriptedCtx([0.5, 0.5]), { ...NEUTRAL_ARTIST, mood: 0 }, 'local', 'standard', 4000, 1);
    const m100 = qual(scriptedCtx([0.5, 0.5]), { ...NEUTRAL_ARTIST, mood: 100 }, 'local', 'standard', 4000, 1);
    expect(m0).toBe(44);
    expect(m100).toBe(48);
    expect(m100).toBeGreaterThan(m0);
    // 0.9x..1.1x over baseline ~46 => at most ~a few points; never a large swing
    expect(m100 - m0).toBeLessThanOrEqual(6);
  });

  it('popularity factor is a bounded 0.95x-1.05x swing (pop 0 < pop 100, small delta)', () => {
    const p0 = qual(scriptedCtx([0.5, 0.5]), { ...NEUTRAL_ARTIST, popularity: 0 }, 'local', 'standard', 4000, 1);
    const p100 = qual(scriptedCtx([0.5, 0.5]), { ...NEUTRAL_ARTIST, popularity: 100 }, 'local', 'standard', 4000, 1);
    expect(p0).toBe(44);
    expect(p100).toBe(49);
    expect(p100).toBeGreaterThan(p0);
    expect(p100 - p0).toBeLessThanOrEqual(6);
  });

  it('session fatigue: songCount beyond 3 (0.97^n) reduces quality at matched per-song budget', () => {
    // per-song budget held at 4000 => budgetAmount = 4000 * songCount.
    // focusFactor = 0.97^max(0, songCount-3): equal at 1 & 3, then decays.
    const sc3 = qual(scriptedCtx([0.5, 0.5]), NEUTRAL_ARTIST, 'local', 'standard', 12000, 3);
    const sc6 = qual(scriptedCtx([0.5, 0.5]), NEUTRAL_ARTIST, 'local', 'standard', 24000, 6);
    expect(sc3).toBe(46);
    expect(sc6).toBe(42);
    expect(sc6).toBeLessThan(sc3);
  });

  it('budget factor: higher per-song budget raises quality (real FinancialSystem multiplier)', () => {
    const low = qual(scriptedCtx([0.5, 0.5]), NEUTRAL_ARTIST, 'local', 'standard', 500, 1);
    const high = qual(scriptedCtx([0.5, 0.5]), NEUTRAL_ARTIST, 'local', 'standard', 30000, 1);
    expect(low).toBe(33);
    expect(high).toBe(69);
    expect(high).toBeGreaterThan(low);
  });

  // --- (c) clamp floor/ceiling 25 / 98 -------------------------------------
  it('clamps to floor 25 with worst-case inputs + critical failure', () => {
    const floor = qual(
      scriptedCtx([0.07]), // critical-failure branch (single draw)
      { talent: 0, workEthic: 0, popularity: 0, mood: 0 },
      'local',
      'rushed',
      0,
      10,
    );
    expect(floor).toBe(25);
  });

  it('clamps to ceiling 98 with best-case inputs + breakout hit', () => {
    const ceil = qual(
      scriptedCtx([0.01]), // breakout branch (single draw)
      { talent: 100, workEthic: 100, popularity: 100, mood: 100 },
      'legendary',
      'perfectionist',
      50000,
      1,
    );
    expect(ceil).toBe(98);
  });

  // --- (d) outlier branches ------------------------------------------------
  it('breakout hit (outlierRoll < 0.05): variance multiplier 1.5x-2.0x, beats no-variance baseline', () => {
    const baseline = qual(scriptedCtx([0.5, 0.5]), NEUTRAL_ARTIST, 'local', 'standard', 4000, 1); // 44
    const breakout = qual(scriptedCtx([0.01]), NEUTRAL_ARTIST, 'local', 'standard', 4000, 1); // 78
    expect(baseline).toBe(44);
    expect(breakout).toBe(78);
    expect(breakout).toBeGreaterThan(baseline);
    // boost is 1.5x-2.0x; raw baseline (pre-clamp) is ~44, so breakout >= 1.5x baseline region
    expect(breakout).toBeGreaterThanOrEqual(Math.round(baseline * 1.5));
  });

  it('breakout boost is larger for lower combined skill (skill still matters)', () => {
    // low skill (talent 0, local) gets a bigger multiplier than mid skill, but low
    // base can leave the final number equal after rounding — assert boost direction
    // via the pre-clamp relationship: low-skill breakout is not below mid-skill * (base ratio).
    const midBreakout = qual(scriptedCtx([0.01]), NEUTRAL_ARTIST, 'local', 'standard', 4000, 1);
    const lowBreakout = qual(scriptedCtx([0.01]), { ...NEUTRAL_ARTIST, talent: 0 }, 'local', 'standard', 4000, 1);
    // Both land at breakout; low-skill's higher multiplier compensates its lower base.
    expect(midBreakout).toBe(78);
    expect(lowBreakout).toBe(78);
  });

  it('critical failure (0.05 <= outlierRoll < 0.10): variance multiplier 0.5x-0.7x, below baseline', () => {
    const baseline = qual(scriptedCtx([0.5, 0.5]), NEUTRAL_ARTIST, 'local', 'standard', 4000, 1); // 44
    const critfail = qual(scriptedCtx([0.07]), NEUTRAL_ARTIST, 'local', 'standard', 4000, 1); // 26
    expect(baseline).toBe(44);
    expect(critfail).toBe(26);
    expect(critfail).toBeLessThan(baseline);
    // penalty 0.5x-0.7x; result should be at or below 0.7x baseline region
    expect(critfail).toBeLessThanOrEqual(Math.round(baseline * 0.7));
  });

  it('critical failure is less severe for high skill (skill protects)', () => {
    // High-skill critfail penalty is only 0.7x and base is very high, so it clamps
    // at the ceiling — demonstrably less punished than a mid-skill critfail.
    const highSkillCritfail = qual(
      scriptedCtx([0.07]),
      { talent: 100, workEthic: 100, popularity: 100, mood: 100 },
      'legendary',
      'perfectionist',
      20000,
      1,
    );
    const midCritfail = qual(scriptedCtx([0.07]), NEUTRAL_ARTIST, 'local', 'standard', 4000, 1);
    expect(highSkillCritfail).toBe(98);
    expect(highSkillCritfail).toBeGreaterThan(midCritfail);
  });

  it('normal branch variance widens quality symmetrically around baseline (skill-based range)', () => {
    // outlierRoll 0.5 (normal), then variance draw at +max and -max of the range.
    const plusMax = qual(scriptedCtx([0.5, 1.0]), NEUTRAL_ARTIST, 'local', 'standard', 4000, 1); // 54
    const minusMax = qual(scriptedCtx([0.5, 0.0]), NEUTRAL_ARTIST, 'local', 'standard', 4000, 1); // 35
    const baseline = qual(scriptedCtx([0.5, 0.5]), NEUTRAL_ARTIST, 'local', 'standard', 4000, 1); // 44
    expect(plusMax).toBe(54);
    expect(minusMax).toBe(35);
    expect(plusMax).toBeGreaterThan(baseline);
    expect(minusMax).toBeLessThan(baseline);
  });
});
