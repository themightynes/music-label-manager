import { describe, it, expect } from 'vitest';
import { GameEngine } from '@shared/engine/game-engine';
import type { GameState, WeekSummary, SideEvent } from '@shared/types/gameTypes';

/**
 * Tier 2 (PR-3) — engine-level checkForEvents behavior.
 *
 * Exercises the PRIVATE checkForEvents through a cast: the lapse rule, the
 * flags written on a hit (pending_side_event + side_event_history), and the
 * full-payload push into summary.events. The WEEKLY ROLL is forced by the
 * gameData mock's weekly_chance (1 = always hit, 0 = never) so these tests are
 * deterministic without depending on the RNG seed's actual draw.
 *
 * checkForEvents touches neither storage nor the DB — it only reads gameData
 * config + events and mutates gameState.flags + summary — so a duck-typed
 * gameData and no storage suffice.
 */

function makeEvents(): SideEvent[] {
  return [
    {
      id: 'sync_offer',
      role_hint: 'x',
      category: 'sync_licensing',
      prompt: 'A blockbuster film wants your single.',
      choices: [{ id: 'take', label: 'Take', effects_immediate: { money: 1 }, effects_delayed: {} }],
    },
  ];
}

function makeGameData(weeklyChance: number, events: SideEvent[]): any {
  return {
    getEventConfigSync: () => ({ weekly_chance: weeklyChance, cooldown_weeks: 2, max_per_year: 12 }),
    getSideEventsConfigSync: () => ({
      event_weights: { sync_licensing: 1 },
      event_cooldown: 2,
    }),
    getAllEvents: async () => events,
    // FinancialSystem's constructor runs validateConfiguration(), which reads
    // tour + venue config. Minimal valid stubs so construction succeeds; these
    // are never exercised by checkForEvents.
    getTourConfigSync: () => ({
      sell_through_base: 0.7,
      reputation_modifier: 1.0,
      local_popularity_weight: 1.0,
      ticket_price_base: 20,
      ticket_price_per_capacity: 0.01,
      merch_percentage: 0.25,
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

function makeGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    currentWeek: 5,
    money: 100000,
    reputation: 0,
    creativeCapital: 5,
    flags: {},
    ...overrides,
  } as GameState;
}

function makeSummary(): WeekSummary {
  return {
    week: 5,
    changes: [],
    revenue: 0,
    expenses: 0,
    reputationChanges: {},
    events: [],
  };
}

/** Invoke the private checkForEvents on a constructed engine. */
async function runCheck(gameState: GameState, gameData: any, summary: WeekSummary) {
  const engine = new GameEngine(gameState, gameData, undefined, 'fixed-seed');
  await (engine as any).checkForEvents(summary);
}

describe('checkForEvents — hit writes pending + history flags', () => {
  it('on a hit, sets pending_side_event and stamps side_event_history at the arrival week', async () => {
    const gs = makeGameState({ currentWeek: 5, flags: {} });
    const summary = makeSummary();
    await runCheck(gs, makeGameData(1, makeEvents()), summary);

    const flags = gs.flags as any;
    expect(flags.pending_side_event).toEqual({ eventId: 'sync_offer', week: 5 });
    expect(flags.side_event_history.sync_offer).toBe(5);
  });

  it('on a hit, pushes the FULL event payload into summary.events', async () => {
    const gs = makeGameState({ currentWeek: 5, flags: {} });
    const summary = makeSummary();
    await runCheck(gs, makeGameData(1, makeEvents()), summary);

    expect(summary.events).toHaveLength(1);
    const occ = summary.events[0];
    expect(occ.id).toBe('sync_offer');
    expect(occ.occurred).toBe(true);
    expect(occ.category).toBe('sync_licensing');
    expect(occ.prompt).toBe('A blockbuster film wants your single.');
    expect(occ.choices).toHaveLength(1);
  });

  it('on a miss (weekly_chance 0), no pending event and no summary push', async () => {
    const gs = makeGameState({ currentWeek: 5, flags: {} });
    const summary = makeSummary();
    await runCheck(gs, makeGameData(0, makeEvents()), summary);

    expect((gs.flags as any).pending_side_event).toBeUndefined();
    expect(summary.events).toHaveLength(0);
  });

  it('respects cooldown: an on-cooldown sole event does not fire even on a roll hit', async () => {
    // sync_offer fired at week 4; cooldown 2 → ineligible at week 5.
    const gs = makeGameState({ currentWeek: 5, flags: { side_event_history: { sync_offer: 4 } } });
    const summary = makeSummary();
    await runCheck(gs, makeGameData(1, makeEvents()), summary);

    expect((gs.flags as any).pending_side_event).toBeUndefined();
    expect(summary.events).toHaveLength(0);
    // History untouched (no new fire).
    expect((gs.flags as any).side_event_history.sync_offer).toBe(4);
  });
});

describe('checkForEvents — lapse rule', () => {
  it('clears a stale pending event from a PRIOR week with no effects', async () => {
    const gs = makeGameState({
      currentWeek: 6,
      // pending left from week 5; money must not change from lapsing.
      flags: { pending_side_event: { eventId: 'sync_offer', week: 5 } },
      money: 100000,
    });
    const summary = makeSummary();
    // weekly_chance 0 so the roll does not also fire a new event this week.
    await runCheck(gs, makeGameData(0, makeEvents()), summary);

    expect((gs.flags as any).pending_side_event).toBeUndefined();
    expect(gs.money).toBe(100000); // no effects applied on lapse
    expect(summary.events).toHaveLength(0);
  });

  it('does NOT lapse a pending event from the CURRENT week (still resolvable)', async () => {
    const gs = makeGameState({
      currentWeek: 5,
      flags: { pending_side_event: { eventId: 'sync_offer', week: 5 } },
    });
    const summary = makeSummary();
    await runCheck(gs, makeGameData(0, makeEvents()), summary);

    // Same-week pending survives (the beat is consumed this week).
    expect((gs.flags as any).pending_side_event).toEqual({ eventId: 'sync_offer', week: 5 });
  });

  it('lapse does not consume the new week roll: a prior pending clears AND a new event still fires', async () => {
    const gs = makeGameState({
      currentWeek: 6,
      flags: { pending_side_event: { eventId: 'sync_offer', week: 5 } },
    });
    const summary = makeSummary();
    // weekly_chance 1 → the roll hits after the lapse; a fresh event is selected.
    await runCheck(gs, makeGameData(1, makeEvents()), summary);

    const flags = gs.flags as any;
    // The stale one lapsed and was replaced by this week's fresh pending.
    expect(flags.pending_side_event).toEqual({ eventId: 'sync_offer', week: 6 });
    expect(summary.events).toHaveLength(1);
  });
});
