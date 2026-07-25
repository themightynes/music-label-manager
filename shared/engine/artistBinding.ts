/**
 * Artist auto-binding for `user_selected` executive meetings (item 5,
 * playtest 2026-07-25).
 *
 * Fiction-driven meetings (authored `auto_bind_artist: true` in
 * data/actions.json) have the exec walk in already naming an artist — "a
 * journalist is sitting on a story about Diego Morales" — instead of asking
 * the player to pick the subject first. The artist is drawn ONCE, seeded and
 * deterministic per (game, week, role), weighted by popularity so
 * higher-profile artists attract the stories, with a floor so a fresh signing
 * can still be the subject.
 *
 * TWO-SITE PARITY: the server route (offer path) and the engine's
 * autonomous-resolution (neglected-exec path) must bind the SAME artist for
 * the same seed, or the artist the player was shown and the artist a
 * neglected exec acts on would diverge. Both sites call this helper with the
 * same base meeting seed. Storage-free by design (plain rows in, pick out) —
 * mirrors shared/engine/meetingSelection.ts.
 */

import { seededWeightedPick } from '../utils/seededRandom';

export interface BindableArtist {
  id: string;
  name: string;
  popularity?: number | null;
  signed?: boolean | null;
}

/** Weight floor so 0-popularity artists remain drawable. */
const POPULARITY_WEIGHT_FLOOR = 20;

/**
 * Deterministically pick the artist a fiction-bound meeting is about.
 *
 * @param artists  signed-roster rows (unsigned rows are filtered out
 *                 defensively when the flag is present)
 * @param meetingSeed  the SAME base seed both selection sites use
 *                 (generateMeetingSeed(gameId, week, roleId)); an isolated
 *                 `-artistbind` namespace keeps the draw independent of the
 *                 meeting draw itself
 * @returns the bound artist, or undefined when the roster is empty
 */
export function pickBoundArtist<T extends BindableArtist>(
  artists: T[],
  meetingSeed: string,
): T | undefined {
  const roster = artists.filter((artist) => artist.signed !== false);
  if (roster.length === 0) return undefined;

  const weights = roster.map(
    (artist) => Math.max(0, artist.popularity ?? 0) + POPULARITY_WEIGHT_FLOOR,
  );
  return seededWeightedPick(roster, weights, `${meetingSeed}-artistbind`);
}
