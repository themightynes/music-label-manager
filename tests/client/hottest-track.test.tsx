/**
 * Awareness slice 3: dashboard "Hottest track" stat + the two-Buzz
 * disambiguation tooltips (fork C).
 *
 * Pure-module + light render tests (house preference, mirrors
 * releaseBuzz.test.tsx / TourStatusStrip.test.tsx — no full
 * MetricsDashboard/SongCatalog mount):
 *   - findHottestTrack: max among RELEASED songs only, unreleased excluded,
 *     empty/zero → null, breakthrough flag carried through.
 *   - HottestTrackStat: title + N/100, 🔥 only on breakthrough, quiet em-dash
 *     placeholder when there is no hottest track.
 *   - SongBuzzChip: the song-level Buzz tooltip copy is wired on the chip and
 *     is its OWN copy (not the meetings awareness_boost copy), with the
 *     cross-reference sentence and (fork E) no multiplier numbers.
 *   - EFFECT_CHANNEL_DESCRIPTIONS.awareness_boost: carries the reverse
 *     cross-reference clause distinguishing it from song-level live Buzz.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { findHottestTrack, SONG_BUZZ_TOOLTIP } from '@/lib/releaseBuzz';
import { HottestTrackStat } from '@/components/MetricsDashboard';
import { SongBuzzChip } from '@/components/SongCatalog';
import { EFFECT_CHANNEL_DESCRIPTIONS } from '@shared/engine/processors/ActionProcessor';

// Fixture mirroring the drizzle song row shape reaching the client via useSongs
// (awareness / breakthrough_achieved snake-cased; isReleased camelCase).
const song = (overrides: Record<string, any> = {}) => ({
  id: 's1',
  title: 'Neon Nights',
  isReleased: true,
  releaseWeek: 10,
  awareness: 50,
  breakthrough_achieved: false,
  ...overrides,
});

describe('findHottestTrack', () => {
  it('picks the MAX-awareness song across the catalog (fork D)', () => {
    const hottest = findHottestTrack([
      song({ id: 'a', title: 'Filler', awareness: 12 }),
      song({ id: 'b', title: 'The Hit', awareness: 84 }),
      song({ id: 'c', title: 'Also Filler', awareness: 40 }),
    ]);
    expect(hottest).toEqual({ title: 'The Hit', awareness: 84, breakthrough: false });
  });

  it('considers RELEASED songs only — a hotter unreleased song is excluded', () => {
    const hottest = findHottestTrack([
      song({ id: 'a', title: 'Unreleased Banger', awareness: 99, isReleased: false }),
      song({ id: 'b', title: 'Live One', awareness: 20 }),
    ]);
    expect(hottest).toEqual({ title: 'Live One', awareness: 20, breakthrough: false });
  });

  it('returns null when no released song has awareness > 0', () => {
    expect(findHottestTrack([song({ awareness: 0 }), song({ id: 's2', awareness: 0 })])).toBeNull();
  });

  it('returns null for an empty or undefined catalog', () => {
    expect(findHottestTrack([])).toBeNull();
    expect(findHottestTrack(undefined)).toBeNull();
  });

  it('carries the hottest song\'s breakthrough flag (🔥 condition)', () => {
    const hottest = findHottestTrack([
      song({ id: 'a', title: 'Broke Through', awareness: 84, breakthrough_achieved: true }),
      song({ id: 'b', title: 'Quiet', awareness: 30 }),
    ]);
    expect(hottest?.breakthrough).toBe(true);
  });

  it('does NOT borrow a breakthrough from a non-hottest song', () => {
    const hottest = findHottestTrack([
      song({ id: 'a', title: 'Old Fire', awareness: 10, breakthrough_achieved: true }),
      song({ id: 'b', title: 'New Peak', awareness: 60 }),
    ]);
    expect(hottest).toEqual({ title: 'New Peak', awareness: 60, breakthrough: false });
  });
});

describe('HottestTrackStat', () => {
  it('renders the hottest released song\'s title and its buzz value as N/100', () => {
    render(
      <HottestTrackStat
        songs={[song({ title: 'The Hit', awareness: 84 }), song({ id: 'b', title: 'Filler', awareness: 12 })]}
      />
    );
    const stat = screen.getByTestId('hottest-track-stat');
    expect(stat).toHaveTextContent('Hottest track');
    expect(stat).toHaveTextContent('The Hit');
    expect(stat).toHaveTextContent('84');
    expect(stat).toHaveTextContent('/100');
    expect(screen.queryByRole('img', { name: 'breakthrough' })).not.toBeInTheDocument();
  });

  it('shows the 🔥 icon only when the hottest song broke through', () => {
    render(
      <HottestTrackStat songs={[song({ title: 'Broke Through', awareness: 91, breakthrough_achieved: true })]} />
    );
    expect(screen.getByRole('img', { name: 'breakthrough' })).toHaveTextContent('🔥');
  });

  it('renders the quiet em-dash placeholder when no released song has awareness > 0', () => {
    render(<HottestTrackStat songs={[song({ awareness: 0 }), song({ id: 'b', awareness: 55, isReleased: false })]} />);
    const stat = screen.getByTestId('hottest-track-stat');
    expect(stat).toHaveTextContent('—');
    expect(stat).toHaveTextContent('Hottest track');
    expect(stat).not.toHaveTextContent('/100');
  });

  it('renders the placeholder while songs are still loading (undefined)', () => {
    render(<HottestTrackStat songs={undefined} />);
    expect(screen.getByTestId('hottest-track-stat')).toHaveTextContent('—');
  });
});

describe('SongBuzzChip tooltip (fork C — song-level side)', () => {
  it('wires the song-level Buzz copy onto the chip trigger', () => {
    render(<SongBuzzChip awareness={42} />);
    const trigger = screen.getByTestId('song-buzz-chip');
    expect(trigger).toHaveAttribute('aria-label', `Buzz: ${SONG_BUZZ_TOOLTIP}`);
    expect(trigger).toHaveClass('cursor-help');
    // The chip value still renders.
    expect(trigger).toHaveTextContent('42');
  });

  it('has its OWN copy — distinct from the meetings awareness_boost channel copy', () => {
    expect(SONG_BUZZ_TOOLTIP).not.toBe(EFFECT_CHANNEL_DESCRIPTIONS.awareness_boost.text);
    // The load-bearing pieces of the slice-3 copy: the live mechanic...
    expect(SONG_BUZZ_TOOLTIP).toContain('Cultural buzz (0–100)');
    expect(SONG_BUZZ_TOOLTIP).toContain('release weeks 1–4');
    // ...and the cross-reference sentence to the meeting channel.
    expect(SONG_BUZZ_TOOLTIP).toContain('NEXT release');
    // Fork E: qualitative only — no multiplier number sneaks in.
    expect(SONG_BUZZ_TOOLTIP).not.toMatch(/[×x]\s?\d/);
    expect(SONG_BUZZ_TOOLTIP).not.toContain('2.0');
  });
});

describe('awareness_boost channel copy (fork C — meetings side)', () => {
  it('cross-references the song-level live Buzz stat', () => {
    expect(EFFECT_CHANNEL_DESCRIPTIONS.awareness_boost.text).toContain(
      "Separate from a released song's live Buzz stat"
    );
    // Still the banked-seed mechanic description underneath.
    expect(EFFECT_CHANNEL_DESCRIPTIONS.awareness_boost.title).toBe('Buzz');
    expect(EFFECT_CHANNEL_DESCRIPTIONS.awareness_boost.text).toContain('banked for your next release');
  });
});
