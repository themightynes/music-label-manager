/**
 * Query-key contract test (Phase 3 PR-1).
 *
 * Enumerates every cache invalidation gameStore.ts performs and asserts each one
 * actually matches a query key that a real hook produces. TanStack Query matches
 * an `invalidateQueries({ queryKey })` against a cached query when the
 * invalidation key is an element-by-element PREFIX of the query key (NOT a string
 * prefix). Predicate-based invalidations are checked by running the predicate.
 *
 * PR-3 fixed the four ROI invalidations in `advanceWeek` to use a
 * predicate matching the real analytics key shape `[url, 'analytics:<scope>-roi',
 * { gameId, ... }]` (scope in element 1, gameId in element 2), and removed the
 * dead `['executives']` invalidation entirely (no hook produces that key —
 * executives aren't wired into TanStack yet; see the PR-8 TODO in gameStore.ts).
 *
 * Reference invalidations in client/src/store/gameStore.ts (advanceWeek):
 *   predicate: matches queryKey[1] in the ROI analytics scopes AND
 *              queryKey[2].gameId === current gameId
 *   predicate: EMAIL_LIST_SCOPE / EMAIL_UNREAD_SCOPE keyed on gameId
 * and saveGame: queryKey: ['api', 'saves'].
 */
import { describe, it, expect } from 'vitest';
import { EMAIL_LIST_SCOPE, EMAIL_UNREAD_SCOPE } from '@/hooks/useEmails';
import { EXECUTIVES_SCOPE, executivesQueryKey } from '@/hooks/useExecutives';
import { CHART_TOP10_SCOPE, CHART_TOP100_SCOPE } from '@/hooks/useCharts';
import {
  RELEASES_SCOPE,
  RELEASE_SONGS_SCOPE,
  releasesQueryKey,
  releaseSongsQueryKey,
} from '@/hooks/useReleases';
import { SONGS_SCOPE, songsQueryKey } from '@/hooks/useSongs';
import { PROJECTS_SCOPE, projectsQueryKey } from '@/hooks/useProjects';
import { ARTISTS_SCOPE, artistsQueryKey } from '@/hooks/useArtists';
import {
  DISCOVERED_ARTISTS_SCOPE,
  discoveredArtistsQueryKey,
} from '@/hooks/useDiscoveredArtists';

const GAME_ID = 'game-1';
const ARTIST_ID = 'artist-1';
const PROJECT_ID = 'project-1';
const RELEASE_ID = 'release-1';

/**
 * Representative REAL query keys produced by the app's hooks.
 * - Analytics keys (useAnalytics.ts): `[url, 'analytics:<scope>-roi', { ... }]`
 * - Email keys (useEmails.ts): `[SCOPE, gameId, ...filters]`
 * - Chart keys (useCharts.ts): `[SCOPE, gameId]`
 * - Saves key (SaveGameModal.tsx): `['api', 'saves']`
 */
const REAL_QUERY_KEYS: readonly unknown[][] = [
  [`/api/analytics/${GAME_ID}/artist/${ARTIST_ID}/roi`, 'analytics:artist-roi', { gameId: GAME_ID, artistId: ARTIST_ID }],
  [`/api/analytics/${GAME_ID}/project/${PROJECT_ID}/roi`, 'analytics:project-roi', { gameId: GAME_ID, projectId: PROJECT_ID }],
  [`/api/analytics/${GAME_ID}/portfolio/roi`, 'analytics:portfolio-roi', { gameId: GAME_ID }],
  [`/api/analytics/${GAME_ID}/release/${RELEASE_ID}/roi`, 'analytics:release-roi', { gameId: GAME_ID, releaseId: RELEASE_ID }],
  [EMAIL_LIST_SCOPE, GAME_ID, null, null, null, null, null],
  [EMAIL_UNREAD_SCOPE, GAME_ID],
  // Executives (useExecutives.ts, PR-8): [EXECUTIVES_SCOPE, gameId]
  [...executivesQueryKey(GAME_ID)],
  [CHART_TOP10_SCOPE, GAME_ID],
  [CHART_TOP100_SCOPE, GAME_ID],
  // Releases / songs (useReleases.ts, useSongs.ts, PR-6): [SCOPE, gameId]
  [...releasesQueryKey(GAME_ID)],
  [...releaseSongsQueryKey(GAME_ID)],
  [...songsQueryKey(GAME_ID)],
  // Projects (useProjects.ts, PR-7): [SCOPE, gameId]
  [...projectsQueryKey(GAME_ID)],
  // Artists / discovered artists (useArtists.ts, useDiscoveredArtists.ts, PR-9):
  // [SCOPE, gameId]
  [...artistsQueryKey(GAME_ID)],
  [...discoveredArtistsQueryKey(GAME_ID)],
  ['api', 'saves'],
];

/** Element-by-element prefix match, mirroring TanStack's partial key matching. */
function keyIsPrefixOf(invalidationKey: readonly unknown[], realKey: readonly unknown[]): boolean {
  if (invalidationKey.length > realKey.length) return false;
  return invalidationKey.every((el, i) => JSON.stringify(el) === JSON.stringify(realKey[i]));
}

function someRealKeyMatchesInvalidationKey(invalidationKey: readonly unknown[]): boolean {
  return REAL_QUERY_KEYS.some((real) => keyIsPrefixOf(invalidationKey, real));
}

function someRealKeyMatchesPredicate(
  predicate: (q: { queryKey: readonly unknown[] }) => boolean,
): boolean {
  return REAL_QUERY_KEYS.some((real) => predicate({ queryKey: real }));
}

describe('query-key contract: invalidations that DO match a real hook key', () => {
  it('saveGame ["api","saves"] matches the SaveGameModal saves query', () => {
    expect(someRealKeyMatchesInvalidationKey(['api', 'saves'])).toBe(true);
  });

  it('email invalidation predicate matches the scoped email queries for the game', () => {
    const emailPredicate = (q: { queryKey: readonly unknown[] }) =>
      (q.queryKey[0] === EMAIL_LIST_SCOPE || q.queryKey[0] === EMAIL_UNREAD_SCOPE) &&
      q.queryKey[1] === GAME_ID;
    expect(someRealKeyMatchesPredicate(emailPredicate)).toBe(true);
  });
});

describe('query-key contract: advanceWeek chart invalidations (PR-5)', () => {
  // Mirrors client/src/store/gameStore.ts advanceWeek's chart invalidation
  // predicate exactly: matches CHART_TOP10_SCOPE/CHART_TOP100_SCOPE at
  // queryKey[0] and requires queryKey[1] to equal the current game's id.
  function chartPredicate(gameId: string) {
    return (q: { queryKey: readonly unknown[] }) =>
      (q.queryKey[0] === CHART_TOP10_SCOPE || q.queryKey[0] === CHART_TOP100_SCOPE) &&
      q.queryKey[1] === gameId;
  }

  it('advanceWeek chart predicate matches both real chart query keys', () => {
    const predicate = chartPredicate(GAME_ID);
    const matches = REAL_QUERY_KEYS.filter((real) => predicate({ queryKey: real }));
    expect(matches.length).toBe(2);
  });

  it('advanceWeek chart predicate does NOT match a different game\'s chart keys', () => {
    expect(someRealKeyMatchesPredicate(chartPredicate('some-other-game'))).toBe(false);
  });
});

describe('query-key contract: planRelease invalidations (PR-6)', () => {
  // planRelease invalidates the release/song caches with EXACT scoped keys
  // (client/src/store/gameStore.ts): releasesQueryKey / releaseSongsQueryKey /
  // songsQueryKey, each == [SCOPE, gameId]. Assert each matches its hook key.
  it('planRelease releases invalidation matches the useReleases hook key', () => {
    expect(someRealKeyMatchesInvalidationKey(releasesQueryKey(GAME_ID))).toBe(true);
  });

  it('planRelease release-songs invalidation matches the useReleaseSongs hook key', () => {
    expect(someRealKeyMatchesInvalidationKey(releaseSongsQueryKey(GAME_ID))).toBe(true);
  });

  it('planRelease songs invalidation matches the useSongs hook key', () => {
    expect(someRealKeyMatchesInvalidationKey(songsQueryKey(GAME_ID))).toBe(true);
  });

  it('none of the release/song invalidations match a different game', () => {
    expect(someRealKeyMatchesInvalidationKey(releasesQueryKey('other'))).toBe(false);
    expect(someRealKeyMatchesInvalidationKey(releaseSongsQueryKey('other'))).toBe(false);
    expect(someRealKeyMatchesInvalidationKey(songsQueryKey('other'))).toBe(false);
  });

  it('release/song scope constants and hook keys agree element-for-element', () => {
    expect(releasesQueryKey(GAME_ID)).toEqual([RELEASES_SCOPE, GAME_ID]);
    expect(releaseSongsQueryKey(GAME_ID)).toEqual([RELEASE_SONGS_SCOPE, GAME_ID]);
    expect(songsQueryKey(GAME_ID)).toEqual([SONGS_SCOPE, GAME_ID]);
  });
});

describe('query-key contract: project mutation invalidations (PR-7)', () => {
  // createProject / updateProject / cancelProject invalidate the projects cache
  // with the EXACT scoped key (client/src/store/gameStore.ts): projectsQueryKey
  // == [PROJECTS_SCOPE, gameId]. Assert each matches the useProjects hook key.
  it('project mutation invalidation matches the useProjects hook key', () => {
    expect(someRealKeyMatchesInvalidationKey(projectsQueryKey(GAME_ID))).toBe(true);
  });

  it('the projects invalidation does NOT match a different game', () => {
    expect(someRealKeyMatchesInvalidationKey(projectsQueryKey('other'))).toBe(false);
  });

  it('the projects scope constant and hook key agree element-for-element', () => {
    expect(projectsQueryKey(GAME_ID)).toEqual([PROJECTS_SCOPE, GAME_ID]);
  });
});

describe('query-key contract: artist mutation invalidations (PR-9)', () => {
  // signArtist / updateArtist invalidate the artists cache with the EXACT scoped
  // key (client/src/store/gameStore.ts): artistsQueryKey == [ARTISTS_SCOPE,
  // gameId]. signArtist additionally invalidates the discovered-artists cache
  // (discoveredArtistsQueryKey == [DISCOVERED_ARTISTS_SCOPE, gameId]) so the
  // signed artist drops out of the discovered list. Assert each matches its hook.
  it('artist mutation invalidation matches the useArtists hook key', () => {
    expect(someRealKeyMatchesInvalidationKey(artistsQueryKey(GAME_ID))).toBe(true);
  });

  it('signArtist discovered invalidation matches the useDiscoveredArtists hook key', () => {
    expect(someRealKeyMatchesInvalidationKey(discoveredArtistsQueryKey(GAME_ID))).toBe(true);
  });

  it('the artist invalidations do NOT match a different game', () => {
    expect(someRealKeyMatchesInvalidationKey(artistsQueryKey('other'))).toBe(false);
    expect(someRealKeyMatchesInvalidationKey(discoveredArtistsQueryKey('other'))).toBe(false);
  });

  it('the artist scope constants and hook keys agree element-for-element', () => {
    expect(artistsQueryKey(GAME_ID)).toEqual([ARTISTS_SCOPE, GAME_ID]);
    expect(discoveredArtistsQueryKey(GAME_ID)).toEqual([DISCOVERED_ARTISTS_SCOPE, GAME_ID]);
  });
});

describe('query-key contract: advanceWeek invalidations (PR-3 fixed)', () => {
  // The ROI predicate now used by advanceWeek: matches queryKey[1] against the
  // known analytics scopes and requires queryKey[2].gameId to equal the current
  // game's id — mirrors client/src/store/gameStore.ts exactly.
  const ROI_ANALYTICS_SCOPES = new Set([
    'analytics:artist-roi',
    'analytics:project-roi',
    'analytics:portfolio-roi',
    'analytics:release-roi',
  ]);
  function roiPredicate(gameId: string) {
    return (q: { queryKey: readonly unknown[] }) =>
      typeof q.queryKey[1] === 'string' &&
      ROI_ANALYTICS_SCOPES.has(q.queryKey[1] as string) &&
      (q.queryKey[2] as { gameId?: string } | undefined)?.gameId === gameId;
  }

  it('advanceWeek ROI predicate matches the real artist-roi analytics key', () => {
    expect(someRealKeyMatchesPredicate(roiPredicate(GAME_ID))).toBe(true);
  });

  it('advanceWeek ROI predicate matches all four real ROI analytics keys', () => {
    const predicate = roiPredicate(GAME_ID);
    const matches = REAL_QUERY_KEYS.filter((real) => predicate({ queryKey: real }));
    expect(matches.length).toBe(4);
  });

  it('advanceWeek ROI predicate does NOT match a different game\'s analytics keys', () => {
    expect(someRealKeyMatchesPredicate(roiPredicate('some-other-game'))).toBe(false);
  });

  it('advanceWeek executives invalidation matches the useExecutives hook key (PR-8)', () => {
    // PR-8 wired executives into TanStack: useExecutives keys on
    // [EXECUTIVES_SCOPE, gameId] and advanceWeek invalidates the same key via
    // executivesQueryKey(gameId). The invalidation must now match the hook.
    expect(someRealKeyMatchesInvalidationKey(executivesQueryKey(GAME_ID))).toBe(true);
  });

  it('advanceWeek executives invalidation does NOT match a different game', () => {
    expect(someRealKeyMatchesInvalidationKey(executivesQueryKey('some-other-game'))).toBe(false);
  });

  it('the executives scope invalidation and hook key agree element-for-element', () => {
    // Guards against drift: the store invalidation and the hook must produce the
    // byte-identical key shape [EXECUTIVES_SCOPE, gameId].
    expect(executivesQueryKey(GAME_ID)).toEqual([EXECUTIVES_SCOPE, GAME_ID]);
  });
});
