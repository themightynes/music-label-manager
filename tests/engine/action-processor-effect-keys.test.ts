import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionProcessor, LIVE_EFFECT_KEYS } from '@shared/engine/processors/ActionProcessor';
import type { WeekContext } from '@shared/engine/processors/types';
import { createTestWeekSummary } from '../helpers/test-factories';

/**
 * PR-1 truth infrastructure — ActionProcessor unit tests.
 *
 * Covers:
 *  (a) an unknown effect key warns and is dropped without throwing or mutating state
 *  (b) 'executive_mood' does NOT trigger the unknown-key warning (it's consumed
 *      directly out of effects_immediate by processExecutiveActions, not this switch)
 *  (c) the delayed-effect flag key now uses the real choiceId, pinned to the exact
 *      format `${actionId}-${choiceId}-delayed`
 */

function buildContext(overrides: Partial<WeekContext> = {}): WeekContext {
  const gameState: any = {
    id: 'test-game-state',
    currentWeek: 5,
    reputation: 50,
    creativeCapital: 10,
    flags: {},
  };

  return {
    gameState,
    summary: createTestWeekSummary({ week: 5 }),
    gameData: {} as any,
    storage: {} as any,
    financialSystem: {} as any,
    getRandom: () => 0.5,
    ...overrides,
  };
}

describe('ActionProcessor.applyEffects — unknown effect keys (PR-1)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('warns and drops an unknown effect key without throwing or mutating state', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();
    const reputationBefore = ctx.gameState.reputation;
    const creativeCapitalBefore = ctx.gameState.creativeCapital;

    await expect(
      processor.applyEffects(ctx, { totally_unknown_key: 42 }, undefined, 'global', 'test_meeting', 'test_choice')
    ).resolves.not.toThrow();

    // State must be unchanged — the unknown key must be dropped, not applied.
    expect(ctx.gameState.reputation).toBe(reputationBefore);
    expect(ctx.gameState.creativeCapital).toBe(creativeCapitalBefore);
    expect(ctx.summary.artistChanges ?? {}).toEqual({});

    // Must have warned, mentioning the offending key.
    const warnedUnknownKey = warnSpy.mock.calls.some(call =>
      call.some(arg => typeof arg === 'string' && arg.includes('totally_unknown_key'))
    );
    expect(warnedUnknownKey).toBe(true);

    // Sanity: 'totally_unknown_key' is indeed not in the live-effect allowlist.
    expect(LIVE_EFFECT_KEYS.has('totally_unknown_key')).toBe(false);
  });

  it('does NOT warn for executive_mood (handled outside the switch by processExecutiveActions)', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();

    await expect(
      processor.applyEffects(ctx, { executive_mood: 5 }, undefined, 'global', 'test_meeting', 'test_choice')
    ).resolves.not.toThrow();

    const warnedExecutiveMood = warnSpy.mock.calls.some(call =>
      call.some(arg => typeof arg === 'string' && arg.includes('executive_mood') && arg.includes('Unknown effect key'))
    );
    expect(warnedExecutiveMood).toBe(false);

    // executive_mood is intentionally NOT part of the live-effect allowlist either
    // (it never reaches applyEffects's switch as a "live" key in normal play).
    expect(LIVE_EFFECT_KEYS.has('executive_mood')).toBe(false);
  });

  it('still applies known keys (e.g. reputation) normally alongside an unknown key', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();

    await processor.applyEffects(ctx, { reputation: 3, totally_unknown_key: -99 }, undefined, 'global');

    // Volatility-economy slice 3: positive reputation gains are scaled by
    // reputation_gain_scaling (fallback 0.7 here — buildContext's gameData has no
    // config), so +3 → round(2.1) = 2 → 50 + 2 = 52. The point of THIS test is
    // that the known key still applies alongside a dropped unknown key.
    expect(ctx.gameState.reputation).toBe(52);
  });
});

describe('ActionProcessor.processRoleMeeting — delayed-effect flag key (PR-1)', () => {
  it('uses the real choiceId in the delayed-effect flag key, not "undefined"', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();

    const actionId = 'ceo_priorities';
    const choiceId = 'priority_growth';
    const roleId = 'ceo';

    const gameData = {
      getRoleById: vi.fn().mockResolvedValue({ id: roleId, name: 'CEO' }),
      getActionById: vi.fn().mockResolvedValue({ id: actionId, target_scope: 'global' }),
      getChoiceById: vi.fn().mockResolvedValue({
        id: choiceId,
        effects_immediate: { reputation: 1 },
        effects_delayed: { reputation: 2 },
      }),
    };

    const storage = {
      getExecutive: vi.fn().mockResolvedValue(null), // no executive → processExecutiveActions short-circuits
    };

    ctx.gameData = gameData as any;
    ctx.storage = storage as any;

    const action: any = {
      actionType: 'role_meeting',
      targetId: actionId,
      metadata: { roleId, actionId, choiceId },
      details: {},
    };

    await processor.processRoleMeeting(ctx, action);

    const expectedKey = `${actionId}-${choiceId}-delayed`;
    expect(ctx.gameState.flags).toHaveProperty(expectedKey);
    expect((ctx.gameState.flags as any)[expectedKey].choiceId).toBe(choiceId);

    // The old, buggy key format must NOT be present.
    expect(ctx.gameState.flags).not.toHaveProperty(`${actionId}-undefined-delayed`);
  });
});
