import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionProcessor, LIVE_EFFECT_KEYS } from '@shared/engine/processors/ActionProcessor';
import type { WeekContext } from '@shared/engine/processors/types';
import { createTestWeekSummary } from '../helpers/test-factories';

/**
 * Engine-verbs arc Tier 2 (slices 8-10) — applyEffects cases for the five
 * live-economy verbs: promote_release, catalog_damage, cancel_project,
 * grant_inventory, transfer_revenue_stream. Stub-context unit tests (no DB),
 * mirroring action-processor-effect-keys.test.ts.
 */

function buildContext(overrides: Partial<WeekContext> = {}): WeekContext {
  const gameState: any = {
    id: 'test-game',
    currentWeek: 10,
    reputation: 50,
    creativeCapital: 10,
    flags: {},
  };
  return {
    gameState,
    summary: createTestWeekSummary({ week: 10 }),
    gameData: {} as any,
    storage: {} as any,
    financialSystem: {} as any,
    getRandom: () => 0.5,
    ...overrides,
  };
}

const RELEASED_SONGS = [
  { id: 'song-low', artistId: 'artist-1', awareness: 20, peak_awareness: 30, releaseWeek: 4, title: 'Low Song', isReleased: true },
  { id: 'song-hot', artistId: 'artist-1', awareness: 60, peak_awareness: 60, releaseWeek: 6, title: 'Hot Song', isReleased: true },
  { id: 'song-other', artistId: 'artist-2', awareness: 90, peak_awareness: 95, releaseWeek: 8, title: 'Other Artist Hit', isReleased: true },
];

const RELEASES = [
  { id: 'rel-old', artistId: 'artist-1', status: 'released', releaseWeek: 4, title: 'Old EP' },
  { id: 'rel-new', artistId: 'artist-1', status: 'released', releaseWeek: 8, title: 'New Single' },
  { id: 'rel-planned', artistId: 'artist-1', status: 'planned', releaseWeek: 15, title: 'Future Album' },
];

describe('live-economy verbs are canonical', () => {
  it('all five keys are in LIVE_EFFECT_KEYS', () => {
    for (const key of ['promote_release', 'catalog_damage', 'cancel_project', 'grant_inventory', 'transfer_revenue_stream']) {
      expect(LIVE_EFFECT_KEYS.has(key), `${key} missing from LIVE_EFFECT_KEYS`).toBe(true);
    }
  });

  it('none of them hit the unknown-key warning even on a bare stub context (guarded no-ops)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const processor = new ActionProcessor();
    const ctx = buildContext(); // gameData/storage are {} — every verb must degrade to a warn-skip
    await expect(processor.applyEffects(ctx, {
      promote_release: 10,
      catalog_damage: 2,
      cancel_project: 1,
      grant_inventory: 500,
      transfer_revenue_stream: 25,
    }, undefined, 'global', 'stub_meeting', 'stub_choice')).resolves.not.toThrow();

    const unknownWarned = warnSpy.mock.calls.some(call =>
      call.some(arg => typeof arg === 'string' && arg.includes('Unknown effect key'))
    );
    expect(unknownWarned).toBe(false);
    // Nothing landed: no ledger keys, no summary money.
    expect((ctx.gameState.flags as any).inventory).toBeUndefined();
    expect((ctx.gameState.flags as any).revenue_transfers).toBeUndefined();
    expect(ctx.summary.expenses).toBe(0);
    warnSpy.mockRestore();
  });
});

describe('promote_release — clamped awareness bump on the targeted released song', () => {
  let updateSongs: ReturnType<typeof vi.fn>;
  let ctx: WeekContext;

  beforeEach(() => {
    updateSongs = vi.fn().mockResolvedValue(undefined);
    ctx = buildContext({
      gameData: {
        getReleasedSongs: vi.fn().mockResolvedValue(RELEASED_SONGS),
        updateSongs,
        getBalanceConfigSync: () => ({ market_formulas: { release_promotion: { max_awareness_bump: 15 } } }),
      } as any,
    });
  });

  it('artist-scoped: bumps THAT artist\'s highest-awareness song, capped by the knob', async () => {
    await new ActionProcessor().applyEffects(ctx, { promote_release: 40 }, 'artist-1', 'user_selected', 'm', 'c');
    // artist-1's hottest is song-hot (60); bump capped 40→15 → 75.
    expect(updateSongs).toHaveBeenCalledWith(
      [{ songId: 'song-hot', awareness: 75, peak_awareness: 75 }],
      undefined
    );
    const entry = ctx.summary.changes.find(c => c.appliedEffects?.promote_release !== undefined);
    expect(entry).toBeDefined();
    expect(entry!.description).toContain('Hot Song');
  });

  it('label-wide (no artistId): targets the label\'s highest-awareness song and clamps at 100', async () => {
    await new ActionProcessor().applyEffects(ctx, { promote_release: 15 }, undefined, 'global');
    // Label-wide hottest is song-other (90); 90+15 clamps to 100; peak follows.
    expect(updateSongs).toHaveBeenCalledWith(
      [{ songId: 'song-other', awareness: 100, peak_awareness: 100 }],
      undefined
    );
  });

  it('no released music → warn-skip, no update, no summary entry', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    (ctx.gameData as any).getReleasedSongs = vi.fn().mockResolvedValue([]);
    await new ActionProcessor().applyEffects(ctx, { promote_release: 10 }, undefined, 'global');
    expect(updateSongs).not.toHaveBeenCalled();
    expect(ctx.summary.changes).toHaveLength(0);
    warnSpy.mockRestore();
  });

  it('non-positive value is ignored', async () => {
    await new ActionProcessor().applyEffects(ctx, { promote_release: -5 }, undefined, 'global');
    expect(updateSongs).not.toHaveBeenCalled();
  });
});

describe('catalog_damage — severity-scaled awareness loss', () => {
  let updateSongs: ReturnType<typeof vi.fn>;
  let ctx: WeekContext;

  beforeEach(() => {
    updateSongs = vi.fn().mockResolvedValue(undefined);
    ctx = buildContext({
      gameData: {
        getReleasedSongs: vi.fn().mockResolvedValue(RELEASED_SONGS),
        updateSongs,
        getBalanceConfigSync: () => ({
          market_formulas: {
            catalog_damage: { awareness_loss_fraction_per_severity: 0.1, max_total_fraction: 0.8 },
          },
        }),
      } as any,
    });
  });

  it('severity 2 removes 20% of the targeted song\'s awareness (peak untouched)', async () => {
    await new ActionProcessor().applyEffects(ctx, { catalog_damage: 2 }, 'artist-1', 'user_selected');
    // song-hot: 60 * (1 - 0.2) = 48. Patch must NOT include peak_awareness.
    expect(updateSongs).toHaveBeenCalledWith([{ songId: 'song-hot', awareness: 48 }], undefined);
  });

  it('total loss fraction is capped by max_total_fraction', async () => {
    await new ActionProcessor().applyEffects(ctx, { catalog_damage: 50 }, undefined, 'global');
    // song-other: 90 * (1 - 0.8) = 18 (severity 50 * 0.1 = 5.0 capped at 0.8).
    expect(updateSongs).toHaveBeenCalledWith([{ songId: 'song-other', awareness: 18 }], undefined);
  });

  it('no released music → warn-skip', async () => {
    (ctx.gameData as any).getReleasedSongs = vi.fn().mockResolvedValue([]);
    await new ActionProcessor().applyEffects(ctx, { catalog_damage: 3 }, undefined, 'global');
    expect(updateSongs).not.toHaveBeenCalled();
  });
});

describe('cancel_project — soft-cancel of the targeted active recording project', () => {
  const PROJECTS = [
    { id: 'p-old', type: 'Single', stage: 'production', artistId: 'artist-1', startWeek: 3, title: 'Old Single', completionStatus: 'active', songsCreated: 1, songCount: 3, metadata: {} },
    { id: 'p-new', type: 'EP', stage: 'production', artistId: 'artist-1', startWeek: 8, title: 'New EP', completionStatus: 'active', songsCreated: 2, songCount: 5, metadata: { foo: 'bar' } },
    { id: 'p-tour', type: 'Mini-Tour', stage: 'production', artistId: 'artist-1', startWeek: 9, title: 'Tour', completionStatus: 'active', metadata: {} },
    { id: 'p-done', type: 'Single', stage: 'recorded', artistId: 'artist-1', startWeek: 1, title: 'Done', completionStatus: 'completed', metadata: {} },
    { id: 'p-other', type: 'Single', stage: 'production', artistId: 'artist-2', startWeek: 9, title: 'Other Artist Single', completionStatus: 'active', metadata: {} },
  ];

  let updateProject: ReturnType<typeof vi.fn>;
  let ctx: WeekContext;

  beforeEach(() => {
    updateProject = vi.fn().mockResolvedValue(undefined);
    ctx = buildContext({
      storage: {
        getProjectsByGame: vi.fn().mockResolvedValue(PROJECTS),
        updateProject,
      } as any,
      gameData: {} as any,
    });
  });

  it('cancels the targeted artist\'s most recent ACTIVE recording project (never the tour, never recorded/completed rows)', async () => {
    await new ActionProcessor().applyEffects(ctx, { cancel_project: 1 }, 'artist-1', 'user_selected', 'meet', 'choice');
    expect(updateProject).toHaveBeenCalledTimes(1);
    const [id, patch] = updateProject.mock.calls[0];
    expect(id).toBe('p-new'); // highest startWeek among artist-1's active recordings
    expect(patch).toMatchObject({ stage: 'cancelled', completionStatus: 'cancelled' });
    expect(patch.metadata).toMatchObject({ foo: 'bar', cancelledWeek: 10, cancelledBy: 'meet' });

    const entry = ctx.summary.changes.find(c => c.appliedEffects?.cancel_project !== undefined);
    expect(entry).toBeDefined();
    expect(entry!.projectId).toBe('p-new');
    // Documented rule: songs already created stay — the change copy says so.
    expect(entry!.description.toLowerCase()).toContain('kept');
  });

  it('no active recording project for the targeted artist → warn-skip, nothing updated', async () => {
    await new ActionProcessor().applyEffects(ctx, { cancel_project: 1 }, 'artist-3', 'user_selected');
    expect(updateProject).not.toHaveBeenCalled();
    expect(ctx.summary.changes).toHaveLength(0);
  });

  it('an already-cancelled project is never re-targeted', async () => {
    (ctx.storage as any).getProjectsByGame = vi.fn().mockResolvedValue([
      { ...PROJECTS[1], completionStatus: 'cancelled', stage: 'cancelled' },
    ]);
    await new ActionProcessor().applyEffects(ctx, { cancel_project: 1 }, 'artist-1', 'user_selected');
    expect(updateProject).not.toHaveBeenCalled();
  });
});

describe('grant_inventory — flags.inventory ledger grant', () => {
  let ctx: WeekContext;

  beforeEach(() => {
    ctx = buildContext({
      storage: { getReleasesByGame: vi.fn().mockResolvedValue(RELEASES) } as any,
      gameData: {
        getBalanceConfigSync: () => ({
          market_formulas: {
            physical_inventory: {
              unit_cost: 4, unit_price: 12, base_weekly_sell_rate: 0.12,
              awareness_sell_rate_bonus_max: 1.0, min_weekly_units: 1,
              shelf_life_weeks: 12, max_units_per_grant: 20000,
            },
          },
        }),
      } as any,
    });
  });

  it('writes a ledger entry against the targeted artist\'s LATEST released release and charges manufacturing now', async () => {
    await new ActionProcessor().applyEffects(ctx, { grant_inventory: 1000 }, 'artist-1', 'user_selected', 'm', 'c');

    const ledger = (ctx.gameState.flags as any).inventory;
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      releaseId: 'rel-new', // latest released (never rel-planned)
      releaseTitle: 'New Single',
      unitsInitial: 1000,
      unitsRemaining: 1000,
      unitCost: 4,
      unitPrice: 12,
      createdWeek: 10,
    });
    // Manufacturing charged through the summary (single FINAL-MONEY point rule).
    expect(ctx.summary.expenses).toBe(4000);
    expect(ctx.summary.expenseBreakdown?.roleMeetingCosts).toBe(4000);
    const expenseEntry = ctx.summary.changes.find(c => c.type === 'expense');
    expect(expenseEntry?.amount).toBe(-4000);
  });

  it('clamps the unit count to max_units_per_grant', async () => {
    await new ActionProcessor().applyEffects(ctx, { grant_inventory: 999999 }, undefined, 'global');
    const ledger = (ctx.gameState.flags as any).inventory;
    expect(ledger[0].unitsInitial).toBe(20000);
    expect(ctx.summary.expenses).toBe(80000);
  });

  it('a second grant appends (existing entries preserved) with a distinct id', async () => {
    const processor = new ActionProcessor();
    await processor.applyEffects(ctx, { grant_inventory: 100 }, 'artist-1', 'user_selected');
    await processor.applyEffects(ctx, { grant_inventory: 200 }, 'artist-1', 'user_selected');
    const ledger = (ctx.gameState.flags as any).inventory;
    expect(ledger).toHaveLength(2);
    expect(ledger[0].id).not.toBe(ledger[1].id);
  });

  it('no released release → warn-skip, no ledger, no expense', async () => {
    (ctx.storage as any).getReleasesByGame = vi.fn().mockResolvedValue([RELEASES[2]]); // planned only
    await new ActionProcessor().applyEffects(ctx, { grant_inventory: 500 }, undefined, 'global');
    expect((ctx.gameState.flags as any).inventory).toBeUndefined();
    expect(ctx.summary.expenses).toBe(0);
  });

  it('non-positive units are ignored', async () => {
    await new ActionProcessor().applyEffects(ctx, { grant_inventory: 0 }, undefined, 'global');
    expect((ctx.gameState.flags as any).inventory).toBeUndefined();
  });
});

describe('transfer_revenue_stream — flags.revenue_transfers ledger grant', () => {
  let ctx: WeekContext;

  beforeEach(() => {
    ctx = buildContext({
      storage: { getReleasesByGame: vi.fn().mockResolvedValue(RELEASES) } as any,
      gameData: {
        getBalanceConfigSync: () => ({
          market_formulas: { revenue_transfer: { max_fraction: 0.5, default_weeks: 26 } },
        }),
      } as any,
    });
  });

  it('writes a term-bounded entry with the normalized fraction (percent form)', async () => {
    await new ActionProcessor().applyEffects(ctx, { transfer_revenue_stream: 25 }, 'artist-1', 'user_selected');
    const ledger = (ctx.gameState.flags as any).revenue_transfers;
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      releaseId: 'rel-new',
      fraction: 0.25,
      startWeek: 10,
      endWeek: 35, // 10 + 26 - 1
    });
  });

  it('clamps the fraction to max_fraction', async () => {
    await new ActionProcessor().applyEffects(ctx, { transfer_revenue_stream: 90 }, undefined, 'global');
    expect((ctx.gameState.flags as any).revenue_transfers[0].fraction).toBe(0.5);
  });

  it('non-positive fraction → no entry', async () => {
    await new ActionProcessor().applyEffects(ctx, { transfer_revenue_stream: 0 }, undefined, 'global');
    expect((ctx.gameState.flags as any).revenue_transfers).toBeUndefined();
  });

  it('no released release → warn-skip', async () => {
    (ctx.storage as any).getReleasesByGame = vi.fn().mockResolvedValue([]);
    await new ActionProcessor().applyEffects(ctx, { transfer_revenue_stream: 25 }, undefined, 'global');
    expect((ctx.gameState.flags as any).revenue_transfers).toBeUndefined();
  });
});
