/**
 * Buzz-v2 (Hype & Pre-Marketing) — Slice 3: pre-release marketing.
 *
 * The engine's NEW weekly write path: ReleaseProcessor.processPreCampaigns builds
 * awareness on the songs of a PLANNED, not-yet-released release that diverted a
 * share of its marketing budget to a pre-launch campaign (metadata.preCampaign).
 *
 * DETERMINISTIC, zero RNG draws. These processor-level tests mock
 * financialSystem.calculateAwarenessGain (a deterministic stand-in that mirrors
 * the real +25/wk cap) so the ramp factors — fork D diminishing, fork F lead-single
 * conduit — and the spentToDate accounting can be asserted in isolation. The real
 * channel-coefficient formula is covered by awareness-channel.test.ts.
 *
 * Also validates the plan-time server rules (INVALID_PRE_CAMPAIGN_PCT,
 * PRE_CAMPAIGN_NO_LEADUP) and the launch-path scaling helper (scaleLaunchBreakdown).
 */
import { describe, it, expect } from 'vitest';
import { ReleaseProcessor, scaleLaunchBreakdown } from '@shared/engine/processors/ReleaseProcessor';
import type { WeekContext } from '@shared/engine/processors/types';
import { createTestWeekSummary } from '../helpers/test-factories';

const PRE_CAMPAIGN_CFG = {
  max_pct: 50,
  diminishing_after_weeks: 4,
  diminishing_factor: 0.5,
  lead_single_conduit_factor: 0.5,
};

/**
 * Deterministic stand-in for FinancialSystem.calculateAwarenessGain. Sums the
 * per-channel breakdown, scales per $1k by 0.4 (a representative coefficient), and
 * applies the real +25/wk cap — enough to assert per-week scaling, ramp factors,
 * and cap behavior without the full quality/popularity path.
 */
function fakeAwarenessGain(breakdown: Record<string, number>): number {
  const total = Object.values(breakdown || {}).reduce((a, b) => a + (b as number), 0);
  return Math.min((total / 1000) * 0.4, 25);
}

interface BuildOpts {
  currentWeek?: number;
  releaseWeek?: number;
  preCampaign?: any;
  leadSingleStrategy?: any;
  status?: string;
  songs?: any[];
}

function buildContext(opts: BuildOpts = {}) {
  const currentWeek = opts.currentWeek ?? 3;
  const songs = opts.songs ?? [
    { id: 'song-1', title: 'Track One', quality: 80, artistId: 'artist-1', awareness: 0, peak_awareness: 0 },
  ];
  const release = {
    id: 'rel-1',
    title: 'Neon Nights',
    status: opts.status ?? 'planned',
    releaseWeek: opts.releaseWeek ?? 9,
    metadata: {
      marketingBudgetBreakdown: { pr: 10000 },
      preCampaign: opts.preCampaign,
      leadSingleStrategy: opts.leadSingleStrategy,
    },
  };

  const songUpdates: any[] = [];
  const releaseUpdates: any[] = [];

  const gameState: any = { id: 'game-1', currentWeek, flags: {} };
  const ctx: WeekContext = {
    gameState,
    summary: createTestWeekSummary({ week: currentWeek }),
    gameData: {
      getPreCampaignConfigSync: () => PRE_CAMPAIGN_CFG,
      getReleasesByGame: async () => [release],
      getSongsByRelease: async () => songs,
      updateSongs: async (updates: any[]) => { songUpdates.push(...updates); },
    } as any,
    storage: {
      updateRelease: async (id: string, patch: any) => { releaseUpdates.push({ id, patch }); },
    } as any,
    financialSystem: {
      calculateAwarenessGain: async (_song: any, breakdown: any) => fakeAwarenessGain(breakdown),
    } as any,
    getRandom: () => 0.5,
  } as any;

  return { ctx, release, songs, songUpdates, releaseUpdates };
}

function basePreCampaign(overrides: any = {}) {
  // totalBudget 30000, split evenly over 6 lead-up weeks -> weeklySpend 5000,
  // single pr channel. budgetPerChannel already scaled by pct at plan time.
  return {
    pct: 30,
    totalBudget: 30000,
    budgetPerChannel: { pr: 30000 },
    weeklySpend: 5000,
    spentToDate: 0,
    ...overrides,
  };
}

describe('slice 3 — processPreCampaigns weekly build', () => {
  it('applies the channel formula at FULL strength within the diminishing window (≤4 weeks out) with lead single out', async () => {
    // 3 weeks to launch (week 6, release 9), lead single already out (week 2).
    const { ctx, songUpdates } = buildContext({
      currentWeek: 6,
      releaseWeek: 9,
      preCampaign: basePreCampaign(),
      leadSingleStrategy: { leadSingleReleaseWeek: 2 },
    });

    await new ReleaseProcessor().processPreCampaigns(ctx, ctx.summary);

    // weeklyBreakdown = 30000 * (5000/30000) = 5000 pr -> gain = 5*0.4 = 2.0.
    // diminishing = 1.0 (3 <= 4), conduit = 1.0 (lead single out) -> 2.0 -> round 2.
    expect(songUpdates).toHaveLength(1);
    expect(songUpdates[0].awareness).toBe(2);
    expect(songUpdates[0].peak_awareness).toBe(2);
    const entry = ctx.summary.changes.find((c: any) => c.type === 'pre_campaign') as any;
    expect(entry).toBeDefined();
    expect(entry.amount).toBe(2);
    expect(entry.weeksToLaunch).toBe(3);
    expect(entry.releaseId).toBe('rel-1');
    expect(entry.description).not.toMatch(/[×x]\s*\d/);
  });

  it('halves the build via fork D diminishing when planning far ahead (≥5 weeks out)', async () => {
    // 6 weeks to launch (week 3, release 9). Lead single out to isolate fork D.
    const { ctx, songUpdates } = buildContext({
      currentWeek: 3,
      releaseWeek: 9,
      preCampaign: basePreCampaign(),
      leadSingleStrategy: { leadSingleReleaseWeek: 1 },
    });

    await new ReleaseProcessor().processPreCampaigns(ctx, ctx.summary);

    // base gain 2.0 * diminishing 0.5 * conduit 1.0 = 1.0 -> round 1.
    expect(songUpdates[0].awareness).toBe(1);
  });

  it('halves the build via fork F conduit when NO lead single is out', async () => {
    // 3 weeks out (in window), but no lead single planned.
    const { ctx, songUpdates } = buildContext({
      currentWeek: 6,
      releaseWeek: 9,
      preCampaign: basePreCampaign(),
      leadSingleStrategy: undefined,
    });

    await new ReleaseProcessor().processPreCampaigns(ctx, ctx.summary);

    // base 2.0 * diminishing 1.0 * conduit 0.5 = 1.0 -> round 1.
    expect(songUpdates[0].awareness).toBe(1);
  });

  it('applies conduit at half strength when the lead single is planned but NOT yet out', async () => {
    // lead single releases week 8, currentWeek 6 -> not out yet.
    const { ctx, songUpdates } = buildContext({
      currentWeek: 6,
      releaseWeek: 9,
      preCampaign: basePreCampaign(),
      leadSingleStrategy: { leadSingleReleaseWeek: 8 },
    });

    await new ReleaseProcessor().processPreCampaigns(ctx, ctx.summary);

    expect(songUpdates[0].awareness).toBe(1); // conduit 0.5
  });

  it('respects the +25/wk cap from calculateAwarenessGain', async () => {
    // Huge weekly spend so the uncapped gain would exceed 25; base is capped to 25.
    const { ctx, songUpdates } = buildContext({
      currentWeek: 6,
      releaseWeek: 9,
      preCampaign: basePreCampaign({ totalBudget: 6000000, budgetPerChannel: { pr: 6000000 }, weeklySpend: 1000000 }),
      leadSingleStrategy: { leadSingleReleaseWeek: 1 },
    });

    await new ReleaseProcessor().processPreCampaigns(ctx, ctx.summary);

    // weeklyBreakdown pr = 6000000 * (1000000/6000000) = 1,000,000 -> gain 400 capped 25.
    // diminishing 1, conduit 1 -> 25.
    expect(songUpdates[0].awareness).toBe(25);
  });

  it('advances spentToDate and spends the remainder on the final lead-up week', async () => {
    // spentToDate 25000 of 30000; weeklySpend 5000 -> remaining 5000, spends it.
    const { ctx, releaseUpdates } = buildContext({
      currentWeek: 8,
      releaseWeek: 9,
      preCampaign: basePreCampaign({ spentToDate: 25000 }),
      leadSingleStrategy: { leadSingleReleaseWeek: 1 },
    });

    await new ReleaseProcessor().processPreCampaigns(ctx, ctx.summary);

    expect(releaseUpdates).toHaveLength(1);
    expect(releaseUpdates[0].patch.metadata.preCampaign.spentToDate).toBe(30000);
  });

  it('spends only the remainder (never overshoots totalBudget) when weeklySpend exceeds remaining', async () => {
    const { ctx, releaseUpdates, songUpdates } = buildContext({
      currentWeek: 8,
      releaseWeek: 9,
      preCampaign: basePreCampaign({ spentToDate: 28000, weeklySpend: 5000 }),
      leadSingleStrategy: { leadSingleReleaseWeek: 1 },
    });

    await new ReleaseProcessor().processPreCampaigns(ctx, ctx.summary);

    // remaining 2000 spent -> spentToDate 30000. spendFraction 2000/30000.
    expect(releaseUpdates[0].patch.metadata.preCampaign.spentToDate).toBe(30000);
    // weeklyBreakdown pr = 30000 * (2000/30000) = 2000 -> gain 0.8 -> round 1.
    expect(songUpdates[0].awareness).toBe(1);
  });

  it('does nothing once the pre-campaign is fully converted (spentToDate >= totalBudget)', async () => {
    const { ctx, songUpdates, releaseUpdates } = buildContext({
      currentWeek: 6,
      releaseWeek: 9,
      preCampaign: basePreCampaign({ spentToDate: 30000 }),
      leadSingleStrategy: { leadSingleReleaseWeek: 1 },
    });

    await new ReleaseProcessor().processPreCampaigns(ctx, ctx.summary);

    expect(songUpdates).toHaveLength(0);
    expect(releaseUpdates).toHaveLength(0);
    expect(ctx.summary.changes.find((c: any) => c.type === 'pre_campaign')).toBeUndefined();
  });

  it('leaves releases WITHOUT a preCampaign untouched (golden-master containment)', async () => {
    const { ctx, songUpdates, releaseUpdates } = buildContext({
      currentWeek: 6,
      releaseWeek: 9,
      preCampaign: undefined,
    });

    await new ReleaseProcessor().processPreCampaigns(ctx, ctx.summary);

    expect(songUpdates).toHaveLength(0);
    expect(releaseUpdates).toHaveLength(0);
    expect(ctx.summary.changes.find((c: any) => c.type === 'pre_campaign')).toBeUndefined();
  });

  it('ignores a pct=0 preCampaign block (never enters the path)', async () => {
    const { ctx, songUpdates } = buildContext({
      currentWeek: 6,
      releaseWeek: 9,
      preCampaign: basePreCampaign({ pct: 0 }),
    });

    await new ReleaseProcessor().processPreCampaigns(ctx, ctx.summary);

    expect(songUpdates).toHaveLength(0);
  });

  it('does not build in or after the release week (weeksUntilRelease < 1)', async () => {
    const { ctx, songUpdates } = buildContext({
      currentWeek: 9,
      releaseWeek: 9,
      preCampaign: basePreCampaign(),
      leadSingleStrategy: { leadSingleReleaseWeek: 1 },
    });

    await new ReleaseProcessor().processPreCampaigns(ctx, ctx.summary);

    expect(songUpdates).toHaveLength(0);
  });

  it('composes with prior awareness: the build ADDS to existing per-song awareness', async () => {
    // Song already at 40 (e.g. from a prior pre-campaign week). +2 -> 42.
    const { ctx, songUpdates } = buildContext({
      currentWeek: 6,
      releaseWeek: 9,
      preCampaign: basePreCampaign(),
      leadSingleStrategy: { leadSingleReleaseWeek: 1 },
      songs: [{ id: 'song-1', title: 'T', quality: 80, artistId: 'a', awareness: 40, peak_awareness: 40 }],
    });

    await new ReleaseProcessor().processPreCampaigns(ctx, ctx.summary);

    expect(songUpdates[0].awareness).toBe(42);
    expect(songUpdates[0].peak_awareness).toBe(42);
  });
});

describe('slice 3 — scaleLaunchBreakdown (launch-path read-time scaling)', () => {
  it('passes the breakdown through unchanged when no preCampaign', () => {
    const breakdown = { pr: 10000, radio: 2000 };
    expect(scaleLaunchBreakdown(breakdown, null)).toBe(breakdown);
    expect(scaleLaunchBreakdown(breakdown, undefined)).toBe(breakdown);
    expect(scaleLaunchBreakdown(breakdown, { pct: 0 } as any)).toBe(breakdown);
  });

  it('scales each channel down by the remaining (1-pct) share, without mutating the input', () => {
    const breakdown = { pr: 10000, radio: 2000 };
    const scaled = scaleLaunchBreakdown(breakdown, { pct: 30 } as any)!;
    expect(scaled.pr).toBe(7000);
    expect(scaled.radio).toBe(1400);
    // original untouched (auditable)
    expect(breakdown.pr).toBe(10000);
  });

  it('returns falsy for a missing breakdown', () => {
    expect(scaleLaunchBreakdown(undefined, { pct: 30 } as any)).toBeUndefined();
    expect(scaleLaunchBreakdown(null, { pct: 30 } as any)).toBeNull();
  });
});
