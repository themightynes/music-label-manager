/**
 * gameStore action characterization tests (Phase 3 PR-1).
 *
 * SAFETY NET for the Phase 3 client-state-ownership refactor. These pins assert
 * the CURRENT behavior of the real store exactly — including places the plan
 * flags as drift bugs that later PRs (esp. PR-10) will fix. Do NOT "correct"
 * these assertions; a later PR that changes behavior should update the pin
 * deliberately.
 *
 * See: docs Phase 3 client-state-ownership plan (PR-1 = client-state
 * characterization net).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the network + cache layer BEFORE the store import (vitest hoists these).
// Phase 3 PR-6: the store now seeds songs/releases/releaseSongs into the query
// cache via setQueryData and reads them back via getQueryData, so the mocked
// queryClient must expose a working in-memory cache for those methods.
const queryCache = new Map<string, unknown>();
vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
  queryClient: {
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
    setQueryData: vi.fn((key: unknown, value: unknown) => {
      queryCache.set(JSON.stringify(key), value);
      return value;
    }),
    getQueryData: vi.fn((key: unknown) => queryCache.get(JSON.stringify(key))),
    removeQueries: vi.fn(({ queryKey }: { queryKey: unknown }) => {
      queryCache.delete(JSON.stringify(queryKey));
    }),
  },
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

import { apiRequest, queryClient } from '@/lib/queryClient';
import { songsQueryKey } from '@/hooks/useSongs';
import { releasesQueryKey, releaseSongsQueryKey } from '@/hooks/useReleases';
import { projectsQueryKey } from '@/hooks/useProjects';
import { artistsQueryKey } from '@/hooks/useArtists';
import { discoveredArtistsQueryKey } from '@/hooks/useDiscoveredArtists';
import { gameStateQueryKey } from '@/hooks/useGameState';
import { useGameStore } from '@/store/gameStore';
import {
  routeApiRequest as routeApiRequestImpl,
  jsonResponse,
  resetGameStore as resetGameStoreImpl,
  baseGameState,
} from './gameStore-harness';

const mockedApiRequest = apiRequest as unknown as ReturnType<typeof vi.fn>;
const routeApiRequest = (routes: Array<{ match: (url: string) => boolean; body: unknown }>) =>
  routeApiRequestImpl(mockedApiRequest, routes);
const resetGameStore = () => resetGameStoreImpl(useGameStore);

/**
 * Phase 3.5 PR-6: the store's actions read the spine record from its SINGLE
 * owner (the query cache) via `readGameState`, and Zustand keeps only a `{ id }`
 * session pointer. So a test seed must write BOTH the pointer and the cache
 * record, and post-action pins read the record back from the cache.
 */
function seedGameState(gs: any) {
  useGameStore.setState({ gameState: { id: gs.id } as any });
  queryClient.setQueryData(gameStateQueryKey(gs.id), gs);
}
/** The committed spine record for a game (its single owner is the cache). */
function record(gameId = 'game-1'): any {
  return queryClient.getQueryData(gameStateQueryKey(gameId));
}

beforeEach(() => {
  mockedApiRequest.mockReset();
  queryCache.clear();
  resetGameStore();
});

describe('signArtist adopts server-canonical money', () => {
  // Phase 3 PR-10 CHANGE (drift fix): signArtist no longer does optimistic
  // client-side `money -= signingCost` arithmetic. The POST .../artists response
  // is just the created artist row (no money field) and the signing cost is
  // derived server-side (artistService), so the displayed balance is adopted
  // from a refetch of GET /api/game/:id. The mocked GET below returns a balance
  // DIFFERENT from what client math would produce, proving no client arithmetic
  // remains: client math on 100000 - 15000 would say 85000, but the server says
  // 83000 and the store must show 83000. (Phase 3 PR-9 pins for the artists +
  // discovered cache invalidations are unchanged.)
  it('adopts the server balance from the refetch (NOT a client 100000-15000 delta)', async () => {
    seedGameState(baseGameState({ id: 'game-1', money: 100000 }));
    const newArtist = { id: 'artist-99', name: 'Signed One' };
    routeApiRequest([
      // GET /api/game/:id refetch — server is canonical (83000 != client's 85000).
      { match: (u) => /\/api\/game\/[^/]+$/.test(u), body: { gameState: { money: 83000, creativeCapital: 4 } } },
      { match: (u) => u.includes('/artists'), body: newArtist },
    ]);

    await useGameStore.getState().signArtist({ name: 'Signed One', signingCost: 15000 });

    const state = useGameStore.getState();
    expect(record().money).toBe(83000); // server-canonical, not 85000
    // Roster no longer lives in the store; the mutation invalidates the cache.
    expect((state as any).artists).toBeUndefined();
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: artistsQueryKey('game-1'),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: discoveredArtistsQueryKey('game-1'),
    });
  });

  it('double-firing signArtist cannot compound the balance (server number wins)', async () => {
    // Guard the plan requires: two rapid calls must leave the displayed balance
    // equal to the mocked server's LAST response, with no client arithmetic
    // compounding. There is no in-flight guard in the store (a double-fire is two
    // real server mutations — a server concern, out of scope), but the displayed
    // balance must still be exactly the server's number, never 100000 - 15000 -
    // 15000. The GET always returns 83000 here, so after two signs the store
    // shows 83000, not a doubly-subtracted 70000.
    seedGameState(baseGameState({ id: 'game-1', money: 100000 }));
    routeApiRequest([
      { match: (u) => /\/api\/game\/[^/]+$/.test(u), body: { gameState: { money: 83000, creativeCapital: 4 } } },
      { match: (u) => u.includes('/artists'), body: { id: 'a1' } },
    ]);

    await Promise.all([
      useGameStore.getState().signArtist({ signingCost: 15000 }),
      useGameStore.getState().signArtist({ signingCost: 15000 }),
    ]);

    expect(record().money).toBe(83000); // not 70000
  });

  it('leaves money unchanged when the refetch yields no gameState (transient GET failure)', async () => {
    // adoptServerBalances returns silently if the GET has no gameState; the store
    // keeps its prior balance rather than throwing or zeroing out.
    seedGameState(baseGameState({ id: 'game-1', money: 42000 }));
    routeApiRequest([
      { match: (u) => /\/api\/game\/[^/]+$/.test(u), body: {} }, // no gameState field
      { match: (u) => u.includes('/artists'), body: { id: 'a1' } },
    ]);

    await useGameStore.getState().signArtist({ name: 'No Cost' });

    expect(record().money).toBe(42000);
  });
});

describe('createProject adopts server-canonical money + creativeCapital', () => {
  // Phase 3 PR-10 CHANGE (drift fix): createProject no longer does optimistic
  // client-side `money -= projectCost; creativeCapital -= 1` arithmetic. The
  // POST .../projects response is just the created project row (no money/cc) and
  // the cost is recomputed server-side (projects.ts recomputes totalCost), so
  // BOTH balances are adopted from a refetch of GET /api/game/:id. The mocked GET
  // returns numbers DIFFERENT from what client math would produce, proving no
  // client arithmetic remains: client math would say money 80000 / cc 3, but the
  // server says 83000 / 2 and the store must show 83000 / 2. (Phase 3 PR-7 pin
  // for the projects cache invalidation is unchanged.)
  it('adopts server money + cc from the refetch (NOT client 80000/3 deltas)', async () => {
    seedGameState(baseGameState({ id: 'game-1', money: 100000, creativeCapital: 4 }));
    const newProject = { id: 'proj-1', title: 'EP' };
    routeApiRequest([
      // GET /api/game/:id refetch — server canonical (83000/2 != client 80000/3).
      { match: (u) => /\/api\/game\/[^/]+$/.test(u), body: { gameState: { money: 83000, creativeCapital: 2 } } },
      { match: (u) => u.includes('/projects'), body: newProject },
    ]);

    await useGameStore.getState().createProject({ totalCost: 20000 });

    const state = useGameStore.getState();
    expect(record().money).toBe(83000); // server-canonical, not 80000
    expect(record().creativeCapital).toBe(2); // server-canonical, not 3
    // Projects no longer live in the store; the mutation invalidates the cache.
    expect((state as any).projects).toBeUndefined();
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: projectsQueryKey('game-1'),
    });
  });

  it('double-firing createProject cannot compound the balances (server numbers win)', async () => {
    // Two rapid creates leave the displayed balances equal to the mocked server's
    // response, with no client arithmetic compounding. No in-flight guard exists
    // (a double-fire is two real server mutations — out of scope); the point is
    // the displayed balances equal the server's numbers, never a doubly-
    // subtracted 60000 / cc 2.
    seedGameState(baseGameState({ id: 'game-1', money: 100000, creativeCapital: 4 }));
    routeApiRequest([
      { match: (u) => /\/api\/game\/[^/]+$/.test(u), body: { gameState: { money: 83000, creativeCapital: 2 } } },
      { match: (u) => u.includes('/projects'), body: { id: 'p1' } },
    ]);

    await Promise.all([
      useGameStore.getState().createProject({ totalCost: 20000 }),
      useGameStore.getState().createProject({ totalCost: 20000 }),
    ]);

    expect(record().money).toBe(83000); // not 60000
    expect(record().creativeCapital).toBe(2); // not a compounded value
  });
});

describe('planRelease adopts server-canonical money + creativeCapital', () => {
  // Phase 3 PR-10 CHANGE (drift fix): planRelease no longer does optimistic
  // client-side `money -= totalInvestment; creativeCapital -= 1` arithmetic. The
  // POST .../releases/plan response carries `updatedGameState.money` but NOT
  // creativeCapital, so a single refetch of GET /api/game/:id is the one correct
  // source for BOTH fields. The mocked GET returns numbers DIFFERENT from what
  // client math would produce, proving no client arithmetic remains: client math
  // would say money 88000 / cc 3, but the server says 83000 / 2 and the store
  // must show 83000 / 2.
  it('adopts server money + cc from the refetch (NOT client 88000/3 deltas)', async () => {
    seedGameState(baseGameState({ id: 'game-1', money: 100000, creativeCapital: 4 }));
    routeApiRequest([
      // GET /api/game/:id refetch — server canonical (83000/2 != client 88000/3).
      { match: (u) => /\/api\/game\/[^/]+$/.test(u), body: { gameState: { money: 83000, creativeCapital: 2 } } },
      { match: (u) => u.includes('/releases/plan'), body: { ok: true } },
    ]);

    await useGameStore.getState().planRelease({ metadata: { totalInvestment: 12000 } });

    expect(record().money).toBe(83000); // server-canonical, not 88000
    expect(record().creativeCapital).toBe(2); // server-canonical, not 3
  });

  it('leaves balances unchanged when the refetch yields no gameState (transient GET failure)', async () => {
    seedGameState(baseGameState({ id: 'game-1', money: 60000, creativeCapital: 2 }));
    routeApiRequest([
      { match: (u) => /\/api\/game\/[^/]+$/.test(u), body: {} }, // no gameState field
      { match: (u) => u.includes('/releases/plan'), body: {} },
    ]);

    await useGameStore.getState().planRelease({});

    expect(record().money).toBe(60000);
    expect(record().creativeCapital).toBe(2);
  });
});

describe('cancelProject adopts server balance', () => {
  // Phase 3 PR-7 CHANGE: projects are cache-owned. cancelProject no longer
  // filters the cancelled project out of a store `projects` array; it
  // invalidates the projects query key so useProjects refetches. The money
  // pin (adopts server newBalance verbatim) is UNTOUCHED.
  it('sets money to result.newBalance (NOT a local delta) and invalidates projects', async () => {
    seedGameState(baseGameState({ id: 'game-1', money: 20000 }));
    routeApiRequest([
      {
        match: (u) => u.includes('/cancel'),
        body: { newBalance: 27500, refundAmount: 7500 },
      },
    ]);

    await useGameStore.getState().cancelProject('proj-1', { refundAmount: 7500 });

    const state = useGameStore.getState();
    expect(record().money).toBe(27500); // adopts server newBalance verbatim
    // Projects no longer live in the store; the mutation invalidates the cache.
    expect((state as any).projects).toBeUndefined();
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: projectsQueryKey('game-1'),
    });
  });
});

describe('loadGame set(...) state shape', () => {
  // Phase 3 PR-6/PR-7 CHANGE: loadGame no longer writes songs / releases /
  // releaseSongs / projects into the store. It seeds those into the TanStack
  // Query cache (via queryClient.setQueryData) so the useSongs/useReleases/
  // useReleaseSongs/useProjects hooks own them. The pins below assert the cache
  // is seeded from the same fan-out bodies, and that the store set() no longer
  // carries these arrays. (projects is seeded from the base game payload's
  // `projects` field — there is no dedicated projects endpoint.)
  it('writes exactly the collections loadGame owns and resets selectedActions', async () => {
    mockedApiRequest.mockImplementation(async (_m: string, url: string) => {
      if (url.endsWith('/songs')) return jsonResponse([{ id: 's1' }]);
      if (url.endsWith('/releases')) return jsonResponse([{ id: 'r1' }]);
      if (url.endsWith('/release-songs')) return jsonResponse([{ id: 'rs1' }]);
      if (url.endsWith('/executives')) return jsonResponse([{ id: 'e1' }]);
      if (url.endsWith('/mood-events')) return jsonResponse([{ id: 'm1' }]);
      if (url.includes('/emails?') || url.endsWith('/emails')) return jsonResponse({ emails: [{ id: 'em1' }], total: 1, unreadCount: 0 });
      if (url.includes('/ar-office/artists')) return jsonResponse({ artists: [] });
      // GET /api/game/:id (the base game fetch)
      return jsonResponse({
        gameState: { id: 'game-1', currentWeek: 3, money: 5000, arOfficeSlotUsed: false },
        musicLabel: { name: 'Loaded Label' },
        artists: [{ id: 'a1' }],
        projects: [{ id: 'p1' }],
        roles: [{ id: 'role1' }],
        weeklyActions: [{ id: 'wa1' }],
      });
    });

    await useGameStore.getState().loadGame('game-1');

    const state = useGameStore.getState();
    // gameState carries musicLabel nested in (loadGame's shape), plus synced AR fields.
    expect(record('game-1').id).toBe('game-1');
    expect(record('game-1').musicLabel).toEqual({ name: 'Loaded Label' });
    expect(record('game-1').usedFocusSlots).toBe(0);
    // PR-9: artists are seeded into the query cache, not the store.
    expect((state as any).artists).toBeUndefined();
    expect(state.roles).toEqual([{ id: 'role1' }]);
    expect(state.weeklyActions).toEqual([{ id: 'wa1' }]);
    expect(state.emails).toEqual([{ id: 'em1' }]);
    expect(state.executives).toEqual([{ id: 'e1' }]);
    expect(state.moodEvents).toEqual([{ id: 'm1' }]);
    expect(state.selectedActions).toEqual([]);

    // PR-6/PR-7: songs / releases / releaseSongs / projects are seeded into the
    // query cache, NOT the store. Assert the cache holds the fan-out bodies
    // keyed by gameId (projects from the base game payload's `projects` field).
    expect(queryClient.getQueryData(songsQueryKey('game-1'))).toEqual([{ id: 's1' }]);
    expect(queryClient.getQueryData(releasesQueryKey('game-1'))).toEqual([{ id: 'r1' }]);
    expect(queryClient.getQueryData(releaseSongsQueryKey('game-1'))).toEqual([{ id: 'rs1' }]);
    expect(queryClient.getQueryData(projectsQueryKey('game-1'))).toEqual([{ id: 'p1' }]);
    // PR-9: artists seeded from the base game payload's `artists` field.
    expect(queryClient.getQueryData(artistsQueryKey('game-1'))).toEqual([{ id: 'a1' }]);
    // And the store no longer exposes them.
    expect((state as any).songs).toBeUndefined();
    expect((state as any).releases).toBeUndefined();
    expect((state as any).releaseSongs).toBeUndefined();
    expect((state as any).projects).toBeUndefined();
    expect((state as any).artists).toBeUndefined();
  });
});

describe('advanceWeek set(...) state shape', () => {
  it('writes the post-advance collections, weeklyOutcome/campaignResults, and clears flags', async () => {
    seedGameState(baseGameState({ id: 'game-1', currentWeek: 5, arOfficeSlotUsed: false }));
    useGameStore.setState({
      selectedActions: ['{"roleId":"ceo","actionId":"a1","choiceId":"c1"}'],
    });

    mockedApiRequest.mockImplementation(async (_m: string, url: string) => {
      if (url.includes('/advance-week')) {
        return jsonResponse({
          gameState: { id: 'game-1', currentWeek: 6, money: 9000 },
          summary: { week: 6 },
          campaignResults: null,
        });
      }
      if (url.endsWith('/songs')) return jsonResponse([{ id: 's1' }]);
      if (url.endsWith('/releases')) return jsonResponse([{ id: 'r1' }]);
      if (url.endsWith('/release-songs')) return jsonResponse([{ id: 'rs1' }]);
      if (url.endsWith('/executives')) return jsonResponse([{ id: 'e1' }]);
      if (url.endsWith('/mood-events')) return jsonResponse([{ id: 'm1' }]);
      if (url.includes('/emails?') || url.endsWith('/emails')) return jsonResponse({ emails: [{ id: 'em1' }], total: 1, unreadCount: 0 });
      if (url.includes('/saves')) return jsonResponse({ ok: true });
      if (url.includes('/ar-office/artists')) return jsonResponse({ artists: [] });
      // GET /api/game/:id reload
      return jsonResponse({
        gameState: { id: 'game-1', currentWeek: 6, money: 9000 },
        musicLabel: { name: 'Test Label' },
        artists: [{ id: 'a1' }],
        projects: [{ id: 'p1' }],
      });
    });

    await useGameStore.getState().advanceWeek();

    const state = useGameStore.getState();
    expect(record('game-1').currentWeek).toBe(6);
    // PR-9: artists are seeded into the query cache, not the store.
    expect((state as any).artists).toBeUndefined();
    expect(state.emails).toEqual([{ id: 'em1' }]);
    expect(state.executives).toEqual([{ id: 'e1' }]);
    expect(state.moodEvents).toEqual([{ id: 'm1' }]);
    expect(state.weeklyOutcome).toEqual({ week: 6 });
    expect(state.campaignResults).toBeNull();
    expect(state.selectedActions).toEqual([]);
    expect(state.isAdvancingWeek).toBe(false);

    // PR-6/PR-7: advanceWeek seeds songs / releases / releaseSongs / projects
    // into the query cache (via fetchGameBundle) instead of the store. Assert
    // the seeded cache (projects from the base game payload's `projects` field).
    expect(queryClient.getQueryData(songsQueryKey('game-1'))).toEqual([{ id: 's1' }]);
    expect(queryClient.getQueryData(releasesQueryKey('game-1'))).toEqual([{ id: 'r1' }]);
    expect(queryClient.getQueryData(releaseSongsQueryKey('game-1'))).toEqual([{ id: 'rs1' }]);
    expect(queryClient.getQueryData(projectsQueryKey('game-1'))).toEqual([{ id: 'p1' }]);
    // PR-9: artists seeded from the base game payload's `artists` field (reflects
    // post-week mood changes).
    expect(queryClient.getQueryData(artistsQueryKey('game-1'))).toEqual([{ id: 'a1' }]);
    expect((state as any).songs).toBeUndefined();
    expect((state as any).releases).toBeUndefined();
    expect((state as any).releaseSongs).toBeUndefined();
    expect((state as any).projects).toBeUndefined();
    expect((state as any).artists).toBeUndefined();
  });
});
