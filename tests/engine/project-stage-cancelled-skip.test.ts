import { describe, it, expect, vi } from 'vitest';
import { ProjectStageProcessor } from '@shared/engine/processors/ProjectStageProcessor';
import type { WeekContext } from '@shared/engine/processors/types';
import { createTestWeekSummary } from '../helpers/test-factories';

/**
 * Engine-verbs arc slice 9 (M6 cancel_project) — advanceProjectStages must SKIP
 * soft-cancelled projects (completionStatus 'cancelled' and/or stage 'cancelled')
 * entirely: no stage advancement, no update write, no summary entry. Uses a fake
 * drizzle transaction (no DB).
 */

function makeFakeTx(projects: any[]) {
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set: updateSet }));
  const tx = {
    select: () => ({ from: () => ({ where: async () => projects }) }),
    update,
  };
  return { tx, update, updateSet };
}

function buildContext(): WeekContext {
  return {
    gameState: { id: 'game-1', currentWeek: 12 } as any,
    summary: createTestWeekSummary({ week: 12 }),
    gameData: {} as any,
    storage: {} as any,
    financialSystem: {} as any,
    getRandom: () => 0.5,
  };
}

describe('ProjectStageProcessor.advanceProjectStages — cancelled projects are frozen', () => {
  it('skips a project with completionStatus cancelled (even if stage is still production)', async () => {
    const cancelled = {
      id: 'p-1', title: 'Cancelled EP', type: 'EP', stage: 'production',
      startWeek: 2, songCount: 5, songsCreated: 5, completionStatus: 'cancelled', metadata: {},
    };
    const { tx, update } = makeFakeTx([cancelled]);
    const ctx = buildContext();

    await new ProjectStageProcessor().advanceProjectStages(ctx, ctx.summary, tx);

    expect(update).not.toHaveBeenCalled();
    expect(ctx.summary.changes).toHaveLength(0);
  });

  it('skips a project soft-cancelled via stage (the tour-route / cancel_project shape)', async () => {
    const cancelled = {
      id: 'p-2', title: 'Cancelled Single', type: 'Single', stage: 'cancelled',
      startWeek: 2, songCount: 1, songsCreated: 0, completionStatus: 'cancelled', metadata: {},
    };
    const { tx, update } = makeFakeTx([cancelled]);
    const ctx = buildContext();

    await new ProjectStageProcessor().advanceProjectStages(ctx, ctx.summary, tx);

    expect(update).not.toHaveBeenCalled();
  });

  it('still advances a normal active project alongside a cancelled one', async () => {
    const cancelled = {
      id: 'p-3', title: 'Dead Project', type: 'EP', stage: 'production',
      startWeek: 2, songCount: 5, songsCreated: 5, completionStatus: 'cancelled', metadata: {},
    };
    const active = {
      id: 'p-4', title: 'Live Project', type: 'EP', stage: 'production',
      startWeek: 8, songCount: 3, songsCreated: 3, completionStatus: 'active', metadata: {},
    };
    const { tx, update } = makeFakeTx([cancelled, active]);
    const ctx = buildContext();

    await new ProjectStageProcessor().advanceProjectStages(ctx, ctx.summary, tx);

    // Exactly one update: the active project (4 weeks elapsed, all songs → recorded).
    expect(update).toHaveBeenCalledTimes(1);
    expect(ctx.summary.changes.some(c => c.description.includes('Live Project'))).toBe(true);
    expect(ctx.summary.changes.some(c => c.description.includes('Dead Project'))).toBe(false);
  });
});
