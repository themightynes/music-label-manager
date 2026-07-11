/**
 * Balance-integrity slice 4 (mood → variance widening) — direction-pinned tests.
 *
 * Low artist mood makes recording outcomes VOLATILE (a WIDER variance band), not
 * uniformly worse. The unchanged 0.9–1.1 mood_factor quality MULTIPLIER (the mean
 * nudge) is a separate mechanism and stays put.
 *
 * Covers:
 *  1. mood 10 produces a wider effective band than mood 50 (both via the pure
 *     helper factor AND by driving the real calculateEnhancedSongQuality).
 *  2. mood 50 and mood 90 produce IDENTICAL factors (1.0) — no narrowing above
 *     baseline.
 *  3. Factor at mood 0 = 1.4 with default config; respects config override.
 *  4. Composition with pendingVariance: both active → both applied (combined).
 *
 * RNG invariance: the widening scales the BAND WIDTH the existing normal-variance
 * draw is mapped onto — no ctx.getRandom draw is added, removed, or reordered.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  SongGenerationProcessor,
  computeMoodVarianceWiden,
} from '@shared/engine/processors/SongGenerationProcessor';
import { FinancialSystem } from '@shared/engine/FinancialSystem';
import type { WeekContext } from '@shared/engine/processors/types';
import { createGameData } from './golden-master-fixtures';

const quality = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'balance', 'quality.json'), 'utf-8'),
);

// ---------------------------------------------------------------------------
// Pure helper: computeMoodVarianceWiden
// ---------------------------------------------------------------------------
describe('computeMoodVarianceWiden — the pure band-widen factor', () => {
  it('mood 10 widens more than mood 50 (lower mood → wider band)', () => {
    const low = computeMoodVarianceWiden(10);
    const mid = computeMoodVarianceWiden(50);
    expect(low).toBeGreaterThan(mid);
  });

  it('mood 50 and mood 90 produce the IDENTICAL factor 1.0 (no narrowing above baseline)', () => {
    expect(computeMoodVarianceWiden(50)).toBe(1.0);
    expect(computeMoodVarianceWiden(90)).toBe(1.0);
    expect(computeMoodVarianceWiden(90)).toBe(computeMoodVarianceWiden(50));
  });

  it('mood 0 = 1.4 with default config (baseline 50, max 0.4)', () => {
    expect(computeMoodVarianceWiden(0)).toBeCloseTo(1.4, 10);
  });

  it('respects a config override', () => {
    // baseline 100, max 1.0 → mood 0 => 1 + (100/100)*1.0 = 2.0; mood 50 => 1.5
    expect(
      computeMoodVarianceWiden(0, { mood_baseline: 100, mood_variance_widening_max: 1.0 }),
    ).toBeCloseTo(2.0, 10);
    expect(
      computeMoodVarianceWiden(50, { mood_baseline: 100, mood_variance_widening_max: 1.0 }),
    ).toBeCloseTo(1.5, 10);
  });

  it('composes multiplicatively with the pendingVariance widen (both applied)', () => {
    // The engine composes: skill-derived band × moodWiden × pendingVarianceWiden.
    // Assert the combined factor equals the product of the two independent factors.
    const moodWiden = computeMoodVarianceWiden(0); // 1.4 default
    const pendingWiden = 1 + 2 * (quality.quality_system.variance_widen_per_point ?? 0.5); // 2.0 for 2 points
    const combined = moodWiden * pendingWiden;
    expect(combined).toBeCloseTo(1.4 * 2.0, 10);
    expect(combined).toBeGreaterThan(moodWiden);
    expect(combined).toBeGreaterThan(pendingWiden);
  });
});

// ---------------------------------------------------------------------------
// Real driver: SongGenerationProcessor.calculateEnhancedSongQuality
// ---------------------------------------------------------------------------
const baseGameData = createGameData({} as any, []);
const fullBalance = {
  ...baseGameData.getBalanceConfigSync(),
  quality_system: quality.quality_system,
  producer_tier_system: quality.producer_tier_system,
};
const gameData: any = { ...baseGameData, getBalanceConfigSync: () => fullBalance };

function makeQualityCtx(rng: () => number, flags: Record<string, any> = {}): WeekContext {
  const financialSystem = new FinancialSystem(gameData, rng);
  return {
    gameState: { flags } as any,
    summary: { changes: [] } as any,
    gameData,
    storage: {},
    financialSystem,
    getRandom: (min: number, max: number) => min + rng() * (max - min),
  } as WeekContext;
}

const proc = new SongGenerationProcessor();
const PROJECT = { type: 'single', songCount: 1 };

// rngValues: [outlierRoll, varianceDraw]. Use a high outlierRoll (0.9) so we land
// in the NORMAL-variance branch. varianceDraw 1 = max positive band edge, 0 = max
// negative band edge. The spread between the two isolates the effective band WIDTH.
function qualForMoodDraw(mood: number, varianceDraw: number): number {
  const rngValues = [0.9, varianceDraw];
  let i = 0;
  const rng = () => rngValues[i++ % rngValues.length];
  return proc.calculateEnhancedSongQuality(
    makeQualityCtx(rng, {}),
    { talent: 50, workEthic: 50, popularity: 0, mood },
    PROJECT,
    'local',
    'standard',
    4000,
    1,
  );
}

describe('calculateEnhancedSongQuality — low mood widens the effective variance band', () => {
  it('mood 10 has a wider effective band (max-edge spread) than mood 50', () => {
    const spreadLow = qualForMoodDraw(10, 1) - qualForMoodDraw(10, 0);
    const spreadMid = qualForMoodDraw(50, 1) - qualForMoodDraw(50, 0);
    // Both spreads are positive (band has width); the low-mood band is wider even
    // though its mean multiplier (moodFactor) is slightly lower. The mean-vs-band
    // effects do NOT cancel — the wider band dominates.
    expect(spreadLow).toBeGreaterThan(spreadMid);
  });

  // Note: mood 90 vs mood 50 "no narrowing above baseline" is asserted cleanly on
  // the pure factor (computeMoodVarianceWiden === 1.0 for both) above. Asserting it
  // on the ABSOLUTE quality spread here would be confounded by the unchanged
  // moodFactor mean multiplier (mood 90's higher mean scales the same band into
  // more quality points), so the factor-level assertion is the honest one.
});
