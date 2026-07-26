/**
 * Tour-completion engine coverage — playtest bugs #9 (C68) and #12.
 *
 * #9 (C68): a Mini-Tour reaching its terminal stage must emit a TOUR-appropriate
 *   milestone label, NOT the recording pipeline's stage name ("recorded"). The
 *   stage machine reuses the `recorded` stage index internally as the tour's
 *   "completed" state, but that internal enum must never leak into player-facing
 *   Milestone Moments copy.
 *
 * #12: the tour-completion `project_complete` change (and the email built from it)
 *   must carry NET profit (grossRevenue − total tour costs), not just gross.
 *
 * ProjectStageProcessor.advanceProjectStages reads projects directly off the
 * injected dbTransaction (mirrors the pre-extraction engine), so these tests hand
 * it a minimal mock tx that satisfies the drizzle select/update chains, plus a
 * mock storage.updateProject.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectStageProcessor } from '@shared/engine/processors/ProjectStageProcessor';
import { FinancialSystem } from '@shared/engine/FinancialSystem';
import { generateEmails } from '@shared/engine/EmailGenerator';
import type { WeekContext } from '@shared/engine/processors/types';
import type { WeekSummary, GameChange } from '@shared/types/gameTypes';

/**
 * Minimal mock of the drizzle transaction used by advanceProjectStages:
 *  - `select().from(projects).where(...)` resolves to the seeded project list
 *  - `update(projects).set(...).where(...)` is a no-op that resolves
 */
function makeTx(projectList: any[]) {
  const updates: any[] = [];
  const tx: any = {
    select: () => ({
      from: () => ({
        where: async () => projectList,
      }),
    }),
    update: () => ({
      set: (data: any) => ({
        where: async () => {
          updates.push(data);
        },
      }),
    }),
  };
  return { tx, updates };
}

function makeCtx(project: any, currentWeek: number): { ctx: WeekContext; summary: WeekSummary; savedProjects: any[] } {
  const savedProjects: any[] = [];
  const summary = { changes: [] } as unknown as WeekSummary;
  const ctx: WeekContext = {
    gameState: { id: 'game-1', currentWeek } as any,
    summary,
    gameData: {} as any,
    storage: {
      updateProject: async (id: string, data: any) => {
        savedProjects.push({ id, ...data });
      },
    } as any,
    financialSystem: {} as any,
    getRandom: (min: number, max: number) => (min + max) / 2,
  } as any;
  return { ctx, summary, savedProjects };
}

/**
 * Builds a completed-tour project: 1 city planned, currently in production,
 * far enough elapsed that weeksInProduction > citiesPlanned → completion path.
 * tourStats carries a single revealed city with a full economics.costs breakdown
 * so net = gross − costs is exercised.
 */
function makeCompletedTourProject(overrides: Record<string, any> = {}) {
  return {
    id: 'tour-1',
    gameId: 'game-1',
    artistId: 'artist-1',
    title: 'Quantum Leap Showcase',
    type: 'Mini-Tour',
    stage: 'production',
    startWeek: 1,
    totalCost: 30000,
    quality: 50,
    songCount: 1,
    songsCreated: 0,
    metadata: {
      cities: 1,
      venueAccess: 'clubs',
      venueCapacity: 500,
      tourStats: {
        cities: [
          {
            cityNumber: 1,
            revenue: 20000,
            attendanceRate: 80,
            economics: {
              costs: { venue: 4000, production: 3000, marketing: 1000, total: 8000 },
            },
          },
        ],
      },
    },
    ...overrides,
  };
}

const proc = new ProjectStageProcessor();

describe('ProjectStageProcessor — tour completion label (#9 / C68)', () => {
  it('emits a TOUR-appropriate milestone label, never the recording "recorded stage" name', async () => {
    const project = makeCompletedTourProject();
    // startWeek 1, currentWeek 4 → weeksElapsed=3, weeksInProduction=2 > cities(1) → completes.
    const { ctx, summary } = makeCtx(project, 4);
    const { tx } = makeTx([project]);

    await proc.advanceProjectStages(ctx, summary, tx);

    const milestone = summary.changes.find(
      (c: GameChange) => c.type === 'unlock' && c.description.includes('Quantum Leap Showcase'),
    );
    expect(milestone).toBeDefined();
    // The recording-pipeline stage name must NOT appear for a tour.
    expect(milestone!.description.toLowerCase()).not.toContain('recorded stage');
    expect(milestone!.description.toLowerCase()).not.toContain('to recorded');
    // A tour-appropriate label IS present.
    expect(milestone!.description).toContain('Tour Completed');
  });

  it('a RECORDING project keeps the pipeline stage name (no tour relabel bleed)', async () => {
    // Single that has met the completion gate: allSongsCreated + weeksElapsed>=2.
    const project = {
      id: 'rec-1',
      gameId: 'game-1',
      artistId: 'artist-1',
      title: 'Debut Single',
      type: 'Single',
      stage: 'production',
      startWeek: 1,
      totalCost: 8000,
      quality: 50,
      songCount: 2,
      songsCreated: 2,
      metadata: {},
    };
    const { ctx, summary } = makeCtx(project, 4); // weeksElapsed=3
    const { tx } = makeTx([project]);

    await proc.advanceProjectStages(ctx, summary, tx);

    const milestone = summary.changes.find(
      (c: GameChange) => c.type === 'unlock' && c.description.includes('Debut Single'),
    );
    expect(milestone).toBeDefined();
    expect(milestone!.description).toContain('advanced to recorded stage');
  });
});

describe('ProjectStageProcessor — tour completion net profit (#12)', () => {
  it('attaches netProfit = grossRevenue − total tour costs to the project_complete change', async () => {
    const project = makeCompletedTourProject();
    const { ctx, summary } = makeCtx(project, 4);
    const { tx } = makeTx([project]);

    await proc.advanceProjectStages(ctx, summary, tx);

    const completion = summary.changes.find((c: GameChange) => c.type === 'project_complete');
    expect(completion).toBeDefined();
    expect(completion!.grossRevenue).toBe(20000);
    expect(completion!.totalCosts).toBe(8000);
    expect(completion!.netProfit).toBe(12000); // 20000 − 8000
    // Headline description reflects real profit, not just gross.
    expect(completion!.description).toContain('$12,000 net profit');
    expect(completion!.description).toContain('$20,000 gross');
  });

  it('reports a net LOSS when tour costs exceed revenue', async () => {
    const project = makeCompletedTourProject({
      metadata: {
        cities: 1,
        venueAccess: 'clubs',
        venueCapacity: 500,
        tourStats: {
          cities: [
            {
              cityNumber: 1,
              revenue: 5000,
              attendanceRate: 20,
              economics: { costs: { total: 8000 } },
            },
          ],
        },
      },
    });
    const { ctx, summary } = makeCtx(project, 4);
    const { tx } = makeTx([project]);

    await proc.advanceProjectStages(ctx, summary, tx);

    const completion = summary.changes.find((c: GameChange) => c.type === 'project_complete');
    expect(completion!.netProfit).toBe(-3000); // 5000 − 8000
    expect(completion!.description).toContain('net loss');
  });
});

describe('ProjectStageProcessor — same-pass completion cadence (weeksInProduction === citiesPlanned)', () => {
  /**
   * C77: the fixtures above enter completion via the legacy fall-through
   * (weeksInProduction > citiesPlanned, tourStats pre-seeded in metadata). The
   * CURRENT cadence — final city processed and tour completed in the SAME pass,
   * weeksInProduction === citiesPlanned — needs a real FinancialSystem + tour
   * balance config so processUnifiedTourRevenue actually runs (pattern-matched
   * from tests/engine/tour-tier1-slice1.test.ts).
   */
  const TEST_ARTIST = { id: 'artist-1', name: 'Touring Act', popularity: 60 };
  const progression = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'data', 'balance', 'progression.json'), 'utf-8'),
  );

  function makeRealCtx(currentWeek: number) {
    const savedProjects: any[] = [];
    const summary = { changes: [] } as unknown as WeekSummary;
    const getRandom = (min: number, max: number) => (min + max) / 2;
    const gameData = {
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
    const storage = {
      updateProject: async (id: string, data: any) => { savedProjects.push({ id, ...data }); },
      getArtist: async (id: string) => (id === TEST_ARTIST.id ? TEST_ARTIST : null),
    };
    const financialSystem = new FinancialSystem(gameData, getRandom as any, storage as any);
    const ctx: WeekContext = {
      gameState: { id: 'game-1', currentWeek, reputation: 10 } as any,
      summary,
      gameData,
      storage: storage as any,
      financialSystem,
      getRandom,
    } as any;
    return { ctx, summary, savedProjects };
  }

  it('completes at the === cadence with a tour milestone label and coherent net-profit figures', async () => {
    // 1-city tour in production, startWeek 1, currentWeek 3 → weeksElapsed=2 →
    // weeksInProduction=1 === citiesPlanned(1): the final city's revenue is
    // processed AND the tour completes in this same pass (no metadata tourStats
    // pre-seeded — the processor must build them itself this pass).
    const project = {
      id: 'tour-1',
      gameId: 'game-1',
      artistId: TEST_ARTIST.id,
      title: 'Quantum Leap Showcase',
      type: 'Mini-Tour',
      stage: 'production',
      startWeek: 1,
      totalCost: 30000,
      quality: 50,
      songCount: 1,
      songsCreated: 0,
      metadata: { cities: 1, venueAccess: 'clubs', venueCapacity: 500 },
    };
    const { ctx, summary, savedProjects } = makeRealCtx(3);
    const { tx } = makeTx([project]);

    await proc.advanceProjectStages(ctx, summary, tx);

    // Same-pass: city revenue AND completion in one advance.
    const perf = summary.changes.find((c: GameChange) => (c as any).source === 'tour_performance');
    expect(perf).toBeDefined();
    const completion = summary.changes.find((c: GameChange) => c.type === 'project_complete');
    expect(completion).toBeDefined();

    // #9 / C68 concern at THIS cadence: tour milestone label, no recording-stage leak.
    const milestone = summary.changes.find(
      (c: GameChange) => c.type === 'unlock' && c.description.includes('Quantum Leap Showcase'),
    );
    expect(milestone).toBeDefined();
    expect(milestone!.description).toContain('Tour Completed');
    expect(milestone!.description.toLowerCase()).not.toContain('recorded stage');

    // #12 concern at THIS cadence: totals computed from the JUST-processed city.
    expect(completion!.grossRevenue).toBeGreaterThan(0);
    expect(completion!.totalCosts).toBeGreaterThan(0);
    expect(completion!.netProfit).toBe(completion!.grossRevenue! - completion!.totalCosts!);
    expect(completion!.description).toMatch(/net (profit|loss)/);

    // Persisted as completed this pass.
    expect(savedProjects.some((p) => p.completionStatus === 'completed')).toBe(true);
  });
});

describe('EmailGenerator — tour-completion email carries net figure (#12)', () => {
  const baseSummary = (changes: GameChange[]): WeekSummary =>
    ({ week: 5, revenue: 0, expenses: 0, changes } as unknown as WeekSummary);

  it('surfaces netProfit/totalCosts in the tour email body and headlines net in the preview', () => {
    const completion: GameChange = {
      type: 'project_complete',
      description: 'Quantum Leap Showcase tour completed - 1 cities, 80% avg attendance, $20,000 gross, $12,000 net profit',
      amount: 0,
      projectId: 'tour-1',
      grossRevenue: 20000,
      totalCosts: 8000,
      netProfit: 12000,
    };
    const emails = generateEmails({ gameId: 'game-1', weekSummary: baseSummary([completion]) });

    const tourEmail = emails.find((e) => e.subject.includes('Tour Metrics'));
    expect(tourEmail).toBeDefined();
    const body = tourEmail!.body as Record<string, any>;
    expect(body.grossRevenue).toBe(20000);
    expect(body.totalCosts).toBe(8000);
    expect(body.netProfit).toBe(12000);
    // Preview headlines the NET figure, not bare gross.
    expect(tourEmail!.preview).toContain('Net profit');
    expect(tourEmail!.preview).toContain('$12,000');
  });

  it('headlines a net loss in the preview when the tour lost money', () => {
    const completion: GameChange = {
      type: 'project_complete',
      description: 'Broke Tour tour completed - 1 cities, 20% avg attendance, $5,000 gross, $-3,000 net loss',
      amount: 0,
      projectId: 'tour-2',
      grossRevenue: 5000,
      totalCosts: 8000,
      netProfit: -3000,
    };
    const emails = generateEmails({ gameId: 'game-1', weekSummary: baseSummary([completion]) });
    const tourEmail = emails.find((e) => e.subject.includes('Tour Metrics'));
    expect(tourEmail!.preview).toContain('Net loss');
    expect(tourEmail!.preview).toContain('$3,000');
    expect((tourEmail!.body as Record<string, any>).netProfit).toBe(-3000);
  });
});
