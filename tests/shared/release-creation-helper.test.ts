import { describe, it, expect } from 'vitest';
import {
  buildReleaseSongRows,
  createReleaseWithSongs,
  type ReleaseCreationOps,
  type ReleaseRowInput,
} from '@shared/engine/releaseCreation';

/**
 * Engine-verbs M1b — shared release-creation core (shared/engine/releaseCreation.ts).
 *
 * Parity contract: this helper is the lifted body of releasePlanningService's
 * inline creation block. The service's route behavior stays byte-identical
 * because the helper preserves (a) the exact junction-row shape the service
 * always built (id/createdAt included, trackNumber = selection order) and
 * (b) the exact step ORDER: insert release → reserve songs → junction rows.
 */

const RELEASE_ROW: ReleaseRowInput = {
  gameId: 'game-1',
  artistId: 'artist-1',
  title: 'Test Single',
  type: 'single',
  releaseWeek: 13,
  status: 'planned',
  marketingBudget: 0,
  metadata: { attachedHype: 0 },
};

describe('buildReleaseSongRows', () => {
  it('builds junction rows exactly the way releasePlanningService always has', () => {
    const rows = buildReleaseSongRows('rel-1', ['s-a', 's-b', 's-c']);
    expect(rows).toHaveLength(3);
    rows.forEach((row, index) => {
      expect(row.releaseId).toBe('rel-1');
      expect(row.songId).toBe(['s-a', 's-b', 's-c'][index]);
      expect(row.trackNumber).toBe(index + 1); // track order = selection order
      expect(typeof row.id).toBe('string'); // crypto.randomUUID()
      expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(row.createdAt).toBeInstanceOf(Date);
    });
    // ids are unique per row
    expect(new Set(rows.map((r) => r.id)).size).toBe(3);
  });
});

describe('createReleaseWithSongs', () => {
  it('runs the three creation steps in the service order and returns the created release', async () => {
    const calls: string[] = [];
    const captured: Record<string, any> = {};
    const ops: ReleaseCreationOps = {
      insertRelease: async (row) => {
        calls.push('insertRelease');
        captured.releaseRow = row;
        return { ...row, id: 'rel-9' };
      },
      reserveSongsForRelease: async (songIds, releaseId) => {
        calls.push('reserveSongsForRelease');
        captured.reserved = { songIds, releaseId };
      },
      insertReleaseSongs: async (rows) => {
        calls.push('insertReleaseSongs');
        captured.junctionRows = rows;
      },
    };

    const created = await createReleaseWithSongs(ops, RELEASE_ROW, ['s-1', 's-2']);

    // Step ORDER is load-bearing (release id feeds the later steps).
    expect(calls).toEqual(['insertRelease', 'reserveSongsForRelease', 'insertReleaseSongs']);
    expect(created.id).toBe('rel-9');
    expect(captured.releaseRow).toBe(RELEASE_ROW); // row passed through untouched
    expect(captured.reserved).toEqual({ songIds: ['s-1', 's-2'], releaseId: 'rel-9' });
    expect(captured.junctionRows.map((r: any) => [r.songId, r.trackNumber])).toEqual([
      ['s-1', 1],
      ['s-2', 2],
    ]);
    expect(captured.junctionRows.every((r: any) => r.releaseId === 'rel-9')).toBe(true);
  });

  it('propagates an insertRelease failure without running the later steps', async () => {
    const calls: string[] = [];
    const ops: ReleaseCreationOps = {
      insertRelease: async () => {
        calls.push('insertRelease');
        throw new Error('insert failed');
      },
      reserveSongsForRelease: async () => {
        calls.push('reserveSongsForRelease');
      },
      insertReleaseSongs: async () => {
        calls.push('insertReleaseSongs');
      },
    };
    await expect(createReleaseWithSongs(ops, RELEASE_ROW, ['s-1'])).rejects.toThrow('insert failed');
    expect(calls).toEqual(['insertRelease']);
  });
});
