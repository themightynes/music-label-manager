/**
 * Engine-verbs Slice 1 (M4 — chained/scheduled events) + Slice 14 (M12b —
 * escalation last-seen stamp) + Slice 11 READ half (exec absence filter).
 *
 * DB-free unit suite driving the REAL private engine methods via runtime
 * access (the established pattern — see creative-capital-milestones.test.ts)
 * plus ActionProcessor.applyEffects directly.
 *
 * Pins the queue rules AS IMPLEMENTED:
 *  - schedule_event banks {eventId, landsOnWeek: currentWeek + defer_weeks,
 *    source, artistId?} into flags.scheduled_events (additive key).
 *  - promoteScheduledEvents: at most ONE promotion per advance; earliest DUE
 *    entry wins (lowest landsOnWeek, FIFO tie-break); an occupied
 *    pending_side_event slot (escalation / unresolved crisis) makes EVERYTHING
 *    wait (starvation by design — entries are never dropped); legacy
 *    (non-mandatory) mode never promotes; unknown event ids are dropped and
 *    the next due entry is considered in the same advance.
 *  - applyEscalation stamps flags.escalationHistory[roleId] (saturation reset).
 *  - resolveAutonomousExecMeetings skips execs with
 *    flags.execAbsence[roleId] > planning week.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameEngine } from '@shared/engine/game-engine';
import { ActionProcessor } from '@shared/engine/processors/ActionProcessor';
import type { WeekContext } from '@shared/engine/processors/types';
import type { ScheduledEventEntry } from '@shared/types/gameTypes';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const VERDICT_EVENT = {
  id: 'scheduled_verdict_test',
  role_hint: 'Legal',
  category: 'reputation',
  scheduled_only: true,
  prompt: 'The verdict on the botched signing lands on your desk.',
  choices: [
    { id: 'settle', label: 'Settle quietly', effects_immediate: { money: -5000 }, effects_delayed: {} },
  ],
};

/** Minimal gameData satisfying the FinancialSystem constructor + this suite. */
function buildGameData(overrides: Record<string, any> = {}) {
  return {
    getBalanceConfigSync: () => ({
      reputation_system: { reputation_gain_scaling: 1.0 },
    }),
    getAccessTiersSync: () => ({
      venue_access: {
        none: { threshold: 0, capacity_range: [0, 50], guarantee_multiplier: 0.3 },
        clubs: { threshold: 5, capacity_range: [50, 500], guarantee_multiplier: 0.7 },
        theaters: { threshold: 20, capacity_range: [500, 2000], guarantee_multiplier: 1.0 },
        arenas: { threshold: 45, capacity_range: [2000, 20000], guarantee_multiplier: 1.5 },
      },
    }),
    getTourConfigSync: () => ({
      sell_through_base: 0.15,
      reputation_modifier: 0.05,
      local_popularity_weight: 0.6,
      merch_percentage: 0.15,
      ticket_price_base: 25,
      ticket_price_per_capacity: 0.03,
    }),
    getMandatorySideEventsConfigSync: () => ({ enabled: true }),
    getEventById: async (id: string) => (id === VERDICT_EVENT.id ? VERDICT_EVENT : undefined),
    ...overrides,
  } as any;
}

function buildEngine(opts: { currentWeek?: number; flags?: Record<string, any>; gameData?: Record<string, any>; storage?: any } = {}) {
  const gameState: any = {
    id: 'scheduled-events-game',
    currentWeek: opts.currentWeek ?? 10,
    reputation: 50,
    creativeCapital: 5,
    flags: opts.flags ?? {},
  };
  const engine = new GameEngine(gameState, buildGameData(opts.gameData ?? {}), opts.storage, 'scheduled-events-seed');
  return { engine, gameState };
}

function makeSummary(): any {
  return { week: 10, changes: [], events: [], revenue: 0, expenses: 0, streams: 0 };
}

function buildCtx(gameState: any): WeekContext {
  return {
    gameState,
    summary: makeSummary(),
    gameData: {} as any,
    storage: {} as any,
    financialSystem: {} as any,
    getRandom: () => 0.5,
  } as WeekContext;
}

function entry(partial: Partial<ScheduledEventEntry> = {}): ScheduledEventEntry {
  return { eventId: VERDICT_EVENT.id, landsOnWeek: 10, source: 'test_meeting', ...partial };
}

// ---------------------------------------------------------------------------
// ActionProcessor.applyEffects — the schedule_event writer
// ---------------------------------------------------------------------------

describe('applyEffects schedule_event — queue writer', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('banks an entry with landsOnWeek = currentWeek + defer_weeks and the source meeting', async () => {
    const gameState: any = { id: 'g', currentWeek: 7, flags: {} };
    const ctx = buildCtx(gameState);
    await new ActionProcessor().applyEffects(
      ctx,
      { schedule_event: { event_id: 'scheduled_verdict_test', defer_weeks: 3 } },
      undefined,
      'global',
      'ar_risky_signing',
      'gamble'
    );
    expect(gameState.flags.scheduled_events).toEqual([
      { eventId: 'scheduled_verdict_test', landsOnWeek: 10, source: 'ar_risky_signing' },
    ]);
    // Qualitative foreshadow entry, no numbers/event identity in the prose.
    const change = ctx.summary.changes.find((c: any) => c.type === 'meeting');
    expect(change).toBeTruthy();
    expect(change!.description).not.toMatch(/\d/);
    expect(change!.description).not.toContain('scheduled_verdict_test');
  });

  it('threads the resolved artistId through the queue entry (conditional spread — absent otherwise)', async () => {
    const gameState: any = { id: 'g', currentWeek: 5, flags: {} };
    const ctx = buildCtx(gameState);
    const processor = new ActionProcessor();
    await processor.applyEffects(ctx, { schedule_event: { event_id: 'e1', defer_weeks: 1 } }, 'artist-42', 'predetermined', 'm1', 'c1');
    await processor.applyEffects(ctx, { schedule_event: { event_id: 'e2', defer_weeks: 1 } }, undefined, 'global', 'm2', 'c2');
    const queue = gameState.flags.scheduled_events;
    expect(queue[0]).toEqual({ eventId: 'e1', landsOnWeek: 6, source: 'm1', artistId: 'artist-42' });
    expect(queue[1]).toEqual({ eventId: 'e2', landsOnWeek: 6, source: 'm2' });
    expect('artistId' in queue[1]).toBe(false);
  });

  it('appends to an existing queue (never clobbers earlier entries)', async () => {
    const existing = entry({ eventId: 'earlier', landsOnWeek: 8 });
    const gameState: any = { id: 'g', currentWeek: 5, flags: { scheduled_events: [existing] } };
    const ctx = buildCtx(gameState);
    await new ActionProcessor().applyEffects(ctx, { schedule_event: { event_id: 'later', defer_weeks: 2 } }, undefined, 'global', 'm', 'c');
    expect(gameState.flags.scheduled_events.map((e: any) => e.eventId)).toEqual(['earlier', 'later']);
  });

  it('drops an invalid payload with a warn and touches no state (numbers, missing fields, negative/fractional defer)', async () => {
    const gameState: any = { id: 'g', currentWeek: 5, flags: {} };
    const ctx = buildCtx(gameState);
    const processor = new ActionProcessor();
    for (const bad of [5, { event_id: 'x' }, { defer_weeks: 2 }, { event_id: '', defer_weeks: 2 }, { event_id: 'x', defer_weeks: -1 }, { event_id: 'x', defer_weeks: 1.5 }, null]) {
      await processor.applyEffects(ctx, { schedule_event: bad as any }, undefined, 'global', 'm', 'c');
    }
    expect(gameState.flags.scheduled_events).toBeUndefined();
    expect(ctx.summary.changes).toEqual([]);
    expect(
      (console.warn as any).mock.calls.some((call: any[]) =>
        call.some((a: any) => typeof a === 'string' && a.includes('schedule_event with invalid payload'))
      )
    ).toBe(true);
  });

  it('applies alongside numeric keys in the same effects block without disturbing them', async () => {
    const gameState: any = { id: 'g', currentWeek: 5, creativeCapital: 4, flags: {} };
    const ctx = buildCtx(gameState);
    await new ActionProcessor().applyEffects(
      ctx,
      { creative_capital: 2, schedule_event: { event_id: 'e', defer_weeks: 0 } },
      undefined,
      'global',
      'm',
      'c'
    );
    expect(gameState.creativeCapital).toBe(6);
    expect(gameState.flags.scheduled_events).toHaveLength(1);
    expect(gameState.flags.scheduled_events[0].landsOnWeek).toBe(5); // defer 0 = due immediately
  });
});

// ---------------------------------------------------------------------------
// GameEngine.promoteScheduledEvents — the queue drainer
// ---------------------------------------------------------------------------

describe('promoteScheduledEvents — promotion / priority / starvation rules', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('promotes a due entry into the mandatory pending_side_event slot (rich payload) and removes it from the queue', async () => {
    const { engine, gameState } = buildEngine({ currentWeek: 10, flags: { scheduled_events: [entry({ landsOnWeek: 9 })] } });
    const summary = makeSummary();
    await (engine as any).promoteScheduledEvents(summary);

    expect(gameState.flags.pending_side_event).toEqual({
      eventId: VERDICT_EVENT.id,
      week: 10,
      prompt: VERDICT_EVENT.prompt,
      category: VERDICT_EVENT.category,
      choices: VERDICT_EVENT.choices,
    });
    // Fully drained → the queue key is deleted (old-save flag shape preserved).
    expect('scheduled_events' in gameState.flags).toBe(false);
    // Crisis-card convention: arrival beat WITHOUT choices.
    expect(summary.events).toHaveLength(1);
    expect(summary.events[0].id).toBe(VERDICT_EVENT.id);
    expect(summary.events[0].choices).toBeUndefined();
  });

  it('carries the pinned artistId onto the pending payload (conditional spread)', async () => {
    const { engine, gameState } = buildEngine({ currentWeek: 10, flags: { scheduled_events: [entry({ landsOnWeek: 10, artistId: 'artist-7' })] } });
    await (engine as any).promoteScheduledEvents(makeSummary());
    expect(gameState.flags.pending_side_event.artistId).toBe('artist-7');
  });

  it('a not-yet-due entry waits (landsOnWeek > currentWeek)', async () => {
    const { engine, gameState } = buildEngine({ currentWeek: 10, flags: { scheduled_events: [entry({ landsOnWeek: 11 })] } });
    const summary = makeSummary();
    await (engine as any).promoteScheduledEvents(summary);
    expect(gameState.flags.pending_side_event).toBeUndefined();
    expect(gameState.flags.scheduled_events).toHaveLength(1);
    expect(summary.events).toEqual([]);
  });

  it('ESCALATION PRIORITY / STARVATION: an occupied slot makes every due entry wait — nothing is dropped', async () => {
    const occupied = { eventId: 'escalation_ar_botched_signing', week: 10 };
    const { engine, gameState } = buildEngine({
      currentWeek: 10,
      flags: { pending_side_event: occupied, scheduled_events: [entry({ landsOnWeek: 8 }), entry({ landsOnWeek: 9 })] },
    });
    const summary = makeSummary();
    await (engine as any).promoteScheduledEvents(summary);
    expect(gameState.flags.pending_side_event).toBe(occupied); // untouched
    expect(gameState.flags.scheduled_events).toHaveLength(2); // both still queued
    expect(summary.events).toEqual([]);
  });

  it('AT MOST ONE per advance: earliest landsOnWeek wins, the rest of the backlog waits', async () => {
    const gd = {
      getEventById: async (id: string) => ({ ...VERDICT_EVENT, id }),
    };
    const { engine, gameState } = buildEngine({
      currentWeek: 10,
      gameData: gd,
      flags: { scheduled_events: [entry({ eventId: 'late', landsOnWeek: 9 }), entry({ eventId: 'early', landsOnWeek: 7 })] },
    });
    await (engine as any).promoteScheduledEvents(makeSummary());
    expect(gameState.flags.pending_side_event.eventId).toBe('early');
    expect(gameState.flags.scheduled_events.map((e: any) => e.eventId)).toEqual(['late']);
  });

  it('FIFO tie-break: equal landsOnWeek promotes the first-inserted entry', async () => {
    const gd = { getEventById: async (id: string) => ({ ...VERDICT_EVENT, id }) };
    const { engine, gameState } = buildEngine({
      currentWeek: 10,
      gameData: gd,
      flags: { scheduled_events: [entry({ eventId: 'first', landsOnWeek: 9 }), entry({ eventId: 'second', landsOnWeek: 9 })] },
    });
    await (engine as any).promoteScheduledEvents(makeSummary());
    expect(gameState.flags.pending_side_event.eventId).toBe('first');
    expect(gameState.flags.scheduled_events.map((e: any) => e.eventId)).toEqual(['second']);
  });

  it('unknown event id is dropped (warn) and the NEXT due entry promotes in the same advance', async () => {
    const { engine, gameState } = buildEngine({
      currentWeek: 10,
      flags: { scheduled_events: [entry({ eventId: 'deleted_content', landsOnWeek: 8 }), entry({ landsOnWeek: 9 })] },
    });
    await (engine as any).promoteScheduledEvents(makeSummary());
    expect(gameState.flags.pending_side_event.eventId).toBe(VERDICT_EVENT.id);
    expect('scheduled_events' in gameState.flags).toBe(false); // bad entry dropped, good one promoted
  });

  it('legacy (non-mandatory) mode: nothing promotes, the queue waits', async () => {
    const { engine, gameState } = buildEngine({
      currentWeek: 10,
      gameData: { getMandatorySideEventsConfigSync: () => ({ enabled: false }) },
      flags: { scheduled_events: [entry({ landsOnWeek: 8 })] },
    });
    await (engine as any).promoteScheduledEvents(makeSummary());
    expect(gameState.flags.pending_side_event).toBeUndefined();
    expect(gameState.flags.scheduled_events).toHaveLength(1);
  });

  it('no queue key → pure no-op (pre-slice saves are byte-identical)', async () => {
    const { engine, gameState } = buildEngine({ currentWeek: 10, flags: {} });
    const summary = makeSummary();
    await (engine as any).promoteScheduledEvents(summary);
    expect(gameState.flags).toEqual({});
    expect(summary.events).toEqual([]);
    expect(summary.changes).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// applyEscalation — Slice 14 escalation last-seen stamping
// ---------------------------------------------------------------------------

describe('applyEscalation — escalationHistory stamp (Slice 14)', () => {
  const ESC_EVENT = {
    id: 'escalation_ar_botched_signing',
    role_hint: 'A&R',
    category: 'reputation',
    escalation_only: true,
    prompt: 'The botched signing blows up in public.',
    choices: [],
  };

  function escalationEngine(flags: Record<string, any>) {
    return buildEngine({
      currentWeek: 12,
      flags,
      gameData: { getEventById: async (id: string) => (id === ESC_EVENT.id ? ESC_EVENT : undefined) },
    });
  }

  it('stamps flags.escalationHistory[roleId] when the escalation lands (singleton pool → saturation reset keeps just the landed id)', async () => {
    const { engine, gameState } = escalationEngine({});
    const summary = makeSummary();
    (summary as any)._pendingEscalation = { roleId: 'head_ar', eventId: ESC_EVENT.id };
    await (engine as any).applyEscalation(summary);
    expect(gameState.flags.pending_side_event.eventId).toBe(ESC_EVENT.id);
    expect(gameState.flags.escalationHistory).toEqual({ head_ar: [ESC_EVENT.id] });
  });

  it('preserves other roles\' history entries when stamping', async () => {
    const { engine, gameState } = escalationEngine({ escalationHistory: { cmo: ['escalation_cmo_narrative_lost'] } });
    const summary = makeSummary();
    (summary as any)._pendingEscalation = { roleId: 'head_ar', eventId: ESC_EVENT.id };
    await (engine as any).applyEscalation(summary);
    expect(gameState.flags.escalationHistory).toEqual({
      cmo: ['escalation_cmo_narrative_lost'],
      head_ar: [ESC_EVENT.id],
    });
  });

  it('does NOT stamp when the slot is already occupied (escalation discarded, one crisis at a time)', async () => {
    const occupied = { eventId: 'other_crisis', week: 11 };
    const { engine, gameState } = escalationEngine({ pending_side_event: occupied });
    const summary = makeSummary();
    (summary as any)._pendingEscalation = { roleId: 'head_ar', eventId: ESC_EVENT.id };
    await (engine as any).applyEscalation(summary);
    expect(gameState.flags.pending_side_event).toBe(occupied);
    expect(gameState.flags.escalationHistory).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// resolveAutonomousExecMeetings — Slice 11 READ half (exec absence filter)
// ---------------------------------------------------------------------------

describe('resolveAutonomousExecMeetings — execAbsence filter (Slice 11 READ half)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  function absenceEngine(execAbsence: Record<string, number>, currentWeek: number) {
    const getWeeklyActionsWithCategories = vi.fn(async () => ({ actions: [] }));
    const storage = {
      getExecutivesByGame: async () => [{ id: 'exec-1', role: 'head_ar', loyalty: 50, mood: 50 }],
    };
    const { engine, gameState } = buildEngine({
      currentWeek,
      flags: { execAbsence },
      gameData: { getWeeklyActionsWithCategories },
      storage,
    });
    return { engine, gameState, getWeeklyActionsWithCategories };
  }

  it('skips an absent exec entirely (absence untilWeek > planning week → no candidates, pool never loaded)', async () => {
    // currentWeek 5 → planning week 4; absent until week 10 (> 4) → skip.
    const { engine, getWeeklyActionsWithCategories } = absenceEngine({ head_ar: 10 }, 5);
    const summary = makeSummary();
    (summary as any).usedExecutives = new Set();
    await (engine as any).resolveAutonomousExecMeetings(summary);
    expect(getWeeklyActionsWithCategories).not.toHaveBeenCalled();
  });

  it('an expired absence (untilWeek <= planning week) does NOT skip the exec', async () => {
    // currentWeek 5 → planning week 4; absent until week 4 (not > 4) → candidate.
    const { engine, getWeeklyActionsWithCategories } = absenceEngine({ head_ar: 4 }, 5);
    const summary = makeSummary();
    (summary as any).usedExecutives = new Set();
    await (engine as any).resolveAutonomousExecMeetings(summary);
    // Proceeded past the candidate filter into pool loading (empty pool → no-op after).
    expect(getWeeklyActionsWithCategories).toHaveBeenCalled();
  });
});
