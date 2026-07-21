/**
 * releaseTargeting — shared "locate a released row" helpers for the live-economy
 * effect verbs (engine-verbs arc, Tier 2 slices 8-10).
 *
 * The economy was forward-only before this arc: every existing channel banks
 * toward a FUTURE recording/release. These verbs are the first backward-acting
 * ones — they need a deterministic way to pick WHICH already-released row a
 * meeting/event effect lands on. That rule lives here, in pure functions over
 * plain arrays, so:
 *   - ActionProcessor's effect cases and any future consumer share ONE target
 *     rule (no per-key drift), and
 *   - the rule is unit-testable with zero DB/storage plumbing.
 *
 * DEFAULT TARGET RULE (per the engine-verbs plan):
 *   - song-level verbs (promote_release / catalog_damage): the highest-awareness
 *     currently-released song — scoped to the targeted artist when the meeting
 *     carries an artistId, label-wide otherwise. Ties break deterministically
 *     (later releaseWeek wins, then lexicographic id) — never RNG.
 *   - release-level verbs (grant_inventory / transfer_revenue_stream): the
 *     targeted artist's LATEST released release (highest releaseWeek), or the
 *     label-wide latest when no artist is targeted. Same deterministic
 *     tie-breaks.
 *
 * When the targeted artist has NO released row, these return null — the verb
 * no-ops with a warn rather than silently landing on another artist's catalog.
 */

export interface ReleasedSongLike {
  id: string;
  artistId?: string | null;
  awareness?: number | null;
  releaseWeek?: number | null;
  isReleased?: boolean | null;
  title?: string | null;
  peak_awareness?: number | null;
  releaseId?: string | null;
}

export interface ReleaseLike {
  id: string;
  artistId?: string | null;
  status?: string | null;
  releaseWeek?: number | null;
  title?: string | null;
}

/**
 * Highest-awareness currently-released song for the targeted artist (or
 * label-wide when artistId is omitted). Returns null when nothing qualifies.
 */
export function pickTargetReleasedSong<T extends ReleasedSongLike>(
  songs: T[] | null | undefined,
  artistId?: string
): T | null {
  if (!Array.isArray(songs) || songs.length === 0) return null;

  const candidates = songs.filter((s) => {
    if (!s || !s.id) return false;
    // getReleasedSongs already filters to released rows, but defend against a
    // caller passing a raw song list.
    if (s.isReleased === false) return false;
    if (artistId && s.artistId !== artistId) return false;
    return true;
  });
  if (candidates.length === 0) return null;

  return candidates.reduce((best, s) => {
    const bestAwareness = best.awareness ?? 0;
    const sAwareness = s.awareness ?? 0;
    if (sAwareness !== bestAwareness) return sAwareness > bestAwareness ? s : best;
    const bestWeek = best.releaseWeek ?? 0;
    const sWeek = s.releaseWeek ?? 0;
    if (sWeek !== bestWeek) return sWeek > bestWeek ? s : best;
    return s.id < best.id ? s : best; // deterministic final tie-break
  });
}

/**
 * Latest released release (status 'released'; 'catalog' rows count too — they
 * are released rows that aged out of the front line) for the targeted artist,
 * or label-wide when artistId is omitted. Returns null when nothing qualifies.
 */
export function pickLatestReleasedRelease<T extends ReleaseLike>(
  releases: T[] | null | undefined,
  artistId?: string
): T | null {
  if (!Array.isArray(releases) || releases.length === 0) return null;

  const candidates = releases.filter((r) => {
    if (!r || !r.id) return false;
    if (r.status !== 'released' && r.status !== 'catalog') return false;
    if (artistId && r.artistId !== artistId) return false;
    return true;
  });
  if (candidates.length === 0) return null;

  return candidates.reduce((best, r) => {
    const bestWeek = best.releaseWeek ?? 0;
    const rWeek = r.releaseWeek ?? 0;
    if (rWeek !== bestWeek) return rWeek > bestWeek ? r : best;
    return r.id < best.id ? r : best; // deterministic final tie-break
  });
}
