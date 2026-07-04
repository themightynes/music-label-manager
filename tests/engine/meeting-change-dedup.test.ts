import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionProcessor } from '@shared/engine/processors/ActionProcessor';
import type { WeekContext } from '@shared/engine/processors/types';
import { createTestWeekSummary } from '../helpers/test-factories';

/**
 * Playtest bug #1/#3/#7 regression tests (2026-07-04).
 *
 * These guard the SOURCE of the emitted meeting change entries (ActionProcessor),
 * which is where the bugs lived — the WeekSummary renderer was innocent:
 *
 *  #1 A role meeting must push exactly ONE change (type 'meeting') carrying the
 *     exec mood/loyalty deltas — NOT a second 'executive_interaction' "Met with
 *     <slug>" row. That duplicate was the doubled-entry bug.
 *  #7 A CEO meeting renders as "Executive strategy decision", never "Met with CEO"
 *     (the player IS the CEO), and folds no exec deltas (there is no exec row).
 *  #3 describeDelayedEffect() labels a delayed payoff with its originating meeting
 *     + choice instead of the bare "Delayed effect triggered" placeholder.
 */

const CONFIG = {
  disgruntled_below: 30,
  content_above: 80,
  inspired_above: 90,
  cost_multiplier_disgruntled: 1.25,
  cost_multiplier_content: 0.9,
  effect_multiplier_inspired: 1.2,
};

function buildCtx(overrides: {
  gameData?: Partial<any>;
  storage?: Partial<any>;
  gameState?: Partial<any>;
} = {}): WeekContext {
  const gameState: any = {
    id: 'test-game',
    currentWeek: 5,
    money: 100000,
    reputation: 50,
    creativeCapital: 10,
    flags: {},
    ...overrides.gameState,
  };

  const gameData: any = {
    getRoleById: vi.fn(async (roleId: string) =>
      roleId === 'head_ar' ? { id: 'head_ar', name: 'Head of A&R' } : { id: roleId, name: roleId }
    ),
    getActionById: vi.fn(async (id: string) => ({
      id,
      name: 'Strategy Session',
      target_scope: 'global',
    })),
    getChoiceById: vi.fn(async () => ({
      id: 'choice_a',
      label: 'Push the aggressive plan',
      effects_immediate: { money: -1000 },
      // effects_delayed intentionally omitted for the dedup tests
    })),
    getExecMoodModifierConfigSync: vi.fn(() => CONFIG),
    ...overrides.gameData,
  };

  const storage: any = {
    getExecutive: vi.fn(async () => ({ id: 'exec-1', role: 'head_ar', mood: 50, loyalty: 40 })),
    updateExecutive: vi.fn(async () => {}),
    ...overrides.storage,
  };

  return {
    gameState,
    // usedExecutives is added-to by processExecutiveActions; the factory omits it.
    summary: createTestWeekSummary({ week: 5, usedExecutives: new Set() } as any),
    gameData,
    storage,
    financialSystem: {} as any,
    getRandom: () => 0.5,
  };
}

describe('ActionProcessor — meeting change dedup / CEO framing (playtest #1/#7)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('#1: a non-CEO role meeting emits ONE meeting change with folded deltas, no executive_interaction row', async () => {
    const processor = new ActionProcessor();
    const ctx = buildCtx();
    const action: any = {
      targetId: 'strategy_session',
      actionType: 'role_meeting',
      metadata: {
        roleId: 'head_ar',
        actionId: 'strategy_session',
        choiceId: 'choice_a',
        executiveId: 'exec-1',
      },
    };

    await processor.processRoleMeeting(ctx, action);

    const changes = ctx.summary.changes as any[];
    // No duplicate 'executive_interaction' "Met with <slug>" row.
    expect(changes.filter((c) => c.type === 'executive_interaction')).toHaveLength(0);

    const meetings = changes.filter((c) => c.type === 'meeting');
    expect(meetings).toHaveLength(1);

    const meeting = meetings[0];
    expect(meeting.description).toBe('Met with Head of A&R');
    // Exec deltas folded onto the single meeting entry (was mood 50 +5 = 55).
    expect(meeting.moodChange).toBe(5);
    expect(meeting.newMood).toBe(55);
    expect(meeting.loyaltyBoost).toBe(5);
    expect(meeting.newLoyalty).toBe(45);
    // The exec row was still persisted.
    expect(ctx.storage.updateExecutive).toHaveBeenCalledOnce();
  });

  it('#7: a CEO meeting renders "Executive strategy decision" and folds no exec deltas', async () => {
    const processor = new ActionProcessor();
    // CEO path never fetches/updates an executive.
    const getExecutive = vi.fn(async () => {
      throw new Error('CEO meeting must not fetch an executive');
    });
    const updateExecutive = vi.fn();
    const ctx = buildCtx({ storage: { getExecutive, updateExecutive } });
    const action: any = {
      targetId: 'strategy_session',
      actionType: 'role_meeting',
      metadata: {
        roleId: 'ceo',
        actionId: 'strategy_session',
        choiceId: 'choice_a',
        // no executiveId — CEO has no exec row
      },
    };

    await processor.processRoleMeeting(ctx, action);

    const changes = ctx.summary.changes as any[];
    expect(changes.filter((c) => c.type === 'executive_interaction')).toHaveLength(0);

    const meetings = changes.filter((c) => c.type === 'meeting');
    expect(meetings).toHaveLength(1);
    expect(meetings[0].description).toBe('Executive strategy decision');
    // No exec → no folded deltas.
    expect(meetings[0].moodChange).toBeUndefined();
    expect(meetings[0].loyaltyBoost).toBeUndefined();
    expect(updateExecutive).not.toHaveBeenCalled();
  });
});

describe('ActionProcessor.describeDelayedEffect — labeled payoffs (playtest #3)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('labels with meeting name AND choice label when both resolve', async () => {
    const processor: any = new ActionProcessor();
    const ctx = buildCtx();
    const label = await processor.describeDelayedEffect(ctx, 'strategy_session', 'choice_a');
    expect(label).toBe('Delayed effect: Strategy Session — Push the aggressive plan');
  });

  it('labels with meeting name only when the choice cannot be resolved', async () => {
    const processor: any = new ActionProcessor();
    const ctx = buildCtx({ gameData: { getChoiceById: vi.fn(async () => null) } });
    const label = await processor.describeDelayedEffect(ctx, 'strategy_session', 'missing_choice');
    expect(label).toBe('Delayed effect: Strategy Session');
  });

  it('falls back to the generic label when the meeting cannot be resolved', async () => {
    const processor: any = new ActionProcessor();
    const ctx = buildCtx({ gameData: { getActionById: vi.fn(async () => null) } });
    const label = await processor.describeDelayedEffect(ctx, undefined, undefined);
    expect(label).toBe('Delayed effect triggered');
  });
});
