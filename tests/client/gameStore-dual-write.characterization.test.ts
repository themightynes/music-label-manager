/**
 * gameStore commit-funnel characterization tests (Phase 3.5 PR-4 → PR-6).
 *
 * PR-4 routed every gameState write through a single `commitGameState()` funnel
 * that dual-wrote Zustand + the query cache. PR-6 RETIRES the Zustand record:
 * the funnel now writes the full spine ONLY to the cache at
 * `gameStateQueryKey(id)` and keeps just a `{ id }` SESSION POINTER in Zustand.
 * This suite therefore asserts the cache — the single owner — carries the
 * committed record after every store action, and that the Zustand pointer tracks
 * the current game id. (The former "cache deep-equals the Zustand record"
 * invariant no longer applies: Zustand holds no record.)
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

/** Read the committed spine record from its single owner (the cache). */
function readRecord(gameId: string): any {
  return queryClient.getQueryData(gameStateQueryKey(gameId));
}

/**
 * Seed a game the way a real load does after PR-6: the Zustand SESSION POINTER
 * (`{ id }`) plus the full record in the cache. Store actions read the record
 * via `readGameState` (cache), so the cache MUST be seeded, not just the pointer.
 */
function seedGame(gs: any) {
  useGameStore.setState({ gameState: { id: gs.id } as any });
  queryClient.setQueryData(gameStateQueryKey(gs.id), gs);
}

/** After a commit, the Zustand pointer tracks the current game id. */
function pointerId(): string | null {
  return useGameStore.getState().gameState?.id ?? null;
}

beforeEach(() => {
  mockedApiRequest.mockReset();
  queryCache.clear();
  resetGameStore();
  mockedApiRequest.mockResolvedValue(jsonResponse({}));
});

describe('commit funnel: same-game slot writers', () => {
  it('selectAction commits the new gameState to the cache (single owner)', () => {
    seedGame(baseGameState({ id: 'game-1', focusSlots: 3, usedFocusSlots: 0, arOfficeSlotUsed: false }));
    useGameStore.setState({ selectedActions: [] });

    void useGameStore.getState().selectAction('action-A');

    expect(readRecord('game-1').usedFocusSlots).toBe(1);
    expect(pointerId()).toBe('game-1'); // pointer still tracks the game
  });

  it('removeAction commits the decremented gameState to the cache', async () => {
    seedGame(baseGameState({ id: 'game-1', usedFocusSlots: 2, arOfficeSlotUsed: false }));
    useGameStore.setState({ selectedActions: ['action-A', 'action-B'] });

    await useGameStore.getState().removeAction('action-A');

    expect(readRecord('game-1').usedFocusSlots).toBe(1);
  });

  it('clearActions commits the reset gameState to the cache', () => {
    seedGame(baseGameState({ id: 'game-1', usedFocusSlots: 2, arOfficeSlotUsed: false }));
    useGameStore.setState({ selectedActions: ['action-A', 'action-B'] });

    useGameStore.getState().clearActions();

    expect(readRecord('game-1').usedFocusSlots).toBe(0);
  });

  it('consumeAROfficeSlot commits the A&R gameState to the cache', async () => {
    seedGame(baseGameState({ id: 'game-1', focusSlots: 3, usedFocusSlots: 1, arOfficeSlotUsed: false }));
    useGameStore.setState({ selectedActions: ['action-A'] });

    await useGameStore.getState().consumeAROfficeSlot('active');

    expect(readRecord('game-1').arOfficeSlotUsed).toBe(true);
  });

  it('releaseAROfficeSlot commits the cleared A&R gameState to the cache', async () => {
    seedGame(baseGameState({ id: 'game-1', focusSlots: 3, usedFocusSlots: 2, arOfficeSlotUsed: true, arOfficeSourcingType: 'active' }));
    useGameStore.setState({ selectedActions: ['action-A'] });

    await useGameStore.getState().releaseAROfficeSlot();

    expect(readRecord('game-1').arOfficeSlotUsed).toBe(false);
  });
});

describe('commit funnel: balance-adopting writers', () => {
  it('cancelProject commits result.newBalance to the cache', async () => {
    seedGame(baseGameState({ id: 'game-1', money: 20000 }));
    routeApiRequest([
      { match: (u) => u.includes('/cancel'), body: { newBalance: 27500, refundAmount: 7500 } },
    ]);

    await useGameStore.getState().cancelProject('proj-1', { refundAmount: 7500 });

    expect(readRecord('game-1').money).toBe(27500);
  });

  it('adoptServerBalances (via planRelease) commits the two-field merge to the cache', async () => {
    seedGame(baseGameState({ id: 'game-1', money: 100000, creativeCapital: 4, musicLabel: { name: 'Keep' } }));
    routeApiRequest([
      { match: (u) => /\/api\/game\/[^/]+$/.test(u), body: { gameState: { money: 55000, creativeCapital: 1 } } },
      { match: (u) => u.includes('/releases/plan'), body: { ok: true } },
    ]);

    await useGameStore.getState().planRelease({ metadata: { totalInvestment: 1000 } });

    const cached = readRecord('game-1');
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

  it('loadGame seeds the loaded game key and the pointer tracks it', async () => {
    routeLoad('game-1', { name: 'Loaded Label' });

    await useGameStore.getState().loadGame('game-1');

    expect(pointerId()).toBe('game-1');
    expect(readRecord('game-1').musicLabel).toEqual({ name: 'Loaded Label' });
  });

  it('switching games via loadGame drops the previous game key and seeds the new one', async () => {
    // Start on game-A with a seeded record + pointer.
    seedGame(baseGameState({ id: 'game-A' }));

    routeLoad('game-B', { name: 'B Label' });
    await useGameStore.getState().loadGame('game-B');

    // Old key removed, new key seeded, pointer flipped to the new game.
    expect(queryClient.getQueryData(gameStateQueryKey('game-A'))).toBeUndefined();
    expect(pointerId()).toBe('game-B');
    expect(readRecord('game-B')).toBeTruthy();
    expect(queryClient.removeQueries).toHaveBeenCalledWith({
      queryKey: gameStateQueryKey('game-A'),
    });
  });

  it('createNewGame drops the previous (orphaned) game key and seeds the new game', async () => {
    seedGame(baseGameState({ id: 'game-1', currentWeek: 4 }));

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
    expect(pointerId()).toBe('game-2');
    expect(readRecord('game-2').id).toBe('game-2');
  });
});

describe('commit funnel: advanceWeek commits the merged gameState to the cache', () => {
  it('commits the post-advance gameState (refetch-wins merge) to the cache', async () => {
    seedGame(baseGameState({ id: 'game-1', currentWeek: 5, arOfficeSlotUsed: false }));
    useGameStore.setState({
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

    const cached = readRecord('game-1');
    expect(cached.currentWeek).toBe(6);
    expect(cached.money).toBe(12345); // refetch-wins, committed to cache
    expect(cached.usedFocusSlots).toBe(0);
    expect(pointerId()).toBe('game-1');
  });
});
