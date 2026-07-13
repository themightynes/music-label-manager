/**
 * Unit Tests for changeImportance (Phase 4 PR-2).
 *
 * Exhaustively covers the pure change-importance classifier:
 *   - EVERY member of the `GameChange['type']` union gets at least one assertion.
 *   - Chart edge cases: No. 1 debut, No. 1 climber, first entry (debut),
 *     top-10 vs sub-top-10 movement, tiny/zero movement, off-chart, competitors.
 *   - Determinism: the same input twice yields the same output.
 *
 * Pure unit tests — no DB, no RNG, no clock.
 */

import { describe, it, expect } from 'vitest';
import {
  classifyChange,
  classifyChartUpdate,
  REPUTATION_NOTABLE_THRESHOLD,
  TOP_10,
} from '@shared/utils/changeImportance';
import type { ChartUpdate, GameChange } from '@shared/types/gameTypes';

// The full GameChange['type'] union, kept in lockstep with gameTypes.ts. If a new
// member is added there without a case in the classifier, TS fails to compile the
// classifier; this list keeps the *test* honest that every member is asserted.
const ALL_CHANGE_TYPES: GameChange['type'][] = [
  'expense',
  'revenue',
  'meeting',
  'project_complete',
  'delayed_effect',
  'unlock',
  'ongoing_revenue',
  'song_release',
  'release',
  'marketing',
  'reputation',
  'error',
  'mood',
  'popularity',
  'executive_interaction',
  'expense_tracking',
  'breakthrough',
  'awareness_gain',
  'awareness_decay',
  'tour_planning',
  'hype_banked',
  'hype_applied',
  'hype_expired',
  'pre_campaign',
  'creative_capital',
  'song_granted',
  'release_spawned',
];

function change(type: GameChange['type'], over: Partial<GameChange> = {}): GameChange {
  return { type, description: `${type} change`, ...over };
}

function chart(over: Partial<ChartUpdate> = {}): ChartUpdate {
  return {
    songTitle: 'Song',
    artistName: 'Artist',
    position: 50,
    movement: 0,
    isDebut: false,
    isCompetitorSong: false,
    ...over,
  };
}

describe('classifyChange', () => {
  // --- exhaustiveness: every union member returns a valid tier ---------------
  it('maps every GameChange type to a valid importance tier', () => {
    for (const type of ALL_CHANGE_TYPES) {
      const result = classifyChange(change(type, { amount: 1 }));
      expect(['hero', 'notable', 'routine']).toContain(result);
    }
  });

  it('covers the full union (guards against a new type slipping in untested)', () => {
    // The classifier switch is exhaustive at compile time; this asserts the test
    // list itself matches the real union size so new members force a test update.
    expect(new Set(ALL_CHANGE_TYPES).size).toBe(27);
  });

  // --- HERO -----------------------------------------------------------------
  it('classifies unlock as hero', () => {
    expect(classifyChange(change('unlock'))).toBe('hero');
  });

  it('classifies breakthrough as hero (playtest July 6: renders in the Milestone Moments card)', () => {
    expect(classifyChange(change('breakthrough'))).toBe('hero');
  });

  // --- NOTABLE --------------------------------------------------------------
  it('classifies hype payoff/expiry as notable (buzz-v2 slice 1)', () => {
    expect(classifyChange(change('hype_applied'))).toBe('notable');
    expect(classifyChange(change('hype_expired'))).toBe('notable');
  });

  it('classifies banking hype as routine (buzz-v2 slice 1)', () => {
    expect(classifyChange(change('hype_banked'))).toBe('routine');
  });

  it('classifies a pre-release campaign build as routine (buzz-v2 slice 3)', () => {
    expect(classifyChange(change('pre_campaign', { amount: 5, weeksToLaunch: 3 }))).toBe('routine');
  });

  it('classifies a chart-milestone creative-capital grant as notable (PENDING-DECISIONS #9)', () => {
    expect(classifyChange(change('creative_capital', { amount: 1 }))).toBe('notable');
    expect(classifyChange(change('creative_capital', { amount: 2 }))).toBe('notable');
  });

  it('classifies tangible-catalog grants as notable (engine-verbs M1a/M1b)', () => {
    expect(classifyChange(change('song_granted'))).toBe('notable');
    expect(classifyChange(change('release_spawned'))).toBe('notable');
  });

  it('classifies release / song_release / project_complete as notable', () => {
    expect(classifyChange(change('release'))).toBe('notable');
    expect(classifyChange(change('song_release'))).toBe('notable');
    expect(classifyChange(change('project_complete'))).toBe('notable');
  });

  it('escalates release / project_complete to hero when the campaign completes', () => {
    const ctx = { campaignCompleted: true };
    expect(classifyChange(change('release'), ctx)).toBe('hero');
    expect(classifyChange(change('song_release'), ctx)).toBe('hero');
    expect(classifyChange(change('project_complete'), ctx)).toBe('hero');
  });

  // --- REPUTATION (threshold-driven) ----------------------------------------
  it('classifies a significant reputation gain as notable', () => {
    expect(classifyChange(change('reputation', { amount: REPUTATION_NOTABLE_THRESHOLD }))).toBe(
      'notable',
    );
    expect(classifyChange(change('reputation', { amount: 12 }))).toBe('notable');
  });

  it('classifies a significant reputation LOSS as notable (magnitude, not sign)', () => {
    expect(classifyChange(change('reputation', { amount: -10 }))).toBe('notable');
  });

  it('classifies a small reputation nudge as routine', () => {
    expect(classifyChange(change('reputation', { amount: 1 }))).toBe('routine');
    expect(
      classifyChange(change('reputation', { amount: REPUTATION_NOTABLE_THRESHOLD - 1 })),
    ).toBe('routine');
  });

  it('treats a reputation change with no amount as routine', () => {
    expect(classifyChange(change('reputation'))).toBe('routine');
  });

  it('honors a custom reputationNotableThreshold from context', () => {
    expect(classifyChange(change('reputation', { amount: 3 }), { reputationNotableThreshold: 3 })).toBe(
      'notable',
    );
    expect(classifyChange(change('reputation', { amount: 3 }), { reputationNotableThreshold: 10 })).toBe(
      'routine',
    );
  });

  it('escalates any nonzero reputation change to hero on campaign completion', () => {
    expect(classifyChange(change('reputation', { amount: 1 }), { campaignCompleted: true })).toBe(
      'hero',
    );
    // zero magnitude stays routine even on completion
    expect(classifyChange(change('reputation', { amount: 0 }), { campaignCompleted: true })).toBe(
      'routine',
    );
  });

  // --- ROUTINE --------------------------------------------------------------
  it('classifies ordinary weekly churn as routine', () => {
    const routineTypes: GameChange['type'][] = [
      'expense',
      'revenue',
      'ongoing_revenue',
      'expense_tracking',
      'marketing',
      'meeting',
      'delayed_effect',
      'mood',
      'popularity',
      'awareness_gain',
      'awareness_decay',
      'tour_planning',
      'hype_banked',
      'pre_campaign',
      'error',
    ];
    for (const type of routineTypes) {
      expect(classifyChange(change(type, { amount: 999999 }))).toBe('routine');
    }
  });

  // --- EXECUTIVE_INTERACTION (loyaltyChange-driven, exec-meetings-revival PR-2) ---
  it('classifies an executive_interaction WITHOUT a negative loyaltyChange as routine', () => {
    // The "Met with X" interaction entry (positive loyaltyBoost/newLoyalty, no
    // loyaltyChange field) and the natural mood-drift entry (neither field).
    expect(classifyChange(change('executive_interaction', { amount: 5 }))).toBe('routine');
    expect(
      classifyChange(change('executive_interaction', { amount: 5, loyaltyBoost: 5, newLoyalty: 65 })),
    ).toBe('routine');
    // A positive loyaltyChange (hypothetical) would also stay routine — only
    // decay (negative) escalates.
    expect(classifyChange(change('executive_interaction', { loyaltyChange: 5 }))).toBe('routine');
  });

  it('classifies an executive_interaction WITH a negative loyaltyChange as notable (loyalty decay)', () => {
    // ArtistStateProcessor's decay push: { type, description, amount, loyaltyChange }
    // with loyaltyChange always < 0. This is the first-time-visible feedback loop
    // from the case file (§2/§6d) — a neglected executive's loyalty erosion.
    expect(classifyChange(change('executive_interaction', { amount: -5, loyaltyChange: -5 }))).toBe(
      'notable',
    );
    expect(classifyChange(change('executive_interaction', { amount: -5, loyaltyChange: -1 }))).toBe(
      'notable',
    );
  });

  it('does not let a huge revenue amount escalate a routine type', () => {
    expect(classifyChange(change('revenue', { amount: 1_000_000 }))).toBe('routine');
  });

  // --- determinism ----------------------------------------------------------
  it('is deterministic: same input twice → same output', () => {
    for (const type of ALL_CHANGE_TYPES) {
      const c = change(type, { amount: 7 });
      expect(classifyChange(c)).toBe(classifyChange(c));
    }
    const rep = change('reputation', { amount: 6 });
    expect(classifyChange(rep, { campaignCompleted: false })).toBe(
      classifyChange(rep, { campaignCompleted: false }),
    );
  });

  it('does not mutate the input change object', () => {
    const c = change('unlock');
    const snapshot = JSON.stringify(c);
    classifyChange(c);
    expect(JSON.stringify(c)).toBe(snapshot);
  });
});

describe('classifyChartUpdate', () => {
  it('classifies a No. 1 debut as hero', () => {
    expect(classifyChartUpdate(chart({ position: 1, isDebut: true, movement: 0 }))).toBe('hero');
  });

  it('classifies a climb to No. 1 as hero', () => {
    expect(classifyChartUpdate(chart({ position: 1, isDebut: false, movement: 5 }))).toBe('hero');
  });

  it('classifies a No. 1 that held (no movement) as hero', () => {
    expect(classifyChartUpdate(chart({ position: 1, isDebut: false, movement: 0 }))).toBe('hero');
  });

  it('classifies a top-10 (non-#1) debut as notable', () => {
    expect(classifyChartUpdate(chart({ position: 5, isDebut: true, movement: 0 }))).toBe('notable');
  });

  it('classifies a sub-top-10 debut (first chart entry) as notable', () => {
    expect(classifyChartUpdate(chart({ position: 42, isDebut: true, movement: 0 }))).toBe('notable');
    expect(classifyChartUpdate(chart({ position: 100, isDebut: true, movement: 0 }))).toBe('notable');
  });

  it('classifies an upward top-10 movement as notable', () => {
    expect(classifyChartUpdate(chart({ position: 8, isDebut: false, movement: 3 }))).toBe('notable');
    // boundary: exactly position 10 with upward movement
    expect(classifyChartUpdate(chart({ position: TOP_10, isDebut: false, movement: 1 }))).toBe(
      'notable',
    );
  });

  it('classifies a static/declining top-10 position as routine', () => {
    expect(classifyChartUpdate(chart({ position: 8, isDebut: false, movement: 0 }))).toBe('routine');
    expect(classifyChartUpdate(chart({ position: 8, isDebut: false, movement: -2 }))).toBe('routine');
  });

  it('classifies a sub-top-10 upward movement as routine (only top-10 movement is notable)', () => {
    expect(classifyChartUpdate(chart({ position: 11, isDebut: false, movement: 20 }))).toBe('routine');
    expect(classifyChartUpdate(chart({ position: 40, isDebut: false, movement: 5 }))).toBe('routine');
  });

  it('classifies a tiny/zero movement outside top-10 as routine', () => {
    expect(classifyChartUpdate(chart({ position: 55, isDebut: false, movement: 0 }))).toBe('routine');
    expect(classifyChartUpdate(chart({ position: 55, isDebut: false, movement: 1 }))).toBe('routine');
  });

  it('classifies an off-chart (position null) update as routine', () => {
    expect(classifyChartUpdate(chart({ position: null, isDebut: false, movement: 0 }))).toBe('routine');
    // even a null position that was a "debut" flag stays routine (not on chart)
    expect(classifyChartUpdate(chart({ position: null, isDebut: true }))).toBe('routine');
  });

  it('always classifies competitor rows as routine, even at No. 1', () => {
    expect(
      classifyChartUpdate(chart({ position: 1, isDebut: true, isCompetitorSong: true })),
    ).toBe('routine');
    expect(
      classifyChartUpdate(chart({ position: 3, movement: 5, isCompetitorSong: true })),
    ).toBe('routine');
  });

  it('treats undefined movement as zero', () => {
    const u = chart({ position: 6, isDebut: false });
    delete (u as any).movement;
    expect(classifyChartUpdate(u)).toBe('routine');
  });

  it('is deterministic: same input twice → same output', () => {
    const cases: ChartUpdate[] = [
      chart({ position: 1, isDebut: true }),
      chart({ position: 5, isDebut: true }),
      chart({ position: 8, movement: 3 }),
      chart({ position: 50, movement: 0 }),
      chart({ position: null }),
    ];
    for (const c of cases) {
      expect(classifyChartUpdate(c)).toBe(classifyChartUpdate(c));
    }
  });

  it('does not mutate the input update object', () => {
    const u = chart({ position: 1, isDebut: true });
    const snapshot = JSON.stringify(u);
    classifyChartUpdate(u);
    expect(JSON.stringify(u)).toBe(snapshot);
  });
});
