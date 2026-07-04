/**
 * Exec-meetings-revival PR-3 (C2) — press channel unit tests.
 *
 * Covers:
 *  (a) press_story_flag: a meeting effect sets flags.pressStoryFlag; the next
 *      release's press roll (ReleaseProcessor.calculatePressOutcome) receives it
 *      as `true`, and the flag is cleared (one-shot) after that roll consumes it.
 *      A press roll with no flag set is unaffected (hasStoryFlag stays false).
 *  (b) press_momentum: applyEffects accumulates the pool; FinancialSystem feeds
 *      it into the pickup chance as a small additive bonus; ActionProcessor
 *      decays it by 1/week (processDelayedEffects), floored at 0.
 *  (c) Both keys are in LIVE_EFFECT_KEYS (badge honesty depends on this).
 */
import { describe, it, expect, vi } from 'vitest';
import { ActionProcessor, LIVE_EFFECT_KEYS } from '@shared/engine/processors/ActionProcessor';
import { ReleaseProcessor } from '@shared/engine/processors/ReleaseProcessor';
import { FinancialSystem } from '@shared/engine/FinancialSystem';
import type { WeekContext } from '@shared/engine/processors/types';
import { createTestWeekSummary } from '../helpers/test-factories';

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

describe('LIVE_EFFECT_KEYS — PR-3 press channel keys', () => {
  it('includes press_story_flag and press_momentum', () => {
    expect(LIVE_EFFECT_KEYS.has('press_story_flag')).toBe(true);
    expect(LIVE_EFFECT_KEYS.has('press_momentum')).toBe(true);
  });
});

describe('ActionProcessor.applyEffects — press_story_flag', () => {
  it('sets flags.pressStoryFlag = true on a positive effect value', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();

    await processor.applyEffects(ctx, { press_story_flag: 1 }, undefined, 'global', 'ceo_priorities', 'content_first');

    expect((ctx.gameState.flags as any).pressStoryFlag).toBe(true);
  });

  it('does not set the flag for a non-positive value', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();

    await processor.applyEffects(ctx, { press_story_flag: 0 }, undefined, 'global');

    expect((ctx.gameState.flags as any).pressStoryFlag).toBeUndefined();
  });
});

describe('ActionProcessor.applyEffects — press_momentum', () => {
  it('accumulates across multiple applications', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();

    await processor.applyEffects(ctx, { press_momentum: 2 }, undefined, 'global');
    expect((ctx.gameState.flags as any).pressMomentum).toBe(2);

    await processor.applyEffects(ctx, { press_momentum: 1 }, undefined, 'global');
    expect((ctx.gameState.flags as any).pressMomentum).toBe(3);

    await processor.applyEffects(ctx, { press_momentum: -1 }, undefined, 'global');
    expect((ctx.gameState.flags as any).pressMomentum).toBe(2);
  });

  it('can go negative from applyEffects alone (flooring happens in weekly decay, not here)', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();

    await processor.applyEffects(ctx, { press_momentum: -3 }, undefined, 'global');
    expect((ctx.gameState.flags as any).pressMomentum).toBe(-3);
  });
});

describe('ActionProcessor.processDelayedEffects — press_momentum weekly decay', () => {
  it('decays pressMomentum by 1 toward 0', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();
    (ctx.gameState.flags as any).pressMomentum = 3;

    await processor.processDelayedEffects(ctx);

    expect((ctx.gameState.flags as any).pressMomentum).toBe(2);
  });

  it('floors at 0 and never goes negative', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();
    (ctx.gameState.flags as any).pressMomentum = 0;

    await processor.processDelayedEffects(ctx);
    expect((ctx.gameState.flags as any).pressMomentum).toBe(0);
  });

  it('leaves other flags (e.g. delayed-effect entries) untouched', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();
    (ctx.gameState.flags as any).pressMomentum = 5;
    (ctx.gameState.flags as any)['some-other-delayed-key'] = {
      triggerWeek: 999, // not this week — should survive untouched
      effects: { reputation: 1 },
    };

    await processor.processDelayedEffects(ctx);

    expect((ctx.gameState.flags as any).pressMomentum).toBe(4);
    expect((ctx.gameState.flags as any)['some-other-delayed-key']).toBeDefined();
  });

  it('does nothing when pressMomentum is absent', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();

    await expect(processor.processDelayedEffects(ctx)).resolves.not.toThrow();
    expect((ctx.gameState.flags as any).pressMomentum).toBeUndefined();
  });
});

// FinancialSystem's constructor runs validateConfiguration(), which reads
// getTourConfigSync()/getAccessTiersSync() regardless of what the test exercises.
// Shared minimal mock so every gameData literal in this file satisfies it.
function baseGameDataMocks() {
  return {
    getTourConfigSync: () => ({
      sell_through_base: 0.15,
      reputation_modifier: 0.05,
      local_popularity_weight: 0.6,
      merch_percentage: 0.15,
      ticket_price_base: 25,
      ticket_price_per_capacity: 0.03,
    }),
    getAccessTiersSync: () => ({
      venue_access: {
        none: { threshold: 0, capacity_range: [0, 50], guarantee_multiplier: 0.3 },
        clubs: { threshold: 5, capacity_range: [50, 500], guarantee_multiplier: 0.7 },
        theaters: { threshold: 20, capacity_range: [500, 2000], guarantee_multiplier: 1.0 },
        arenas: { threshold: 45, capacity_range: [2000, 20000], guarantee_multiplier: 1.5 },
      },
    }),
  };
}

describe('FinancialSystem.calculatePressPickups — press_momentum chance bonus', () => {
  function buildFinancialSystem(pressMomentumChancePerPoint = 0.02) {
    const gameData: any = {
      ...baseGameDataMocks(),
      getPressConfigSync: () => ({
        base_chance: 0.15,
        pr_spend_modifier: 0,
        reputation_modifier: 0,
        story_flag_bonus: 0.30,
        max_pickups_per_release: 8,
        press_momentum_chance_per_point: pressMomentumChancePerPoint,
      }),
    };
    return new FinancialSystem(gameData, () => 0.5);
  }

  it('does not change draw count: same number of getRandomFn calls with or without momentum', () => {
    const fs = buildFinancialSystem();
    let callsNoMomentum = 0;
    let callsWithMomentum = 0;

    fs.calculatePressPickups('none', 0, 0, false, () => { callsNoMomentum++; return 0.99; }, () => 0);
    fs.calculatePressPickups('none', 0, 0, false, () => { callsWithMomentum++; return 0.99; }, () => 0, 5);

    expect(callsWithMomentum).toBe(callsNoMomentum);
  });

  it('a higher momentum raises pickups for a fixed borderline roll', () => {
    const fs = buildFinancialSystem(0.02);
    // base_chance 0.15; roll of 0.16 fails with no momentum, succeeds with +momentum bonus.
    const fixedRoll = () => 0.16;

    const withoutMomentum = fs.calculatePressPickups('none', 0, 0, false, fixedRoll, () => 0, 0);
    const withMomentum = fs.calculatePressPickups('none', 0, 0, false, fixedRoll, () => 0, 5); // +0.10 chance

    expect(withoutMomentum).toBe(0);
    expect(withMomentum).toBeGreaterThan(withoutMomentum);
  });

  it('zero/undefined momentum behaves exactly as before (backward compatible default)', () => {
    const fs = buildFinancialSystem();
    const fixedRoll = () => 0.16;

    const explicitZero = fs.calculatePressPickups('none', 0, 0, false, fixedRoll, () => 0, 0);
    const omitted = fs.calculatePressPickups('none', 0, 0, false, fixedRoll, () => 0);

    expect(omitted).toBe(explicitZero);
  });
});

describe('ReleaseProcessor.calculatePressOutcome — story flag threading + one-shot clear', () => {
  function buildCtx(flags: Record<string, any>, getRandomFn: () => number = () => 0.5): WeekContext {
    const gameState: any = { id: 'g1', currentWeek: 3, flags };
    const gameData: any = {
      ...baseGameDataMocks(),
      getPressConfigSync: () => ({
        base_chance: 0.15,
        pr_spend_modifier: 0,
        reputation_modifier: 0,
        story_flag_bonus: 0.30,
        max_pickups_per_release: 8,
        press_momentum_chance_per_point: 0.02,
      }),
      getAccessTiersSync: () => ({
        venue_access: baseGameDataMocks().getAccessTiersSync().venue_access,
        press_access: {
          none: { threshold: 0, pickup_chance: 0 },
        },
      }),
    };
    const financialSystem = new FinancialSystem(gameData, getRandomFn);
    return {
      gameState,
      summary: createTestWeekSummary({ week: 3 }),
      gameData,
      storage: {} as any,
      financialSystem,
      getRandom: getRandomFn,
    };
  }

  it('threads hasStoryFlag=true through to the pickup roll and clears the flag after', () => {
    const processor = new ReleaseProcessor();
    const ctx = buildCtx({ pressStoryFlag: true });

    processor.calculatePressOutcome(ctx, 80, 'none', 0, 0);

    expect((ctx.gameState.flags as any).pressStoryFlag).toBe(false);
  });

  it('a press roll with no flag set leaves hasStoryFlag false and does not touch the flag key', () => {
    const processor = new ReleaseProcessor();
    const ctx = buildCtx({});

    processor.calculatePressOutcome(ctx, 80, 'none', 0, 0);

    expect((ctx.gameState.flags as any).pressStoryFlag).toBeUndefined();
  });

  it('story flag measurably raises pickups for a fixed borderline roll, then is gone for the next roll', () => {
    const processor = new ReleaseProcessor();
    // base_chance 0.15; roll of 0.30 fails without the flag, succeeds with the +0.30 bonus.
    const fixedRoll = () => 0.30;

    const ctxWithFlag = buildCtx({ pressStoryFlag: true }, fixedRoll);
    const outcomeWithFlag = processor.calculatePressOutcome(ctxWithFlag, 80, 'none', 0, 0);
    expect(outcomeWithFlag.pickups).toBeGreaterThan(0);
    expect((ctxWithFlag.gameState.flags as any).pressStoryFlag).toBe(false);

    // Second release, same game state (flag now cleared) — same roll, no bonus.
    const outcomeSecondRelease = processor.calculatePressOutcome(ctxWithFlag, 80, 'none', 0, 0);
    expect(outcomeSecondRelease.pickups).toBe(0);
  });

  it('does not change RNG draw count regardless of flag/momentum presence', () => {
    let calls = 0;
    const countingRoll = () => { calls++; return 0.99; };

    const processor = new ReleaseProcessor();
    const ctxNoFlag = buildCtx({}, countingRoll);
    processor.calculatePressOutcome(ctxNoFlag, 80, 'none', 0, 0);
    const callsNoFlag = calls;

    calls = 0;
    const ctxWithFlag = buildCtx({ pressStoryFlag: true, pressMomentum: 4 }, countingRoll);
    processor.calculatePressOutcome(ctxWithFlag, 80, 'none', 0, 0);
    const callsWithFlag = calls;

    expect(callsWithFlag).toBe(callsNoFlag);
  });
});
