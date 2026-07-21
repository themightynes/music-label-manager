/**
 * Engine-verbs SLICE 5 (M13) — targeted executive mood + M14 per-artist
 * targeting in events. No DB — mock storage/gameData throughout.
 *
 * Covers:
 *  - ActionProcessor.applyTargetedExecutiveMood (the resolver): per-role
 *    targeting, 'all' broadcast (CEO row excluded), clamp at both ends through
 *    the SAME clamp/persist path role meetings use, unknown target /
 *    missing-storage graceful no-ops, transaction threading, summary entries.
 *  - CEO meeting wiring: processRoleMeeting routes an authored
 *    { executive_mood, target_executive } pair through the resolver; role
 *    meetings never do (their exec is implicit).
 *  - Event wiring: processPendingSideEventResolution routes the pair too, and
 *    honors the M14 target_artist directive ('predetermined' on a global
 *    event, 'global' override on a predetermined event, delayed-bank artistId).
 */
import { describe, it, expect, vi } from 'vitest';
import { ActionProcessor } from '@shared/engine/processors/ActionProcessor';
import type { WeekContext } from '@shared/engine/processors/types';
import { GameEngine } from '@shared/engine/game-engine';
import type { GameState, WeekSummary, SideEvent } from '@shared/types/gameTypes';
import { createTestWeekSummary } from '../helpers/test-factories';

// ---------------------------------------------------------------------------
// Resolver-level harness
// ---------------------------------------------------------------------------

function makeExecutives() {
  return [
    { id: 'exec-ar', role: 'head_ar', mood: 50, loyalty: 50 },
    { id: 'exec-cmo', role: 'cmo', mood: 97, loyalty: 50 },
    { id: 'exec-cco', role: 'cco', mood: 3, loyalty: 50 },
    { id: 'exec-dist', role: 'head_distribution', mood: 50, loyalty: 50 },
    // Defensive: a hypothetical ceo row must never be targeted (the player IS the CEO).
    { id: 'exec-ceo', role: 'ceo', mood: 50, loyalty: 50 },
  ];
}

function makeResolverCtx(executives: any[] | null = makeExecutives()) {
  const updateExecutive = vi.fn(async (_id: string, _updates: Record<string, any>, _tx?: any) => {});
  const getExecutivesByGame = vi.fn(async () => executives ?? []);
  const summary: any = createTestWeekSummary({ week: 5 });
  const ctx: WeekContext = {
    gameState: { id: 'game-1', currentWeek: 5, flags: {} } as any,
    summary,
    gameData: {} as any,
    storage: executives === null ? {} : { getExecutivesByGame, updateExecutive },
    financialSystem: {} as any,
    getRandom: () => 0.5,
  };
  return { ctx, summary, updateExecutive, getExecutivesByGame };
}

describe('applyTargetedExecutiveMood — the SLICE 5 resolver', () => {
  it('targets a single executive by roleId and persists through the shared clamp path', async () => {
    const { ctx, summary, updateExecutive } = makeResolverCtx();
    await new ActionProcessor().applyTargetedExecutiveMood(ctx, -5, 'head_ar', 'tx-1', 'test');

    expect(updateExecutive).toHaveBeenCalledTimes(1);
    expect(updateExecutive).toHaveBeenCalledWith('exec-ar', { mood: 45 }, 'tx-1');

    // Legible summary entry: executive_interaction with the applied delta.
    const entries = summary.changes.filter((c: any) => c.type === 'executive_interaction');
    expect(entries).toHaveLength(1);
    expect(entries[0].roleId).toBe('head_ar');
    expect(entries[0].moodChange).toBe(-5);
    expect(entries[0].newMood).toBe(45);
    // House rule: prose stays qualitative (no digits).
    expect(entries[0].description).not.toMatch(/\d/);
  });

  it("broadcasts 'all' to every executive EXCEPT a ceo row", async () => {
    const { ctx, summary, updateExecutive } = makeResolverCtx();
    await new ActionProcessor().applyTargetedExecutiveMood(ctx, 3, 'all', undefined, 'test');

    expect(updateExecutive).toHaveBeenCalledTimes(4);
    const updatedIds = updateExecutive.mock.calls.map((c: any[]) => c[0]);
    expect(updatedIds).toEqual(expect.arrayContaining(['exec-ar', 'exec-cmo', 'exec-cco', 'exec-dist']));
    expect(updatedIds).not.toContain('exec-ceo');
    expect(summary.changes.filter((c: any) => c.type === 'executive_interaction')).toHaveLength(4);
  });

  it('clamps at 100 (top) and 0 (bottom) — same clamp as processExecutiveActions', async () => {
    const { ctx, summary, updateExecutive } = makeResolverCtx();
    // cmo mood 97 + 8 → clamps to 100
    await new ActionProcessor().applyTargetedExecutiveMood(ctx, 8, 'cmo', undefined);
    expect(updateExecutive).toHaveBeenCalledWith('exec-cmo', { mood: 100 }, undefined);
    // cco mood 3 - 8 → clamps to 0
    await new ActionProcessor().applyTargetedExecutiveMood(ctx, -8, 'cco', undefined);
    expect(updateExecutive).toHaveBeenCalledWith('exec-cco', { mood: 0 }, undefined);

    // The summary entries report the APPLIED (post-clamp) delta, not the authored one.
    const entries = summary.changes.filter((c: any) => c.type === 'executive_interaction');
    expect(entries[0].moodChange).toBe(3);   // 97 → 100
    expect(entries[1].moodChange).toBe(-3);  // 3 → 0
  });

  it('never touches loyalty or lastActionWeek (external mood hit ≠ engagement)', async () => {
    const { ctx, updateExecutive } = makeResolverCtx();
    await new ActionProcessor().applyTargetedExecutiveMood(ctx, -5, 'head_distribution', undefined);
    const updates = updateExecutive.mock.calls[0][1];
    expect(Object.keys(updates)).toEqual(['mood']);
  });

  it('drops an unknown target_executive value without crashing (defensive; data-lint guards authored content)', async () => {
    const { ctx, summary, updateExecutive } = makeResolverCtx();
    await new ActionProcessor().applyTargetedExecutiveMood(ctx, -5, 'intern', undefined);
    expect(updateExecutive).not.toHaveBeenCalled();
    expect(summary.changes).toHaveLength(0);
  });

  it('degrades gracefully when storage lacks getExecutivesByGame (duck-typed test mocks)', async () => {
    const { ctx, summary } = makeResolverCtx(null); // storage = {}
    await expect(
      new ActionProcessor().applyTargetedExecutiveMood(ctx, -5, 'cmo', undefined)
    ).resolves.toBeUndefined();
    expect(summary.changes).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// CEO-meeting wiring (processRoleMeeting)
// ---------------------------------------------------------------------------

function makeMeetingCtx(opts: {
  roleId: string;
  executiveId?: string;
  effects_immediate: Record<string, unknown>;
  executives?: any[];
}) {
  const executives = opts.executives ?? makeExecutives();
  const updateExecutive = vi.fn(async (_id: string, _updates: Record<string, any>, _tx?: any) => {});
  const getExecutivesByGame = vi.fn(async () => executives);
  const getExecutive = vi.fn(async (id: string) => executives.find((e) => e.id === id) ?? null);
  const summary: any = createTestWeekSummary({ week: 5 });
  summary.usedExecutives = new Set<string>();

  const ctx: WeekContext = {
    gameState: { id: 'game-1', currentWeek: 5, reputation: 50, creativeCapital: 10, money: 100000, flags: {} } as any,
    summary,
    gameData: {
      getRoleById: async () => ({ name: opts.roleId.toUpperCase() }),
      getActionById: async () => ({ id: 'meeting_x', target_scope: 'global' }),
      getChoiceById: async () => ({
        id: 'choice_x',
        label: 'Do the thing',
        effects_immediate: opts.effects_immediate,
        effects_delayed: {},
      }),
      getExecMoodModifierConfigSync: () => ({
        disgruntled_below: 30, content_above: 80, inspired_above: 90,
        cost_multiplier_disgruntled: 1.25, cost_multiplier_content: 0.9, effect_multiplier_inspired: 1.2,
      }),
      getBalanceConfigSync: () => ({ reputation_system: { reputation_gain_scaling: 1.0 } }),
    } as any,
    storage: { getExecutive, updateExecutive, getExecutivesByGame },
    financialSystem: {} as any,
    getRandom: () => 0.5,
  };

  const action: any = {
    actionType: 'role_meeting',
    targetId: 'meeting_x',
    metadata: { roleId: opts.roleId, actionId: 'meeting_x', choiceId: 'choice_x', executiveId: opts.executiveId },
  };
  return { ctx, action, summary, updateExecutive, getExecutivesByGame };
}

describe('processRoleMeeting — CEO exec-mood targeting wiring', () => {
  it('a CEO meeting with executive_mood + target_executive routes the delta to the named exec', async () => {
    const { ctx, action, summary, updateExecutive } = makeMeetingCtx({
      roleId: 'ceo',
      effects_immediate: { money: -1000, executive_mood: -5, target_executive: 'cmo' },
    });
    await new ActionProcessor().processRoleMeeting(ctx, action);

    // cmo (mood 97) took the -5 through the shared clamp path.
    expect(updateExecutive).toHaveBeenCalledTimes(1);
    expect(updateExecutive).toHaveBeenCalledWith('exec-cmo', { mood: 92 }, undefined);
    // Money still applied normally alongside.
    expect(ctx.summary.expenseBreakdown?.roleMeetingCosts).toBe(1000);
    // Targeted entry + the meeting entry both present.
    expect(summary.changes.some((c: any) => c.type === 'executive_interaction' && c.roleId === 'cmo')).toBe(true);
    expect(summary.changes.some((c: any) => c.type === 'meeting')).toBe(true);
  });

  it('a CEO meeting with executive_mood but NO directive stays a no-op on executives (pre-slice behavior)', async () => {
    const { ctx, action, updateExecutive } = makeMeetingCtx({
      roleId: 'ceo',
      effects_immediate: { executive_mood: -5 },
    });
    await new ActionProcessor().processRoleMeeting(ctx, action);
    expect(updateExecutive).not.toHaveBeenCalled();
  });

  it('a ROLE meeting ignores a sneaked-in target_executive (its exec is implicit; data-lint forbids it anyway)', async () => {
    const { ctx, action, updateExecutive, getExecutivesByGame } = makeMeetingCtx({
      roleId: 'cmo',
      executiveId: 'exec-cmo',
      effects_immediate: { executive_mood: 8, target_executive: 'head_ar' },
    });
    await new ActionProcessor().processRoleMeeting(ctx, action);

    // The targeted resolver never ran (no by-role fetch)…
    expect(getExecutivesByGame).not.toHaveBeenCalled();
    // …and the ONLY exec update is the meeting's own implicit exec (cmo),
    // via processExecutiveActions (mood 97 + 8 → clamped 100, plus loyalty/lastActionWeek).
    expect(updateExecutive).toHaveBeenCalledTimes(1);
    const [id, updates] = updateExecutive.mock.calls[0];
    expect(id).toBe('exec-cmo');
    expect(updates.mood).toBe(100);
    expect(updates).toHaveProperty('loyalty');
    expect(updates).toHaveProperty('lastActionWeek');
  });
});

// ---------------------------------------------------------------------------
// Side-event wiring (processPendingSideEventResolution) — M13 from events + M14
// ---------------------------------------------------------------------------

function makeArtists() {
  return [
    { id: 'artist-low', gameId: 'game-1', name: 'Low Pop', signed: true, popularity: 20, mood: 50 },
    { id: 'artist-high', gameId: 'game-1', name: 'High Pop', signed: true, popularity: 80, mood: 50 },
  ];
}

function makeEventGameData(events: SideEvent[]): any {
  return {
    getEventConfigSync: () => ({ weekly_chance: 0, cooldown_weeks: 2, max_per_year: 12 }),
    getMandatorySideEventsConfigSync: () => ({ enabled: true }),
    getSideEventsConfigSync: () => ({ event_weights: { artist_personal: 1, business_opportunities: 1 }, event_cooldown: 2 }),
    getAllEvents: async () => events,
    getEventById: async (id: string) => events.find((e) => e.id === id),
    getTourConfigSync: () => ({
      sell_through_base: 0.7, reputation_modifier: 1.0, local_popularity_weight: 1.0,
      ticket_price_base: 20, ticket_price_per_capacity: 0.01, merch_percentage: 0.25,
    }),
    getAccessTiersSync: () => ({
      venue_access: {
        none: { capacity_range: [0, 50] },
        clubs: { capacity_range: [50, 500] },
        theaters: { capacity_range: [500, 2000] },
        medium: { capacity_range: [500, 2000] },
        arenas: { capacity_range: [2000, 20000] },
      },
    }),
  };
}

function makeEventSummary(): WeekSummary {
  return {
    week: 6, changes: [], revenue: 0, expenses: 0, reputationChanges: {}, events: [],
  } as unknown as WeekSummary;
}

async function resolveEvent(event: SideEvent, choiceId: string, opts?: { executives?: any[]; artists?: any[] }) {
  const executives = opts?.executives ?? makeExecutives();
  const artists = opts?.artists ?? makeArtists();
  const updateExecutive = vi.fn(async (_id: string, _updates: Record<string, any>, _tx?: any) => {});
  const storage: any = {
    getArtistsByGame: async () => artists,
    getExecutivesByGame: async () => executives,
    updateExecutive,
  };
  const gs = {
    id: 'game-1', currentWeek: 6, money: 100000, reputation: 0, creativeCapital: 5,
    flags: { pending_side_event: { eventId: event.id, week: 6 } },
  } as unknown as GameState;
  const summary = makeEventSummary();
  const engine = new GameEngine(gs, makeEventGameData([event]), storage, 'fixed-seed');
  await (engine as any).processPendingSideEventResolution(summary, { eventId: event.id, choiceId }, 'tx-evt');
  return { gs, summary, updateExecutive };
}

describe('processPendingSideEventResolution — M13 targeted exec mood from event choices', () => {
  it('an event choice with executive_mood + target_executive applies the delta to the named exec inside the transaction', async () => {
    const event: SideEvent = {
      id: 'escalation_wound',
      role_hint: 'CEO',
      category: 'business_opportunities',
      prompt: 'Your CMO is furious about the botched rollout.',
      choices: [{
        id: 'make_amends',
        label: 'Make amends',
        effects_immediate: { money: -2000, executive_mood: 6, target_executive: 'cmo' } as any,
        effects_delayed: {},
      }],
    };
    const { summary, updateExecutive } = await resolveEvent(event, 'make_amends');

    expect(updateExecutive).toHaveBeenCalledTimes(1);
    // cmo mood 97 + 6 → clamped 100; persisted with the SAME dbTransaction.
    expect(updateExecutive).toHaveBeenCalledWith('exec-cmo', { mood: 100 }, 'tx-evt');
    expect(summary.expenses).toBe(2000); // label-scoped money untouched by targeting
    expect(summary.changes.some((c: any) => c.type === 'executive_interaction' && c.roleId === 'cmo')).toBe(true);
  });

  it('an event choice with executive_mood but NO directive stays dropped (pre-slice behavior, lint-guarded)', async () => {
    const event: SideEvent = {
      id: 'no_directive',
      role_hint: 'CEO',
      category: 'business_opportunities',
      prompt: 'x',
      choices: [{
        id: 'c', label: 'c',
        effects_immediate: { executive_mood: 6 } as any,
        effects_delayed: {},
      }],
    };
    const { updateExecutive } = await resolveEvent(event, 'c');
    expect(updateExecutive).not.toHaveBeenCalled();
  });
});

describe('processPendingSideEventResolution — M14 target_artist directive', () => {
  it("target_artist:'predetermined' on a GLOBAL event routes artist_mood to the highest-popularity signed artist only", async () => {
    const event: SideEvent = {
      id: 'global_event_predetermined_choice',
      role_hint: 'x',
      category: 'business_opportunities',
      // NOTE: no event-level target — legacy global event.
      prompt: 'x',
      choices: [{
        id: 'c', label: 'c',
        effects_immediate: { artist_mood: 3, target_artist: 'predetermined' } as any,
        effects_delayed: {},
      }],
    };
    const { summary } = await resolveEvent(event, 'c');
    expect(Object.keys(summary.artistChanges!)).toEqual(['artist-high']);
    expect(summary.artistChanges!['artist-high'].mood).toBe(3);
  });

  it("target_artist:'global' OVERRIDES an event-level predetermined target back to all signed artists", async () => {
    const event: SideEvent = {
      id: 'predetermined_event_global_choice',
      role_hint: 'x',
      category: 'artist_personal',
      target: 'predetermined',
      prompt: 'x',
      choices: [{
        id: 'c', label: 'c',
        effects_immediate: { artist_mood: 2, target_artist: 'global' } as any,
        effects_delayed: {},
      }],
    };
    const { summary } = await resolveEvent(event, 'c');
    expect(Object.keys(summary.artistChanges!).sort()).toEqual(['artist-high', 'artist-low']);
  });

  it('no directive → event-level behavior unchanged (predetermined event hits one artist — the pre-M14 contract)', async () => {
    const event: SideEvent = {
      id: 'legacy_predetermined',
      role_hint: 'x',
      category: 'artist_personal',
      target: 'predetermined',
      prompt: 'x',
      choices: [{
        id: 'c', label: 'c',
        effects_immediate: { artist_mood: 3 } as any,
        effects_delayed: {},
      }],
    };
    const { summary } = await resolveEvent(event, 'c');
    expect(Object.keys(summary.artistChanges!)).toEqual(['artist-high']);
  });

  it("a DELAYED block with target_artist:'predetermined' banks the resolved artistId on the delayed flag (directive itself not stored)", async () => {
    const event: SideEvent = {
      id: 'delayed_predetermined',
      role_hint: 'x',
      category: 'business_opportunities',
      prompt: 'x',
      choices: [{
        id: 'c', label: 'c',
        effects_immediate: {},
        effects_delayed: { artist_mood: -2, target_artist: 'predetermined' } as any,
      }],
    };
    const { gs } = await resolveEvent(event, 'c');
    const flag = (gs.flags as any)['side-event-delayed_predetermined-c-week6'];
    expect(flag).toBeDefined();
    expect(flag.triggerWeek).toBe(7);
    expect(flag.artistId).toBe('artist-high');
    expect(flag.targetScope).toBe('predetermined');
    // Stored effects are numeric-only — the string directive is consumed at bank time.
    expect(flag.effects).toEqual({ artist_mood: -2 });
  });

  it('a legacy delayed block (no directive, global event) keeps the pre-M14 flag shape (no artistId/targetScope keys)', async () => {
    const event: SideEvent = {
      id: 'legacy_delayed',
      role_hint: 'x',
      category: 'business_opportunities',
      prompt: 'x',
      choices: [{
        id: 'c', label: 'c',
        effects_immediate: {},
        effects_delayed: { money: 500 },
      }],
    };
    const { gs } = await resolveEvent(event, 'c');
    const flag = (gs.flags as any)['side-event-legacy_delayed-c-week6'];
    expect(flag).toBeDefined();
    expect('artistId' in flag).toBe(false);
    expect('targetScope' in flag).toBe(false);
  });
});
