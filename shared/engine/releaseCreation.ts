/**
 * Shared release-creation core (engine-verbs Tier 2, slice 7 — M1b spawn_release).
 *
 * The rich planned-release creation lived ONLY inside
 * `server/services/releasePlanningService.ts` (route-side, inside its own
 * `db.transaction`): insert the releases row, reserve the songs
 * (songs.releaseId), and write the release_songs junction rows. The
 * `spawn_release` effect key needs the SAME three-step core from inside the
 * engine's weekly transaction — so the core is lifted here, once, behind a
 * tiny ops interface both call sites implement:
 *
 *   - the service implements the ops over its route transaction (`tx.insert`/
 *     `tx.update` — byte-identical SQL to what it inlined before), and
 *   - ActionProcessor's `spawn_release` case implements them over
 *     `ctx.gameData.createRelease` / `updateSong` / `createReleaseSong`
 *     threaded with the engine's `ctx.dbTransaction` (D6 one-transaction week).
 *
 * The helper is PURE orchestration + row building — no drizzle imports, no
 * RNG, no Date beyond the junction-row `createdAt` stamp the service has
 * always written. Step ORDER is load-bearing and preserved exactly
 * (release → reserve songs → junction rows).
 */

/** The releases-table row shape both call sites insert (id/createdAt are DB-generated). */
export interface ReleaseRowInput {
  gameId: string;
  artistId: string;
  title: string;
  type: string;
  releaseWeek: number;
  status: string;
  marketingBudget: number;
  metadata: Record<string, unknown>;
}

/**
 * Junction-row shape, matching what releasePlanningService has always built.
 * NOTE: `id` and `createdAt` are NOT columns on release_songs (drizzle ignores
 * unknown keys on insert) — they are kept for byte-identical service behavior.
 */
export interface ReleaseSongJunctionRow {
  id: string;
  releaseId: string;
  songId: string;
  trackNumber: number;
  createdAt: Date;
}

/** Persistence seams the two call sites implement (route tx vs. engine gameData+tx). */
export interface ReleaseCreationOps {
  /** Insert the releases row; MUST return the created row (with its generated id). */
  insertRelease(row: ReleaseRowInput): Promise<any>;
  /** Reserve the songs for this release (set songs.releaseId). */
  reserveSongsForRelease(songIds: string[], releaseId: string): Promise<void>;
  /** Insert the release_songs junction rows. */
  insertReleaseSongs(rows: ReleaseSongJunctionRow[]): Promise<void>;
}

/**
 * Builds the release_songs junction rows exactly the way the planning service
 * always has: trackNumber = selection order (index + 1).
 */
export function buildReleaseSongRows(releaseId: string, songIds: string[]): ReleaseSongJunctionRow[] {
  return songIds.map((songId: string, index: number) => ({
    id: crypto.randomUUID(),
    releaseId,
    songId,
    trackNumber: index + 1, // Track order based on selection order
    createdAt: new Date(),
  }));
}

/**
 * The minimal creation core: release row → song reservation → junction rows.
 * Returns the created release row (with its DB-generated id).
 */
export async function createReleaseWithSongs(
  ops: ReleaseCreationOps,
  releaseRow: ReleaseRowInput,
  songIds: string[]
): Promise<any> {
  const newRelease = await ops.insertRelease(releaseRow);
  await ops.reserveSongsForRelease(songIds, newRelease.id);
  const junctionRows = buildReleaseSongRows(newRelease.id, songIds);
  await ops.insertReleaseSongs(junctionRows);
  return newRelease;
}
