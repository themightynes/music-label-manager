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
vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

import { apiRequest } from '@/lib/queryClient';
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
  it('deducts totalCost from money and 1 from creativeCapital, appends project', async () => {
    useGameStore.setState({
      gameState: baseGameState({ money: 100000, creativeCapital: 4 }),
      projects: [],
    });
    const newProject = { id: 'proj-1', title: 'EP' };
    routeApiRequest([{ match: (u) => u.includes('/projects'), body: newProject }]);

    await useGameStore.getState().createProject({ totalCost: 20000 });

    const state = useGameStore.getState();
    expect(state.gameState!.money).toBe(80000); // 100000 - 20000
    expect((state.gameState as any).creativeCapital).toBe(3); // 4 - 1
    expect(state.projects).toEqual([newProject]);
  });

  it('falls back to budgetPerSong when totalCost is absent', async () => {
    useGameStore.setState({
      gameState: baseGameState({ money: 50000, creativeCapital: 2 }),
      projects: [],
    });
    routeApiRequest([{ match: (u) => u.includes('/projects'), body: { id: 'p2' } }]);

    await useGameStore.getState().createProject({ budgetPerSong: 8000 });

    expect(useGameStore.getState().gameState!.money).toBe(42000); // 50000 - 8000
    expect((useGameStore.getState().gameState as any).creativeCapital).toBe(1);
  });

  it('deducts creative capital even when cost is 0', async () => {
    useGameStore.setState({
      gameState: baseGameState({ money: 30000, creativeCapital: 3 }),
      projects: [],
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
  it('sets money to result.newBalance (NOT a local delta) and removes the project', async () => {
    useGameStore.setState({
      gameState: baseGameState({ money: 20000 }),
      projects: [{ id: 'proj-1' } as any, { id: 'proj-2' } as any],
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
    expect(state.projects).toEqual([{ id: 'proj-2' }]);
  });
});

describe('loadGame set(...) state shape', () => {
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
    expect(state.projects).toEqual([{ id: 'p1' }]);
    expect(state.roles).toEqual([{ id: 'role1' }]);
    expect(state.weeklyActions).toEqual([{ id: 'wa1' }]);
    expect(state.songs).toEqual([{ id: 's1' }]);
    expect(state.releases).toEqual([{ id: 'r1' }]);
    expect(state.emails).toEqual([{ id: 'em1' }]);
    expect(state.releaseSongs).toEqual([{ id: 'rs1' }]);
    expect(state.executives).toEqual([{ id: 'e1' }]);
    expect(state.moodEvents).toEqual([{ id: 'm1' }]);
    expect(state.selectedActions).toEqual([]);
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
    expect(state.projects).toEqual([{ id: 'p1' }]);
    expect(state.songs).toEqual([{ id: 's1' }]);
    expect(state.releases).toEqual([{ id: 'r1' }]);
    expect(state.emails).toEqual([{ id: 'em1' }]);
    expect(state.releaseSongs).toEqual([{ id: 'rs1' }]);
    expect(state.executives).toEqual([{ id: 'e1' }]);
    expect(state.moodEvents).toEqual([{ id: 'm1' }]);
    expect(state.weeklyOutcome).toEqual({ week: 6 });
    expect(state.campaignResults).toBeNull();
    expect(state.selectedActions).toEqual([]);
    expect(state.isAdvancingWeek).toBe(false);
  });
});
