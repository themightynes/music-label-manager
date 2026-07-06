/**
 * Tour Experience Tier 1 — Slice 1 characterization.
 *
 * Covers the three engine-only behavior changes in this slice:
 *  1. The phantom third week is gone: a tour's FINAL city's revenue is processed
 *     AND the tour completes in the SAME advance. A 1-city tour therefore takes
 *     2 advances (planning week, then city+completion), a 3-city tour 4 advances.
 *  2. The weekly tour_performance revenue change carries structured city fields
 *     (venue/attendanceRate/ticketsSold/capacity/cityNumber/citiesTotal/costs/
 *     netProfit/artistId/artistName) alongside the unchanged description string.
 *  3. A planning-week `tour_planning` foreshadow entry is pushed on
 *     planning → production, with a DETERMINISTIC estTickets and NO extra RNG draw.
 *
 * These are processor-level tests: ProjectStageProcessor.advanceProjectStages
 * reads projects directly off the injected mock tx (mirrors the pre-extraction
 * engine), and we hand it a REAL FinancialSystem + a minimal gameData (real tour
 * balance JSON) so the same-pass completion actually runs the unified tour math.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectStageProcessor } from '@shared/engine/processors/ProjectStageProcessor';
import { FinancialSystem } from '@shared/engine/FinancialSystem';
import type { WeekContext } from '@shared/engine/processors/types';
import type { WeekSummary, GameChange } from '@shared/types/gameTypes';

// --- minimal gameData: real tour + venue balance JSON, fixed artist ----------
const balanceDir = path.join(process.cwd(), 'data', 'balance');
const progression = JSON.parse(fs.readFileSync(path.join(balanceDir, 'progression.json'), 'utf-8'));

const TEST_ARTIST = { id: 'artist-1', name: 'Touring Act', popularity: 60 };

function makeGameData() {
  return {
    getArtistById: async (id: string) => (id === TEST_ARTIST.id ? TEST_ARTIST : null),
    getTourConfigSync: () => ({
      sell_through_base: 0.7,
      reputation_modifier: 1.0,
      local_popularity_weight: 1.0,
      ticket_price_base: 20,
      ticket_price_per_capacity: 0.01,
      merch_percentage: 0.25,
      revenue_per_fan: 25,
      base_attendance: 100,
      sell_through_range: 0.3,
      costs: { small: 5000, medium: 15000, large: 40000 },
    }),
    getAccessTiersSync: () => progression.access_tier_system,
  } as any;
}

/** Mock drizzle tx: select→projectList, update→records set() payloads. */
function makeTx(projectList: any[]) {
  const updates: any[] = [];
  const tx: any = {
    select: () => ({ from: () => ({ where: async () => projectList }) }),
    update: () => ({ set: (data: any) => ({ where: async () => { updates.push(data); } }) }),
  };
  return { tx, updates };
}

/**
 * Builds a WeekContext with a COUNTING getRandom (midpoint draw, deterministic)
 * so tests can assert exactly how many RNG draws a pass consumed.
 */
function makeCtx(currentWeek: number, reputation = 10) {
  const savedProjects: any[] = [];
  const summary = { changes: [] } as unknown as WeekSummary;
  let randomCalls = 0;
  const getRandom = (min: number, max: number) => { randomCalls++; return (min + max) / 2; };
  const gameData = makeGameData();
  const storage = {
    updateProject: async (id: string, data: any) => { savedProjects.push({ id, ...data }); },
    getArtist: async (id: string) => (id === TEST_ARTIST.id ? TEST_ARTIST : null),
  };
  const financialSystem = new FinancialSystem(gameData, getRandom as any, storage as any);
  const ctx: WeekContext = {
    gameState: { id: 'game-1', currentWeek, reputation } as any,
    summary,
    gameData,
    storage: storage as any,
    financialSystem,
    getRandom,
  } as any;
  return { ctx, summary, savedProjects, getRandomCalls: () => randomCalls };
}

function tourProject(over: Record<string, any> = {}) {
  return {
    id: 'tour-1',
    gameId: 'game-1',
    artistId: TEST_ARTIST.id,
    title: 'World Tour',
    type: 'Mini-Tour',
    stage: 'planning',
    startWeek: 1,
    totalCost: 30000,
    quality: 50,
    songCount: 1,
    songsCreated: 0,
    metadata: { cities: 1, venueAccess: 'clubs', venueCapacity: 500 },
    ...over,
  };
}

const proc = new ProjectStageProcessor();

describe('Tour Tier1 Slice 1 — planning foreshadow (deterministic, no extra RNG)', () => {
  it('pushes a tour_planning entry on planning → production with deterministic estTickets and ZERO RNG draws', async () => {
    const project = tourProject({ stage: 'planning', startWeek: 1 });
    const { ctx, summary, getRandomCalls } = makeCtx(2); // weeksElapsed=1 → planning→production
    const { tx } = makeTx([project]);

    await proc.advanceProjectStages(ctx, summary, tx);

    const foreshadow = summary.changes.find((c: GameChange) => c.type === 'tour_planning');
    expect(foreshadow).toBeDefined();
    expect(foreshadow!.description).toContain('World Tour');
    expect(foreshadow!.description).toContain('Touring Act');
    expect(foreshadow!.description).toContain('Club Venues');
    // Structured fields for future UI.
    expect(foreshadow!.venue).toBe('Club Venues');
    expect(foreshadow!.capacity).toBe(500);
    expect(foreshadow!.cityNumber).toBe(1);
    expect(foreshadow!.citiesTotal).toBe(1);
    expect(foreshadow!.artistId).toBe(TEST_ARTIST.id);
    expect(foreshadow!.artistName).toBe('Touring Act');
    // estTickets is deterministic: pre-variance sellThroughRate × capacity, rounded.
    expect(typeof foreshadow!.estTickets).toBe('number');
    expect(foreshadow!.estTickets).toBeGreaterThan(0);
    expect(foreshadow!.estTickets).toBeLessThanOrEqual(500);

    // The foreshadow must NOT touch the seeded stream — no getRandom draws at all
    // during a planning→production advance (variance is drawn only at city execution).
    expect(getRandomCalls()).toBe(0);
  });

  it('estTickets equals the FinancialSystem pre-variance city-1 estimate exactly', async () => {
    const project = tourProject({ stage: 'planning', startWeek: 1 });
    const { ctx } = makeCtx(2);
    // Recompute what the helper should produce, independently.
    const fs2 = ctx.financialSystem as any;
    const cost = fs2.calculateTourCostsWithCapacity(500, 1, 0);
    const marketingBudget = Math.max(0, 30000 - cost.totalCosts);
    const bd = fs2.calculateDetailedTourBreakdown({
      venueCapacity: 500, venueTier: 'clubs', artistPopularity: 60, localReputation: 10, cities: 1, marketingBudget,
    });
    const expected = Math.round(bd.cities[0].venueCapacity * bd.cities[0].sellThroughRate);

    const { summary } = ctx as any;
    const { tx } = makeTx([project]);
    await proc.advanceProjectStages(ctx, summary, tx);
    const foreshadow = summary.changes.find((c: GameChange) => c.type === 'tour_planning');
    expect(foreshadow!.estTickets).toBe(expected);
  });
});

describe('Tour Tier1 Slice 1 — completion cadence (phantom week removed)', () => {
  it('a 1-city tour completes in the SAME pass as its city (city revenue + project_complete together)', async () => {
    // 1 city, in production, startWeek 1, currentWeek 2 → weeksElapsed=1,
    // weeksInProduction=0... that is city 0. The final city plays when
    // weeksInProduction === citiesPlanned(1), i.e. weeksElapsed=2, currentWeek=3.
    const project = tourProject({ stage: 'production', startWeek: 1 });
    const { ctx, summary, savedProjects } = makeCtx(3); // weeksElapsed=2 → weeksInProduction=1 === cities
    const { tx } = makeTx([project]);

    await proc.advanceProjectStages(ctx, summary, tx);

    // City revenue processed THIS pass.
    const perf = summary.changes.find((c: GameChange) => c.source === 'tour_performance');
    expect(perf).toBeDefined();
    // Completion in the SAME pass.
    const complete = summary.changes.find((c: GameChange) => c.type === 'project_complete');
    expect(complete).toBeDefined();
    // Milestone advanced to the tour "completed" (recorded) stage this pass.
    const milestone = summary.changes.find((c: GameChange) => c.type === 'unlock');
    expect(milestone!.description).toContain('Tour Completed');
    // Completion totals were computed from the UPDATED tourStats (which now
    // includes the just-processed final city — a nonzero gross/attendance).
    expect(complete!.grossRevenue).toBeGreaterThan(0);
    expect((complete as any).description).toContain('1 cities');
    // Project persisted as completed.
    expect(savedProjects.some((p) => p.completionStatus === 'completed')).toBe(true);
  });

  it('does NOT complete a 3-city tour on its FIRST city week (still touring)', async () => {
    const project = tourProject({
      stage: 'production', startWeek: 1,
      metadata: { cities: 3, venueAccess: 'clubs', venueCapacity: 500 },
    });
    const { ctx, summary } = makeCtx(3); // weeksInProduction=1 < cities(3)
    const { tx } = makeTx([project]);

    await proc.advanceProjectStages(ctx, summary, tx);

    expect(summary.changes.find((c: GameChange) => c.source === 'tour_performance')).toBeDefined();
    expect(summary.changes.find((c: GameChange) => c.type === 'project_complete')).toBeUndefined();
  });

  it('a 3-city tour completes on its THIRD city week (weeksInProduction === cities)', async () => {
    // Final city of a 3-city tour: weeksInProduction===3 → weeksElapsed=4 →
    // currentWeek=5. The pre-calc runs on this pass (city 1 was never revealed in
    // this isolated test, so tourStats.preCalculatedCities is built now and city 3
    // is revealed from it), then completion fires in the same pass.
    const project = tourProject({
      stage: 'production', startWeek: 1,
      metadata: { cities: 3, venueAccess: 'clubs', venueCapacity: 500 },
    });
    const { ctx, summary } = makeCtx(5); // weeksElapsed=4 → weeksInProduction=3 === cities
    const { tx } = makeTx([project]);
    await proc.advanceProjectStages(ctx, summary, tx);

    expect(summary.changes.find((c: GameChange) => c.type === 'project_complete')).toBeDefined();
    const milestone = summary.changes.find((c: GameChange) => c.type === 'unlock');
    expect(milestone!.description).toContain('Tour Completed');
  });
});

describe('Tour Tier1 Slice 1 — structured fields on tour_performance change', () => {
  it('the weekly tour revenue change carries structured city fields (description unchanged)', async () => {
    const project = tourProject({
      stage: 'production', startWeek: 1,
      metadata: { cities: 3, venueAccess: 'clubs', venueCapacity: 500 },
    });
    const { ctx, summary } = makeCtx(3); // weeksInProduction=1 → city 1, mid-tour
    const { tx } = makeTx([project]);

    await proc.advanceProjectStages(ctx, summary, tx);

    const perf = summary.changes.find((c: GameChange) => c.source === 'tour_performance');
    expect(perf).toBeDefined();
    // Description string is preserved verbatim (other consumers match on it).
    expect(perf!.description).toContain('World Tour - City 1 performance:');
    expect(perf!.description).toContain('% attendance)');
    // Structured fields present + internally consistent.
    expect(perf!.venue).toBe('Club Venues');
    expect(perf!.capacity).toBe(500);
    expect(perf!.cityNumber).toBe(1);
    expect(perf!.citiesTotal).toBe(3);
    expect(perf!.artistId).toBe(TEST_ARTIST.id);
    expect(perf!.artistName).toBe('Touring Act');
    expect(typeof perf!.attendanceRate).toBe('number');
    expect(typeof perf!.ticketsSold).toBe('number');
    expect(typeof perf!.costs).toBe('number');
    expect(typeof perf!.netProfit).toBe('number');
    // netProfit = revenue − costs consistency.
    expect(perf!.netProfit).toBe((perf!.amount ?? 0) - (perf!.costs ?? 0));
  });
});
