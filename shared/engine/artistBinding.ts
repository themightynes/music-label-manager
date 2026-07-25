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

/** Weight floor so no artist is ever undrawable under a weighted strategy. */
const WEIGHT_FLOOR = 20;

/**
 * How a fiction-bound meeting chooses its subject (authored per meeting as
 * the `auto_bind_artist` value in data/actions.json; `true` = 'popularity'):
 *
 * - 'popularity'      — stories gravitate to the biggest name (journalist
 *                       dossiers, award whispers, chart fallout)
 * - 'low_mood'        — the exec brings up the artist who visibly needs help
 *                       (creative boost, intervention fictions)
 * - 'low_popularity'  — the up-and-comer: exposure plays (showcase slots)
 * - 'planned_release' — the meeting is literally about an upcoming release:
 *                       bind the artist of the SOONEST planned release
 *                       (cycle protection, platform bidding, single strategy)
 */
export type ArtistBindStrategy = 'popularity' | 'low_mood' | 'low_popularity' | 'planned_release';

export interface BindablePlannedRelease {
  artistId?: string | null;
  status?: string | null;
  releaseWeek?: number | null;
}

/**
 * Deterministically pick the artist a fiction-bound meeting is about.
 *
 * @param artists  signed-roster rows (unsigned rows are filtered out
 *                 defensively when the flag is present)
 * @param meetingSeed  the SAME base seed both selection sites use
 *                 (generateMeetingSeed(gameId, week, roleId)); an isolated
 *                 `-artistbind` namespace keeps the draw independent of the
 *                 meeting draw itself
 * @param strategy  fiction-appropriate selection logic (default 'popularity')
 * @param plannedReleases  release rows for the 'planned_release' strategy
 *                 (both call sites already have them loaded)
 * @returns the bound artist, or undefined when the roster is empty
 */
export function pickBoundArtist<T extends BindableArtist>(
  artists: T[],
  meetingSeed: string,
  strategy: ArtistBindStrategy = 'popularity',
  plannedReleases: BindablePlannedRelease[] = [],
): T | undefined {
  const roster = artists.filter((artist) => artist.signed !== false);
  if (roster.length === 0) return undefined;
  const bindSeed = `${meetingSeed}-artistbind`;

  if (strategy === 'planned_release') {
    // The soonest planned release decides the subject outright; ties on the
    // same week resolve by seeded pick. Falls back to popularity when no
    // planned release exists (requires-gates should prevent that in practice).
    const planned = plannedReleases
      .filter((release) => release.status === 'planned' && release.artistId != null)
      .sort((a, b) => (a.releaseWeek ?? Infinity) - (b.releaseWeek ?? Infinity));
    if (planned.length > 0) {
      const soonestWeek = planned[0].releaseWeek ?? null;
      const candidateIds = new Set(
        planned
          .filter((release) => (release.releaseWeek ?? null) === soonestWeek)
          .map((release) => release.artistId as string),
      );
      const candidates = roster.filter((artist) => candidateIds.has(artist.id));
      if (candidates.length === 1) return candidates[0];
      if (candidates.length > 1) {
        return seededWeightedPick(candidates, candidates.map(() => 1), bindSeed);
      }
      // planned release's artist not in roster (data drift) → fall through
    }
  }

  const weights = roster.map((artist) => {
    const popularity = Math.max(0, Math.min(100, artist.popularity ?? 0));
    const mood = Math.max(0, Math.min(100, (artist as any).mood ?? 50));
    switch (strategy) {
      case 'low_mood':
        return (100 - mood) + WEIGHT_FLOOR;
      case 'low_popularity':
        return (100 - popularity) + WEIGHT_FLOOR;
      case 'planned_release': // fallback when no planned release resolved
      case 'popularity':
      default:
        return popularity + WEIGHT_FLOOR;
    }
  });
  return seededWeightedPick(roster, weights, bindSeed);
}

/** Normalize the authored `auto_bind_artist` value (`true` = 'popularity'). */
export function resolveBindStrategy(
  authored: boolean | string | undefined,
): ArtistBindStrategy | undefined {
  if (!authored) return undefined;
  if (authored === true) return 'popularity';
  const known: ArtistBindStrategy[] = ['popularity', 'low_mood', 'low_popularity', 'planned_release'];
  return known.includes(authored as ArtistBindStrategy)
    ? (authored as ArtistBindStrategy)
    : 'popularity';
}
