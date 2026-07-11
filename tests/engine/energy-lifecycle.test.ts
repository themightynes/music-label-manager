/**
 * Volatility-economy slice 1 — passive artist-energy lifecycle.
 *
 * ArtistStateProcessor.processWeeklyEnergyLifecycle applies two flat, zero-RNG
 * effects, accumulated into summary.artistChanges.energy (same pattern as the C87
 * tour drain) with player-visible `type: 'energy'` change entries:
 *   - recording_drain_per_week (default 4): an artist with a recording-type project
 *     (Single/EP) in the 'production' stage — "from the studio".
 *   - idle_recovery_per_week (default 3): an artist with NO active project (no
 *     Mini-Tour in production, no recording project in production) — "a week to
 *     breathe".
 * A touring artist (Mini-Tour in production) gets neither (their energy moved via
 * the tour drain). Config: markets.json market_formulas.energy_lifecycle with
 * fallback defaults; enabled:false short-circuits both to 0. DB write + 0-100 clamp
 * are downstream in applyArtistChangesToDatabase.
 */
import { describe, it, expect } from 'vitest';
import { ArtistStateProcessor } from '@shared/engine/processors/ArtistStateProcessor';
import type { WeekContext } from '@shared/engine/processors/types';
import type { WeekSummary, GameChange } from '@shared/types/gameTypes';

const proc = new ArtistStateProcessor();

/** Minimal ctx: summary + storage artists/projects + energy_lifecycle config. */
function makeCtx(
  artists: any[],
  projects: any[],
  lifecycleCfg?: Record<string, any>,
) {
  const summary = { changes: [], artistChanges: {} } as unknown as WeekSummary;
  const ctx = {
    summary,
    gameState: { id: 'game-1', currentWeek: 3 },
    dbTransaction: undefined,
    storage: {
      getArtistsByGame: async () => artists,
      getProjectsByGame: async () => projects,
    },
    gameData: {
      getBalanceConfigSync: () => ({
        market_formulas: lifecycleCfg === undefined
          ? {}
          : { energy_lifecycle: lifecycleCfg },
      }),
    },
  } as unknown as WeekContext;
  return { ctx, summary };
}

const A1 = { id: 'artist-1', name: 'Studio Rat', energy: 50 };

describe('slice 1 — recording drain', () => {
  it('drains the default 4 energy for an artist with a Single in production', async () => {
    const { ctx, summary } = makeCtx(
      [A1],
      [{ artistId: A1.id, type: 'Single', stage: 'production' }],
    );
    await proc.processWeeklyEnergyLifecycle(ctx);

    expect((summary.artistChanges as any)[A1.id].energy).toBe(-4);
    const entry = summary.changes.find((c: GameChange) => c.type === 'energy');
    expect(entry).toBeDefined();
    expect(entry!.amount).toBe(-4);
    expect(entry!.artistId).toBe(A1.id);
    expect(entry!.description).toBe('Studio Rat: -4 energy from the studio');
  });

  it('drains for an EP in production too', async () => {
    const { ctx, summary } = makeCtx(
      [A1],
      [{ artistId: A1.id, type: 'EP', stage: 'production' }],
    );
    await proc.processWeeklyEnergyLifecycle(ctx);
    expect((summary.artistChanges as any)[A1.id].energy).toBe(-4);
  });

  it('drains only once even with multiple recording projects in production (flat per artist)', async () => {
    const { ctx, summary } = makeCtx(
      [A1],
      [
        { artistId: A1.id, type: 'Single', stage: 'production' },
        { artistId: A1.id, type: 'EP', stage: 'production' },
      ],
    );
    await proc.processWeeklyEnergyLifecycle(ctx);
    expect((summary.artistChanges as any)[A1.id].energy).toBe(-4);
    expect(summary.changes.filter((c: GameChange) => c.type === 'energy')).toHaveLength(1);
  });

  it('does NOT drain for a recording project still in planning (not yet in the studio)', async () => {
    const { ctx, summary } = makeCtx(
      [A1],
      [{ artistId: A1.id, type: 'Single', stage: 'planning' }],
    );
    await proc.processWeeklyEnergyLifecycle(ctx);
    // planning = not active production → treated as idle → +3 recovery
    expect((summary.artistChanges as any)[A1.id].energy).toBe(3);
  });

  it('reads recording_drain_per_week from the balance knob', async () => {
    const { ctx, summary } = makeCtx(
      [A1],
      [{ artistId: A1.id, type: 'Single', stage: 'production' }],
      { enabled: true, recording_drain_per_week: 7, idle_recovery_per_week: 3 },
    );
    await proc.processWeeklyEnergyLifecycle(ctx);
    expect((summary.artistChanges as any)[A1.id].energy).toBe(-7);
  });
});

describe('slice 1 — idle recovery', () => {
  it('recovers the default 3 energy for an artist with no projects', async () => {
    const { ctx, summary } = makeCtx([A1], []);
    await proc.processWeeklyEnergyLifecycle(ctx);

    expect((summary.artistChanges as any)[A1.id].energy).toBe(3);
    const entry = summary.changes.find((c: GameChange) => c.type === 'energy');
    expect(entry).toBeDefined();
    expect(entry!.amount).toBe(3);
    expect(entry!.description).toBe('Studio Rat: +3 energy — a week to breathe');
  });

  it('does NOT recover for a touring artist (Mini-Tour in production)', async () => {
    const { ctx, summary } = makeCtx(
      [A1],
      [{ artistId: A1.id, type: 'Mini-Tour', stage: 'production' }],
    );
    await proc.processWeeklyEnergyLifecycle(ctx);
    expect((summary.artistChanges as any)[A1.id]?.energy).toBeUndefined();
    expect(summary.changes.find((c: GameChange) => c.type === 'energy')).toBeUndefined();
  });

  it('recovers for an artist whose only project is a completed (recorded) tour', async () => {
    const { ctx, summary } = makeCtx(
      [A1],
      [{ artistId: A1.id, type: 'Mini-Tour', stage: 'recorded' }],
    );
    await proc.processWeeklyEnergyLifecycle(ctx);
    expect((summary.artistChanges as any)[A1.id].energy).toBe(3);
  });

  it('reads idle_recovery_per_week from the balance knob', async () => {
    const { ctx, summary } = makeCtx([A1], [], {
      enabled: true,
      recording_drain_per_week: 4,
      idle_recovery_per_week: 5,
    });
    await proc.processWeeklyEnergyLifecycle(ctx);
    expect((summary.artistChanges as any)[A1.id].energy).toBe(5);
  });
});

describe('slice 1 — enabled flag + no RNG', () => {
  it('enabled:false short-circuits BOTH effects (no changes at all)', async () => {
    const { ctx, summary } = makeCtx(
      [A1],
      [{ artistId: A1.id, type: 'Single', stage: 'production' }],
      { enabled: false, recording_drain_per_week: 4, idle_recovery_per_week: 3 },
    );
    await proc.processWeeklyEnergyLifecycle(ctx);
    expect(summary.artistChanges).toEqual({});
    expect(summary.changes).toHaveLength(0);
  });

  it('makes no getRandom draws (ctx has none; would throw if called)', async () => {
    const summary = { changes: [], artistChanges: {} } as unknown as WeekSummary;
    const ctx = {
      summary,
      gameState: { id: 'game-1', currentWeek: 3 },
      storage: {
        getArtistsByGame: async () => [A1],
        getProjectsByGame: async () => [],
      },
      gameData: { getBalanceConfigSync: () => ({ market_formulas: {} }) },
      getRandom: () => { throw new Error('energy lifecycle must not draw RNG'); },
    } as unknown as WeekContext;
    await expect(proc.processWeeklyEnergyLifecycle(ctx)).resolves.toBeUndefined();
    expect((summary.artistChanges as any)[A1.id].energy).toBe(3);
  });
});
