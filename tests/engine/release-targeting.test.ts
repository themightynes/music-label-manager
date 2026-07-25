import { describe, it, expect } from 'vitest';
import {
  pickTargetReleasedSong,
  pickLatestReleasedRelease,
} from '@shared/engine/releaseTargeting';

/**
 * Engine-verbs arc Tier 2 (slices 8-10) — the shared released-row targeting rule.
 * Pure-function tests, zero DB: the same helper backs promote_release,
 * catalog_damage (song-level) and grant_inventory, transfer_revenue_stream
 * (release-level), so the default target rule is pinned HERE once.
 */

describe('pickTargetReleasedSong — highest-awareness currently-released song', () => {
  const songs = [
    { id: 's-a', artistId: 'artist-1', awareness: 40, releaseWeek: 4 },
    { id: 's-b', artistId: 'artist-1', awareness: 70, releaseWeek: 8 },
    { id: 's-c', artistId: 'artist-2', awareness: 90, releaseWeek: 6 },
  ];

  it('label-wide (no artistId): picks the highest-awareness song across the roster', () => {
    expect(pickTargetReleasedSong(songs)?.id).toBe('s-c');
  });

  it('artist-scoped: picks that artist\'s highest-awareness song, never another artist\'s', () => {
    expect(pickTargetReleasedSong(songs, 'artist-1')?.id).toBe('s-b');
  });

  it('returns null (no cross-artist fallback) when the targeted artist has nothing out', () => {
    expect(pickTargetReleasedSong(songs, 'artist-3')).toBeNull();
  });

  it('returns null for empty/absent input', () => {
    expect(pickTargetReleasedSong([])).toBeNull();
    expect(pickTargetReleasedSong(null)).toBeNull();
    expect(pickTargetReleasedSong(undefined)).toBeNull();
  });

  it('awareness tie breaks to the later releaseWeek, then lexicographic id (deterministic)', () => {
    const tied = [
      { id: 's-x', artistId: 'a', awareness: 50, releaseWeek: 3 },
      { id: 's-y', artistId: 'a', awareness: 50, releaseWeek: 7 },
    ];
    expect(pickTargetReleasedSong(tied)?.id).toBe('s-y');

    const fullyTied = [
      { id: 's-z', artistId: 'a', awareness: 50, releaseWeek: 7 },
      { id: 's-y', artistId: 'a', awareness: 50, releaseWeek: 7 },
    ];
    expect(pickTargetReleasedSong(fullyTied)?.id).toBe('s-y');
    // Order-independent: reversing the input yields the same pick.
    expect(pickTargetReleasedSong([...fullyTied].reverse())?.id).toBe('s-y');
  });

  it('excludes rows explicitly marked isReleased: false', () => {
    const mixed = [
      { id: 's-out', artistId: 'a', awareness: 10, isReleased: true },
      { id: 's-unreleased', artistId: 'a', awareness: 99, isReleased: false },
    ];
    expect(pickTargetReleasedSong(mixed)?.id).toBe('s-out');
  });

  it('treats missing awareness as 0', () => {
    const noAwareness = [
      { id: 's-1', artistId: 'a' },
      { id: 's-2', artistId: 'a', awareness: 1 },
    ];
    expect(pickTargetReleasedSong(noAwareness)?.id).toBe('s-2');
  });
});

describe('pickLatestReleasedRelease — latest released release', () => {
  const releases = [
    { id: 'r-a', artistId: 'artist-1', status: 'released', releaseWeek: 5 },
    { id: 'r-b', artistId: 'artist-1', status: 'released', releaseWeek: 9 },
    { id: 'r-c', artistId: 'artist-2', status: 'catalog', releaseWeek: 12 },
    { id: 'r-planned', artistId: 'artist-1', status: 'planned', releaseWeek: 20 },
  ];

  it('label-wide: latest by releaseWeek across released + catalog rows, never planned', () => {
    expect(pickLatestReleasedRelease(releases)?.id).toBe('r-c');
  });

  it('artist-scoped: latest released release for THAT artist', () => {
    expect(pickLatestReleasedRelease(releases, 'artist-1')?.id).toBe('r-b');
  });

  it('never targets a planned release even when it is the newest row', () => {
    const onlyPlanned = [{ id: 'r-p', artistId: 'a', status: 'planned', releaseWeek: 3 }];
    expect(pickLatestReleasedRelease(onlyPlanned)).toBeNull();
  });

  it('returns null when the targeted artist has no released release', () => {
    expect(pickLatestReleasedRelease(releases, 'artist-3')).toBeNull();
  });

  it('releaseWeek tie breaks to lexicographic id (deterministic, order-independent)', () => {
    const tied = [
      { id: 'r-z', artistId: 'a', status: 'released', releaseWeek: 4 },
      { id: 'r-y', artistId: 'a', status: 'released', releaseWeek: 4 },
    ];
    expect(pickLatestReleasedRelease(tied)?.id).toBe('r-y');
    expect(pickLatestReleasedRelease([...tied].reverse())?.id).toBe('r-y');
  });
});
