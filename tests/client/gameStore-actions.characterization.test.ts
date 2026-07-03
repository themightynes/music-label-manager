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
  },
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

import { apiRequest, queryClient } from '@/lib/queryClient';
import { songsQueryKey } from '@/hooks/useSongs';
import { releasesQueryKey, releaseSongsQueryKey } from '@/hooks/useReleases';
import { projectsQueryKey } from '@/hooks/useProjects';
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

beforeEach(() => {
  mockedApiRequest.mockReset();
  queryCache.clear();
  resetGameStore();
});

describe('signArtist optimistic delta', () => {
  it('deducts signingCost from money and appends the returned artist', async () => {
    useGameStore.setState({ gameState: baseGameState({ money: 100000 }), artists: [] });
    const newArtist = { id: 'artist-99', name: 'Signed One' };
    routeApiRequest([{ match: (u) => u.includes('/artists'), body: newArtist }]);

    await useGameStore.getState().signArtist({ name: 'Signed One', signingCost: 15000 });

    const state = useGameStore.getState();
    expect(state.gameState!.money).toBe(85000); // 100000 - 15000
    expect(state.artists).toEqual([newArtist]);
  });

  it('clamps money at 0 (Math.max floor) when signingCost exceeds balance', async () => {
    useGameStore.setState({ gameState: baseGameState({ money: 5000 }), artists: [] });
    routeApiRequest([{ match: (u) => u.includes('/artists'), body: { id: 'a1' } }]);

    await useGameStore.getState().signArtist({ signingCost: 15000 });

    expect(useGameStore.getState().gameState!.money).toBe(0);
  });

  it('treats a missing signingCost as 0 (no money change)', async () => {
    useGameStore.setState({ gameState: baseGameState({ money: 42000 }), artists: [] });
    routeApiRequest([{ match: (u) => u.includes('/artists'), body: { id: 'a1' } }]);

    await useGameStore.getState().signArtist({ name: 'No Cost' });

    expect(useGameStore.getState().gameState!.money).toBe(42000);
  });
});

describe('createProject optimistic delta', () => {
  // Phase 3 PR-7 CHANGE: projects are cache-owned now. createProject no longer
  // splices the returned project into a store `projects` array; it invalidates
  // the projects query key so useProjects refetches the authoritative list. The
  // money/creativeCapital optimistic math is UNTOUCHED (that's PR-10), so those
  // pins stay identical — only the array-splice pin becomes an invalidation pin.
  it('deducts totalCost from money and 1 from creativeCapital, invalidates projects', async () => {
    useGameStore.setState({
      gameState: baseGameState({ id: 'game-1', money: 100000, creativeCapital: 4 }),
    });
    const newProject = { id: 'proj-1', title: 'EP' };
    routeApiRequest([{ match: (u) => u.includes('/projects'), body: newProject }]);

    await useGameStore.getState().createProject({ totalCost: 20000 });

    const state = useGameStore.getState();
    expect(state.gameState!.money).toBe(80000); // 100000 - 20000
    expect((state.gameState as any).creativeCapital).toBe(3); // 4 - 1
    // Projects no longer live in the store; the mutation invalidates the cache.
    expect((state as any).projects).toBeUndefined();
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: projectsQueryKey('game-1'),
    });
  });

  it('falls back to budgetPerSong when totalCost is absent', async () => {
    useGameStore.setState({
      gameState: baseGameState({ money: 50000, creativeCapital: 2 }),
    });
    routeApiRequest([{ match: (u) => u.includes('/projects'), body: { id: 'p2' } }]);

    await useGameStore.getState().createProject({ budgetPerSong: 8000 });

    expect(useGameStore.getState().gameState!.money).toBe(42000); // 50000 - 8000
    expect((useGameStore.getState().gameState as any).creativeCapital).toBe(1);
  });

  it('deducts creative capital even when cost is 0', async () => {
    useGameStore.setState({
      gameState: baseGameState({ money: 30000, creativeCapital: 3 }),
    });
    routeApiRequest([{ match: (u) => u.includes('/projects'), body: { id: 'p3' } }]);

    await useGameStore.getState().createProject({});

    expect(useGameStore.getState().gameState!.money).toBe(30000);
    expect((useGameStore.getState().gameState as any).creativeCapital).toBe(2);
  });
});

describe('planRelease optimistic delta', () => {
  it('deducts metadata.totalInvestment from money and 1 from creativeCapital', async () => {
    useGameStore.setState({
      gameState: baseGameState({ money: 100000, creativeCapital: 4 }),
    });
    routeApiRequest([{ match: (u) => u.includes('/releases/plan'), body: { ok: true } }]);

    await useGameStore.getState().planRelease({ metadata: { totalInvestment: 12000 } });

    const state = useGameStore.getState();
    expect(state.gameState!.money).toBe(88000); // 100000 - 12000
    expect((state.gameState as any).creativeCapital).toBe(3);
  });

  it('treats a missing totalInvestment as 0 for money but still deducts creative capital', async () => {
    useGameStore.setState({
      gameState: baseGameState({ money: 60000, creativeCapital: 2 }),
    });
    routeApiRequest([{ match: (u) => u.includes('/releases/plan'), body: {} }]);

    await useGameStore.getState().planRelease({});

    expect(useGameStore.getState().gameState!.money).toBe(60000);
    expect((useGameStore.getState().gameState as any).creativeCapital).toBe(1);
  });
});

describe('cancelProject adopts server balance', () => {
  // Phase 3 PR-7 CHANGE: projects are cache-owned. cancelProject no longer
  // filters the cancelled project out of a store `projects` array; it
  // invalidates the projects query key so useProjects refetches. The money
  // pin (adopts server newBalance verbatim) is UNTOUCHED.
  it('sets money to result.newBalance (NOT a local delta) and invalidates projects', async () => {
    useGameStore.setState({
      gameState: baseGameState({ id: 'game-1', money: 20000 }),
    });
    routeApiRequest([
      {
        match: (u) => u.includes('/cancel'),
        body: { newBalance: 27500, refundAmount: 7500 },
      },
    ]);

    await useGameStore.getState().cancelProject('proj-1', { refundAmount: 7500 });

    const state = useGameStore.getState();
    expect(state.gameState!.money).toBe(27500); // adopts server newBalance verbatim
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
    expect(state.gameState!.id).toBe('game-1');
    expect((state.gameState as any).musicLabel).toEqual({ name: 'Loaded Label' });
    expect((state.gameState as any).usedFocusSlots).toBe(0);
    expect(state.artists).toEqual([{ id: 'a1' }]);
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
    // And the store no longer exposes them.
    expect((state as any).songs).toBeUndefined();
    expect((state as any).releases).toBeUndefined();
    expect((state as any).releaseSongs).toBeUndefined();
    expect((state as any).projects).toBeUndefined();
  });
});

describe('advanceWeek set(...) state shape', () => {
  it('writes the post-advance collections, weeklyOutcome/campaignResults, and clears flags', async () => {
    useGameStore.setState({
      gameState: baseGameState({ id: 'game-1', currentWeek: 5, arOfficeSlotUsed: false }),
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
    expect((state.gameState as any).currentWeek).toBe(6);
    expect(state.artists).toEqual([{ id: 'a1' }]);
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
    expect((state as any).songs).toBeUndefined();
    expect((state as any).releases).toBeUndefined();
    expect((state as any).releaseSongs).toBeUndefined();
    expect((state as any).projects).toBeUndefined();
  });
});
