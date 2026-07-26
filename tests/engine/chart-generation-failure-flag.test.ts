/**
 * C108 safe slice — chart-failure observability flag.
 *
 * GameEngine.processWeeklyCharts deliberately SWALLOWS failures (post-D6 the
 * whole advance is one transaction, so a chart failure yields a COMMITTED week
 * with no chart rows, no chartUpdates, and silently-skipped chart-milestone
 * bonuses; rethrow-vs-log is PENDING-DECISIONS #11). This suite pins the new
 * structured signal: on any chart generation/fetch failure the week summary
 * carries `chartGenerationFailed: true`, and on the success path the field is
 * never set (snapshot-safe) — mirrors the C55 email-failure flag suite.
 *
 * DB-free: drives the private method via runtime access (established pattern),
 * with the ChartService module mocked for deterministic failure injection.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameEngine } from '@shared/engine/game-engine';
import type { WeekSummary } from '@shared/types/gameTypes';

const { generateWeeklyChartMock, getCurrentWeekChartEntriesMock } = vi.hoisted(() => ({
  generateWeeklyChartMock: vi.fn(),
  getCurrentWeekChartEntriesMock: vi.fn(),
}));

vi.mock('@shared/engine/ChartService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@shared/engine/ChartService')>();
  class MockChartService {
    // Preserve the real static helper called before the instance methods.
    static generateChartWeekFromGameWeek = actual.ChartService.generateChartWeekFromGameWeek;
    constructor(..._args: any[]) {}
    generateWeeklyChart = generateWeeklyChartMock;
    getCurrentWeekChartEntries = getCurrentWeekChartEntriesMock;
  }
  return { ...actual, ChartService: MockChartService };
});

function buildGameData() {
  return {
    getBalanceConfigSync: () => ({ reputation_system: { reputation_gain_scaling: 1.0 } }),
    // FinancialSystem's constructor validation reads these two at engine build.
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

function buildEngine() {
  const gameState: any = {
    id: 'chart-flag-game',
    currentWeek: 10,
    reputation: 50,
    flags: {},
  };
  return new GameEngine(gameState, buildGameData(), {} as any, 'chart-flag-seed');
}

function makeSummary(): WeekSummary {
  return { week: 10, changes: [], revenue: 0, expenses: 0, reputationChanges: {}, events: [] };
}

describe('processWeeklyCharts — C108 chartGenerationFailed flag', () => {
  beforeEach(() => {
    generateWeeklyChartMock.mockReset();
    getCurrentWeekChartEntriesMock.mockReset();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('sets summary.chartGenerationFailed when chart GENERATION throws (swallow semantics preserved — no rethrow)', async () => {
    generateWeeklyChartMock.mockRejectedValue(new Error('chart generation exploded'));
    const engine = buildEngine();
    const summary = makeSummary();
    await expect((engine as any).processWeeklyCharts(summary)).resolves.toBeUndefined();
    expect(summary.chartGenerationFailed).toBe(true);
  });

  it('sets summary.chartGenerationFailed when entry FETCH rejects', async () => {
    generateWeeklyChartMock.mockResolvedValue(undefined);
    getCurrentWeekChartEntriesMock.mockRejectedValue(new Error('fetch down'));
    const engine = buildEngine();
    const summary = makeSummary();
    await expect((engine as any).processWeeklyCharts(summary)).resolves.toBeUndefined();
    expect(summary.chartGenerationFailed).toBe(true);
  });

  it('does NOT set the flag on success (snapshot-safe: field absent, not false)', async () => {
    generateWeeklyChartMock.mockResolvedValue(undefined);
    getCurrentWeekChartEntriesMock.mockResolvedValue([]);
    const engine = buildEngine();
    const summary = makeSummary();
    await (engine as any).processWeeklyCharts(summary);
    expect('chartGenerationFailed' in summary).toBe(false);
    expect(summary.chartUpdates).toEqual([]);
  });
});
