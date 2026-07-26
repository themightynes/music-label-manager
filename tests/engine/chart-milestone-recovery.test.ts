/**
 * C108 milestone-recovery slice (PENDING-DECISIONS #11, "gameplay is more
 * important"): weekly chart failures stay LOG-AND-CONTINUE, but a chart-milestone
 * grant skipped by a fetch/apply-stage failure must be RECOVERABLE — re-attempted
 * on the next successful advance, not silently lost.
 *
 * The recovery mechanism: applyChartMilestoneBonuses fires a milestone on EITHER
 * the current-week position OR the persisted `peakPosition` (rows survive in
 * chart_entries even when the grant was skipped), still guarded by the once-per-
 * song flag so it grants exactly once.
 *
 * DB-free: drives the private applyChartMilestoneBonuses via runtime access
 * (mirrors chart-generation-failure-flag.test.ts's harness); mock gameData carries
 * getBalanceConfigSync/getAccessTiersSync/getTourConfigSync so the engine builds.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEngine } from '@shared/engine/game-engine';
import type { WeekSummary } from '@shared/types/gameTypes';

function buildGameData() {
  return {
    getBalanceConfigSync: () => ({
      reputation_system: {
        reputation_gain_scaling: 1.0,
        hit_single_bonus: 5,
        number_one_bonus: 10,
        creative_capital_milestones: {
          cc_top10_bonus: 1,
          cc_number_one_bonus: 2,
        },
      },
    }),
    getAccessTiersSync: () => ({
      venue_access: {
        none: { threshold: 0, capacity_range: [0, 50], guarantee_multiplier: 0.3 },
        clubs: { threshold: 5, capacity_range: [50, 500], guarantee_multiplier: 0.7 },
        theaters: { threshold: 20, capacity_range: [500, 2000], guarantee_multiplier: 1.0 },
        arenas: { threshold: 45, capacity_range: [2000, 20000], guarantee_multiplier: 1.5 },
      },
    }),
    getTourConfigSync: () => ({
      sell_through_base: 0.15,
      reputation_modifier: 0.05,
      local_popularity_weight: 0.6,
      merch_percentage: 0.15,
      ticket_price_base: 25,
      ticket_price_per_capacity: 0.03,
    }),
    getAllArtists: async () => [],
  } as any;
}

function buildEngine(flags: any = {}) {
  const gameState: any = {
    id: 'chart-milestone-recovery-game',
    currentWeek: 10,
    reputation: 50,
    creativeCapital: 3,
    flags,
  };
  return new GameEngine(gameState, buildGameData(), {} as any, 'recovery-seed');
}

function makeSummary(): WeekSummary {
  return { week: 10, changes: [], revenue: 0, expenses: 0, reputationChanges: {}, events: [] };
}

describe('applyChartMilestoneBonuses — C108 peak-based milestone recovery', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('(a) RECOVERY: current position outside top-10 but qualifying peak, flag unset → grants + sets flags', () => {
    const engine = buildEngine({}); // no prior milestone flag
    const gs: any = (engine as any).gameState;
    const summary = makeSummary();
    const repBefore = gs.reputation;
    const ccBefore = gs.creativeCapital;

    (engine as any).applyChartMilestoneBonuses(
      [{ songId: 'song-1', songTitle: 'Comeback', position: 12, peakPosition: 1, isCompetitorSong: false }],
      summary
    );

    // Both reputation bonuses stack (hit_single 5 + number_one 10 = 15) on the 1.0 scale.
    expect(gs.reputation).toBe(repBefore + 15);
    // CC no-stack: higher of top10(1)/number_one(2) = 2.
    expect(gs.creativeCapital).toBe(ccBefore + 2);
    // Once-fired flag now records both milestones.
    expect(gs.flags.chartMilestones['song-1']).toEqual({ hitTop10: true, hitNumberOne: true });
    // Summary reflects the grants.
    expect(summary.reputationChanges!['global']).toBe(15);
    expect(summary.changes.some(c => c.type === 'reputation')).toBe(true);
    expect(summary.changes.some(c => c.type === 'creative_capital')).toBe(true);
  });

  it('(b) IDEMPOTENCE: same entry but flag already fully set → no grant', () => {
    const engine = buildEngine({
      chartMilestones: { 'song-1': { hitTop10: true, hitNumberOne: true } },
    });
    const gs: any = (engine as any).gameState;
    const summary = makeSummary();
    const repBefore = gs.reputation;
    const ccBefore = gs.creativeCapital;

    (engine as any).applyChartMilestoneBonuses(
      [{ songId: 'song-1', songTitle: 'Comeback', position: 12, peakPosition: 1, isCompetitorSong: false }],
      summary
    );

    expect(gs.reputation).toBe(repBefore);
    expect(gs.creativeCapital).toBe(ccBefore);
    expect(summary.changes).toEqual([]);
    expect(gs.flags.chartMilestones['song-1']).toEqual({ hitTop10: true, hitNumberOne: true });
  });

  it('(c) NORMAL debut: current position 1, no peak → grants (unchanged behavior)', () => {
    const engine = buildEngine({});
    const gs: any = (engine as any).gameState;
    const summary = makeSummary();
    const repBefore = gs.reputation;
    const ccBefore = gs.creativeCapital;

    (engine as any).applyChartMilestoneBonuses(
      [{ songId: 'song-2', songTitle: 'Instant Smash', position: 1, peakPosition: null, isCompetitorSong: false }],
      summary
    );

    expect(gs.reputation).toBe(repBefore + 15);
    expect(gs.creativeCapital).toBe(ccBefore + 2);
    expect(gs.flags.chartMilestones['song-2']).toEqual({ hitTop10: true, hitNumberOne: true });
  });
});
