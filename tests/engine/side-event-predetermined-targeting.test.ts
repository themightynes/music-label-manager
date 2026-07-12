import { describe, it, expect } from 'vitest';
import { GameEngine } from '@shared/engine/game-engine';
import type { GameState, WeekSummary, SideEvent } from '@shared/types/gameTypes';

/**
 * Executive Delegation arc (Tier 1, §8 / fork f) — predetermined-target support
 * in the side-event resolver.
 *
 * `event.target === 'predetermined'` resolves the event's artist-scoped effects
 * (artist_mood, etc.) against the highest-popularity SIGNED artist, reusing the
 * same `ArtistStateProcessor.selectHighestPopularityArtist` resolver role-meeting
 * predetermined targeting already uses (ActionProcessor.ts:296). Absent `target`
 * -> existing global-application behavior, byte-identical for all 12 pre-arc
 * events (proven below by the legacy-event case).
 *
 * Exercises the PRIVATE processPendingSideEventResolution through a cast — same
 * pattern as side-event-check-for-events.test.ts. Money/reputation (label-scoped)
 * effects are untouched by targeting; artist_mood (artist-scoped) is the
 * observable proof point.
 */

function makeArtists() {
  return [
    { id: 'artist-low', gameId: 'game-1', name: 'Low Pop', signed: true, popularity: 20, mood: 50 },
    { id: 'artist-high', gameId: 'game-1', name: 'High Pop', signed: true, popularity: 80, mood: 50 },
    { id: 'artist-unsigned', gameId: 'game-1', name: 'Unsigned', signed: false, popularity: 99, mood: 50 },
  ];
}

function makeStorage(artists: any[]): any {
  return {
    getArtistsByGame: async (_gameId: string, _tx?: any) => artists,
  };
}

function makePredeterminedEvent(): SideEvent {
  return {
    id: 'crisis_fired_dancers',
    role_hint: 'CEO',
    category: 'artist_personal',
    target: 'predetermined',
    prompt: 'Your biggest artist just fired their last three backup dancers.',
    choices: [
      {
        id: 'emergency_auditions',
        label: 'Emergency auditions',
        effects_immediate: { money: -8000, reputation: 1, artist_mood: 3 },
        effects_delayed: {},
      },
    ],
  };
}

function makeLegacyEvent(): SideEvent {
  return {
    id: 'sync_offer',
    role_hint: 'x',
    category: 'sync_licensing',
    prompt: 'A blockbuster film wants your single.',
    choices: [
      {
        id: 'take',
        label: 'Take',
        effects_immediate: { money: 1, artist_mood: 2 },
        effects_delayed: {},
      },
    ],
  };
}

function makeGameData(events: SideEvent[]): any {
  return {
    getEventConfigSync: () => ({ weekly_chance: 0, cooldown_weeks: 2, max_per_year: 12 }),
    getMandatorySideEventsConfigSync: () => ({ enabled: true }),
    getSideEventsConfigSync: () => ({ event_weights: { artist_personal: 1, sync_licensing: 1 }, event_cooldown: 2 }),
    getAllEvents: async () => events,
    getEventById: async (id: string) => events.find((e) => e.id === id),
    // FinancialSystem's constructor runs validateConfiguration(), which reads
    // tour + venue config. Minimal valid stubs so construction succeeds; these
    // are never exercised by processPendingSideEventResolution.
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
    id: 'game-1',
    currentWeek: 6,
    money: 100000,
    reputation: 0,
    creativeCapital: 5,
    flags: {},
    ...overrides,
  } as GameState;
}

function makeSummary(): WeekSummary {
  return {
    week: 6,
    changes: [],
    revenue: 0,
    expenses: 0,
    reputationChanges: {},
    events: [],
  } as unknown as WeekSummary;
}

async function runResolution(
  gameState: GameState,
  gameData: any,
  storage: any,
  summary: WeekSummary,
  sideEventChoice: { eventId: string; choiceId: string },
) {
  const engine = new GameEngine(gameState, gameData, storage, 'fixed-seed');
  await (engine as any).processPendingSideEventResolution(summary, sideEventChoice, undefined);
}

describe('processPendingSideEventResolution — predetermined-target support (fork f)', () => {
  it('a target:"predetermined" event applies artist_mood to exactly the highest-popularity SIGNED artist', async () => {
    const artists = makeArtists();
    const event = makePredeterminedEvent();
    const gs = makeGameState({
      flags: { pending_side_event: { eventId: event.id, week: 6 } },
    });
    const summary = makeSummary();

    await runResolution(
      gs,
      makeGameData([event]),
      makeStorage(artists),
      summary,
      { eventId: event.id, choiceId: 'emergency_auditions' },
    );

    // Label-scoped effects apply regardless of targeting.
    expect(summary.expenses).toBe(8000);
    expect(gs.reputation).toBeGreaterThan(0);

    // Artist-scoped effect hits EXACTLY the highest-popularity signed artist
    // (artist-high, popularity 80) — not the unsigned artist (popularity 99,
    // ineligible) and not artist-low.
    expect(summary.artistChanges).toBeDefined();
    expect(Object.keys(summary.artistChanges!)).toEqual(['artist-high']);
    expect(summary.artistChanges!['artist-high'].mood).toBe(3);

    // Pending flag cleared; resolved beat emitted.
    expect((gs.flags as any).pending_side_event).toBeUndefined();
    expect(summary.events).toHaveLength(1);
    expect(summary.events[0].resolved).toBe(true);
  });

  it('a legacy event (no target field) still applies artist_mood GLOBALLY to every signed artist', async () => {
    const artists = makeArtists();
    const event = makeLegacyEvent();
    const gs = makeGameState({
      flags: { pending_side_event: { eventId: event.id, week: 6 } },
    });
    const summary = makeSummary();

    await runResolution(
      gs,
      makeGameData([event]),
      makeStorage(artists),
      summary,
      { eventId: event.id, choiceId: 'take' },
    );

    // Global targeting: BOTH signed artists get the mood effect; the unsigned
    // artist does not.
    expect(summary.artistChanges).toBeDefined();
    const targeted = Object.keys(summary.artistChanges!).sort();
    expect(targeted).toEqual(['artist-high', 'artist-low']);
    expect(summary.artistChanges!['artist-high'].mood).toBe(2);
    expect(summary.artistChanges!['artist-low'].mood).toBe(2);
  });

  it('predetermined targeting with NO signed artists degrades to a no-op for artist-scoped effects (label-scoped effects still apply)', async () => {
    const event = makePredeterminedEvent();
    const gs = makeGameState({
      flags: { pending_side_event: { eventId: event.id, week: 6 } },
    });
    const summary = makeSummary();

    await runResolution(
      gs,
      makeGameData([event]),
      makeStorage([]), // no signed artists at all
      summary,
      { eventId: event.id, choiceId: 'emergency_auditions' },
    );

    expect(summary.expenses).toBe(8000); // money still applies
    // artistChanges is initialized to {} by the artist_mood branch but nothing
    // is targeted (no signed artists to apply the effect to).
    expect(summary.artistChanges ?? {}).toEqual({});
  });
});
