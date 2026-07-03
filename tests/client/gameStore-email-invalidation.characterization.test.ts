/**
 * C49 email-cache-invalidation regression pins (Phase 3 PR-1).
 *
 * The C49 fix (commit 2b57880) makes `loadGameFromSave` invalidate email queries
 * via a PREDICATE scoped to the RESTORED gameId, so the inbox reflects the
 * restored save immediately instead of showing stale pre-restore emails.
 *
 * `advanceWeek` uses the same email-invalidation predicate keyed on the new
 * game id. Both are pinned here.
 *
 * We assert two things:
 *   1. `queryClient.invalidateQueries` is called with a `predicate`.
 *   2. That predicate matches the correct query keys: matching scope + correct
 *      id => true; matching scope + wrong id => false; wrong scope => false.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the network + cache layer BEFORE the store import (vitest hoists these).
// Phase 3 PR-6: the store seeds songs/releases/releaseSongs into the query cache
// via setQueryData, so the mocked queryClient must expose it (a no-op is fine
// here — these tests only assert email invalidation).
vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
  queryClient: {
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
  },
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

import { EMAIL_LIST_SCOPE, EMAIL_UNREAD_SCOPE } from '@/hooks/useEmails';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useGameStore } from '@/store/gameStore';
import {
  jsonResponse,
  resetGameStore as resetGameStoreImpl,
  baseGameState,
} from './gameStore-harness';

const mockedApiRequest = apiRequest as unknown as ReturnType<typeof vi.fn>;
const mockedInvalidateQueries = queryClient.invalidateQueries as unknown as ReturnType<typeof vi.fn>;
const resetGameStore = () => resetGameStoreImpl(useGameStore);

beforeEach(() => {
  mockedApiRequest.mockReset();
  mockedInvalidateQueries.mockClear();
  resetGameStore();
});

/**
 * Extract the `predicate` passed to invalidateQueries that matches the EMAIL
 * scopes specifically, scoped to `gameId`. `advanceWeek`/`loadGameFromSave`
 * fire several scoped predicate invalidations (ROI analytics, charts, emails)
 * — search by scope+id rather than assuming email is the last call, so this
 * pin doesn't break when another predicate invalidation is added alongside it.
 */
function lastPredicate(gameId: string): (query: { queryKey: readonly unknown[] }) => boolean {
  const calls = mockedInvalidateQueries.mock.calls;
  for (let i = calls.length - 1; i >= 0; i--) {
    const arg = calls[i][0];
    if (arg && typeof arg.predicate === 'function') {
      const predicate = arg.predicate;
      if (predicate({ queryKey: [EMAIL_LIST_SCOPE, gameId] })) {
        return predicate;
      }
    }
  }
  throw new Error('No invalidateQueries call with an email-scoped predicate was recorded');
}

function assertEmailPredicateScopedTo(
  predicate: (q: { queryKey: readonly unknown[] }) => boolean,
  gameId: string,
) {
  // matching scope + correct id => true
  expect(predicate({ queryKey: [EMAIL_LIST_SCOPE, gameId] })).toBe(true);
  expect(predicate({ queryKey: [EMAIL_UNREAD_SCOPE, gameId] })).toBe(true);
  // matching scope + WRONG id => false
  expect(predicate({ queryKey: [EMAIL_LIST_SCOPE, 'some-other-id'] })).toBe(false);
  expect(predicate({ queryKey: [EMAIL_UNREAD_SCOPE, 'some-other-id'] })).toBe(false);
  // WRONG scope + correct id => false
  expect(predicate({ queryKey: ['executives', gameId] })).toBe(false);
  expect(predicate({ queryKey: ['artist-roi', gameId] })).toBe(false);
}

describe('loadGameFromSave email invalidation (C49)', () => {
  it('invalidates email queries via a predicate scoped to the restored gameId', async () => {
    const restoredGameId = 'restored-game-abc';

    mockedApiRequest.mockImplementation(async (method: string, url: string) => {
      if (url.includes('/restore')) return jsonResponse({ gameId: restoredGameId });
      if (url.endsWith('/songs')) return jsonResponse([]);
      if (url.endsWith('/releases')) return jsonResponse([]);
      if (url.endsWith('/release-songs')) return jsonResponse([]);
      if (url.endsWith('/executives')) return jsonResponse([]);
      if (url.endsWith('/mood-events')) return jsonResponse([]);
      if (url.includes('/emails?') || url.endsWith('/emails')) return jsonResponse({ emails: [], total: 0, unreadCount: 0 });
      if (url.includes('/ar-office/artists')) return jsonResponse({ artists: [] });
      // GET /api/game/:restoredGameId
      return jsonResponse({
        gameState: { id: restoredGameId, currentWeek: 2, arOfficeSlotUsed: false },
        musicLabel: null,
        artists: [],
        projects: [],
        roles: [],
        weeklyActions: [],
      });
    });

    const snapshot = {
      snapshotVersion: 2,
      gameState: { id: 'pre-restore-id', currentWeek: 2 },
      artists: [],
      projects: [],
      roles: [],
      songs: [],
      releases: [],
      emails: [],
      releaseSongs: [],
      executives: [],
      moodEvents: [],
      weeklyActions: [],
      weeklyOutcome: null,
    } as any;

    await useGameStore.getState().loadGameFromSave('save-1', snapshot, 'overwrite');

    // The predicate must be keyed on the RESTORED id, not the snapshot's own id.
    assertEmailPredicateScopedTo(lastPredicate(restoredGameId), restoredGameId);
  });
});

describe('advanceWeek email invalidation', () => {
  it('invalidates email queries via a predicate scoped to the advanced gameId', async () => {
    const gameId = 'game-adv-1';
    useGameStore.setState({
      gameState: baseGameState({ id: gameId, currentWeek: 5, arOfficeSlotUsed: false }),
      selectedActions: ['{"roleId":"ceo","actionId":"a1","choiceId":"c1"}'],
    });

    mockedApiRequest.mockImplementation(async (_m: string, url: string) => {
      if (url.includes('/advance-week')) {
        return jsonResponse({ gameState: { id: gameId, currentWeek: 6 }, summary: {}, campaignResults: null });
      }
      if (url.endsWith('/songs')) return jsonResponse([]);
      if (url.endsWith('/releases')) return jsonResponse([]);
      if (url.endsWith('/release-songs')) return jsonResponse([]);
      if (url.endsWith('/executives')) return jsonResponse([]);
      if (url.endsWith('/mood-events')) return jsonResponse([]);
      if (url.includes('/emails?') || url.endsWith('/emails')) return jsonResponse({ emails: [], total: 0, unreadCount: 0 });
      if (url.includes('/saves')) return jsonResponse({ ok: true });
      if (url.includes('/ar-office/artists')) return jsonResponse({ artists: [] });
      return jsonResponse({ gameState: { id: gameId, currentWeek: 6 }, musicLabel: null, artists: [], projects: [] });
    });

    await useGameStore.getState().advanceWeek();

    assertEmailPredicateScopedTo(lastPredicate(gameId), gameId);
  });
});
