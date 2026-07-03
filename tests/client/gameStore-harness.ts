/**
 * Pure (mock-free) helpers for gameStore characterization tests (Phase 3 PR-1).
 *
 * The `vi.mock('@/lib/queryClient')` / `vi.mock('@/hooks/use-toast')` calls MUST
 * live at the top level of each test file so vitest can hoist them above the
 * real store import. This module only provides helpers that don't depend on
 * hoisting, so importing it never fights the mock ordering.
 */
import { vi } from 'vitest';
import type { useGameStore as UseGameStore } from '@/store/gameStore';

type Store = typeof UseGameStore;

/** A minimal `Response`-like object whose `.json()` resolves to `body`. */
export function jsonResponse(body: unknown): Response {
  return {
    json: async () => body,
    clone() {
      return this;
    },
    text: async () => JSON.stringify(body),
    ok: true,
    status: 200,
  } as unknown as Response;
}

/**
 * Route `apiRequest(method, url)` to a body by matching a substring of the URL.
 * First matching route wins; unmatched requests resolve to `{}` so parallel
 * `Promise.all` fetches don't reject.
 */
export function routeApiRequest(
  mockedApiRequest: ReturnType<typeof vi.fn>,
  routes: Array<{ match: (url: string) => boolean; body: unknown }>,
) {
  mockedApiRequest.mockImplementation(async (_method: string, url: string) => {
    const route = routes.find((r) => r.match(url));
    return jsonResponse(route ? route.body : {});
  });
}

/** Reset Zustand store state to store defaults between tests. */
export function resetGameStore(useGameStore: Store) {
  useGameStore.setState({
    gameState: null,
    artists: [],
    roles: [],
    weeklyActions: [],
    // Phase 3 PR-6/PR-7: songs / releases / releaseSongs / projects are no
    // longer store-owned (they live in the TanStack Query cache), so they are
    // not reset here.
    emails: [],
    executives: [],
    moodEvents: [],
    discoveredArtists: [],
    loadingDiscoveredArtists: false,
    selectedActions: [],
    isAdvancingWeek: false,
    weeklyOutcome: null,
    campaignResults: null,
  });
}

/** A representative full-ish GameState fixture for optimistic-delta pins. */
export function baseGameState(overrides: Record<string, any> = {}) {
  return {
    id: 'game-1',
    currentWeek: 5,
    money: 100000,
    reputation: 10,
    creativeCapital: 4,
    focusSlots: 3,
    usedFocusSlots: 0,
    arOfficeSlotUsed: false,
    arOfficeSourcingType: null,
    musicLabel: { name: 'Test Label' },
    ...overrides,
  } as any;
}
