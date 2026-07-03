/**
 * buildGameSnapshot shape pins (Phase 3 PR-1).
 *
 * Guards the save-snapshot invariant documented in CLAUDE.md "Save/Load
 * Snapshots": `musicLabel` and every collection are SIBLINGS of `gameState`,
 * never nested inside it. A test that nests them can pass while the real code
 * path is broken (this class of bug shipped a real migration regression).
 */
import { describe, it, expect } from 'vitest';
import { SNAPSHOT_VERSION } from '@shared/schema';
import { buildGameSnapshot } from '@/utils/buildGameSnapshot';

function minimalParams(overrides: Partial<Parameters<typeof buildGameSnapshot>[0]> = {}) {
  return {
    gameState: {
      id: 'game-1',
      currentWeek: 4,
      money: 12345,
      musicLabel: { name: 'My Label' },
    } as any,
    emailSnapshot: { emails: [{ id: 'em1' }], total: 1, unreadCount: 0, truncated: false },
    artists: [{ id: 'a1' }] as any,
    projects: [{ id: 'p1' }] as any,
    roles: [{ id: 'r1' }] as any,
    songs: [{ id: 's1' }],
    releases: [{ id: 'rel1' }],
    releaseSongs: [{ id: 'rs1' }],
    executives: [{ id: 'e1' }],
    moodEvents: [{ id: 'm1' }],
    weeklyActions: [{ id: 'wa1' }] as any,
    weeklyOutcome: { week: 4 },
    ...overrides,
  };
}

describe('buildGameSnapshot shape', () => {
  it('includes snapshotVersion equal to SNAPSHOT_VERSION', () => {
    const snap = buildGameSnapshot(minimalParams()) as any;
    expect(snap.snapshotVersion).toBe(SNAPSHOT_VERSION);
  });

  it('places musicLabel as a top-level SIBLING of gameState, not nested inside it', () => {
    const snap = buildGameSnapshot(minimalParams()) as any;
    expect(snap.musicLabel).toEqual({ name: 'My Label' });
    // The invariant: musicLabel is stripped OUT of gameState.
    expect(snap.gameState.musicLabel).toBeUndefined();
  });

  it('nulls musicLabel when the incoming gameState has no label', () => {
    const snap = buildGameSnapshot(
      minimalParams({ gameState: { id: 'g', currentWeek: 1 } as any }),
    ) as any;
    expect(snap.musicLabel).toBeNull();
  });

  it('places every collection as a top-level sibling of gameState', () => {
    const snap = buildGameSnapshot(minimalParams()) as any;
    expect(snap.artists).toEqual([{ id: 'a1' }]);
    expect(snap.projects).toEqual([{ id: 'p1' }]);
    expect(snap.roles).toEqual([{ id: 'r1' }]);
    expect(snap.songs).toEqual([{ id: 's1' }]);
    expect(snap.releases).toEqual([{ id: 'rel1' }]);
    expect(snap.releaseSongs).toEqual([{ id: 'rs1' }]);
    expect(snap.executives).toEqual([{ id: 'e1' }]);
    expect(snap.moodEvents).toEqual([{ id: 'm1' }]);
    expect(snap.weeklyActions).toEqual([{ id: 'wa1' }]);
    expect(snap.emails).toEqual([{ id: 'em1' }]);
    // None of the collections leaked into gameState.
    for (const key of ['artists', 'projects', 'roles', 'songs', 'releases']) {
      expect((snap.gameState as any)[key]).toBeUndefined();
    }
  });

  it('propagates emailMetadata including the truncated flag', () => {
    const snap = buildGameSnapshot(
      minimalParams({
        emailSnapshot: { emails: [], total: 250, unreadCount: 7, truncated: true },
      }),
    ) as any;
    expect(snap.emailMetadata).toEqual({ total: 250, unreadCount: 7, truncated: true });
  });

  it('defaults weeklyOutcome to null when not provided', () => {
    const snap = buildGameSnapshot(minimalParams({ weeklyOutcome: null })) as any;
    expect(snap.weeklyOutcome).toBeNull();
  });
});
