/**
 * gameStore SPINE characterization tests (Phase 3.5 PR-1).
 *
 * SAFETY NET for the Phase 3.5 gameState-spine → TanStack Query ownership
 * refactor. These pins assert the CURRENT behavior of the real store's
 * gameState spine EXACTLY — the synchronous focus-slot math, the
 * `syncSlotsPatch` payloads, the `advanceWeek` merge (including its
 * `{...resultGameState, ...serverGameState}` refetch-wins precedence quirk and
 * the hardcoded `usedFocusSlots` reset), `adoptServerBalances`' two-field
 * merge, `loadGame`'s `gameStateWithLabel` assembly, the orphan-cleanup path in
 * `createNewGame`, and the snapshot-assembly input to `saveGame`.
 *
 * Do NOT "correct" these assertions to what looks right — they pin what the
 * code DOES today so PRs 4–6 (the ownership flip) can prove behavior is
 * unchanged. A later PR that deliberately changes behavior should update the
 * pin with intent.
 *
 * Mirrors the mock/harness setup of `gameStore-actions.characterization.test.ts`.
 * See: docs/01-planning/implementation-specs/[READY] phase-3.5-gamestate-tanstack-plan.md (PR-1).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the network + cache layer BEFORE the store import (vitest hoists these).
// The mocked queryClient exposes a working in-memory cache because the store
// seeds/reads several collections via setQueryData/getQueryData.
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

/** Grab every PATCH /api/game/:id payload the store fired at syncSlotsPatch. */
function slotPatchCalls() {
  return mockedApiRequest.mock.calls
    .filter(([method, url]) => method === 'PATCH' && /\/api\/game\/[^/]+$/.test(url))
    .map(([, , payload]) => payload);
}

beforeEach(() => {
  mockedApiRequest.mockReset();
  queryCache.clear();
  resetGameStore();
  // Default: any request resolves to {} (slot ops fire a fire-and-forget PATCH).
  mockedApiRequest.mockResolvedValue(jsonResponse({}));
});

// ---------------------------------------------------------------------------
// (a) Synchronous focus-slot math + syncSlotsPatch payloads
// ---------------------------------------------------------------------------

describe('selectAction focus-slot math', () => {
  it('increments usedFocusSlots synchronously and is visible on the SAME tick', () => {
    seedGameState(baseGameState({ focusSlots: 3, usedFocusSlots: 0, arOfficeSlotUsed: false }));
    useGameStore.setState({ selectedActions: [] });

    // Do NOT await: the local set() is synchronous; only syncSlotsPatch is async.
    void useGameStore.getState().selectAction('action-A');

    const state = useGameStore.getState();
    expect(state.selectedActions).toEqual(['action-A']);
    expect(record().usedFocusSlots).toBe(1);
  });

  it('fires syncSlotsPatch with the new usedFocusSlots + A&R fields', async () => {
    seedGameState(baseGameState({
      focusSlots: 3,
      usedFocusSlots: 0,
      arOfficeSlotUsed: false,
      arOfficeSourcingType: null,
    }));
    useGameStore.setState({ selectedActions: [] });

    await useGameStore.getState().selectAction('action-A');

    expect(slotPatchCalls()).toContainEqual({
      usedFocusSlots: 1,
      arOfficeSlotUsed: false,
      arOfficeSourcingType: null,
    });
  });

  it('adds the A&R-consumed slot on top of selected actions in usedFocusSlots', async () => {
    seedGameState(baseGameState({
      focusSlots: 3,
      usedFocusSlots: 1,
      arOfficeSlotUsed: true,
      arOfficeSourcingType: 'active',
    }));
    useGameStore.setState({ selectedActions: [] });

    await useGameStore.getState().selectAction('action-A');

    // 1 selected action + 1 A&R slot = 2.
    expect(record().usedFocusSlots).toBe(2);
    expect(slotPatchCalls()).toContainEqual({
      usedFocusSlots: 2,
      arOfficeSlotUsed: true,
      arOfficeSourcingType: 'active',
    });
  });

  it('does NOT select past the available slots (focusSlots minus A&R slot)', async () => {
    // focusSlots 2, A&R slot used → only 1 action slot available.
    seedGameState(baseGameState({
      focusSlots: 2,
      usedFocusSlots: 1,
      arOfficeSlotUsed: true,
      arOfficeSourcingType: 'active',
    }));
    useGameStore.setState({ selectedActions: [] });

    await useGameStore.getState().selectAction('action-A'); // fills the last slot
    await useGameStore.getState().selectAction('action-B'); // should be rejected

    const state = useGameStore.getState();
    expect(state.selectedActions).toEqual(['action-A']);
    expect(record().usedFocusSlots).toBe(2);
  });

  it('ignores a duplicate action id (no double-count)', async () => {
    seedGameState(baseGameState({ focusSlots: 3, usedFocusSlots: 0, arOfficeSlotUsed: false }));
    useGameStore.setState({ selectedActions: [] });

    await useGameStore.getState().selectAction('action-A');
    await useGameStore.getState().selectAction('action-A');

    const state = useGameStore.getState();
    expect(state.selectedActions).toEqual(['action-A']);
    expect(record().usedFocusSlots).toBe(1);
  });

  it('is a no-op when gameState is null', async () => {
    useGameStore.setState({ gameState: null, selectedActions: [] });
    await useGameStore.getState().selectAction('action-A');
    expect(useGameStore.getState().selectedActions).toEqual([]);
  });
});

describe('removeAction focus-slot math', () => {
  it('decrements usedFocusSlots synchronously and syncs the new count', async () => {
    seedGameState(baseGameState({
      focusSlots: 3,
      usedFocusSlots: 2,
      arOfficeSlotUsed: false,
      arOfficeSourcingType: null,
    }));
    useGameStore.setState({ selectedActions: ['action-A', 'action-B'] });

    await useGameStore.getState().removeAction('action-A');

    const state = useGameStore.getState();
    expect(state.selectedActions).toEqual(['action-B']);
    expect(record().usedFocusSlots).toBe(1);
    expect(slotPatchCalls()).toContainEqual({
      usedFocusSlots: 1,
      arOfficeSlotUsed: false,
      arOfficeSourcingType: null,
    });
  });

  it('keeps the A&R slot counted when removing an action', async () => {
    seedGameState(baseGameState({
      focusSlots: 3,
      usedFocusSlots: 2,
      arOfficeSlotUsed: true,
      arOfficeSourcingType: 'active',
    }));
    useGameStore.setState({ selectedActions: ['action-A'] });

    await useGameStore.getState().removeAction('action-A');

    // 0 actions + 1 A&R slot = 1.
    expect(record().usedFocusSlots).toBe(1);
  });

  it('is a no-op for an action id that is not selected', async () => {
    seedGameState(baseGameState({ usedFocusSlots: 1 }));
    useGameStore.setState({ selectedActions: ['action-A'] });

    await useGameStore.getState().removeAction('not-selected');

    expect(useGameStore.getState().selectedActions).toEqual(['action-A']);
    expect(slotPatchCalls()).toHaveLength(0);
  });
});

describe('clearActions focus-slot math', () => {
  it('clears selectedActions and resets usedFocusSlots to the A&R slot count (no A&R)', () => {
    seedGameState(baseGameState({ usedFocusSlots: 2, arOfficeSlotUsed: false }));
    useGameStore.setState({ selectedActions: ['action-A', 'action-B'] });

    useGameStore.getState().clearActions();

    const state = useGameStore.getState();
    expect(state.selectedActions).toEqual([]);
    expect(record().usedFocusSlots).toBe(0);
  });

  it('preserves the A&R-consumed slot in usedFocusSlots after clearing', () => {
    seedGameState(baseGameState({ usedFocusSlots: 3, arOfficeSlotUsed: true }));
    useGameStore.setState({ selectedActions: ['action-A', 'action-B'] });

    useGameStore.getState().clearActions();

    const state = useGameStore.getState();
    expect(state.selectedActions).toEqual([]);
    expect(record().usedFocusSlots).toBe(1); // A&R slot only
  });

  it('does NOT fire a syncSlotsPatch (purely local reset)', () => {
    seedGameState(baseGameState({ usedFocusSlots: 2 }));
    useGameStore.setState({ selectedActions: ['action-A'] });

    useGameStore.getState().clearActions();

    expect(slotPatchCalls()).toHaveLength(0);
  });
});

describe('consumeAROfficeSlot focus-slot math', () => {
  it('marks the A&R slot used and sets usedFocusSlots to selectedActions.length + 1', async () => {
    seedGameState(baseGameState({
      focusSlots: 3,
      usedFocusSlots: 1,
      arOfficeSlotUsed: false,
      arOfficeSourcingType: null,
    }));
    useGameStore.setState({ selectedActions: ['action-A'] });

    await useGameStore.getState().consumeAROfficeSlot('active');

    expect(record().arOfficeSlotUsed).toBe(true);
    expect(record().arOfficeSourcingType).toBe('active');
    expect(record().usedFocusSlots).toBe(2); // 1 action + 1 A&R
    expect(slotPatchCalls()).toContainEqual({
      usedFocusSlots: 2,
      arOfficeSlotUsed: true,
      arOfficeSourcingType: 'active',
    });
  });

  it('is a no-op when the A&R slot is already used', async () => {
    seedGameState(baseGameState({
      focusSlots: 3,
      usedFocusSlots: 1,
      arOfficeSlotUsed: true,
      arOfficeSourcingType: 'passive',
    }));
    useGameStore.setState({ selectedActions: [] });

    await useGameStore.getState().consumeAROfficeSlot('active');

    // sourcingType unchanged, no PATCH fired.
    expect(record().arOfficeSourcingType).toBe('passive');
    expect(slotPatchCalls()).toHaveLength(0);
  });

  it('is a no-op when all focus slots are already consumed', async () => {
    seedGameState(baseGameState({
      focusSlots: 2,
      usedFocusSlots: 2,
      arOfficeSlotUsed: false,
      arOfficeSourcingType: null,
    }));
    useGameStore.setState({ selectedActions: ['action-A', 'action-B'] });

    await useGameStore.getState().consumeAROfficeSlot('active');

    expect(record().arOfficeSlotUsed).toBe(false);
    expect(slotPatchCalls()).toHaveLength(0);
  });
});

describe('releaseAROfficeSlot focus-slot math', () => {
  it('clears the A&R slot and sets usedFocusSlots to selectedActions.length', async () => {
    seedGameState(baseGameState({
      focusSlots: 3,
      usedFocusSlots: 2,
      arOfficeSlotUsed: true,
      arOfficeSourcingType: 'active',
    }));
    useGameStore.setState({ selectedActions: ['action-A'] });

    await useGameStore.getState().releaseAROfficeSlot();

    expect(record().arOfficeSlotUsed).toBe(false);
    expect(record().arOfficeSourcingType).toBeNull();
    expect(record().usedFocusSlots).toBe(1); // just the 1 action
    expect(slotPatchCalls()).toContainEqual({
      usedFocusSlots: 1,
      arOfficeSlotUsed: false,
      arOfficeSourcingType: null,
    });
  });

  it('is a no-op when no A&R slot is in use', async () => {
    seedGameState(baseGameState({ arOfficeSlotUsed: false }));
    useGameStore.setState({ selectedActions: [] });

    await useGameStore.getState().releaseAROfficeSlot();

    expect(slotPatchCalls()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// (b) advanceWeek gameState assembly — merge precedence + usedFocusSlots reset
// ---------------------------------------------------------------------------

describe('advanceWeek gameState merge precedence', () => {
  function routeAdvance(advanceGameState: any, reloadGameState: any, reloadMusicLabel: any) {
    mockedApiRequest.mockImplementation(async (_m: string, url: string) => {
      if (url.includes('/advance-week')) {
        return jsonResponse({ gameState: advanceGameState, summary: { week: 6 }, campaignResults: null });
      }
      if (url.endsWith('/songs')) return jsonResponse([]);
      if (url.endsWith('/releases')) return jsonResponse([]);
      if (url.endsWith('/release-songs')) return jsonResponse([]);
      if (url.endsWith('/executives')) return jsonResponse([]);
      if (url.endsWith('/mood-events')) return jsonResponse([]);
      if (url.includes('/emails?') || url.endsWith('/emails')) return jsonResponse({ emails: [], total: 0, unreadCount: 0 });
      if (url.includes('/saves')) return jsonResponse({ ok: true });
      if (url.includes('/ar-office/artists')) return jsonResponse({ artists: [] });
      // GET /api/game/:id reload (the "refetch" side of the merge)
      return jsonResponse({ gameState: reloadGameState, musicLabel: reloadMusicLabel, artists: [], projects: [] });
    });
  }

  it('lets the refetch (serverGameState) WIN over the advance-week response on conflicting fields', async () => {
    seedGameState(baseGameState({ id: 'game-1', currentWeek: 5, arOfficeSlotUsed: false }));
    useGameStore.setState({
      selectedActions: ['{"roleId":"ceo","actionId":"a1","choiceId":"c1"}'],
    });

    // advance-week says money 9000; the immediate refetch disagrees (money 12345).
    // The merge is {...resultGameState, ...serverGameState} so the REFETCH wins.
    routeAdvance(
      { id: 'game-1', currentWeek: 6, money: 9000, reputation: 50 },
      { id: 'game-1', currentWeek: 6, money: 12345 },
      { name: 'Test Label' },
    );

    await useGameStore.getState().advanceWeek();

    const gs = record('game-1');
    expect(gs.money).toBe(12345); // refetch wins over the advance-week 9000
    // A field present ONLY in the advance-week response survives (not overwritten).
    expect(gs.reputation).toBe(50);
  });

  it('hardcodes usedFocusSlots to (arOfficeSlotUsed ? 1 : 0) — 0 when no A&R slot', async () => {
    seedGameState(baseGameState({ id: 'game-1', currentWeek: 5 }));
    useGameStore.setState({
      selectedActions: ['{"roleId":"ceo","actionId":"a1","choiceId":"c1"}'],
    });
    routeAdvance(
      { id: 'game-1', currentWeek: 6, usedFocusSlots: 99, arOfficeSlotUsed: false },
      { id: 'game-1', currentWeek: 6, usedFocusSlots: 99 },
      { name: 'Test Label' },
    );

    await useGameStore.getState().advanceWeek();

    expect(record('game-1').usedFocusSlots).toBe(0);
  });

  it('resets usedFocusSlots to 1 when the advance response reports an A&R slot in use', async () => {
    seedGameState(baseGameState({ id: 'game-1', currentWeek: 5, arOfficeSlotUsed: true }));
    useGameStore.setState({ selectedActions: [] });
    routeAdvance(
      { id: 'game-1', currentWeek: 6, arOfficeSlotUsed: true, arOfficeSourcingType: 'active' },
      { id: 'game-1', currentWeek: 6 }, // refetch omits the A&R fields
      { name: 'Test Label' },
    );

    await useGameStore.getState().advanceWeek();

    const gs = record('game-1');
    expect(gs.usedFocusSlots).toBe(1);
    // arOfficeSlotUsed/SourcingType are coalesced result ?? server.
    expect(gs.arOfficeSlotUsed).toBe(true);
    expect(gs.arOfficeSourcingType).toBe('active');
  });

  it('sources musicLabel from the reload (gameData.musicLabel), embedded into gameState', async () => {
    seedGameState(baseGameState({ id: 'game-1', currentWeek: 5 }));
    useGameStore.setState({
      selectedActions: ['{"roleId":"ceo","actionId":"a1","choiceId":"c1"}'],
    });
    routeAdvance(
      { id: 'game-1', currentWeek: 6 },
      { id: 'game-1', currentWeek: 6 },
      { name: 'Reloaded Label' },
    );

    await useGameStore.getState().advanceWeek();

    expect(record('game-1').musicLabel).toEqual({ name: 'Reloaded Label' });
  });

  it('falls back to null musicLabel when neither reload nor advance response carries one', async () => {
    seedGameState(baseGameState({ id: 'game-1', currentWeek: 5 }));
    useGameStore.setState({
      selectedActions: ['{"roleId":"ceo","actionId":"a1","choiceId":"c1"}'],
    });
    routeAdvance({ id: 'game-1', currentWeek: 6 }, { id: 'game-1', currentWeek: 6 }, null);

    await useGameStore.getState().advanceWeek();

    expect(record('game-1').musicLabel).toBeNull();
  });

  it('is a no-op (never sets isAdvancingWeek) when there are no actions and no A&R slot', async () => {
    seedGameState(baseGameState({ id: 'game-1', arOfficeSlotUsed: false }));
    useGameStore.setState({ selectedActions: [] });

    await useGameStore.getState().advanceWeek();

    expect(useGameStore.getState().isAdvancingWeek).toBe(false);
    // advance-week endpoint was never hit.
    const hitAdvance = mockedApiRequest.mock.calls.some(([, url]) => String(url).includes('/advance-week'));
    expect(hitAdvance).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// (c) adoptServerPlanReleaseResolution — money/creativeCapital/flags merge
//     preserving everything else (buzz-v2 slice 2 follow-up: planRelease moved
//     off adoptServerBalances to this wider sibling because attach-at-plan
//     drains hype flags server-side)
// ---------------------------------------------------------------------------

describe('adoptServerPlanReleaseResolution merge (via planRelease)', () => {
  it('overwrites ONLY money + creativeCapital + flags, preserving A&R fields and musicLabel', async () => {
    seedGameState(baseGameState({
      id: 'game-1',
      money: 100000,
      creativeCapital: 4,
      arOfficeSlotUsed: true,
      arOfficeSourcingType: 'active',
      usedFocusSlots: 2,
      musicLabel: { name: 'Preserve Me' },
      flags: { pendingAwarenessBoost: 5, pendingAwarenessBoostWeek: 3 },
    } as any));
    routeApiRequest([
      // GET /api/game/:id refetch carries a DIFFERENT musicLabel + A&R fields, none
      // of which must leak into the store (only money + creativeCapital + flags
      // merge — flags because attach-at-plan drains the hype pools server-side).
      {
        match: (u) => /\/api\/game\/[^/]+$/.test(u),
        body: {
          gameState: {
            money: 55000,
            creativeCapital: 1,
            flags: {}, // pools drained onto the release at plan time
            arOfficeSlotUsed: false,
            arOfficeSourcingType: null,
            usedFocusSlots: 0,
            musicLabel: { name: 'Server Label' },
          },
        },
      },
      { match: (u) => u.includes('/releases/plan'), body: { ok: true } },
    ]);

    await useGameStore.getState().planRelease({ metadata: { totalInvestment: 1000 } });

    const gs = record('game-1');
    expect(gs.money).toBe(55000); // adopted
    expect(gs.creativeCapital).toBe(1); // adopted
    // Drained flags adopted — the "+N Hype banked" chip clears without a reload.
    expect((gs as any).flags).toEqual({});
    // Everything else is the PRE-EXISTING store value, NOT the server refetch's.
    expect(gs.arOfficeSlotUsed).toBe(true);
    expect(gs.arOfficeSourcingType).toBe('active');
    expect(gs.usedFocusSlots).toBe(2);
    expect(gs.musicLabel).toEqual({ name: 'Preserve Me' });
  });
});

// ---------------------------------------------------------------------------
// (d) cancelProject adopts result.newBalance verbatim (complements the
//     existing pin in gameStore-actions.characterization.test.ts)
// ---------------------------------------------------------------------------

describe('cancelProject balance adoption preserves the rest of the spine', () => {
  it('sets money to result.newBalance while leaving other spine fields intact', async () => {
    seedGameState(baseGameState({
      id: 'game-1',
      money: 20000,
      creativeCapital: 3,
      reputation: 12,
      musicLabel: { name: 'Keep' },
    }));
    routeApiRequest([
      { match: (u) => u.includes('/cancel'), body: { newBalance: 27500, refundAmount: 7500 } },
    ]);

    await useGameStore.getState().cancelProject('proj-1', { refundAmount: 7500 });

    const gs = record('game-1');
    expect(gs.money).toBe(27500);
    // creativeCapital is NOT touched by cancelProject (only money).
    expect(gs.creativeCapital).toBe(3);
    expect(gs.reputation).toBe(12);
    expect(gs.musicLabel).toEqual({ name: 'Keep' });
  });
});

// ---------------------------------------------------------------------------
// (e) loadGame gameStateWithLabel assembly
// ---------------------------------------------------------------------------

describe('loadGame gameStateWithLabel assembly', () => {
  function routeLoad(baseGameStatePayload: any, musicLabel: any) {
    mockedApiRequest.mockImplementation(async (_m: string, url: string) => {
      if (url.endsWith('/songs')) return jsonResponse([]);
      if (url.endsWith('/releases')) return jsonResponse([]);
      if (url.endsWith('/release-songs')) return jsonResponse([]);
      if (url.endsWith('/executives')) return jsonResponse([]);
      if (url.endsWith('/mood-events')) return jsonResponse([]);
      if (url.includes('/emails?') || url.endsWith('/emails')) return jsonResponse({ emails: [], total: 0, unreadCount: 0 });
      if (url.includes('/ar-office/artists')) return jsonResponse({ artists: [] });
      return jsonResponse({
        gameState: baseGameStatePayload,
        musicLabel,
        artists: [],
        projects: [],
        roles: [],
        weeklyActions: [],
      });
    });
  }

  it('embeds musicLabel and derives usedFocusSlots=0 when no A&R slot is used', async () => {
    routeLoad(
      { id: 'game-1', currentWeek: 3, money: 5000, arOfficeSlotUsed: false, arOfficeSourcingType: null },
      { name: 'Loaded Label' },
    );

    await useGameStore.getState().loadGame('game-1');

    const gs = record('game-1');
    expect(gs.musicLabel).toEqual({ name: 'Loaded Label' });
    expect(gs.usedFocusSlots).toBe(0);
    expect(gs.arOfficeSlotUsed).toBe(false);
    expect(gs.arOfficeSourcingType).toBeNull();
  });

  it('derives usedFocusSlots=1 when the loaded game has an A&R slot in use', async () => {
    routeLoad(
      { id: 'game-1', currentWeek: 3, money: 5000, arOfficeSlotUsed: true, arOfficeSourcingType: 'active' },
      { name: 'Loaded Label' },
    );

    await useGameStore.getState().loadGame('game-1');

    const gs = record('game-1');
    expect(gs.usedFocusSlots).toBe(1);
    expect(gs.arOfficeSlotUsed).toBe(true);
    expect(gs.arOfficeSourcingType).toBe('active');
  });

  it('embeds musicLabel as null when the payload has none', async () => {
    routeLoad({ id: 'game-1', currentWeek: 3, arOfficeSlotUsed: false }, null);

    await useGameStore.getState().loadGame('game-1');

    expect(record('game-1').musicLabel).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// (f) Orphan-cleanup path in createNewGame
// ---------------------------------------------------------------------------

describe('createNewGame orphan-cleanup', () => {
  /** Route the common new-game creation sequence; `savesBody` controls the /api/saves GET. */
  function routeCreate(savesBody: any, opts: { newId?: string } = {}) {
    const newId = opts.newId ?? 'game-2';
    mockedApiRequest.mockImplementation(async (method: string, url: string) => {
      if (method === 'GET' && url.endsWith('/api/saves')) return jsonResponse(savesBody);
      if (method === 'DELETE' && /\/api\/game\/[^/]+$/.test(url)) return jsonResponse({ ok: true });
      if (method === 'POST' && url.endsWith('/api/game')) return jsonResponse({ id: newId, currentWeek: 1 });
      // Follow-up GET /api/game/:newId for the complete payload (incl. musicLabel)
      if (method === 'GET' && /\/api\/game\/[^/]+$/.test(url)) {
        return jsonResponse({ gameState: { id: newId, currentWeek: 1 }, musicLabel: null });
      }
      return jsonResponse({});
    });
  }

  it('issues GET /api/saves then DELETE /api/game/:id for an unsaved current game', async () => {
    seedGameState(baseGameState({ id: 'game-1', currentWeek: 4 }));
    routeCreate([]); // no saves belong to game-1 → orphaned

    await useGameStore.getState().createNewGame('Balanced');

    const calls = mockedApiRequest.mock.calls.map(([m, u]) => `${m} ${u}`);
    expect(calls).toContain('GET /api/saves');
    expect(calls).toContain('DELETE /api/game/game-1');
  });

  it('does NOT delete the current game when it has saves', async () => {
    seedGameState(baseGameState({ id: 'game-1', currentWeek: 4 }));
    routeCreate([{ gameId: 'game-1', name: 'a save' }]);

    await useGameStore.getState().createNewGame('Balanced');

    const deletedCurrent = mockedApiRequest.mock.calls.some(
      ([m, u]) => m === 'DELETE' && u === '/api/game/game-1',
    );
    expect(deletedCurrent).toBe(false);
  });

  it('filters saves by gameId — saves for OTHER games do not protect the current one', async () => {
    seedGameState(baseGameState({ id: 'game-1', currentWeek: 4 }));
    routeCreate([{ gameId: 'some-other-game', name: 'unrelated save' }]);

    await useGameStore.getState().createNewGame('Balanced');

    const calls = mockedApiRequest.mock.calls.map(([m, u]) => `${m} ${u}`);
    expect(calls).toContain('DELETE /api/game/game-1');
  });

  it('skips cleanup entirely when there is no current game', async () => {
    useGameStore.setState({ gameState: null });
    routeCreate([]);

    await useGameStore.getState().createNewGame('Balanced');

    const hitSaves = mockedApiRequest.mock.calls.some(([m, u]) => m === 'GET' && u === '/api/saves');
    expect(hitSaves).toBe(false);
  });

  it('still creates the new game when the DELETE cleanup fails (non-fatal)', async () => {
    seedGameState(baseGameState({ id: 'game-1', currentWeek: 4 }));
    mockedApiRequest.mockImplementation(async (method: string, url: string) => {
      if (method === 'GET' && url.endsWith('/api/saves')) return jsonResponse([]);
      if (method === 'DELETE' && /\/api\/game\/[^/]+$/.test(url)) throw new Error('delete failed');
      if (method === 'POST' && url.endsWith('/api/game')) return jsonResponse({ id: 'game-2', currentWeek: 1 });
      if (method === 'GET' && /\/api\/game\/[^/]+$/.test(url)) {
        return jsonResponse({ gameState: { id: 'game-2', currentWeek: 1 }, musicLabel: null });
      }
      return jsonResponse({});
    });

    const result = await useGameStore.getState().createNewGame('Balanced');

    expect(result.id).toBe('game-2');
    expect(record('game-2').id).toBe('game-2');
  });
});

// ---------------------------------------------------------------------------
// (g) saveGame passes the store gameState (embedded musicLabel) into
//     buildGameSnapshot verbatim — the snapshot POSTed keeps musicLabel a
//     SIBLING of gameState (stripped out by buildGameSnapshot).
// ---------------------------------------------------------------------------

describe('saveGame snapshot-assembly input', () => {
  /** Capture the POST /api/saves body. */
  function routeSave() {
    let saved: any = null;
    mockedApiRequest.mockImplementation(async (method: string, url: string, body?: any) => {
      if (method === 'POST' && url.endsWith('/api/saves')) {
        saved = body;
        return jsonResponse({ ok: true });
      }
      // fetchSnapshotCollections fan-out
      if (url.includes('/emails?') || url.endsWith('/emails')) return jsonResponse({ emails: [], total: 0, unreadCount: 0 });
      if (url.endsWith('/release-songs')) return jsonResponse([]);
      if (url.endsWith('/executives')) return jsonResponse([]);
      if (url.endsWith('/mood-events')) return jsonResponse([]);
      return jsonResponse({});
    });
    return () => saved;
  }

  it('feeds gameState verbatim into buildGameSnapshot — musicLabel ends up a SIBLING, not nested', async () => {
    seedGameState(baseGameState({
      id: 'game-1',
      currentWeek: 7,
      money: 42000,
      musicLabel: { name: 'Snapshot Label' },
    }));
    useGameStore.setState({
      roles: [{ id: 'role1' } as any],
      weeklyActions: [{ id: 'wa1' } as any],
      weeklyOutcome: { week: 7 },
    });
    const getSaved = routeSave();

    await useGameStore.getState().saveGame('My Save');

    const saved = getSaved();
    expect(saved).toBeTruthy();
    const snapshot = saved.gameState; // the snapshot object built by buildGameSnapshot
    // musicLabel is a SIBLING of the inner gameState, and stripped OUT of it.
    expect(snapshot.musicLabel).toEqual({ name: 'Snapshot Label' });
    expect(snapshot.gameState.musicLabel).toBeUndefined();
    // The rest of the spine is carried into the inner gameState verbatim.
    expect(snapshot.gameState.id).toBe('game-1');
    expect(snapshot.gameState.currentWeek).toBe(7);
    expect(snapshot.gameState.money).toBe(42000);
    // top-level save envelope reports the week from the store gameState.
    expect(saved.week).toBe(7);
  });

  it('sources songs/releases/projects/artists from the query cache, not the store', async () => {
    seedGameState(baseGameState({ id: 'game-1', currentWeek: 2, musicLabel: null }));
    useGameStore.setState({
      roles: [],
      weeklyActions: [],
      weeklyOutcome: null,
    });
    // Seed the caches the snapshot reads from.
    queryCache.set(JSON.stringify(songsQueryKey('game-1')), [{ id: 's1' }]);
    queryCache.set(JSON.stringify(releasesQueryKey('game-1')), [{ id: 'r1' }]);
    queryCache.set(JSON.stringify(releaseSongsQueryKey('game-1')), [{ id: 'rs1' }]);
    queryCache.set(JSON.stringify(projectsQueryKey('game-1')), [{ id: 'p1' }]);
    queryCache.set(JSON.stringify(artistsQueryKey('game-1')), [{ id: 'a1' }]);
    const getSaved = routeSave();

    await useGameStore.getState().saveGame('Cache Save');

    const snapshot = getSaved().gameState;
    // Collections are siblings of gameState (from the cache).
    expect(snapshot.songs).toEqual([{ id: 's1' }]);
    expect(snapshot.releases).toEqual([{ id: 'r1' }]);
    expect(snapshot.projects).toEqual([{ id: 'p1' }]);
    expect(snapshot.artists).toEqual([{ id: 'a1' }]);
    // release-songs fan-out from fetchSnapshotCollections returns [] here, which
    // takes precedence over the cached value (releaseSongsSnapshot ?? releaseSongs).
    expect(snapshot.releaseSongs).toEqual([]);
  });
});
