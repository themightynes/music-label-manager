/**
 * Round-4 reputation delta scaling (0-700 scale) + C65 cap.
 *
 *  - scaleReputationGain (shared/utils/reputationScaling): EVERY delta — gains
 *    AND losses — is multiplied by reputation_gain_scaling (x3 amplifier onto
 *    the 0-700 scale) and rounded. Authored content keeps small values; applied
 *    deltas and the badge preview both read through this helper, so promise ==
 *    delivery.
 *  - Applied per-source (no single chokepoint) at: chart milestones, release
 *    press coverage + the flop sink, PR-push + digital-ads marketing, meeting
 *    immediate + delayed reputation effects incl. rep_swing.
 *  - TRIPWIRES: DEFAULT_REPUTATION_GAIN_SCALING and MAX_REPUTATION_FALLBACK
 *    must equal the progression.json values — the client badge preview and the
 *    engine clamps rely on the constants when no config is at hand.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  scaleReputationGain,
  DEFAULT_REPUTATION_GAIN_SCALING,
  MAX_REPUTATION_FALLBACK,
} from '@shared/utils/reputationScaling';
import { ReleaseProcessor } from '@shared/engine/processors/ReleaseProcessor';
import type { WeekContext } from '@shared/engine/processors/types';

const progression = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'balance', 'progression.json'), 'utf-8'),
);
const repSystem = progression.reputation_system;
const SCALING: number = repSystem.reputation_gain_scaling; // 3 (round-4 redesign, 2026-07-25)

describe('round-4 — scaleReputationGain helper', () => {
  it('TRIPWIRE: code constants match progression.json (badge preview + clamps depend on it)', () => {
    expect(DEFAULT_REPUTATION_GAIN_SCALING).toBe(SCALING);
    expect(MAX_REPUTATION_FALLBACK).toBe(repSystem.max_reputation);
  });

  it('configured factor is the x3 amplifier', () => {
    expect(SCALING).toBe(3);
  });

  it('scales + rounds a positive gain (1 → 3, 3 → 9, 7 → 21)', () => {
    expect(scaleReputationGain(1, repSystem)).toBe(3);
    expect(scaleReputationGain(3, repSystem)).toBe(9);
    expect(scaleReputationGain(7, repSystem)).toBe(21);
  });

  it('LOSSES scale symmetrically (round-4: no more losses-unscaled asymmetry)', () => {
    expect(scaleReputationGain(-2, repSystem)).toBe(-6);
    expect(scaleReputationGain(-8, repSystem)).toBe(-24);
  });

  it('zero passes through unchanged', () => {
    expect(scaleReputationGain(0, repSystem)).toBe(0);
  });

  it('falls back to the shared DEFAULT when config is absent (badge-preview path)', () => {
    expect(scaleReputationGain(2, undefined)).toBe(2 * DEFAULT_REPUTATION_GAIN_SCALING);
    expect(scaleReputationGain(2, {})).toBe(2 * DEFAULT_REPUTATION_GAIN_SCALING);
  });

  it('reputation_gain_scaling: 1.0 disables scaling (deltas untouched)', () => {
    expect(scaleReputationGain(10, { reputation_gain_scaling: 1.0 })).toBe(10);
    expect(scaleReputationGain(-10, { reputation_gain_scaling: 1.0 })).toBe(-10);
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
  it('scales the press reputation gain (raw 10 → applied 5 at the 0.5 damper)', async () => {
    const proc = new ReleaseProcessor();
    stubOutcome(proc, 50000); // healthy revenue, not a flop
    const { ctx } = buildPressCtx({ reputation: 50, reputationGain: 10, pickups: 3 });

    await proc.processPlannedReleases(ctx, ctx.summary, undefined);

    expect(ctx.gameState.reputation).toBe(50 + scaleReputationGain(10, repSystem)); // 80
    expect(ctx.summary.reputationChanges['artist-1']).toBe(scaleReputationGain(10, repSystem));
  });

  it('C65: caps reputation at max_reputation (was the only uncapped path)', async () => {
    const proc = new ReleaseProcessor();
    stubOutcome(proc, 50000);
    const maxRep = repSystem.max_reputation; // 700
    // near-cap rep + scaled gain would exceed the cap → must clamp.
    const { ctx } = buildPressCtx({ reputation: maxRep - 2, reputationGain: 20, pickups: 5 });

    await proc.processPlannedReleases(ctx, ctx.summary, undefined);

    expect(ctx.gameState.reputation).toBe(maxRep);
    expect(ctx.gameState.reputation).toBeLessThanOrEqual(maxRep);
  });
});
