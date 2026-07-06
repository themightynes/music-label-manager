import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  deriveRelevanceState,
  filterEligible,
  isTagSatisfied,
  selectWeeklyMeeting,
  type MeetingRelevanceState,
} from '@shared/engine/meetingSelection';
import { generateMeetingSeed } from '@shared/utils/seededRandom';
import type { RelevanceTag } from '@shared/types/gameTypes';

/**
 * Meeting-relevance Tier 0 (PR-1) — unit tests for the pure selection pipeline
 * (shared/engine/meetingSelection.ts). Pure, no DB.
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

describe('deriveRelevanceState — one predicate per tag', () => {
  it('week-1 empty label: every predicate false', () => {
    const state = emptyState();
    expect(state).toEqual({
      currentWeek: 1,
      artistSigned: false,
      musicExists: false,
      releasePlanned: false,
      releaseOut: false,
      recordingProjectActive: false,
      tourActive: false,
      releasePlannedSoon: false,
      artistSignedRecently: false,
    });
  });

  it('artist_signed: true iff at least one signed artist row', () => {
    const state = deriveRelevanceState({ ...EMPTY_INPUT, artists: [{ id: 'a1' }] });
    expect(state.artistSigned).toBe(true);
  });

  it('music_exists: true iff at least one recorded song', () => {
    expect(deriveRelevanceState({ ...EMPTY_INPUT, songs: [{ isRecorded: false }] }).musicExists).toBe(false);
    expect(deriveRelevanceState({ ...EMPTY_INPUT, songs: [{ isRecorded: true }] }).musicExists).toBe(true);
  });

  it('release_planned: true iff a release has status planned', () => {
    expect(deriveRelevanceState({ ...EMPTY_INPUT, releases: [{ status: 'released' }] }).releasePlanned).toBe(false);
    expect(deriveRelevanceState({ ...EMPTY_INPUT, releases: [{ status: 'planned' }] }).releasePlanned).toBe(true);
  });

  it('release_out: released/catalog release OR a released song', () => {
    expect(deriveRelevanceState({ ...EMPTY_INPUT, releases: [{ status: 'planned' }] }).releaseOut).toBe(false);
    expect(deriveRelevanceState({ ...EMPTY_INPUT, releases: [{ status: 'released' }] }).releaseOut).toBe(true);
    expect(deriveRelevanceState({ ...EMPTY_INPUT, releases: [{ status: 'catalog' }] }).releaseOut).toBe(true);
    expect(deriveRelevanceState({ ...EMPTY_INPUT, songs: [{ isReleased: true }] }).releaseOut).toBe(true);
  });

  it('recording_project_active: Single/EP in production only', () => {
    expect(
      deriveRelevanceState({ ...EMPTY_INPUT, projects: [{ type: 'Single', stage: 'planning' }] }).recordingProjectActive
    ).toBe(false);
    expect(
      deriveRelevanceState({ ...EMPTY_INPUT, projects: [{ type: 'Single', stage: 'production' }] }).recordingProjectActive
    ).toBe(true);
    expect(
      deriveRelevanceState({ ...EMPTY_INPUT, projects: [{ type: 'EP', stage: 'production' }] }).recordingProjectActive
    ).toBe(true);
    expect(
      deriveRelevanceState({ ...EMPTY_INPUT, projects: [{ type: 'Mini-Tour', stage: 'production', startWeek: 1 }] })
        .recordingProjectActive
    ).toBe(false);
  });

  describe('tour_active: mirrors tourHelpers.getArtistStatus city-count rule (C51)', () => {
    const tour = (overrides: Record<string, unknown>) => ({
      type: 'Mini-Tour',
      stage: 'production',
      startWeek: 2,
      ...overrides,
    });

    it('false when not started yet (currentWeek < startWeek)', () => {
      const state = deriveRelevanceState({ ...EMPTY_INPUT, currentWeek: 1, projects: [tour({})] });
      expect(state.tourActive).toBe(false);
    });

    it('true while cities remain to play', () => {
      const state = deriveRelevanceState({
        ...EMPTY_INPUT,
        currentWeek: 3,
        projects: [tour({ metadata: { cities: 3, tourStats: { cities: [{}, {}] } } })],
      });
      expect(state.tourActive).toBe(true);
    });

    it('false once all planned cities are completed', () => {
      const state = deriveRelevanceState({
        ...EMPTY_INPUT,
        currentWeek: 3,
        projects: [tour({ metadata: { cities: 2, tourStats: { cities: [{}, {}] } } })],
      });
      expect(state.tourActive).toBe(false);
    });

    it('missing city metadata fails OPEN (stage-only behavior)', () => {
      const state = deriveRelevanceState({ ...EMPTY_INPUT, currentWeek: 3, projects: [tour({})] });
      expect(state.tourActive).toBe(true);
    });

    it('false for a tour not in production', () => {
      const state = deriveRelevanceState({
        ...EMPTY_INPUT,
        currentWeek: 3,
        projects: [tour({ stage: 'planning' })],
      });
      expect(state.tourActive).toBe(false);
    });
  });
});

describe('filterEligible — AND semantics, absent requires = always eligible', () => {
  const state = deriveRelevanceState({ ...EMPTY_INPUT, artists: [{ id: 'a1' }] }); // only artist_signed true

  it('a meeting without requires is always eligible (even at week-1 empty state)', () => {
    expect(filterEligible([{ id: 'floor' } as any], emptyState())).toHaveLength(1);
  });

  it('single satisfied tag → eligible; single unsatisfied tag → not', () => {
    const pool = [
      { id: 'ok', requires: ['artist_signed'] as RelevanceTag[] },
      { id: 'no', requires: ['release_out'] as RelevanceTag[] },
    ];
    expect(filterEligible(pool, state).map((m) => m.id)).toEqual(['ok']);
  });

  it('AND semantics: ALL tags must hold', () => {
    const pool = [{ id: 'both', requires: ['artist_signed', 'tour_active'] as RelevanceTag[] }];
    expect(filterEligible(pool, state)).toHaveLength(0); // tour_active false

    const fullState = deriveRelevanceState({
      ...EMPTY_INPUT,
      currentWeek: 3,
      artists: [{ id: 'a1' }],
      projects: [{ type: 'Mini-Tour', stage: 'production', startWeek: 1, metadata: { cities: 3, tourStats: { cities: [] } } }],
    });
    expect(filterEligible(pool, fullState)).toHaveLength(1);
  });

  it('isTagSatisfied covers each tag against the matching state flag', () => {
    const state: MeetingRelevanceState = {
      currentWeek: 5,
      artistSigned: true,
      musicExists: false,
      releasePlanned: true,
      releaseOut: false,
      recordingProjectActive: true,
      tourActive: false,
      releasePlannedSoon: false,
      artistSignedRecently: false,
    };
    expect(isTagSatisfied('artist_signed', state)).toBe(true);
    expect(isTagSatisfied('music_exists', state)).toBe(false);
    expect(isTagSatisfied('release_planned', state)).toBe(true);
    expect(isTagSatisfied('release_out', state)).toBe(false);
    expect(isTagSatisfied('recording_project_active', state)).toBe(true);
    expect(isTagSatisfied('tour_active', state)).toBe(false);
  });
});

describe('selectWeeklyMeeting — deterministic uniform pick over the eligible pool', () => {
  it('returns null on an empty eligible pool (the sit-out rule)', () => {
    const pool = [{ id: 'gated', requires: ['release_out'] as RelevanceTag[] }];
    expect(selectWeeklyMeeting(pool, emptyState(), 'seed')).toBeNull();
    expect(selectWeeklyMeeting([], emptyState(), 'seed')).toBeNull();
  });

  it('same seed + same state → same pick (deterministic)', () => {
    const pool: Array<{ id: string; requires?: RelevanceTag[] }> = [
      { id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' },
    ];
    const seed = generateMeetingSeed('game-123', 7, 'cmo');
    const first = selectWeeklyMeeting(pool, emptyState(), seed);
    for (let i = 0; i < 10; i++) {
      expect(selectWeeklyMeeting(pool, emptyState(), seed)).toBe(first);
    }
  });

  it('never picks an ineligible meeting', () => {
    const pool = [
      { id: 'floor' },
      { id: 'gated', requires: ['release_out'] as RelevanceTag[] },
    ];
    for (let week = 1; week <= 25; week++) {
      const pick = selectWeeklyMeeting(pool, emptyState(), generateMeetingSeed('g', week, 'cmo'));
      expect(pick?.id).toBe('floor');
    }
  });
});

describe('week-1 scenario against the real catalog (spec §1 empty-pool finding)', () => {
  it('empty label state → exactly ceo_priorities, ar_discovery, cmo_pr_angle eligible across all 25 meetings', () => {
    const actions = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/actions.json'), 'utf-8'));
    const catalog = (actions.weekly_actions as any[]).filter(
      (a) => a.type === 'role_meeting' && !String(a.id).startsWith('TEST_')
    );
    // Tier 2 PR-2 added 5 authored reactive meetings (25 total, up from 20) —
    // all 5 require tags that are false under empty label state, so the
    // empty-pool eligible set below is unchanged.
    expect(catalog).toHaveLength(25);

    const eligible = filterEligible(catalog, emptyState()).map((m) => m.id).sort();
    expect(eligible).toEqual(['ar_discovery', 'ceo_priorities', 'cmo_pr_angle']);
  });
});
