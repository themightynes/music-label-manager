/**
 * gameStore dual-write funnel characterization tests (Phase 3.5 PR-4).
 *
 * PR-4 routes every gameState write in the store through a single
 * `commitGameState()` funnel that dual-writes: the Zustand `set({ gameState })`
 * (unchanged) PLUS `queryClient.setQueryData(gameStateQueryKey(id), next)`. This
 * suite asserts the INVARIANT that makes PR-5's reader flip safe: after every
 * store action, the cache record at `gameStateQueryKey(id)` deep-equals the
 * Zustand `gameState`. The Zustand side itself is pinned unchanged by
 * gameStore-spine.characterization.test.ts (the PR-1 net) — this file adds the
 * cache-equivalence half.
 *
 * The mocked queryClient here exposes `removeQueries` in addition to
 * set/get/invalidate because the game-SWITCH writers (loadGame /
 * loadGameFromSave / createNewGame) drop the previous game's stale record key.
 *
 * Mirrors the mock/harness setup of the other gameStore characterization tests.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

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

/** The single invariant this whole suite exists to prove. */
function cacheEqualsStore(gameId: string) {
  const store = useGameStore.getState().gameState;
  const cached = queryClient.getQueryData(gameStateQueryKey(gameId));
  expect(cached).toEqual(store);
}

beforeEach(() => {
  mockedApiRequest.mockReset();
  queryCache.clear();
  resetGameStore();
  mockedApiRequest.mockResolvedValue(jsonResponse({}));
});

describe('dual-write funnel: same-game slot writers', () => {
  it('selectAction mirrors the new gameState into the cache', () => {
    useGameStore.setState({
      gameState: baseGameState({ id: 'game-1', focusSlots: 3, usedFocusSlots: 0, arOfficeSlotUsed: false }),
      selectedActions: [],
    });

    void useGameStore.getState().selectAction('action-A');

    expect(useGameStore.getState().gameState!.usedFocusSlots).toBe(1);
    cacheEqualsStore('game-1');
    expect(
      (queryClient.getQueryData(gameStateQueryKey('game-1')) as any).usedFocusSlots,
    ).toBe(1);
  });

  it('removeAction mirrors the decremented gameState into the cache', async () => {
    useGameStore.setState({
      gameState: baseGameState({ id: 'game-1', usedFocusSlots: 2, arOfficeSlotUsed: false }),
      selectedActions: ['action-A', 'action-B'],
    });

    await useGameStore.getState().removeAction('action-A');

    cacheEqualsStore('game-1');
    expect(
      (queryClient.getQueryData(gameStateQueryKey('game-1')) as any).usedFocusSlots,
    ).toBe(1);
  });

  it('clearActions mirrors the reset gameState into the cache', () => {
    useGameStore.setState({
      gameState: baseGameState({ id: 'game-1', usedFocusSlots: 2, arOfficeSlotUsed: false }),
      selectedActions: ['action-A', 'action-B'],
    });

    useGameStore.getState().clearActions();

    cacheEqualsStore('game-1');
    expect(
      (queryClient.getQueryData(gameStateQueryKey('game-1')) as any).usedFocusSlots,
    ).toBe(0);
  });

  it('consumeAROfficeSlot mirrors the A&R gameState into the cache', async () => {
    useGameStore.setState({
      gameState: baseGameState({ id: 'game-1', focusSlots: 3, usedFocusSlots: 1, arOfficeSlotUsed: false }),
      selectedActions: ['action-A'],
    });

    await useGameStore.getState().consumeAROfficeSlot('active');

    cacheEqualsStore('game-1');
    expect(
      (queryClient.getQueryData(gameStateQueryKey('game-1')) as any).arOfficeSlotUsed,
    ).toBe(true);
  });

  it('releaseAROfficeSlot mirrors the cleared A&R gameState into the cache', async () => {
    useGameStore.setState({
      gameState: baseGameState({ id: 'game-1', focusSlots: 3, usedFocusSlots: 2, arOfficeSlotUsed: true, arOfficeSourcingType: 'active' }),
      selectedActions: ['action-A'],
    });

    await useGameStore.getState().releaseAROfficeSlot();

    cacheEqualsStore('game-1');
    expect(
      (queryClient.getQueryData(gameStateQueryKey('game-1')) as any).arOfficeSlotUsed,
    ).toBe(false);
  });
});

describe('dual-write funnel: balance-adopting writers', () => {
  it('cancelProject mirrors result.newBalance into the cache', async () => {
    useGameStore.setState({ gameState: baseGameState({ id: 'game-1', money: 20000 }) });
    routeApiRequest([
      { match: (u) => u.includes('/cancel'), body: { newBalance: 27500, refundAmount: 7500 } },
    ]);

    await useGameStore.getState().cancelProject('proj-1', { refundAmount: 7500 });

    cacheEqualsStore('game-1');
    expect((queryClient.getQueryData(gameStateQueryKey('game-1')) as any).money).toBe(27500);
  });

  it('adoptServerBalances (via planRelease) mirrors the two-field merge into the cache', async () => {
    useGameStore.setState({
      gameState: baseGameState({ id: 'game-1', money: 100000, creativeCapital: 4, musicLabel: { name: 'Keep' } }),
    });
    routeApiRequest([
      { match: (u) => /\/api\/game\/[^/]+$/.test(u), body: { gameState: { money: 55000, creativeCapital: 1 } } },
      { match: (u) => u.includes('/releases/plan'), body: { ok: true } },
    ]);

    await useGameStore.getState().planRelease({ metadata: { totalInvestment: 1000 } });

    cacheEqualsStore('game-1');
    const cached = queryClient.getQueryData(gameStateQueryKey('game-1')) as any;
    expect(cached.money).toBe(55000);
    expect(cached.creativeCapital).toBe(1);
    expect(cached.musicLabel).toEqual({ name: 'Keep' }); // preserved, not clobbered
  });
});

describe('dual-write funnel: game-switch writers seed the new key + drop the old', () => {
  function routeLoad(gameId: string, musicLabel: any) {
    mockedApiRequest.mockImplementation(async (_m: string, url: string) => {
      if (url.endsWith('/songs')) return jsonResponse([]);
      if (url.endsWith('/releases')) return jsonResponse([]);
      if (url.endsWith('/release-songs')) return jsonResponse([]);
      if (url.endsWith('/executives')) return jsonResponse([]);
      if (url.endsWith('/mood-events')) return jsonResponse([]);
      if (url.includes('/emails?') || url.endsWith('/emails')) return jsonResponse({ emails: [], total: 0, unreadCount: 0 });
      if (url.includes('/ar-office/artists')) return jsonResponse({ artists: [] });
      return jsonResponse({
        gameState: { id: gameId, currentWeek: 3, money: 5000, arOfficeSlotUsed: false, arOfficeSourcingType: null },
        musicLabel,
        artists: [],
        projects: [],
        roles: [],
        weeklyActions: [],
      });
    });
  }

  it('loadGame seeds the loaded game key equal to the store gameState', async () => {
    routeLoad('game-1', { name: 'Loaded Label' });

    await useGameStore.getState().loadGame('game-1');

    cacheEqualsStore('game-1');
    expect((queryClient.getQueryData(gameStateQueryKey('game-1')) as any).musicLabel).toEqual({
      name: 'Loaded Label',
    });
  });

  it('switching games via loadGame drops the previous game key and seeds the new one', async () => {
    // Start on game-A with a seeded record.
    useGameStore.setState({ gameState: baseGameState({ id: 'game-A' }) });
    queryClient.setQueryData(gameStateQueryKey('game-A'), baseGameState({ id: 'game-A' }));

    routeLoad('game-B', { name: 'B Label' });
    await useGameStore.getState().loadGame('game-B');

    // Old key removed, new key seeded and equal to the store.
    expect(queryClient.getQueryData(gameStateQueryKey('game-A'))).toBeUndefined();
    cacheEqualsStore('game-B');
    expect(queryClient.removeQueries).toHaveBeenCalledWith({
      queryKey: gameStateQueryKey('game-A'),
    });
  });

  it('createNewGame drops the previous (orphaned) game key and seeds the new game', async () => {
    useGameStore.setState({ gameState: baseGameState({ id: 'game-1', currentWeek: 4 }) });
    queryClient.setQueryData(gameStateQueryKey('game-1'), baseGameState({ id: 'game-1' }));

    mockedApiRequest.mockImplementation(async (method: string, url: string) => {
      if (method === 'GET' && url.endsWith('/api/saves')) return jsonResponse([]); // orphaned
      if (method === 'DELETE' && /\/api\/game\/[^/]+$/.test(url)) return jsonResponse({ ok: true });
      if (method === 'POST' && url.endsWith('/api/game')) return jsonResponse({ id: 'game-2', currentWeek: 1 });
      if (method === 'GET' && /\/api\/game\/[^/]+$/.test(url)) {
        return jsonResponse({ gameState: { id: 'game-2', currentWeek: 1 }, musicLabel: null });
      }
      return jsonResponse({});
    });

    await useGameStore.getState().createNewGame('Balanced');

    expect(queryClient.getQueryData(gameStateQueryKey('game-1'))).toBeUndefined();
    cacheEqualsStore('game-2');
    expect((queryClient.getQueryData(gameStateQueryKey('game-2')) as any).id).toBe('game-2');
  });
});

describe('dual-write funnel: advanceWeek commits the merged gameState to the cache', () => {
  it('mirrors the post-advance gameState (refetch-wins merge) into the cache', async () => {
    useGameStore.setState({
      gameState: baseGameState({ id: 'game-1', currentWeek: 5, arOfficeSlotUsed: false }),
      selectedActions: ['{"roleId":"ceo","actionId":"a1","choiceId":"c1"}'],
    });

    mockedApiRequest.mockImplementation(async (_m: string, url: string) => {
      if (url.includes('/advance-week')) {
        return jsonResponse({ gameState: { id: 'game-1', currentWeek: 6, money: 9000 }, summary: { week: 6 }, campaignResults: null });
      }
      if (url.endsWith('/songs')) return jsonResponse([]);
      if (url.endsWith('/releases')) return jsonResponse([]);
      if (url.endsWith('/release-songs')) return jsonResponse([]);
      if (url.endsWith('/executives')) return jsonResponse([]);
      if (url.endsWith('/mood-events')) return jsonResponse([]);
      if (url.includes('/emails?') || url.endsWith('/emails')) return jsonResponse({ emails: [], total: 0, unreadCount: 0 });
      if (url.includes('/saves')) return jsonResponse({ ok: true });
      if (url.includes('/ar-office/artists')) return jsonResponse({ artists: [] });
      // GET /api/game/:id reload — money 12345 wins over advance-week's 9000.
      return jsonResponse({ gameState: { id: 'game-1', currentWeek: 6, money: 12345 }, musicLabel: { name: 'L' }, artists: [], projects: [] });
    });

    await useGameStore.getState().advanceWeek();

    cacheEqualsStore('game-1');
    const cached = queryClient.getQueryData(gameStateQueryKey('game-1')) as any;
    expect(cached.currentWeek).toBe(6);
    expect(cached.money).toBe(12345); // refetch-wins, mirrored to cache
    expect(cached.usedFocusSlots).toBe(0);
  });
});
