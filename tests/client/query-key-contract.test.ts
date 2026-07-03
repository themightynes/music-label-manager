/**
 * Query-key contract test (Phase 3 PR-1).
 *
 * Enumerates every cache invalidation gameStore.ts performs and asserts each one
 * actually matches a query key that a real hook produces. TanStack Query matches
 * an `invalidateQueries({ queryKey })` against a cached query when the
 * invalidation key is an element-by-element PREFIX of the query key (NOT a string
 * prefix). Predicate-based invalidations are checked by running the predicate.
 *
 * Per the Phase 3 plan, FOUR `['*-roi']` keys and `['executives']` in
 * `advanceWeek` match NOTHING today — the real analytics keys are shaped
 * `[url, 'analytics:artist-roi', {...}]` and no hook produces an `['executives']`
 * key. Those assertions are intentionally RED-PINNED via `it.fails(...)` so they
 * flip to green when PR-3 fixes the invalidation keys.
 *
 * Reference invalidations in client/src/store/gameStore.ts (advanceWeek):
 *   queryKey: ['artist-roi'] | ['project-roi'] | ['portfolio-roi'] | ['release-roi']
 *   queryKey: ['executives']
 *   predicate: EMAIL_LIST_SCOPE / EMAIL_UNREAD_SCOPE keyed on gameId
 * and saveGame: queryKey: ['api', 'saves'].
 */
import { describe, it, expect } from 'vitest';
import { EMAIL_LIST_SCOPE, EMAIL_UNREAD_SCOPE } from '@/hooks/useEmails';

const GAME_ID = 'game-1';
const ARTIST_ID = 'artist-1';
const PROJECT_ID = 'project-1';
const RELEASE_ID = 'release-1';

/**
 * Representative REAL query keys produced by the app's hooks.
 * - Analytics keys (useAnalytics.ts): `[url, 'analytics:<scope>-roi', { ... }]`
 * - Email keys (useEmails.ts): `[SCOPE, gameId, ...filters]`
 * - Saves key (SaveGameModal.tsx): `['api', 'saves']`
 */
const REAL_QUERY_KEYS: readonly unknown[][] = [
  [`/api/analytics/${GAME_ID}/artist/${ARTIST_ID}/roi`, 'analytics:artist-roi', { gameId: GAME_ID, artistId: ARTIST_ID }],
  [`/api/analytics/${GAME_ID}/project/${PROJECT_ID}/roi`, 'analytics:project-roi', { gameId: GAME_ID, projectId: PROJECT_ID }],
  [`/api/analytics/${GAME_ID}/portfolio/roi`, 'analytics:portfolio-roi', { gameId: GAME_ID }],
  [`/api/analytics/${GAME_ID}/release/${RELEASE_ID}/roi`, 'analytics:release-roi', { gameId: GAME_ID, releaseId: RELEASE_ID }],
  [EMAIL_LIST_SCOPE, GAME_ID, null, null, null, null, null],
  [EMAIL_UNREAD_SCOPE, GAME_ID],
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

describe('query-key contract: RED-PINNED invalidations (PR-3 will fix)', () => {
  // These use it.fails: the assertion body FAILS today, and vitest reports the
  // test as PASSING because failure is expected. When PR-3 changes the store to
  // emit the correct keys AND the real keys here are updated to match, these
  // will start passing the assertion, which flips it.fails to a (desired)
  // failure — a loud signal that the pin must be converted to a normal `it`.

  it.fails('advanceWeek ["artist-roi"] currently matches NO real analytics key', () => {
    // Real key is [url, "analytics:artist-roi", {...}] — ["artist-roi"] matches nothing.
    expect(someRealKeyMatchesInvalidationKey(['artist-roi'])).toBe(true);
  });

  it.fails('advanceWeek ["project-roi"] currently matches NO real analytics key', () => {
    expect(someRealKeyMatchesInvalidationKey(['project-roi'])).toBe(true);
  });

  it.fails('advanceWeek ["portfolio-roi"] currently matches NO real analytics key', () => {
    expect(someRealKeyMatchesInvalidationKey(['portfolio-roi'])).toBe(true);
  });

  it.fails('advanceWeek ["release-roi"] currently matches NO real analytics key', () => {
    expect(someRealKeyMatchesInvalidationKey(['release-roi'])).toBe(true);
  });

  it.fails('advanceWeek ["executives"] currently matches NO real hook key', () => {
    // No hook produces an ["executives"] query key today.
    expect(someRealKeyMatchesInvalidationKey(['executives'])).toBe(true);
  });
});
