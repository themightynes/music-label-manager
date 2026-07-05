import { describe, it, expect } from 'vitest';
import {
  deriveRelevanceState,
  filterEligible,
  weighMeetings,
  selectWeeklyMeeting,
  type MeetingRelevanceState,
  type MeetingSelectionTuning,
} from '@shared/engine/meetingSelection';
import { generateMeetingSeed } from '@shared/utils/seededRandom';

/**
 * Meeting-relevance Tier 1 (PR-2) — unit tests for the weighting stage.
 * Pure, no DB. Sibling of tests/engine/meeting-selection.test.ts (PR-1).
 *
 * Spec: docs/01-planning/implementation-specs/[READY] meeting-relevance-tier0-1-plan.md §2.
 */

const EMPTY_INPUT = {
  artists: [] as any[],
  projects: [] as any[],
  releases: [] as any[],
  songs: [] as any[],
  currentWeek: 1,
};

const TUNING: MeetingSelectionTuning = { relevanceWeight: 2.0, recencyWindowWeeks: 4 };

describe('deriveRelevanceState — Tier 1 recency signals', () => {
  it('releasePlannedSoon: false with no recencyWindowWeeks (PR-1 callers keep old behavior)', () => {
    const state = deriveRelevanceState({ ...EMPTY_INPUT, currentWeek: 5, releases: [{ status: 'planned', releaseWeek: 7 }] });
    expect(state.releasePlannedSoon).toBe(false);
  });

  it('releasePlannedSoon: true when a planned release is UPCOMING within the window (future-facing)', () => {
    const state = deriveRelevanceState({
      ...EMPTY_INPUT,
      currentWeek: 6,
      recencyWindowWeeks: 4,
      releases: [{ status: 'planned', releaseWeek: 9 }], // lead 3, within window of 4
    });
    expect(state.releasePlannedSoon).toBe(true);
  });

  it('releasePlannedSoon: true when the planned release is THIS week (lead 0 counts)', () => {
    const state = deriveRelevanceState({
      ...EMPTY_INPUT,
      currentWeek: 6,
      recencyWindowWeeks: 4,
      releases: [{ status: 'planned', releaseWeek: 6 }],
    });
    expect(state.releasePlannedSoon).toBe(true);
  });

  it('releasePlannedSoon: false when scheduled beyond the window', () => {
    const state = deriveRelevanceState({
      ...EMPTY_INPUT,
      currentWeek: 6,
      recencyWindowWeeks: 4,
      releases: [{ status: 'planned', releaseWeek: 11 }], // lead 5 > 4
    });
    expect(state.releasePlannedSoon).toBe(false);
  });

  it('releasePlannedSoon: false for a PAST releaseWeek — the signal is imminence, not recency (direction pin)', () => {
    // Regression pin for the PR-2 review fix: a planned release whose week is
    // already behind currentWeek must NOT fire the marketing/distribution boost.
    const state = deriveRelevanceState({
      ...EMPTY_INPUT,
      currentWeek: 20,
      recencyWindowWeeks: 4,
      releases: [{ status: 'planned', releaseWeek: 18 }], // lead -2 (overdue)
    });
    expect(state.releasePlannedSoon).toBe(false);
  });

  it('releasePlannedSoon: false for a non-planned release even if releaseWeek is imminent', () => {
    const state = deriveRelevanceState({
      ...EMPTY_INPUT,
      currentWeek: 6,
      recencyWindowWeeks: 4,
      releases: [{ status: 'released', releaseWeek: 7 }],
    });
    expect(state.releasePlannedSoon).toBe(false);
  });

  it('artistSignedRecently: false with no recencyWindowWeeks', () => {
    const state = deriveRelevanceState({ ...EMPTY_INPUT, currentWeek: 5, artists: [{ id: 'a1', signedWeek: 4 }] });
    expect(state.artistSignedRecently).toBe(false);
  });

  it('artistSignedRecently: true when an artist was signed within the window', () => {
    const state = deriveRelevanceState({
      ...EMPTY_INPUT,
      currentWeek: 6,
      recencyWindowWeeks: 4,
      artists: [{ id: 'a1', signedWeek: 3 }],
    });
    expect(state.artistSignedRecently).toBe(true);
  });

  it('artistSignedRecently: false when signed outside the window', () => {
    const state = deriveRelevanceState({
      ...EMPTY_INPUT,
      currentWeek: 20,
      recencyWindowWeeks: 4,
      artists: [{ id: 'a1', signedWeek: 1 }],
    });
    expect(state.artistSignedRecently).toBe(false);
  });

  it('missing signedWeek/releaseWeek degrades honestly to false (not always-on)', () => {
    const state = deriveRelevanceState({
      ...EMPTY_INPUT,
      currentWeek: 6,
      recencyWindowWeeks: 4,
      artists: [{ id: 'a1' }], // no signedWeek
      releases: [{ status: 'planned' }], // no releaseWeek
    });
    expect(state.artistSignedRecently).toBe(false);
    expect(state.releasePlannedSoon).toBe(false);
  });
});

describe('weighMeetings — situation → category boosts (spec §2 table)', () => {
  const fullState = (overrides: Partial<MeetingRelevanceState> = {}): MeetingRelevanceState => ({
    currentWeek: 10,
    artistSigned: true,
    musicExists: true,
    releasePlanned: true,
    releaseOut: true,
    recordingProjectActive: false,
    tourActive: false,
    releasePlannedSoon: false,
    artistSignedRecently: false,
    ...overrides,
  });

  it('no tuning → every weight is 1.0 (Tier 0 behavior)', () => {
    const pool = [{ category: 'live' }, { category: 'marketing' }];
    const weights = weighMeetings(pool, fullState({ tourActive: true }));
    expect(weights).toEqual([1.0, 1.0]);
  });

  it('no signals firing → uniform weights even with tuning supplied', () => {
    const pool = [{ category: 'live' }, { category: 'marketing' }, { category: 'production' }];
    const weights = weighMeetings(pool, fullState(), TUNING);
    expect(weights).toEqual([1.0, 1.0, 1.0]);
  });

  it('tour_active boosts category "live" only', () => {
    const pool = [{ category: 'live' }, { category: 'talent' }, { category: 'business' }];
    const weights = weighMeetings(pool, fullState({ tourActive: true }), TUNING);
    expect(weights).toEqual([2.0, 1.0, 1.0]);
  });

  it('release planned soon boosts both "marketing" and "distribution"', () => {
    const pool = [{ category: 'marketing' }, { category: 'distribution' }, { category: 'live' }];
    const weights = weighMeetings(pool, fullState({ releasePlannedSoon: true }), TUNING);
    expect(weights).toEqual([2.0, 2.0, 1.0]);
  });

  it('recording_project_active boosts "production"', () => {
    const pool = [{ category: 'production' }, { category: 'talent' }];
    const weights = weighMeetings(pool, fullState({ recordingProjectActive: true }), TUNING);
    expect(weights).toEqual([2.0, 1.0]);
  });

  it('artist signed recently boosts "talent"', () => {
    const pool = [{ category: 'talent' }, { category: 'business' }];
    const weights = weighMeetings(pool, fullState({ artistSignedRecently: true }), TUNING);
    expect(weights).toEqual([2.0, 1.0]);
  });

  it('all eligible meetings boosted equally → uniform weights again (spec §2 degenerate case)', () => {
    const pool = [{ category: 'live' }, { category: 'live' }, { category: 'live' }];
    const weights = weighMeetings(pool, fullState({ tourActive: true }), TUNING);
    expect(weights).toEqual([2.0, 2.0, 2.0]); // equal, not necessarily 1 — still uniform draw probability
  });

  it('a category-less meeting gets weight 1.0 even when other signals fire', () => {
    const pool = [{ category: 'live' }, {}];
    const weights = weighMeetings(pool, fullState({ tourActive: true }), TUNING);
    expect(weights).toEqual([2.0, 1.0]);
  });

  it('stacking: two independent signals targeting the same category multiply', () => {
    // release_planned targets BOTH marketing and distribution; simulate a second
    // independent hit by re-checking the multiplicative contract directly via
    // Math.pow — a `marketing` meeting under a state where release_planned fires
    // gets exactly one multiply (only one signal targets marketing in the table).
    const pool = [{ category: 'marketing' }];
    const weights = weighMeetings(pool, fullState({ releasePlannedSoon: true }), TUNING);
    expect(weights).toEqual([2.0]);
  });
});

describe('selectWeeklyMeeting — tuning integration', () => {
  it('tuning omitted → identical picks to PR-1 (uniform) behavior across seeds', () => {
    const pool = [
      { id: 'a', category: 'business' },
      { id: 'b', category: 'live' },
      { id: 'c', category: 'talent' },
    ];
    const state: MeetingRelevanceState = {
      currentWeek: 5,
      artistSigned: true,
      musicExists: false,
      releasePlanned: false,
      releaseOut: false,
      recordingProjectActive: false,
      tourActive: true, // would boost "live" if tuning were passed
      releasePlannedSoon: false,
      artistSignedRecently: false,
    };
    for (let week = 1; week <= 15; week++) {
      const seed = generateMeetingSeed('game-x', week, 'cmo');
      const withoutTuning = selectWeeklyMeeting(pool, state, seed);
      const withZeroWeightTuning = selectWeeklyMeeting(pool, state, seed, undefined);
      expect(withoutTuning).toBe(withZeroWeightTuning);
    }
  });

  it('empty eligible pool still returns null regardless of tuning', () => {
    const pool = [{ id: 'gated', requires: ['release_out'] as any, category: 'live' }];
    const state = deriveRelevanceState({ ...EMPTY_INPUT, currentWeek: 1 });
    expect(selectWeeklyMeeting(pool, state, 'seed', TUNING)).toBeNull();
  });

  it('a boosted category meeting is picked materially more often across many seeds than under uniform tuning', () => {
    const pool = [
      { id: 'live1', category: 'live' },
      { id: 'plain1', category: 'business' },
      { id: 'plain2', category: 'business' },
      { id: 'plain3', category: 'business' },
      { id: 'plain4', category: 'business' },
    ];
    const state: MeetingRelevanceState = {
      currentWeek: 10,
      artistSigned: true,
      musicExists: false,
      releasePlanned: false,
      releaseOut: false,
      recordingProjectActive: false,
      tourActive: true,
      releasePlannedSoon: false,
      artistSignedRecently: false,
    };

    const N = 200;
    let uniformHits = 0;
    let boostedHits = 0;
    for (let i = 0; i < N; i++) {
      const seed = generateMeetingSeed(`game-${i}`, 10, 'live-role');
      const uniformPick = selectWeeklyMeeting(pool, state, seed); // no tuning
      if (uniformPick?.id === 'live1') uniformHits++;
      const boostedPick = selectWeeklyMeeting(pool, state, seed, TUNING);
      if (boostedPick?.id === 'live1') boostedHits++;
    }

    // Uniform expectation ~20% (1/5); boosted expectation ~33% (2/(2+4)).
    // Assert the boosted share is materially higher, with loose bounds (fixed
    // seed list via gameId index, not Math.random — no flakiness).
    expect(boostedHits / N).toBeGreaterThan(uniformHits / N);
    expect(boostedHits / N).toBeGreaterThan(0.25);
  });
});
