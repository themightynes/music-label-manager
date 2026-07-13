import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ActionProcessor,
  LIVE_EFFECT_KEYS,
  STRUCTURED_EFFECT_KEYS,
} from '@shared/engine/processors/ActionProcessor';
import { ReleaseProcessor } from '@shared/engine/processors/ReleaseProcessor';
import type { WeekContext } from '@shared/engine/processors/types';
import { createTestWeekSummary } from '../helpers/test-factories';

/**
 * Engine-verbs arc (feat/ev-flags-keys) — unit tests for the five new effect
 * keys, no DB required:
 *   - story_flag              (slice 3-WRITE / M3): flags.story[key] namespace write
 *   - spawn_prospect          (slice 2 / M2): A&R discovered-pool injection
 *   - set_exec_absence        (slice 11-WRITE / M7): flags.execAbsence[role] write
 *   - distribution_efficiency (slice 12 / M10): bank + expiry + revenue-multiplier read
 *   - press_scrutiny_flag     (slice 13 / M15): bank + expiry + one-shot press-roll fire
 *
 * Every context is a stub (storage: {}, gameData minimal) — mirrors the PR-1
 * pattern in action-processor-effect-keys.test.ts.
 */

function buildContext(overrides: Partial<WeekContext> = {}): WeekContext {
  const gameState: any = {
    id: 'test-game-verbs',
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

describe('LIVE_EFFECT_KEYS / STRUCTURED_EFFECT_KEYS wiring (engine-verbs arc)', () => {
  it('registers the five new keys as live', () => {
    for (const key of ['story_flag', 'spawn_prospect', 'set_exec_absence', 'distribution_efficiency', 'press_scrutiny_flag']) {
      expect(LIVE_EFFECT_KEYS.has(key), `${key} missing from LIVE_EFFECT_KEYS`).toBe(true);
    }
  });

  it('marks exactly the non-numeric keys as structured (merge-reconciled: + schedule_event from the chained-events slice)', () => {
    expect(Array.from(STRUCTURED_EFFECT_KEYS).sort()).toEqual([
      'distribution_efficiency',
      'schedule_event',
      'set_exec_absence',
      'spawn_prospect',
      'story_flag',
    ]);
  });
});

describe('story_flag (slice 3-WRITE)', () => {
  it('string value sets flags.story[key] = true', async () => {
    const ctx = buildContext();
    await new ActionProcessor().applyEffects(ctx, { story_flag: 'mac_warned_once' }, undefined, 'global', 'test_meeting', 'a');
    expect((ctx.gameState.flags as any).story).toEqual({ mac_warned_once: true });
  });

  it('object value {key, value: false} can clear a flag', async () => {
    const ctx = buildContext();
    (ctx.gameState.flags as any).story = { mac_warned_once: true, other: true };
    await new ActionProcessor().applyEffects(ctx, { story_flag: { key: 'mac_warned_once', value: false } }, undefined, 'global');
    expect((ctx.gameState.flags as any).story).toEqual({ mac_warned_once: false, other: true });
  });

  it('accumulates keys in the story namespace without clobbering', async () => {
    const ctx = buildContext();
    const processor = new ActionProcessor();
    await processor.applyEffects(ctx, { story_flag: 'first' }, undefined, 'global');
    await processor.applyEffects(ctx, { story_flag: 'second' }, undefined, 'global');
    expect((ctx.gameState.flags as any).story).toEqual({ first: true, second: true });
  });

  it('invalid values warn and are ignored (no story namespace created)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ctx = buildContext();
    await new ActionProcessor().applyEffects(ctx, { story_flag: '' }, undefined, 'global');
    await new ActionProcessor().applyEffects(ctx, { story_flag: { value: true } }, undefined, 'global');
    expect((ctx.gameState.flags as any).story).toBeUndefined();
    expect(warnSpy.mock.calls.some(c => c.some(a => typeof a === 'string' && a.includes('story_flag')))).toBe(true);
    warnSpy.mockRestore();
  });

  it('pushes a qualitative summary line', async () => {
    const ctx = buildContext();
    await new ActionProcessor().applyEffects(ctx, { story_flag: 'k' }, undefined, 'global');
    const line = ctx.summary.changes.find((c: any) => c.appliedEffects?.story_flag === 1);
    expect(line).toBeDefined();
    expect(line!.description).not.toMatch(/\d/); // qualitative copy, no numbers
  });
});

describe('spawn_prospect (slice 2)', () => {
  const catalog = [
    { id: 'art_1', name: 'Nova Sterling', archetype: 'Visionary', talent: 85, popularity: 30, genre: 'pop' },
    { id: 'art_2', name: 'Mason Beat', archetype: 'Workhorse', talent: 60, popularity: 10, genre: 'hip-hop' },
    { id: 'art_3', name: 'Luna Vibe', archetype: 'Trendsetter', talent: 45, popularity: 55, genre: 'electronic' },
  ];

  function buildSpawnContext(signedNames: string[] = []) {
    return buildContext({
      gameData: {
        getAllArtists: vi.fn().mockResolvedValue(catalog),
        getProspectSpawnConfigSync: () => ({
          default_talent_range: [40, 85],
          default_popularity_range: [5, 40],
        }),
      } as any,
      storage: {
        getArtistsByGame: vi.fn().mockResolvedValue(signedNames.map((name, i) => ({ id: `db-${i}`, name }))),
      } as any,
    });
  }

  it('pushes a descriptor in EXACTLY the AROfficeProcessor shape', async () => {
    const ctx = buildSpawnContext();
    await new ActionProcessor().applyEffects(
      ctx,
      { spawn_prospect: { name: 'Nova Sterling', source: 'mac_meeting' } },
      undefined, 'global', 'mac_scout', 'go'
    );
    const pool = (ctx.gameState.flags as any).ar_office_discovered_artists;
    expect(pool).toHaveLength(1);
    expect(pool[0]).toEqual({
      id: 'art_1',
      name: 'Nova Sterling',
      archetype: 'Visionary',
      talent: 85,
      popularity: 30,
      genre: 'pop',
      discoveryTime: 5, // currentWeek
      sourcingType: 'mac_meeting',
      genreUsed: null,
    });
  });

  it('excludes signed and already-discovered artists', async () => {
    const ctx = buildSpawnContext(['Nova Sterling']);
    (ctx.gameState.flags as any).ar_office_discovered_artists = [
      { id: 'art_3', name: 'Luna Vibe' },
    ];
    await new ActionProcessor().applyEffects(ctx, { spawn_prospect: { source: 'event' } }, undefined, 'global', 'm', 'c');
    const pool = (ctx.gameState.flags as any).ar_office_discovered_artists;
    expect(pool).toHaveLength(2);
    // Only Mason Beat was available.
    expect(pool[1].id).toBe('art_2');
  });

  it('archetype + hints steer selection deterministically', async () => {
    const ctx = buildSpawnContext();
    await new ActionProcessor().applyEffects(
      ctx,
      { spawn_prospect: { archetype: 'Trendsetter', quality_hint: 50, popularity_hint: 50, source: 'event' } },
      undefined, 'global', 'm', 'c'
    );
    const pool = (ctx.gameState.flags as any).ar_office_discovered_artists;
    expect(pool[0].id).toBe('art_3'); // the only Trendsetter
  });

  it('is deterministic (isolated seed) and never draws from ctx.getRandom', async () => {
    const pickIds: string[] = [];
    for (let i = 0; i < 2; i++) {
      const ctx = buildSpawnContext();
      const randomSpy = vi.fn(() => 0.5);
      ctx.getRandom = randomSpy as any;
      await new ActionProcessor().applyEffects(ctx, { spawn_prospect: { source: 'event' } }, undefined, 'global', 'meet', 'ch');
      pickIds.push((ctx.gameState.flags as any).ar_office_discovered_artists[0].id);
      expect(randomSpy).not.toHaveBeenCalled();
    }
    expect(pickIds[0]).toBe(pickIds[1]);
  });

  it('skips gracefully when the whole catalog is exhausted', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ctx = buildSpawnContext(['Nova Sterling', 'Mason Beat', 'Luna Vibe']);
    await new ActionProcessor().applyEffects(ctx, { spawn_prospect: { source: 'event' } }, undefined, 'global');
    expect((ctx.gameState.flags as any).ar_office_discovered_artists).toBeUndefined();
    warnSpy.mockRestore();
  });
});

describe('set_exec_absence (slice 11-WRITE)', () => {
  it('writes flags.execAbsence[role] = currentWeek + weeks', async () => {
    const ctx = buildContext(); // currentWeek 5
    await new ActionProcessor().applyEffects(ctx, { set_exec_absence: { role: 'cmo', weeks: 3 } }, undefined, 'global');
    expect((ctx.gameState.flags as any).execAbsence).toEqual({ cmo: 8 });
  });

  it('the longest bench wins on re-application, and roles accumulate', async () => {
    const ctx = buildContext();
    const processor = new ActionProcessor();
    await processor.applyEffects(ctx, { set_exec_absence: { role: 'cmo', weeks: 4 } }, undefined, 'global');
    await processor.applyEffects(ctx, { set_exec_absence: { role: 'cmo', weeks: 1 } }, undefined, 'global');
    await processor.applyEffects(ctx, { set_exec_absence: { role: 'head_ar', weeks: 2 } }, undefined, 'global');
    expect((ctx.gameState.flags as any).execAbsence).toEqual({ cmo: 9, head_ar: 7 });
  });

  it('invalid values warn and are ignored', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ctx = buildContext();
    await new ActionProcessor().applyEffects(ctx, { set_exec_absence: { role: 'cmo' } }, undefined, 'global');
    await new ActionProcessor().applyEffects(ctx, { set_exec_absence: { role: '', weeks: 2 } }, undefined, 'global');
    await new ActionProcessor().applyEffects(ctx, { set_exec_absence: 3 }, undefined, 'global');
    expect((ctx.gameState.flags as any).execAbsence).toBeUndefined();
    warnSpy.mockRestore();
  });
});

describe('distribution_efficiency (slice 12)', () => {
  const distGameData = {
    getDistributionConfigSync: () => ({ efficiency_amount_cap: 0.25 }),
    getPressConfigSync: () => ({ press_story_flag_expiry_weeks: 8, press_scrutiny_flag_expiry_weeks: 8 }),
    getQualityBonusConfigSync: () => ({ pending_quality_bonus_expiry_weeks: 8 }),
    getAwarenessBoostConfigSync: () => ({ awareness_boost_points_per_unit: 8, pending_awareness_boost_expiry_weeks: 8 }),
    getVarianceConfigSync: () => ({ pending_variance_expiry_weeks: 8 }),
  } as any;

  it('banks { amount, untilWeek } and stacks while live (longest expiry wins)', async () => {
    const ctx = buildContext(); // week 5
    const processor = new ActionProcessor();
    await processor.applyEffects(ctx, { distribution_efficiency: { amount: 0.1, weeks: 6 } }, undefined, 'global');
    expect((ctx.gameState.flags as any).distributionEfficiency).toEqual({ amount: 0.1, untilWeek: 11 });
    await processor.applyEffects(ctx, { distribution_efficiency: { amount: 0.05, weeks: 2 } }, undefined, 'global');
    const stacked = (ctx.gameState.flags as any).distributionEfficiency;
    expect(stacked.amount).toBeCloseTo(0.15);
    expect(stacked.untilWeek).toBe(11); // longest expiry wins
  });

  it('multiplies ongoing streaming revenue by (1 + amount) while active', async () => {
    const ctx = buildContext({
      gameData: distGameData,
      financialSystem: { calculateOngoingSongRevenue: vi.fn().mockResolvedValue(1000) } as any,
    });
    (ctx.gameState.flags as any).distributionEfficiency = { amount: 0.1, untilWeek: 11 };
    const revenue = await new ReleaseProcessor().calculateOngoingSongRevenue(ctx, { title: 'Song', quality: 70 });
    expect(revenue).toBeCloseTo(1100);
  });

  it('clamps the applied amount to ±efficiency_amount_cap', async () => {
    const ctx = buildContext({
      gameData: distGameData,
      financialSystem: { calculateOngoingSongRevenue: vi.fn().mockResolvedValue(1000) } as any,
    });
    (ctx.gameState.flags as any).distributionEfficiency = { amount: 2.0, untilWeek: 11 };
    expect(await new ReleaseProcessor().calculateOngoingSongRevenue(ctx, { title: 'S' })).toBeCloseTo(1250);
    (ctx.gameState.flags as any).distributionEfficiency = { amount: -2.0, untilWeek: 11 };
    expect(await new ReleaseProcessor().calculateOngoingSongRevenue(ctx, { title: 'S' })).toBeCloseTo(750);
  });

  it('is a no-op read when the modifier is absent or lapsed', async () => {
    const ctx = buildContext({
      gameData: distGameData,
      financialSystem: { calculateOngoingSongRevenue: vi.fn().mockResolvedValue(1000) } as any,
    });
    expect(await new ReleaseProcessor().calculateOngoingSongRevenue(ctx, { title: 'S' })).toBe(1000);
    (ctx.gameState.flags as any).distributionEfficiency = { amount: 0.1, untilWeek: 5 }; // currentWeek 5 → lapsed
    expect(await new ReleaseProcessor().calculateOngoingSongRevenue(ctx, { title: 'S' })).toBe(1000);
  });

  it('processDelayedEffects deletes a lapsed modifier (and leaves a live one alone)', async () => {
    const ctx = buildContext({ gameData: distGameData });
    (ctx.gameState.flags as any).distributionEfficiency = { amount: 0.1, untilWeek: 11 };
    await new ActionProcessor().processDelayedEffects(ctx);
    expect((ctx.gameState.flags as any).distributionEfficiency).toEqual({ amount: 0.1, untilWeek: 11 });

    (ctx.gameState.flags as any).distributionEfficiency = { amount: 0.1, untilWeek: 5 }; // currentWeek 5
    await new ActionProcessor().processDelayedEffects(ctx);
    expect((ctx.gameState.flags as any).distributionEfficiency).toBeUndefined();
  });

  it('invalid values warn and are ignored', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ctx = buildContext();
    await new ActionProcessor().applyEffects(ctx, { distribution_efficiency: { amount: 0, weeks: 4 } }, undefined, 'global');
    await new ActionProcessor().applyEffects(ctx, { distribution_efficiency: { amount: 0.1 } }, undefined, 'global');
    await new ActionProcessor().applyEffects(ctx, { distribution_efficiency: 0.1 }, undefined, 'global');
    expect((ctx.gameState.flags as any).distributionEfficiency).toBeUndefined();
    warnSpy.mockRestore();
  });
});

describe('press_scrutiny_flag (slice 13)', () => {
  const pressGameData = {
    getPressConfigSync: () => ({
      press_story_flag_expiry_weeks: 8,
      press_scrutiny_flag_expiry_weeks: 8,
      press_scrutiny_penalty_factor: 0.5,
    }),
    getQualityBonusConfigSync: () => ({ pending_quality_bonus_expiry_weeks: 8 }),
    getAwarenessBoostConfigSync: () => ({ awareness_boost_points_per_unit: 8, pending_awareness_boost_expiry_weeks: 8 }),
    getVarianceConfigSync: () => ({ pending_variance_expiry_weeks: 8 }),
  } as any;

  it('banks the flag with a week stamp on a positive value; ignores non-positive', async () => {
    const ctx = buildContext();
    await new ActionProcessor().applyEffects(ctx, { press_scrutiny_flag: 0 }, undefined, 'global');
    expect((ctx.gameState.flags as any).pressScrutinyFlag).toBeUndefined();
    await new ActionProcessor().applyEffects(ctx, { press_scrutiny_flag: 1 }, undefined, 'global');
    expect((ctx.gameState.flags as any).pressScrutinyFlag).toBe(true);
    expect((ctx.gameState.flags as any).pressScrutinyFlagWeek).toBe(5);
  });

  it('fires ONCE at the next release press roll: pickups + reputation gain scaled down, flag cleared', async () => {
    const ctx = buildContext({
      gameData: pressGameData,
      financialSystem: {
        calculatePressOutcome: vi.fn().mockReturnValue({ pickups: 4, reputationGain: 3 }),
        getAccessChance: vi.fn(),
      } as any,
    });
    (ctx.gameState.flags as any).pressScrutinyFlag = true;
    (ctx.gameState.flags as any).pressScrutinyFlagWeek = 5;

    const outcome = new ReleaseProcessor().calculatePressOutcome(ctx, 70, 'blogs', 50, 5000);
    expect(outcome).toEqual({ pickups: 2, reputationGain: 2 }); // floor(4*0.5)=2, round(3*0.5)=2
    expect((ctx.gameState.flags as any).pressScrutinyFlag).toBe(false);
    expect((ctx.gameState.flags as any).pressScrutinyFlagWeek).toBeUndefined();
    // One qualitative attribution line.
    expect(ctx.summary.changes.some((c: any) => /scrutiny/i.test(c.description))).toBe(true);

    // Second roll: the liability is spent — outcome passes through untouched.
    const second = new ReleaseProcessor().calculatePressOutcome(ctx, 70, 'blogs', 50, 5000);
    expect(second).toEqual({ pickups: 4, reputationGain: 3 });
  });

  it('leaves the press outcome untouched when no scrutiny flag is banked', () => {
    const ctx = buildContext({
      gameData: pressGameData,
      financialSystem: {
        calculatePressOutcome: vi.fn().mockReturnValue({ pickups: 4, reputationGain: 3 }),
        getAccessChance: vi.fn(),
      } as any,
    });
    const outcome = new ReleaseProcessor().calculatePressOutcome(ctx, 70, 'blogs', 50, 5000);
    expect(outcome).toEqual({ pickups: 4, reputationGain: 3 });
  });

  it('expires unconsumed after press_scrutiny_flag_expiry_weeks in processDelayedEffects', async () => {
    const ctx = buildContext({ gameData: pressGameData });
    (ctx.gameState.flags as any).pressScrutinyFlag = true;
    (ctx.gameState.flags as any).pressScrutinyFlagWeek = 5;

    ctx.gameState.currentWeek = 12; // 7 weeks — inside the window
    await new ActionProcessor().processDelayedEffects(ctx);
    expect((ctx.gameState.flags as any).pressScrutinyFlag).toBe(true);

    ctx.gameState.currentWeek = 13; // 8 weeks — expires
    await new ActionProcessor().processDelayedEffects(ctx);
    expect((ctx.gameState.flags as any).pressScrutinyFlag).toBe(false);
    expect((ctx.gameState.flags as any).pressScrutinyFlagWeek).toBeUndefined();
  });
});

describe('structured effects flow through processRoleMeeting (entry-point filter widening)', () => {
  it('a story_flag authored in effects_immediate reaches applyEffects (not dropped by the number filter)', async () => {
    const ctx = buildContext({
      gameData: {
        getRoleById: vi.fn().mockResolvedValue({ id: 'mac', name: 'Mac' }),
        getActionById: vi.fn().mockResolvedValue({ id: 'mac_test', target_scope: 'global' }),
        getChoiceById: vi.fn().mockResolvedValue({
          id: 'choice_a',
          effects_immediate: { money: -500, story_flag: 'test_memory' },
          effects_delayed: {},
        }),
      } as any,
      storage: { getExecutive: vi.fn().mockResolvedValue(null) } as any,
    });

    await new ActionProcessor().processRoleMeeting(ctx, {
      actionType: 'role_meeting',
      targetId: 'mac_test',
      metadata: { roleId: 'mac', actionId: 'mac_test', choiceId: 'choice_a' },
      details: {},
    } as any);

    expect((ctx.gameState.flags as any).story).toEqual({ test_memory: true });
    // The numeric money effect still landed too.
    expect(ctx.summary.expenses).toBe(500);
  });
});
