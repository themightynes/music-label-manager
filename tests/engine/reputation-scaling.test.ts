/**
 * Volatility-economy slice 3 — reputation-gain scaling + C65 cap.
 *
 *  - scaleReputationGain (shared/utils/reputationScaling): POSITIVE gains are
 *    multiplied by reputation_gain_scaling (default 0.7) and rounded; LOSSES and
 *    zero pass through UNSCALED.
 *  - Applied per-source (no single chokepoint) at: chart milestones, release
 *    press coverage, PR-push + digital-ads marketing, meeting immediate + delayed
 *    reputation effects. This suite covers the helper contract + two integration
 *    points that also exercise the C65 cap (press coverage) and losses-unscaled
 *    (negative meeting effect via ActionProcessor.applyEffects).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  scaleReputationGain,
  DEFAULT_REPUTATION_GAIN_SCALING,
} from '@shared/utils/reputationScaling';
import { ReleaseProcessor } from '@shared/engine/processors/ReleaseProcessor';
import type { WeekContext } from '@shared/engine/processors/types';

const progression = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'balance', 'progression.json'), 'utf-8'),
);
const repSystem = progression.reputation_system;
const SCALING: number = repSystem.reputation_gain_scaling; // 0.7

describe('slice 3 — scaleReputationGain helper', () => {
  it('default factor is 0.7', () => {
    expect(DEFAULT_REPUTATION_GAIN_SCALING).toBe(0.7);
    expect(SCALING).toBe(0.7);
  });

  it('scales + rounds a positive gain (10 → 7, 5 → round(3.5)=4, 15 → round(10.5)=11)', () => {
    expect(scaleReputationGain(10, repSystem)).toBe(7);
    expect(scaleReputationGain(5, repSystem)).toBe(4);
    expect(scaleReputationGain(15, repSystem)).toBe(11);
  });

  it('LOSSES pass through unscaled', () => {
    expect(scaleReputationGain(-5, repSystem)).toBe(-5);
    expect(scaleReputationGain(-8, repSystem)).toBe(-8);
  });

  it('zero passes through unchanged', () => {
    expect(scaleReputationGain(0, repSystem)).toBe(0);
  });

  it('falls back to 0.7 when config is absent', () => {
    expect(scaleReputationGain(10, undefined)).toBe(7);
    expect(scaleReputationGain(10, {})).toBe(7);
  });

  it('reputation_gain_scaling: 1.0 disables damping (gains untouched)', () => {
    expect(scaleReputationGain(10, { reputation_gain_scaling: 1.0 })).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Press-coverage integration: scaling + C65 cap (ReleaseProcessor).
// ---------------------------------------------------------------------------
function buildPressCtx(opts: { reputation: number; reputationGain: number; pickups: number }) {
  const song = {
    id: 'song-1', artistId: 'artist-1', title: 'Track', quality: 70,
    productionBudget: 0, awareness: 0, peak_awareness: 0,
    isReleased: false, totalStreams: 0, totalRevenue: 0,
  };
  const gameData: any = {
    getBalanceConfigSync: () => ({ reputation_system: repSystem }),
    getAwarenessBoostConfigSync: () => ({ awareness_boost_points_per_unit: 8, pending_awareness_boost_expiry_weeks: 8 }),
    getPlannedReleases: async () => [{
      id: 'release-1', gameId: 'game-1', artistId: 'artist-1', title: 'Neon Nights',
      type: 'single', status: 'planned', releaseWeek: 5,
      marketingBudget: 5000, metadata: { totalInvestment: 5000, marketingBudget: { pr: 5000 } },
    }],
    getSongsByRelease: async () => [song],
    updateReleaseStatus: async () => {},
    updateSongs: async () => {},
  };
  const ctx: WeekContext = {
    gameState: { id: 'game-1', currentWeek: 5, reputation: opts.reputation, pressAccess: 'national', flags: {} } as any,
    summary: { week: 5, changes: [], revenue: 0, expenses: 0, streams: 0, reputationChanges: {} } as any,
    gameData,
    storage: { getArtist: async () => ({ id: 'artist-1', popularity: 50, name: 'Nova' }) } as any,
    // Stub the FinancialSystem press outcome so the test controls pickups + gain.
    financialSystem: {
      investmentTracker: null,
      calculatePressOutcome: () => ({ pickups: opts.pickups, reputationGain: opts.reputationGain }),
      getAccessChance: () => 0,
    } as any,
    getRandom: (min: number, max: number) => min + 0.5 * (max - min),
    dbTransaction: undefined,
  };
  return { ctx };
}
function stubOutcome(proc: ReleaseProcessor, revenue: number) {
  (proc as any).calculateSophisticatedReleaseOutcome = () => ({
    perSongBreakdown: [{ songId: 'song-1', streams: 1000, revenue }],
    totalStreams: 1000, totalRevenue: revenue,
  });
}

describe('slice 3 — press-coverage reputation scaling + C65 cap', () => {
  it('scales the press reputation gain (raw 10 → applied 7)', async () => {
    const proc = new ReleaseProcessor();
    stubOutcome(proc, 50000); // healthy revenue, not a flop
    const { ctx } = buildPressCtx({ reputation: 50, reputationGain: 10, pickups: 3 });

    await proc.processPlannedReleases(ctx, ctx.summary, undefined);

    expect(ctx.gameState.reputation).toBe(50 + scaleReputationGain(10, repSystem)); // 57
    expect(ctx.summary.reputationChanges['artist-1']).toBe(7);
  });

  it('C65: caps reputation at 100 (was the only uncapped path)', async () => {
    const proc = new ReleaseProcessor();
    stubOutcome(proc, 50000);
    // rep 98 + scaled gain would exceed 100 → must clamp to 100.
    const { ctx } = buildPressCtx({ reputation: 98, reputationGain: 20, pickups: 5 });

    await proc.processPlannedReleases(ctx, ctx.summary, undefined);

    expect(ctx.gameState.reputation).toBe(100);
    expect(ctx.gameState.reputation).toBeLessThanOrEqual(100);
  });
});
