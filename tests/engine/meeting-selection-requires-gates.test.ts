/**
 * Engine-verbs M16 (requires-gates) — unit tests for the extended `requires`
 * grammar. Sibling of meeting-selection.test.ts (pure, no DB).
 *
 * Grammar under test (canonical doc: RequiresEntry in shared/types/gameTypes.ts):
 *  - plain RelevanceTag strings (unchanged Tier 0 behavior + the 3 new
 *    per-artist-state tags);
 *  - `{stat: 'week'|'cash'|'reputation', gte?, lte?}` inclusive thresholds,
 *    failing CLOSED when the stat value is unknown;
 *  - `{flag: 'story_key', is?}` story-flag gates on flags.story (absent = false).
 *
 * Plus the Zod surface (shared/api/contracts.ts RequiresEntrySchema — reused
 * verbatim by shared/utils/dataLoader.ts, so one round of schema tests covers
 * both validation surfaces).
 */
import { describe, it, expect } from 'vitest';
import {
  deriveRelevanceState,
  isRequirementSatisfied,
  filterEligible,
  buildRelevanceInput,
  DEFAULT_ARTIST_STATE_THRESHOLDS,
} from '@shared/engine/meetingSelection';
import type { MeetingRelevanceState } from '@shared/engine/meetingSelection';
import { RequiresEntrySchema, WeeklyActionSchema } from '@shared/api/contracts';
import type { RequiresEntry } from '@shared/types/gameTypes';

/** Baseline state helper: derive from minimal inputs, then override. */
function makeState(overrides: Partial<MeetingRelevanceState> = {}): MeetingRelevanceState {
  const base = deriveRelevanceState({
    artists: [{ id: 'a1' }],
    projects: [],
    releases: [],
    songs: [],
    currentWeek: 10,
  });
  return { ...base, ...overrides };
}

describe('M16 requires grammar — stat thresholds', () => {
  it('week gte/lte are inclusive bounds on currentWeek', () => {
    const state = makeState(); // currentWeek 10
    expect(isRequirementSatisfied({ stat: 'week', gte: 10 }, state)).toBe(true);
    expect(isRequirementSatisfied({ stat: 'week', gte: 11 }, state)).toBe(false);
    expect(isRequirementSatisfied({ stat: 'week', lte: 10 }, state)).toBe(true);
    expect(isRequirementSatisfied({ stat: 'week', lte: 9 }, state)).toBe(false);
    expect(isRequirementSatisfied({ stat: 'week', gte: 5, lte: 15 }, state)).toBe(true);
    expect(isRequirementSatisfied({ stat: 'week', gte: 11, lte: 15 }, state)).toBe(false);
  });

  it('cash thresholds read state.cash (gameState.money)', () => {
    const rich = makeState({ cash: 50_000 });
    expect(isRequirementSatisfied({ stat: 'cash', gte: 50_000 }, rich)).toBe(true);
    expect(isRequirementSatisfied({ stat: 'cash', gte: 50_001 }, rich)).toBe(false);
    expect(isRequirementSatisfied({ stat: 'cash', lte: 50_000 }, rich)).toBe(true);
    const broke = makeState({ cash: -2_000 });
    expect(isRequirementSatisfied({ stat: 'cash', lte: 0 }, broke)).toBe(true);
    expect(isRequirementSatisfied({ stat: 'cash', gte: 0 }, broke)).toBe(false);
  });

  it('reputation thresholds read state.reputation', () => {
    const state = makeState({ reputation: 42 });
    expect(isRequirementSatisfied({ stat: 'reputation', gte: 40 }, state)).toBe(true);
    expect(isRequirementSatisfied({ stat: 'reputation', gte: 43 }, state)).toBe(false);
  });

  it('an UNKNOWN stat value fails CLOSED (never spuriously eligible)', () => {
    const state = makeState(); // cash/reputation not threaded
    expect(state.cash).toBeUndefined();
    expect(isRequirementSatisfied({ stat: 'cash', gte: 0 }, state)).toBe(false);
    expect(isRequirementSatisfied({ stat: 'cash', lte: 999_999_999 }, state)).toBe(false);
    expect(isRequirementSatisfied({ stat: 'reputation', gte: 0 }, state)).toBe(false);
  });
});

describe('M16 requires grammar — story-flag gates', () => {
  const flags = { story: { dante_deal_taken: true, other_key: false } };

  it('`is` defaults to true ("flag must be set")', () => {
    const state = deriveRelevanceState({
      artists: [], projects: [], releases: [], songs: [], currentWeek: 5, flags,
    });
    expect(isRequirementSatisfied({ flag: 'dante_deal_taken' }, state)).toBe(true);
    expect(isRequirementSatisfied({ flag: 'never_written' }, state)).toBe(false);
    // A key explicitly false behaves like absent (only === true counts as set).
    expect(isRequirementSatisfied({ flag: 'other_key' }, state)).toBe(false);
  });

  it('`is: false` is an exclusion gate', () => {
    const state = deriveRelevanceState({
      artists: [], projects: [], releases: [], songs: [], currentWeek: 5, flags,
    });
    expect(isRequirementSatisfied({ flag: 'dante_deal_taken', is: false }, state)).toBe(false);
    expect(isRequirementSatisfied({ flag: 'never_written', is: false }, state)).toBe(true);
  });

  it('reads defensively: absent/malformed flags.story never throws, everything reads unset', () => {
    for (const rawFlags of [undefined, null, {}, { story: null }, { story: 'oops' }, { story: [1, 2] }]) {
      const state = deriveRelevanceState({
        artists: [], projects: [], releases: [], songs: [], currentWeek: 5, flags: rawFlags,
      });
      expect(isRequirementSatisfied({ flag: 'anything' }, state)).toBe(false);
      expect(isRequirementSatisfied({ flag: 'anything', is: false }, state)).toBe(true);
    }
  });
});

describe('M16 requires grammar — per-artist-state tags', () => {
  const th = DEFAULT_ARTIST_STATE_THRESHOLDS; // low_mood_lt 40, high_popularity_gte 70, low_energy_lt 30

  it('any_artist_low_mood fires strictly below the threshold', () => {
    const below = deriveRelevanceState({
      artists: [{ id: 'a', mood: th.low_mood_lt - 1 }], projects: [], releases: [], songs: [], currentWeek: 1,
    });
    const at = deriveRelevanceState({
      artists: [{ id: 'a', mood: th.low_mood_lt }], projects: [], releases: [], songs: [], currentWeek: 1,
    });
    expect(isRequirementSatisfied('any_artist_low_mood', below)).toBe(true);
    expect(isRequirementSatisfied('any_artist_low_mood', at)).toBe(false);
  });

  it('any_artist_high_popularity fires at-or-above the threshold', () => {
    const at = deriveRelevanceState({
      artists: [{ id: 'a', popularity: th.high_popularity_gte }], projects: [], releases: [], songs: [], currentWeek: 1,
    });
    const under = deriveRelevanceState({
      artists: [{ id: 'a', popularity: th.high_popularity_gte - 1 }], projects: [], releases: [], songs: [], currentWeek: 1,
    });
    expect(isRequirementSatisfied('any_artist_high_popularity', at)).toBe(true);
    expect(isRequirementSatisfied('any_artist_high_popularity', under)).toBe(false);
  });

  it('any_artist_low_energy fires strictly below the threshold', () => {
    const below = deriveRelevanceState({
      artists: [{ id: 'a', energy: th.low_energy_lt - 1 }], projects: [], releases: [], songs: [], currentWeek: 1,
    });
    expect(isRequirementSatisfied('any_artist_low_energy', below)).toBe(true);
  });

  it('thresholds are config knobs (artistStateThresholds overrides the defaults)', () => {
    const custom = { low_mood_lt: 60, high_popularity_gte: 10, low_energy_lt: 5 };
    const state = deriveRelevanceState({
      artists: [{ id: 'a', mood: 55, popularity: 10, energy: 6 }],
      projects: [], releases: [], songs: [], currentWeek: 1,
      artistStateThresholds: custom,
    });
    expect(state.anyArtistLowMood).toBe(true); // 55 < 60
    expect(state.anyArtistHighPopularity).toBe(true); // 10 >= 10
    expect(state.anyArtistLowEnergy).toBe(false); // 6 !< 5
  });

  it('missing per-artist fields are simply not counted (no artists → all false)', () => {
    const state = deriveRelevanceState({
      artists: [{ id: 'a' }], projects: [], releases: [], songs: [], currentWeek: 1,
    });
    expect(state.anyArtistLowMood).toBe(false);
    expect(state.anyArtistHighPopularity).toBe(false);
    expect(state.anyArtistLowEnergy).toBe(false);
  });
});

describe('M16 requires grammar — AND semantics + backward compatibility', () => {
  it('mixed arrays keep AND semantics across all grammar forms', () => {
    const state = deriveRelevanceState({
      artists: [{ id: 'a', signedWeek: 1, mood: 10 }],
      projects: [], releases: [], songs: [{ isRecorded: true }],
      currentWeek: 10,
      cash: 20_000,
      flags: { story: { key_set: true } },
    });
    const pool = [
      { id: 'all_pass', requires: ['artist_signed', { stat: 'cash', gte: 10_000 }, { flag: 'key_set' }, 'any_artist_low_mood'] as RequiresEntry[] },
      { id: 'one_fails', requires: ['artist_signed', { stat: 'cash', gte: 50_000 }] as RequiresEntry[] },
      { id: 'no_requires' },
    ];
    expect(filterEligible(pool, state).map((m) => m.id)).toEqual(['all_pass', 'no_requires']);
  });

  it('BACKWARD COMPAT: plain-tag pools evaluate identically with and without the new inputs threaded', () => {
    const rows = {
      artists: [{ id: 'a', signedWeek: 2 }],
      projects: [{ type: 'Single', stage: 'production', startWeek: 1 }],
      releases: [{ status: 'planned' as const }],
      songs: [{ isRecorded: true }],
    };
    const preM16 = deriveRelevanceState({ ...rows, currentWeek: 8, recencyWindowWeeks: 4 });
    const withM16Inputs = deriveRelevanceState(buildRelevanceInput({
      ...rows,
      currentWeek: 8,
      recencyWindowWeeks: 4,
      gameState: { money: 75_000, reputation: 12, flags: { story: { x: true } } },
    }));
    const pool = [
      { id: 'm1', requires: ['artist_signed', 'music_exists'] as RequiresEntry[] },
      { id: 'm2', requires: ['tour_active'] as RequiresEntry[] },
      { id: 'm3', requires: ['release_planned', 'recording_project_active'] as RequiresEntry[] },
      { id: 'm4' },
    ];
    expect(filterEligible(pool, preM16).map((m) => m.id))
      .toEqual(filterEligible(pool, withM16Inputs).map((m) => m.id));
    // And the 6 original predicates themselves are unchanged by the new inputs.
    for (const key of ['artistSigned', 'musicExists', 'releasePlanned', 'releaseOut', 'recordingProjectActive', 'tourActive', 'releasePlannedSoon', 'artistSignedRecently'] as const) {
      expect(withM16Inputs[key]).toBe(preM16[key]);
    }
  });

  it('an unknown object shape fails closed at runtime', () => {
    const state = makeState({ cash: 1_000_000 });
    expect(isRequirementSatisfied({ bogus: true } as unknown as RequiresEntry, state)).toBe(false);
  });
});

describe('M16 requires grammar — Zod surface (RequiresEntrySchema, shared by contracts + dataLoader)', () => {
  it('accepts every grammar form', () => {
    const valid: unknown[] = [
      'artist_signed',
      'any_artist_low_mood',
      { stat: 'cash', gte: 20000 },
      { stat: 'week', gte: 5, lte: 20 },
      { stat: 'reputation', lte: 10 },
      { flag: 'dante_deal_taken' },
      { flag: 'wall_of_misses_seen', is: false },
    ];
    for (const entry of valid) {
      expect(RequiresEntrySchema.safeParse(entry).success, JSON.stringify(entry)).toBe(true);
    }
  });

  it('rejects unknown tags, unknown stats, boundless thresholds, bad flag keys and typo keys', () => {
    const invalid: unknown[] = [
      'not_a_tag',
      { stat: 'money', gte: 1 },           // unknown stat name
      { stat: 'cash' },                     // no bound
      { stat: 'cash', gt: 5 },              // typo'd bound key (strict)
      { flag: 'Bad-Key' },                  // not snake_case
      { flag: '' },
      { flag: 'ok_key', is: 'yes' },        // non-boolean is
      { flag: 'ok_key', extra: 1 },         // strict
      {},
    ];
    for (const entry of invalid) {
      expect(RequiresEntrySchema.safeParse(entry).success, JSON.stringify(entry)).toBe(false);
    }
  });

  it('WeeklyActionSchema still accepts pre-M16 plain-string requires arrays (backward compatible)', () => {
    const action = {
      id: 'x', name: 'X', type: 'role_meeting', icon: 'i', category: 'business',
      requires: ['artist_signed', 'music_exists'],
    };
    expect(WeeklyActionSchema.safeParse(action).success).toBe(true);
    const withObjects = { ...action, requires: ['artist_signed', { stat: 'cash', gte: 1000 }, { flag: 'k', is: false }] };
    expect(WeeklyActionSchema.safeParse(withObjects).success).toBe(true);
  });
});
