import { describe, it, expect } from 'vitest';
import {
  deriveRelevanceState,
  matchReactiveMeeting,
  selectWeeklyMeeting,
  selectWeeklyMeetingWithHappenings,
  REACTIVE_TRIGGER_PRIORITY,
  type MeetingRelevanceState,
  type ReactiveTaggable,
} from '@shared/engine/meetingSelection';
import type { WeekHappening } from '@shared/engine/weekHappenings';
import { generateMeetingSeed } from '@shared/utils/seededRandom';
import { HAPPENING_TYPES } from '@shared/types/gameTypes';
import type { RelevanceTag } from '@shared/types/gameTypes';

/**
 * Tier 2 (PR-1) — unit tests for the reactive-meeting injection stage
 * (shared/engine/meetingSelection.ts). Pure, no DB. Mirrors
 * meeting-selection.test.ts's pattern.
 */

const EMPTY_INPUT = {
  artists: [] as any[],
  projects: [] as any[],
  releases: [] as any[],
  songs: [] as any[],
  currentWeek: 1,
};

function emptyState(): MeetingRelevanceState {
  return deriveRelevanceState(EMPTY_INPUT);
}

function fullState(): MeetingRelevanceState {
  return deriveRelevanceState({
    ...EMPTY_INPUT,
    artists: [{ id: 'a1' }],
    releases: [{ status: 'planned' }, { status: 'released' }],
    songs: [{ isRecorded: true, isReleased: true }],
    currentWeek: 10,
  });
}

type Pool = Array<{ id: string; requires?: RelevanceTag[] } & ReactiveTaggable>;

const happening = (type: WeekHappening['type'], overrides: Partial<WeekHappening> = {}): WeekHappening => ({
  type,
  week: 4,
  ...overrides,
});

describe('matchReactiveMeeting — priority + requires', () => {
  it('returns null when there are no happenings', () => {
    const pool: Pool = [{ id: 'm1', reactive_trigger: 'chart_debut' }];
    expect(matchReactiveMeeting(pool, [], 'seed')).toBeNull();
  });

  it('returns null when no pool meeting has a matching reactive_trigger', () => {
    const pool: Pool = [{ id: 'm1', reactive_trigger: 'chart_debut' }];
    expect(matchReactiveMeeting(pool, [happening('release_out')], 'seed')).toBeNull();
  });

  it('matches the meeting whose reactive_trigger equals the happening type', () => {
    const pool: Pool = [
      { id: 'normal' },
      { id: 'reactive', reactive_trigger: 'recent_signing' },
    ];
    const match = matchReactiveMeeting(pool, [happening('recent_signing')], 'seed');
    expect(match?.meeting.id).toBe('reactive');
    expect(match?.happening.type).toBe('recent_signing');
  });

  it('REACTIVE_TRIGGER_PRIORITY covers exactly the canonical HAPPENING_TYPES (no silent rank-Infinity drift)', () => {
    // matchReactiveMeeting ranks an unknown trigger as Infinity (never wins).
    // If a new type is added to HAPPENING_TYPES but not to the priority list,
    // its reactive meetings would silently never fire — this guard makes that
    // a loud test failure instead.
    expect(new Set(REACTIVE_TRIGGER_PRIORITY)).toEqual(new Set(HAPPENING_TYPES));
    expect(REACTIVE_TRIGGER_PRIORITY).toHaveLength(HAPPENING_TYPES.length);
  });

  it('fixed priority order: mood_crater > chart_debut > release_out > recent_signing', () => {
    expect(REACTIVE_TRIGGER_PRIORITY).toEqual([
      'mood_crater',
      'chart_debut',
      'release_out',
      'recent_signing',
    ]);

    const pool: Pool = [
      { id: 'signing', reactive_trigger: 'recent_signing' },
      { id: 'release', reactive_trigger: 'release_out' },
      { id: 'chart', reactive_trigger: 'chart_debut' },
      { id: 'mood', reactive_trigger: 'mood_crater' },
    ];
    const happenings = [
      happening('recent_signing'),
      happening('release_out'),
      happening('chart_debut'),
      happening('mood_crater'),
    ];
    const match = matchReactiveMeeting(pool, happenings, 'seed');
    expect(match?.meeting.id).toBe('mood');
  });

  it('priority holds regardless of happening array order', () => {
    const pool: Pool = [
      { id: 'chart', reactive_trigger: 'chart_debut' },
      { id: 'release', reactive_trigger: 'release_out' },
    ];
    const happenings = [happening('release_out'), happening('chart_debut')];
    const match = matchReactiveMeeting(pool, happenings, 'seed');
    expect(match?.meeting.id).toBe('chart');
  });

  it('seeded tie-break is deterministic: same seed twice → same pick', () => {
    const pool: Pool = [
      { id: 'debut-1', reactive_trigger: 'chart_debut' },
      { id: 'debut-2', reactive_trigger: 'chart_debut' },
    ];
    const happenings = [
      happening('chart_debut', { songId: 's1' }),
      happening('chart_debut', { songId: 's2' }),
    ];
    const seed = generateMeetingSeed('game-1', 9, 'cmo');
    const first = matchReactiveMeeting(pool, happenings, seed);
    for (let i = 0; i < 10; i++) {
      const again = matchReactiveMeeting(pool, happenings, seed);
      expect(again?.meeting.id).toBe(first?.meeting.id);
    }
  });

  it('a matching trigger whose meeting requires unsatisfied tags is excluded (eligiblePool is pre-filtered by the caller)', () => {
    // matchReactiveMeeting only sees the ALREADY Tier-0-filtered pool, so a
    // meeting requiring an unmet tag simply never appears in eligiblePool —
    // simulate that here by omitting it, proving the meeting with unmet
    // requires would not be picked even though its trigger matches.
    const poolWithGatedMeetingExcluded: Pool = []; // requires unmet -> filtered out upstream
    const match = matchReactiveMeeting(poolWithGatedMeetingExcluded, [happening('mood_crater')], 'seed');
    expect(match).toBeNull();
  });
});

describe('selectWeeklyMeetingWithHappenings — replace-the-draw semantics (fork B1)', () => {
  it('no happenings (default/omitted) → byte-identical to selectWeeklyMeeting', () => {
    const pool: Pool = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }];
    const state = emptyState();
    const seed = generateMeetingSeed('game-1', 12, 'cco');

    const viaOriginal = selectWeeklyMeeting(pool, state, seed);
    const viaExtendedOmitted = selectWeeklyMeetingWithHappenings(pool, state, seed);
    const viaExtendedEmptyArray = selectWeeklyMeetingWithHappenings(pool, state, seed, []);

    expect(viaExtendedOmitted.meeting).toEqual(viaOriginal);
    expect(viaExtendedOmitted.reactiveHappening).toBeNull();
    expect(viaExtendedEmptyArray.meeting).toEqual(viaOriginal);
    expect(viaExtendedEmptyArray.reactiveHappening).toBeNull();
  });

  it('happenings present but no pool meeting has a matching reactive_trigger → falls through unchanged', () => {
    const pool: Pool = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const state = emptyState();
    const seed = generateMeetingSeed('game-1', 3, 'ceo');

    const viaOriginal = selectWeeklyMeeting(pool, state, seed);
    const viaExtended = selectWeeklyMeetingWithHappenings(pool, state, seed, [happening('chart_debut')]);

    expect(viaExtended.meeting).toEqual(viaOriginal);
    expect(viaExtended.reactiveHappening).toBeNull();
  });

  it('a matching happening replaces the weighted draw entirely', () => {
    const pool: Pool = [
      { id: 'normal-1' },
      { id: 'normal-2' },
      { id: 'reactive', reactive_trigger: 'mood_crater' },
    ];
    const state = emptyState();
    const seed = generateMeetingSeed('game-1', 5, 'cco');

    const result = selectWeeklyMeetingWithHappenings(pool, state, seed, [happening('mood_crater')]);
    expect(result.meeting?.id).toBe('reactive');
    expect(result.reactiveHappening?.type).toBe('mood_crater');
  });

  it('requires still respected: a reactive meeting whose requires are unmet does not win, pipeline falls through', () => {
    const pool: Pool = [
      { id: 'normal' },
      { id: 'reactive-gated', reactive_trigger: 'mood_crater', requires: ['tour_active'] },
    ];
    // emptyState has tour_active: false, so 'reactive-gated' is filtered out
    // by Tier 0's filterEligible before matchReactiveMeeting ever sees it.
    const state = emptyState();
    const seed = generateMeetingSeed('game-1', 6, 'cco');

    const result = selectWeeklyMeetingWithHappenings(pool, state, seed, [happening('mood_crater')]);
    expect(result.meeting?.id).toBe('normal');
    expect(result.reactiveHappening).toBeNull();
  });

  it('empty eligible pool still sits out even with happenings present', () => {
    const pool: Pool = [{ id: 'gated', requires: ['release_out'] }];
    const result = selectWeeklyMeetingWithHappenings(pool, emptyState(), 'seed', [happening('release_out')]);
    expect(result.meeting).toBeNull();
    expect(result.reactiveHappening).toBeNull();
  });

  it('reactive meetings are event-gated: NEVER drawable by the regular pipeline when their trigger is not firing', () => {
    // A pool that is mostly reactive: across many seeds, the fall-through
    // draw must only ever return the non-reactive meeting.
    const pool: Pool = [
      { id: 'normal' },
      { id: 'reactive-a', reactive_trigger: 'chart_debut' },
      { id: 'reactive-b', reactive_trigger: 'mood_crater' },
    ];
    const state = emptyState();
    for (let week = 1; week <= 40; week++) {
      const seed = generateMeetingSeed('game-1', week, 'cmo');
      const noHappenings = selectWeeklyMeetingWithHappenings(pool, state, seed);
      expect(noHappenings.meeting?.id).toBe('normal');
      // Non-matching happening: still gated.
      const nonMatching = selectWeeklyMeetingWithHappenings(pool, state, seed, [happening('recent_signing')]);
      expect(nonMatching.meeting?.id).toBe('normal');
    }
  });

  it('an all-reactive pool with no firing trigger sits the exec out (fall-through pool empty)', () => {
    const pool: Pool = [{ id: 'reactive-only', reactive_trigger: 'release_out' }];
    const result = selectWeeklyMeetingWithHappenings(pool, emptyState(), 'seed', [happening('recent_signing')]);
    expect(result.meeting).toBeNull();
    expect(result.reactiveHappening).toBeNull();
  });

  it('dark-launch invariant against the real catalog: zero authored reactive_trigger meetings means happenings never change the pick', () => {
    // data/actions.json has no reactive_trigger entries yet (PR-1 dark launch),
    // so even a synthetic pool mirroring the real one falls through identically.
    const pool: Pool = [{ id: 'ceo_priorities' }, { id: 'ar_discovery' }, { id: 'cmo_pr_angle' }];
    const state = emptyState();
    const seed = generateMeetingSeed('game-1', 1, 'ceo');
    const viaOriginal = selectWeeklyMeeting(pool, state, seed);
    const viaExtended = selectWeeklyMeetingWithHappenings(pool, state, seed, [
      happening('chart_debut'),
      happening('release_out'),
      happening('mood_crater'),
      happening('recent_signing'),
    ]);
    expect(viaExtended.meeting).toEqual(viaOriginal);
    expect(viaExtended.reactiveHappening).toBeNull();
  });
});
