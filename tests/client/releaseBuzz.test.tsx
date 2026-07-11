/**
 * Awareness slice 2: release-card Buzz aggregation + section render.
 *
 * Pure-module tests (house preference, mirrors TourCityCard.test.tsx — no
 * full ReleaseWorkflowCard mount): the aggregation lives in
 * summarizeReleaseBuzz and the section is its own component, both exercised
 * with plain song fixtures shaped like the drizzle rows the songs endpoint
 * returns (awareness / breakthrough_achieved / isReleased / releaseWeek).
 *
 * Fork D: hottest song = MAX awareness (not average).
 * Fork E: qualitative phase strings only — the label map is pinned here so
 * a multiplier number can't sneak back in unnoticed.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  summarizeReleaseBuzz,
  summarizeAnticipation,
  BUZZ_PHASE_LABELS,
  BUZZ_SUSTAIN_STRONG_MIN,
  BUZZ_SUSTAIN_MIN,
  MARKETING_CHANNEL_PERSONALITIES,
  MARKETING_QUALITY_NOTE,
} from '@/lib/releaseBuzz';
import { ReleaseBuzzSection } from '@/components/ReleaseBuzzSection';

// Fixture mirroring the drizzle song row shape reaching the client
// (schema.ts: awareness, breakthrough_achieved are snake-cased properties;
// isReleased / releaseWeek are camelCase).
const song = (overrides: Record<string, any> = {}) => ({
  id: 's1',
  title: 'Neon Nights',
  isReleased: true,
  releaseWeek: 10,
  awareness: 50,
  breakthrough_achieved: false,
  ...overrides,
});

describe('summarizeReleaseBuzz', () => {
  it('picks the MAX-awareness released song as hottest (fork D), not an average', () => {
    const summary = summarizeReleaseBuzz(
      [
        song({ id: 'a', title: 'Filler One', awareness: 12 }),
        song({ id: 'b', title: 'The Hit', awareness: 84 }),
        song({ id: 'c', title: 'Filler Two', awareness: 3 }),
      ],
      12
    );
    expect(summary.hottestSong).toEqual({ title: 'The Hit', awareness: 84 });
  });

  it('ignores unreleased songs entirely (awareness and breakthroughs)', () => {
    const summary = summarizeReleaseBuzz(
      [
        song({ id: 'a', title: 'Unreleased Banger', awareness: 99, breakthrough_achieved: true, isReleased: false }),
        song({ id: 'b', title: 'Live One', awareness: 20 }),
      ],
      12
    );
    expect(summary.hottestSong).toEqual({ title: 'Live One', awareness: 20 });
    expect(summary.breakthroughCount).toBe(0);
  });

  it('counts breakthroughs across the release\'s released songs', () => {
    const summary = summarizeReleaseBuzz(
      [
        song({ id: 'a', breakthrough_achieved: true, awareness: 88 }),
        song({ id: 'b', title: 'Second Fire', breakthrough_achieved: true, awareness: 71 }),
        song({ id: 'c', title: 'Quiet', awareness: 5 }),
      ],
      12
    );
    expect(summary.breakthroughCount).toBe(2);
  });

  it('returns null hottestSong when all released songs have awareness 0 (no section)', () => {
    const summary = summarizeReleaseBuzz(
      [song({ awareness: 0 }), song({ id: 's2', title: 'Also Zero', awareness: 0 })],
      12
    );
    expect(summary.hottestSong).toBeNull();
    expect(summary.phase).toBeNull();
    expect(summary.phaseLabel).toBeNull();
  });

  it('returns null hottestSong for an empty song list', () => {
    expect(summarizeReleaseBuzz([], 12).hottestSong).toBeNull();
  });

  describe('building phase (weeks 1-4 since release)', () => {
    // Engine convention: weeksSinceRelease = currentWeek - releaseWeek (release week 10).
    it.each([
      [11, 1],
      [12, 2],
      [14, 4],
    ])('currentWeek %i → building week %i of 4', (currentWeek, weekOf4) => {
      const summary = summarizeReleaseBuzz([song()], currentWeek);
      expect(summary.phase).toBe('building');
      expect(summary.buildingWeek).toBe(weekOf4);
      expect(summary.phaseLabel).toBe(`building — week ${weekOf4} of 4`);
    });

    it('clamps the release week itself (weeksSince 0, seeded awareness) to week 1 of 4', () => {
      const summary = summarizeReleaseBuzz([song()], 10);
      expect(summary.phase).toBe('building');
      expect(summary.buildingWeek).toBe(1);
    });
  });

  describe('weeks 5+ bands (display-only constants, fork E)', () => {
    const atWeek5 = (awareness: number) => summarizeReleaseBuzz([song({ awareness })], 15);

    it('awareness 70 (boundary) → "sustaining strongly"', () => {
      const summary = atWeek5(BUZZ_SUSTAIN_STRONG_MIN);
      expect(summary.phase).toBe('sustaining');
      expect(summary.phaseLabel).toBe('sustaining strongly');
    });

    it('awareness 69 → "sustaining"', () => {
      expect(atWeek5(69).phaseLabel).toBe('sustaining');
    });

    it('awareness 30 (boundary) → "sustaining"', () => {
      const summary = atWeek5(BUZZ_SUSTAIN_MIN);
      expect(summary.phase).toBe('sustaining');
      expect(summary.phaseLabel).toBe('sustaining');
    });

    it('awareness 29 → "fading"', () => {
      const summary = atWeek5(29);
      expect(summary.phase).toBe('fading');
      expect(summary.phaseLabel).toBe('fading');
    });

    it('awareness 1 (boundary) → "fading"', () => {
      expect(atWeek5(1).phaseLabel).toBe('fading');
    });

    it('awareness 0 → no section at all (null, not "fading")', () => {
      expect(atWeek5(0).hottestSong).toBeNull();
    });
  });

  it('yields hottest song without a phase line when releaseWeek is unknown', () => {
    const summary = summarizeReleaseBuzz([song({ releaseWeek: null })], 15);
    expect(summary.hottestSong).toEqual({ title: 'Neon Nights', awareness: 50 });
    expect(summary.phase).toBeNull();
    expect(summary.phaseLabel).toBeNull();
  });

  it('pins the qualitative label map — no multiplier numbers anywhere (fork E)', () => {
    expect(BUZZ_PHASE_LABELS.building(2)).toBe('building — week 2 of 4');
    expect(BUZZ_PHASE_LABELS.sustainingStrongly).toBe('sustaining strongly');
    expect(BUZZ_PHASE_LABELS.sustaining).toBe('sustaining');
    expect(BUZZ_PHASE_LABELS.fading).toBe('fading');
    for (const label of [BUZZ_PHASE_LABELS.sustainingStrongly, BUZZ_PHASE_LABELS.sustaining, BUZZ_PHASE_LABELS.fading, BUZZ_PHASE_LABELS.building(3)]) {
      expect(label).not.toMatch(/[×x]\s*\d/); // no ×N multiplier leakage
    }
  });
});

describe('ReleaseBuzzSection', () => {
  it('renders label, hottest song, 0-100 value, breakthrough badge, and phase text', () => {
    render(
      <ReleaseBuzzSection
        songs={[
          song({ id: 'a', title: 'The Hit', awareness: 84, breakthrough_achieved: true }),
          song({ id: 'b', title: 'Filler', awareness: 10 }),
        ]}
        currentWeek={12}
      />
    );

    expect(screen.getByText('Buzz')).toBeInTheDocument();
    expect(screen.getByText('The Hit')).toBeInTheDocument();
    expect(screen.getByText('84/100')).toBeInTheDocument();
    expect(screen.getByText(/🔥 1 breakthrough/)).toBeInTheDocument();
    expect(screen.getByText('building — week 2 of 4')).toBeInTheDocument();
  });

  it('omits the breakthrough badge when count is 0 and pluralizes when > 1', () => {
    const { rerender } = render(
      <ReleaseBuzzSection songs={[song({ awareness: 40 })]} currentWeek={16} />
    );
    expect(screen.queryByText(/breakthrough/)).not.toBeInTheDocument();
    expect(screen.getByText('sustaining')).toBeInTheDocument();

    rerender(
      <ReleaseBuzzSection
        songs={[
          song({ id: 'a', awareness: 80, breakthrough_achieved: true }),
          song({ id: 'b', title: 'Other Fire', awareness: 75, breakthrough_achieved: true }),
        ]}
        currentWeek={16}
      />
    );
    expect(screen.getByText(/🔥 2 breakthroughs/)).toBeInTheDocument();
  });

  it('renders NOTHING for a zero-awareness release (no empty-state box)', () => {
    const { container } = render(
      <ReleaseBuzzSection songs={[song({ awareness: 0 }), song({ id: 'b', awareness: 0 })]} currentWeek={12} />
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId('release-buzz-section')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Buzz-v2 slice 3 — pre-release anticipation strength word.
// ---------------------------------------------------------------------------
describe('summarizeAnticipation (buzz-v2 slice 3)', () => {
  it('returns null when no song has any pre-built awareness', () => {
    expect(summarizeAnticipation([{ awareness: 0 }, { awareness: 0 }])).toBeNull();
    expect(summarizeAnticipation([])).toBeNull();
    expect(summarizeAnticipation(undefined)).toBeNull();
  });

  it('derives the strength word from the HOTTEST song awareness, using the shared bands', () => {
    // early: 1..(BUZZ_SUSTAIN_MIN-1)
    expect(summarizeAnticipation([{ awareness: 5 }, { awareness: BUZZ_SUSTAIN_MIN - 1 }])).toBe('early');
    // building: BUZZ_SUSTAIN_MIN..(BUZZ_SUSTAIN_STRONG_MIN-1)
    expect(summarizeAnticipation([{ awareness: BUZZ_SUSTAIN_MIN }])).toBe('building');
    expect(summarizeAnticipation([{ awareness: BUZZ_SUSTAIN_STRONG_MIN - 1 }])).toBe('building');
    // strong: >= BUZZ_SUSTAIN_STRONG_MIN
    expect(summarizeAnticipation([{ awareness: BUZZ_SUSTAIN_STRONG_MIN }, { awareness: 10 }])).toBe('strong');
  });

  it('emits no multiplier numbers in the strength words (fork E guard)', () => {
    for (const a of [5, 40, 90]) {
      const word = summarizeAnticipation([{ awareness: a }]);
      expect(word).not.toMatch(/[×x]\s*\d/);
    }
  });
});

// ---------------------------------------------------------------------------
// Buzz-v2 slice 5 — marketing channel personality + quality legibility copy.
// Fork E (standing rule): qualitative only — no formulas, no coefficients, no
// "×N" multiplier numbers, no dollar-figure formulas anywhere in this copy.
// ---------------------------------------------------------------------------
describe('MARKETING_CHANNEL_PERSONALITIES (buzz-v2 slice 5)', () => {
  const REAL_CHANNEL_KEYS = ['pr', 'influencer', 'digital', 'radio'];

  it('has a non-empty personality line for every real engine channel key', () => {
    for (const key of REAL_CHANNEL_KEYS) {
      expect(MARKETING_CHANNEL_PERSONALITIES[key]).toBeTruthy();
      expect(typeof MARKETING_CHANNEL_PERSONALITIES[key]).toBe('string');
      expect(MARKETING_CHANNEL_PERSONALITIES[key].length).toBeGreaterThan(0);
    }
  });

  it('emits no multiplier numbers or dollar-formula figures in any channel line', () => {
    for (const line of Object.values(MARKETING_CHANNEL_PERSONALITIES)) {
      expect(line).not.toMatch(/[×x]\s*\d/);
      expect(line).not.toMatch(/\$\d/);
    }
  });

  it('quality note is qualitative only (fork E guard)', () => {
    expect(MARKETING_QUALITY_NOTE).toBeTruthy();
    expect(MARKETING_QUALITY_NOTE).not.toMatch(/[×x]\s*\d/);
    expect(MARKETING_QUALITY_NOTE).not.toMatch(/\$\d/);
  });
});
