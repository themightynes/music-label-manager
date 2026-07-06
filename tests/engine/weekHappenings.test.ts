import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  deriveWeekHappenings,
  MOOD_CRATER_THRESHOLD,
  type DeriveWeekHappeningsInput,
} from '@shared/engine/weekHappenings';

/**
 * Tier 2 (PR-1) — unit tests for the pure happening-derivation function
 * (shared/engine/weekHappenings.ts). Pure, no DB.
 */

const EMPTY_INPUT: DeriveWeekHappeningsInput = {
  artists: [],
  releases: [],
  moodEvents: [],
  chartEntries: [],
};

describe('deriveWeekHappenings — freshness window', () => {
  it('week N-2 is excluded (too stale)', () => {
    const happenings = deriveWeekHappenings(
      { ...EMPTY_INPUT, artists: [{ id: 'a1', name: 'Artist', signedWeek: 3 }] },
      6 // targetWeek = 5, signedWeek = 3 → excluded
    );
    expect(happenings).toEqual([]);
  });

  it('week N-1 is included (fresh)', () => {
    const happenings = deriveWeekHappenings(
      { ...EMPTY_INPUT, artists: [{ id: 'a1', name: 'Artist', signedWeek: 5 }] },
      6
    );
    expect(happenings).toHaveLength(1);
    expect(happenings[0]).toMatchObject({ type: 'recent_signing', week: 5, artistId: 'a1' });
  });

  it('week N (this week) is excluded (not last week)', () => {
    const happenings = deriveWeekHappenings(
      { ...EMPTY_INPUT, artists: [{ id: 'a1', name: 'Artist', signedWeek: 6 }] },
      6
    );
    expect(happenings).toEqual([]);
  });

  it('currentWeek 0 or negative targetWeek never throws, returns empty', () => {
    expect(deriveWeekHappenings(EMPTY_INPUT, 0)).toEqual([]);
  });
});

describe('deriveWeekHappenings — recent_signing', () => {
  it('fires once per artist signed exactly last week', () => {
    const happenings = deriveWeekHappenings(
      {
        ...EMPTY_INPUT,
        artists: [
          { id: 'a1', name: 'Fresh Signing', signedWeek: 4 },
          { id: 'a2', name: 'Old Signing', signedWeek: 1 },
        ],
      },
      5
    );
    expect(happenings).toEqual([
      { type: 'recent_signing', week: 4, artistId: 'a1', artistName: 'Fresh Signing' },
    ]);
  });
});

describe('deriveWeekHappenings — release_out', () => {
  it('fires for a release whose releaseWeek is exactly last week, carries artist name via join', () => {
    const happenings = deriveWeekHappenings(
      {
        ...EMPTY_INPUT,
        artists: [{ id: 'a1', name: 'Release Artist' }],
        releases: [{ id: 'r1', releaseWeek: 4, artistId: 'a1', status: 'released' }],
      },
      5
    );
    expect(happenings).toEqual([
      { type: 'release_out', week: 4, releaseId: 'r1', artistId: 'a1', artistName: 'Release Artist' },
    ]);
  });

  it('does not fire for a release scheduled for a different week', () => {
    const happenings = deriveWeekHappenings(
      { ...EMPTY_INPUT, releases: [{ id: 'r1', releaseWeek: 2, status: 'released' }] },
      5
    );
    expect(happenings).toEqual([]);
  });

  it('does NOT fire for a stale still-planned release whose week slipped past', () => {
    const happenings = deriveWeekHappenings(
      { ...EMPTY_INPUT, releases: [{ id: 'r1', releaseWeek: 4, status: 'planned' }] },
      5
    );
    expect(happenings).toEqual([]);
  });

  it('fires for a catalog-status release that went out last week', () => {
    const happenings = deriveWeekHappenings(
      { ...EMPTY_INPUT, releases: [{ id: 'r1', releaseWeek: 4, status: 'catalog' }] },
      5
    );
    expect(happenings).toHaveLength(1);
    expect(happenings[0]).toMatchObject({ type: 'release_out', releaseId: 'r1' });
  });
});

describe('deriveWeekHappenings — chart_debut', () => {
  it('fires for a player song with isDebut true at week N-1', () => {
    const happenings = deriveWeekHappenings(
      {
        ...EMPTY_INPUT,
        artists: [{ id: 'a1', name: 'Chart Artist' }],
        chartEntries: [
          { songId: 's1', songTitle: 'Hit Single', artistId: 'a1', isDebut: true, isCompetitorSong: false },
        ],
      },
      5
    );
    expect(happenings).toEqual([
      { type: 'chart_debut', week: 4, songId: 's1', songTitle: 'Hit Single', artistId: 'a1', artistName: 'Chart Artist' },
    ]);
  });

  it('does not fire for a non-debut chart entry', () => {
    const happenings = deriveWeekHappenings(
      { ...EMPTY_INPUT, chartEntries: [{ songId: 's1', isDebut: false }] },
      5
    );
    expect(happenings).toEqual([]);
  });

  it('does not fire for a competitor song even if isDebut somehow true', () => {
    const happenings = deriveWeekHappenings(
      {
        ...EMPTY_INPUT,
        chartEntries: [{ songId: undefined, isDebut: true, isCompetitorSong: true }],
      },
      5
    );
    expect(happenings).toEqual([]);
  });
});

describe('deriveWeekHappenings — mood_crater (boundary-straddle)', () => {
  it('fires when moodBefore > threshold and moodAfter <= threshold (crossing INTO low band)', () => {
    const happenings = deriveWeekHappenings(
      {
        ...EMPTY_INPUT,
        artists: [{ id: 'a1', name: 'Burning Out' }],
        moodEvents: [
          { artistId: 'a1', weekOccurred: 4, moodBefore: MOOD_CRATER_THRESHOLD + 5, moodAfter: MOOD_CRATER_THRESHOLD },
        ],
      },
      5
    );
    expect(happenings).toEqual([
      { type: 'mood_crater', week: 4, artistId: 'a1', artistName: 'Burning Out' },
    ]);
  });

  it('does NOT fire if already at/below threshold in the prior state (no fresh straddle)', () => {
    const happenings = deriveWeekHappenings(
      {
        ...EMPTY_INPUT,
        moodEvents: [
          { artistId: 'a1', weekOccurred: 4, moodBefore: MOOD_CRATER_THRESHOLD, moodAfter: MOOD_CRATER_THRESHOLD - 5 },
        ],
      },
      5
    );
    expect(happenings).toEqual([]);
  });

  it('does not fire for a mood improvement (crossing back OUT of low band)', () => {
    const happenings = deriveWeekHappenings(
      {
        ...EMPTY_INPUT,
        moodEvents: [
          { artistId: 'a1', weekOccurred: 4, moodBefore: MOOD_CRATER_THRESHOLD - 5, moodAfter: MOOD_CRATER_THRESHOLD + 5 },
        ],
      },
      5
    );
    expect(happenings).toEqual([]);
  });

  it('threshold is pinned to the low/very_low band boundary from data/balance/artists.json (low: [21, 40] ⇒ threshold 20)', () => {
    // Guard against silent drift between the balance JSON and the pinned
    // constant: the "low" band's authored lower bound minus 1 IS the threshold.
    const artistsBalance = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'data/balance/artists.json'), 'utf-8')
    );
    const lowBand = artistsBalance.artist_stats.mood_effects.low; // [min, max, modifier]
    expect(MOOD_CRATER_THRESHOLD).toBe(lowBand[0] - 1);
  });

  it('does not fire for a mood event outside the freshness window', () => {
    const happenings = deriveWeekHappenings(
      {
        ...EMPTY_INPUT,
        moodEvents: [
          { artistId: 'a1', weekOccurred: 2, moodBefore: MOOD_CRATER_THRESHOLD + 5, moodAfter: MOOD_CRATER_THRESHOLD },
        ],
      },
      5
    );
    expect(happenings).toEqual([]);
  });
});

describe('deriveWeekHappenings — multiple simultaneous happenings', () => {
  it('returns one entry per distinct happening in the same week', () => {
    const happenings = deriveWeekHappenings(
      {
        artists: [
          { id: 'a1', name: 'Signee', signedWeek: 4 },
          { id: 'a2', name: 'Craterer' },
        ],
        releases: [{ id: 'r1', releaseWeek: 4, artistId: 'a1', status: 'released' }],
        moodEvents: [
          { artistId: 'a2', weekOccurred: 4, moodBefore: MOOD_CRATER_THRESHOLD + 1, moodAfter: MOOD_CRATER_THRESHOLD },
        ],
        chartEntries: [{ songId: 's1', artistId: 'a1', isDebut: true }],
      },
      5
    );
    const types = happenings.map((h) => h.type).sort();
    expect(types).toEqual(['chart_debut', 'mood_crater', 'recent_signing', 'release_out']);
  });
});
