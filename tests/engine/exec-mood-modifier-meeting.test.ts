/**
 * Exec-meetings-revival PR-9 (C6/D) — engine wiring: executive mood modifies the
 * outcome of that executive's meeting, via the SHARED util
 * (shared/utils/executiveMoodModifier.ts) — the SAME util the client Impact Preview
 * routes through, so engine and preview can never drift.
 *
 * Covers, driving ActionProcessor.processRoleMeeting end-to-end with mock storage +
 * gameData:
 *  - CEO meeting (no executive row) → no modifier ever.
 *  - neutral exec (mood 50) → effects land unscaled.
 *  - disgruntled exec (mood 20) → money COST scaled ×1.25 (positive money never scaled).
 *  - inspired exec (mood 95) → non-money magnitudes ×1.20 AND cost ×0.90.
 *  - executive_mood effect itself is NOT scaled (no feedback loop).
 *  - delayed effects are scaled AT QUEUE TIME (stored flag entry holds scaled values).
 *  - the pre-fetched executive is threaded into processExecutiveActions (single fetch).
 *  - PARITY: the same choice fed through the shared util directly equals what the
 *    engine applied (structural — both go through applyMoodModifiersToEffects).
 */
import { describe, it, expect, vi } from 'vitest';
import { ActionProcessor } from '@shared/engine/processors/ActionProcessor';
import type { WeekContext } from '@shared/engine/processors/types';
import { createTestWeekSummary } from '../helpers/test-factories';
import {
  getMoodModifiers,
  applyMoodModifiersToEffects,
} from '@shared/utils/executiveMoodModifier';

const EXEC_MOOD_CONFIG = {
  disgruntled_below: 30,
  content_above: 80,
  inspired_above: 90,
  cost_multiplier_disgruntled: 1.25,
  cost_multiplier_content: 0.9,
  effect_multiplier_inspired: 1.2,
};

interface MeetingSetup {
  execMood?: number | null; // null => no executive row (CEO)
  roleId: string;
  executiveId?: string;
  effects_immediate?: Record<string, number>;
  effects_delayed?: Record<string, number>;
}

function buildMeetingContext(setup: MeetingSetup) {
  const gameState: any = {
    id: 'test-game',
    currentWeek: 5,
    reputation: 50,
    creativeCapital: 10,
    money: 100000,
    flags: {},
  };

  const executiveRow =
    setup.execMood == null
      ? null
      : { id: setup.executiveId ?? 'exec-1', role: setup.roleId, level: 1, mood: setup.execMood, loyalty: 50 };

  const updateExecutive = vi.fn(async () => {});
  const getExecutive = vi.fn(async () => executiveRow);

  const summary: any = createTestWeekSummary({ week: 5 });
  // processExecutiveActions tracks used execs on this Set (advanceWeek seeds it).
  summary.usedExecutives = new Set<string>();

  const ctx: WeekContext = {
    gameState,
    summary,
    gameData: {
      getRoleById: async () => ({ name: setup.roleId.toUpperCase() }),
      getActionById: async () => ({ id: 'meeting_x', target_scope: 'global' }),
      getChoiceById: async () => ({
        id: 'choice_x',
        label: 'Do the thing',
        effects_immediate: setup.effects_immediate ?? {},
        effects_delayed: setup.effects_delayed ?? {},
      }),
      getExecMoodModifierConfigSync: () => EXEC_MOOD_CONFIG,
      // Isolate these exec-mood-modifier assertions from the volatility-economy
      // slice 3 global reputation-gain damper (default 0.7) — set scaling to 1.0
      // so reputation lands at full magnitude and the exec ×1.20/×0.90 modifier is
      // the ONLY transform under test.
      getBalanceConfigSync: () => ({ reputation_system: { reputation_gain_scaling: 1.0 } }),
    } as any,
    storage: { getExecutive, updateExecutive } as any,
    financialSystem: {} as any,
    getRandom: () => 0.5,
  };

  const action: any = {
    actionType: 'role_meeting',
    targetId: 'meeting_x',
    metadata: { roleId: setup.roleId, actionId: 'meeting_x', choiceId: 'choice_x', executiveId: setup.executiveId },
  };

  return { ctx, action, getExecutive, updateExecutive, gameState };
}

describe('processRoleMeeting — executive mood modifier (engine wiring)', () => {
  it('CEO meeting (no executive row) → effects land unscaled, no modifier', async () => {
    const { ctx, action } = buildMeetingContext({
      execMood: null,
      roleId: 'ceo',
      executiveId: undefined,
      effects_immediate: { money: -1000, reputation: 5 },
    });
    await new ActionProcessor().processRoleMeeting(ctx, action);

    // Cost landed as authored; positive rep landed as authored.
    expect(ctx.summary.expenseBreakdown?.roleMeetingCosts).toBe(1000);
    expect(ctx.gameState.reputation).toBe(55);
    const meetingChange = ctx.summary.changes.find((c) => c.type === 'meeting');
    expect(meetingChange?.moodBand).toBeUndefined();
  });

  it('neutral exec (mood 50) → effects unscaled, no modifier fields', async () => {
    const { ctx, action } = buildMeetingContext({
      execMood: 50,
      roleId: 'cco',
      executiveId: 'exec-cco',
      effects_immediate: { money: -1000, reputation: 5 },
    });
    await new ActionProcessor().processRoleMeeting(ctx, action);

    expect(ctx.summary.expenseBreakdown?.roleMeetingCosts).toBe(1000);
    expect(ctx.gameState.reputation).toBe(55);
    const meetingChange = ctx.summary.changes.find((c) => c.type === 'meeting');
    expect(meetingChange?.moodBand).toBeUndefined();
  });

  it('disgruntled exec (mood 20) → money COST ×1.25, positive money NEVER scaled', async () => {
    const { ctx, action } = buildMeetingContext({
      execMood: 20,
      roleId: 'cmo',
      executiveId: 'exec-cmo',
      effects_immediate: { money: -1000 },
    });
    await new ActionProcessor().processRoleMeeting(ctx, action);
    expect(ctx.summary.expenseBreakdown?.roleMeetingCosts).toBe(1250);

    // positive money windfall unchanged under disgruntled
    const { ctx: ctx2, action: action2 } = buildMeetingContext({
      execMood: 20,
      roleId: 'cmo',
      executiveId: 'exec-cmo',
      effects_immediate: { money: 5000 },
    });
    await new ActionProcessor().processRoleMeeting(ctx2, action2);
    expect(ctx2.summary.revenue).toBe(5000);

    const meetingChange = ctx.summary.changes.find((c) => c.type === 'meeting');
    expect(meetingChange?.moodBand).toBe('disgruntled');
    expect(meetingChange?.costMultiplier).toBe(1.25);
  });

  it('inspired exec (mood 95) → non-money magnitude ×1.20 AND cost ×0.90', async () => {
    const { ctx, action } = buildMeetingContext({
      execMood: 95,
      roleId: 'cco',
      executiveId: 'exec-cco',
      effects_immediate: { money: -1000, reputation: 5 },
    });
    await new ActionProcessor().processRoleMeeting(ctx, action);

    // cost discounted (inspired inherits content break): -1000 ×0.90 → 900
    expect(ctx.summary.expenseBreakdown?.roleMeetingCosts).toBe(900);
    // reputation magnitude amplified: 5 ×1.20 → 6
    expect(ctx.gameState.reputation).toBe(56);

    const meetingChange = ctx.summary.changes.find((c) => c.type === 'meeting');
    expect(meetingChange?.moodBand).toBe('inspired');
    expect(meetingChange?.effectMultiplier).toBe(1.2);
    // summary appliedEffects reflect the SCALED numbers
    expect(meetingChange?.appliedEffects?.reputation).toBe(6);
    expect(meetingChange?.appliedEffects?.money).toBe(-900);
  });

  it('executive_mood effect is NOT scaled under inspired (no feedback loop)', async () => {
    const { ctx, action, updateExecutive } = buildMeetingContext({
      execMood: 95,
      roleId: 'cco',
      executiveId: 'exec-cco',
      effects_immediate: { executive_mood: 3, reputation: 5 },
    });
    await new ActionProcessor().processRoleMeeting(ctx, action);

    // processExecutiveActions applied executive_mood +3 to mood 95 → clamp 98 (NOT +3×1.2)
    expect(updateExecutive).toHaveBeenCalledWith(
      'exec-cco',
      expect.objectContaining({ mood: 98 }),
      undefined,
    );
    // reputation still amplified
    expect(ctx.gameState.reputation).toBe(56);
  });

  it('delayed effects are scaled AT QUEUE TIME (stored flag holds scaled values)', async () => {
    const { ctx, action } = buildMeetingContext({
      execMood: 95,
      roleId: 'cco',
      executiveId: 'exec-cco',
      effects_immediate: {},
      effects_delayed: { money: -2000, reputation: 5 },
    });
    await new ActionProcessor().processRoleMeeting(ctx, action);

    const flags = ctx.gameState.flags as any;
    const delayedEntry = Object.values(flags).find(
      (v: any) => v && typeof v === 'object' && 'triggerWeek' in v,
    ) as any;
    expect(delayedEntry).toBeDefined();
    // cost ×0.90 → -1800; rep magnitude ×1.20 → 6 — stored already-scaled.
    expect(delayedEntry.effects.money).toBe(-1800);
    expect(delayedEntry.effects.reputation).toBe(6);
  });

  it('fetches the executive exactly ONCE (single fetch, threaded to processExecutiveActions)', async () => {
    const { ctx, action, getExecutive } = buildMeetingContext({
      execMood: 20,
      roleId: 'cmo',
      executiveId: 'exec-cmo',
      effects_immediate: { money: -1000 },
    });
    await new ActionProcessor().processRoleMeeting(ctx, action);
    expect(getExecutive).toHaveBeenCalledTimes(1);
  });
});

describe('PARITY — engine apply ≡ shared util for the same exec state', () => {
  it('inspired: engine-applied numbers equal applyMoodModifiersToEffects output', async () => {
    const authored = { money: -1000, reputation: 5, artist_popularity: -3 };
    const { ctx, action } = buildMeetingContext({
      execMood: 95,
      roleId: 'cco',
      executiveId: 'exec-cco',
      effects_immediate: { ...authored },
    });
    await new ActionProcessor().processRoleMeeting(ctx, action);

    const expected = applyMoodModifiersToEffects(authored, getMoodModifiers(95, EXEC_MOOD_CONFIG));
    const meetingChange = ctx.summary.changes.find((c) => c.type === 'meeting');
    expect(meetingChange?.appliedEffects?.money).toBe(expected.money);
    expect(meetingChange?.appliedEffects?.reputation).toBe(expected.reputation);
    expect(meetingChange?.appliedEffects?.artist_popularity).toBe(expected.artist_popularity);
  });
});
