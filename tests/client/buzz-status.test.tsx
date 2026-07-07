/**
 * Core-status "Buzz" stat (playtest feedback July 6: replaced both the
 * WeekSummary weekly buzz line and the "Hottest track" stat) + the two-Buzz
 * disambiguation tooltips (fork C, awareness slice 3 — still alive).
 *
 * Pure-module + light render tests (house preference, mirrors
 * releaseBuzz.test.tsx / TourStatusStrip.test.tsx — no full
 * MetricsDashboard/SongCatalog mount):
 *   - summarizeCatalogBuzz: building = released songs in release weeks 1-4
 *     (weeksSince = currentWeek - releaseWeek) with awareness > 0; fading =
 *     weeks 5+ with awareness >= 1; unreleased/undated/zero-awareness excluded.
 *   - BuzzStatusStat: `N building · M fading` counts under a "Buzz" label,
 *     quiet em-dash when nothing is building or fading, no multiplier numbers.
 *   - SongBuzzChip: the song-level Buzz tooltip copy is wired on the chip and
 *     is its OWN copy (not the meetings awareness_boost copy), with the
 *     cross-reference sentence and (fork E) no multiplier numbers.
 *   - EFFECT_CHANNEL_DESCRIPTIONS.awareness_boost: carries the reverse
 *     cross-reference clause distinguishing it from song-level live Buzz.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { summarizeCatalogBuzz, SONG_BUZZ_TOOLTIP } from '@/lib/releaseBuzz';
import { BuzzStatusStat } from '@/components/MetricsDashboard';
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

describe('summarizeCatalogBuzz', () => {
  it('counts building (weeks 1-4, awareness > 0) and fading (weeks 5+, awareness >= 1) separately', () => {
    const status = summarizeCatalogBuzz(
      [
        song({ id: 'a', releaseWeek: 10, awareness: 30 }), // week 2 → building
        song({ id: 'b', releaseWeek: 11, awareness: 8 }), // week 1 → building
        song({ id: 'c', releaseWeek: 5, awareness: 40 }), // week 7 → fading
      ],
      12
    );
    expect(status).toEqual({ building: 2, fading: 1 });
  });

  it('treats week 4 as building and week 5 as fading (boundary)', () => {
    const status = summarizeCatalogBuzz(
      [
        song({ id: 'a', releaseWeek: 8, awareness: 20 }), // weeksSince 4 → building
        song({ id: 'b', releaseWeek: 7, awareness: 20 }), // weeksSince 5 → fading
      ],
      12
    );
    expect(status).toEqual({ building: 1, fading: 1 });
  });

  it('excludes unreleased songs regardless of awareness', () => {
    const status = summarizeCatalogBuzz(
      [song({ id: 'a', awareness: 99, isReleased: false })],
      12
    );
    expect(status).toEqual({ building: 0, fading: 0 });
  });

  it('excludes zero-awareness building songs and sub-1 fading songs', () => {
    const status = summarizeCatalogBuzz(
      [
        song({ id: 'a', releaseWeek: 11, awareness: 0 }), // building window, no buzz
        song({ id: 'b', releaseWeek: 2, awareness: 0.5 }), // fading window, < 1
      ],
      12
    );
    expect(status).toEqual({ building: 0, fading: 0 });
  });

  it('excludes songs whose release week is unknown (cannot date the buzz)', () => {
    const status = summarizeCatalogBuzz([song({ id: 'a', releaseWeek: null, awareness: 60 })], 12);
    expect(status).toEqual({ building: 0, fading: 0 });
  });

  it('returns zero counts for an empty or undefined catalog', () => {
    expect(summarizeCatalogBuzz([], 12)).toEqual({ building: 0, fading: 0 });
    expect(summarizeCatalogBuzz(undefined, 12)).toEqual({ building: 0, fading: 0 });
  });
});

describe('BuzzStatusStat', () => {
  it('renders building and fading counts under the Buzz label', () => {
    render(
      <BuzzStatusStat
        songs={[
          song({ id: 'a', releaseWeek: 10, awareness: 30 }),
          song({ id: 'b', releaseWeek: 11, awareness: 8 }),
          song({ id: 'c', releaseWeek: 9, awareness: 12 }),
          song({ id: 'd', releaseWeek: 5, awareness: 40 }),
          song({ id: 'e', releaseWeek: 4, awareness: 25 }),
        ]}
        currentWeek={12}
      />
    );
    const stat = screen.getByTestId('buzz-status-stat');
    expect(stat).toHaveTextContent('Buzz');
    expect(stat).toHaveTextContent('3 building');
    expect(stat).toHaveTextContent('2 fading');
  });

  it('omits the fading segment when nothing is fading (and vice versa)', () => {
    render(<BuzzStatusStat songs={[song({ releaseWeek: 11, awareness: 20 })]} currentWeek={12} />);
    const stat = screen.getByTestId('buzz-status-stat');
    expect(stat).toHaveTextContent('1 building');
    expect(stat).not.toHaveTextContent('fading');
  });

  it('renders the quiet em-dash placeholder when nothing is building or fading', () => {
    render(
      <BuzzStatusStat
        songs={[song({ awareness: 0 }), song({ id: 'b', awareness: 55, isReleased: false })]}
        currentWeek={12}
      />
    );
    const stat = screen.getByTestId('buzz-status-stat');
    expect(stat).toHaveTextContent('—');
    expect(stat).toHaveTextContent('Buzz');
    expect(stat).not.toHaveTextContent('building');
  });

  it('renders the placeholder while songs are still loading (undefined)', () => {
    render(<BuzzStatusStat songs={undefined} currentWeek={12} />);
    expect(screen.getByTestId('buzz-status-stat')).toHaveTextContent('—');
  });

  it('never shows a multiplier number (fork E: qualitative only)', () => {
    render(<BuzzStatusStat songs={[song({ releaseWeek: 11, awareness: 80 })]} currentWeek={12} />);
    expect(screen.getByTestId('buzz-status-stat').textContent).not.toMatch(/[×x]\s*\d/);
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
