/**
 * Tour-popularity saturation — balance-integrity slice 6.
 *
 * Tour popularity gains (+1..+7 crowd-size table, markets.json
 * tour_revenue.popularity_reactions) now run through the SAME diminishing-returns
 * curve that streaming popularity gains respect (markets.json
 * popularity_saturation, shared/utils/popularitySaturation.ts):
 *
 *   adjustedGain = max(0, round(tableGain × min(1, satMult(currentPopularity))))
 *   satMult(pop) = dim_base + dim_range/(1 + (pop/satPoint)^exp)
 *
 * DESIGN PIN (deviation from naive reuse of the streaming curve): streaming lets
 * satMult exceed 1 at low popularity (up to 1.5x at pop 0 — a super-charger for
 * unknowns). Tours CLAMP with min(1, ·): the reaction table was authored as the
 * FULL gain, so saturation may only REDUCE a tour gain, never amplify it above the
 * table. A low-pop act therefore gains EXACTLY the table value, and only
 * already-famous acts see the gain shrink (floor 0 — a sold-out arena for a
 * 90-pop star can legitimately move nothing).
 *
 * These are direct method tests: TourProcessor.applyTourPerformanceImpacts reads
 * the artist's popularity off ctx.storage and the curve config off
 * ctx.gameData.getBalanceConfigSync(); we feed it the REAL markets.json balance
 * so the defaults (dim 0.2/1.3, satPoint 35, exp 4) exercise the shipped curve.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { TourProcessor } from '@shared/engine/processors/TourProcessor';
import type { WeekContext } from '@shared/engine/processors/types';
import type { WeekSummary } from '@shared/types/gameTypes';

const markets = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'balance', 'markets.json'), 'utf-8')
);
const marketFormulas = markets.market_formulas;

/**
 * Build a WeekContext whose storage returns an artist at a given popularity and
 * whose gameData exposes the real markets.json balance. capacity/attendanceRate
 * on cityData determine which crowd-size tier (hence raw table gain) fires.
 */
function makeCtx(popularity: number) {
  const summary = { changes: [], artistChanges: {} } as unknown as WeekSummary;
  const artist = { id: 'artist-1', name: 'Touring Act', popularity };
  const ctx = {
    gameState: { id: 'game-1' } as any,
    summary,
    gameData: {
      getBalanceConfigSync: () => ({ market_formulas: marketFormulas }),
    } as any,
    storage: {
      getArtist: async (id: string) => (id === 'artist-1' ? artist : null),
    } as any,
    getRandom: (min: number, max: number) => (min + max) / 2,
  } as unknown as WeekContext;
  return { ctx, summary };
}

/** cityData for a big arena crowd (>=10000 attendees → top tier, raw gain 7). */
function bigCrowdCity() {
  // 20000 cap × 90% = 18000 attendees ≥ 10000 → top tier (gain 7). Attendance
  // 90% > 70% threshold so the popularity branch fires.
  return { capacity: 20000, attendanceRate: 90 };
}

/** cityData for a tiny club crowd (<500 attendees → bottom tier, raw gain 1). */
function tinyCrowdCity() {
  // 400 cap × 90% = 360 attendees < 500 → bottom tier (gain 1).
  return { capacity: 400, attendanceRate: 90 };
}

const proc = new TourProcessor();

describe('Slice 6 — tour popularity gains respect the saturation curve', () => {
  it('DIRECTION: for the same big-crowd show, a low-pop artist gains MORE than a high-pop artist', async () => {
    const lo = makeCtx(20);
    const hi = makeCtx(80);
    const rLo = await proc.applyTourPerformanceImpacts(lo.ctx, 'artist-1', bigCrowdCity(), null);
    const rHi = await proc.applyTourPerformanceImpacts(hi.ctx, 'artist-1', bigCrowdCity(), null);

    expect(rLo.popularityChange).toBeGreaterThan(rHi.popularityChange);
  });

  it('EXACT: pop 80 + big crowd (raw gain 7) → satMult ≈ 0.2459, round(7 × 0.2459) = 2', async () => {
    const { ctx, summary } = makeCtx(80);
    const r = await proc.applyTourPerformanceImpacts(ctx, 'artist-1', bigCrowdCity(), null);

    // satMult(80) = 0.2 + 1.3/(1+(80/35)^4) = 0.245944; 7 × 0.245944 = 1.7216 → 2.
    expect(r.popularityChange).toBe(2);
    // The pushed summary entry mirrors the (saturated) gain.
    const popEntry = summary.changes.find((c: any) => c.type === 'popularity' && c.artistId === 'artist-1');
    expect(popEntry).toBeDefined();
    expect(popEntry!.amount).toBe(2);
  });

  it('FLOOR: pop 80 + tiny crowd (raw gain 1) → round(0.2459) = 0 is allowed (no gain, no entry)', async () => {
    const { ctx, summary } = makeCtx(80);
    const r = await proc.applyTourPerformanceImpacts(ctx, 'artist-1', tinyCrowdCity(), null);

    // 1 × 0.245944 = 0.2459 → round → 0. A sold-out club for a famous act moves nothing.
    expect(r.popularityChange).toBe(0);
    // No popularity summary entry is pushed when the saturated gain is 0.
    const popEntry = summary.changes.find((c: any) => c.type === 'popularity' && c.artistId === 'artist-1');
    expect(popEntry).toBeUndefined();
  });

  it('LOW POP ≈ TABLE: the min(1,·) cap means a pop-0 act gains EXACTLY the raw table value (curve never super-charges)', async () => {
    // satMult(0) = 0.2 + 1.3/1 = 1.5, but min(1, 1.5) = 1 → gain = table (7), NOT 11.
    const { ctx } = makeCtx(0);
    const r = await proc.applyTourPerformanceImpacts(ctx, 'artist-1', bigCrowdCity(), null);

    expect(r.popularityChange).toBe(7);
  });

  it('MOOD UNCHANGED: the saturation cap touches popularity only — mood reaction is the raw table delta', async () => {
    // 90% attendance > good_max(85) → great_delta (+8), independent of popularity.
    const { ctx } = makeCtx(80);
    const r = await proc.applyTourPerformanceImpacts(ctx, 'artist-1', bigCrowdCity(), null);
    expect(r.moodChange).toBe(marketFormulas.tour_revenue.mood_reactions.great_delta);
  });
});
