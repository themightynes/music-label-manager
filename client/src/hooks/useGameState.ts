/**
 * gameState spine façade (Phase 3.5 PR-3a → PR-5).
 *
 * `gameState` (week, money, reputation, creativeCapital, focusSlots, access
 * tiers, flags, A&R fields, embedded `musicLabel`) is a CLIENT-COMMITTED RECORD
 * in the TanStack Query cache at `gameStateQueryKey(gameId)`. The store's
 * `commitGameState` funnel (PR-4) is its ONLY writer (fan-out seed, advance-week
 * commit, slot math, `adoptServerBalances`). This hook is the READ façade the
 * rest of the app goes through.
 *
 * PR-5 (this file): the READ side flips off Zustand and onto the query cache.
 *
 * MECHANISM — `useSyncExternalStore` on the QueryCache, NOT `useQuery`.
 * The plan's critical correctness property (§0.6, AC #3) is that the store's
 * SYNCHRONOUS slot math (`selectAction` etc.) — which commits via `setQueryData`
 * — must be visible on the NEXT RENDER, same-tick, exactly as the old Zustand
 * `useSyncExternalStore` subscription delivered. `useQuery` does NOT satisfy
 * this: React Query v5 defers observer notifications through its `notifyManager`
 * batch (a microtask/scheduler tick), so a `useQuery` reader only re-renders on
 * a LATER tick — an RTL test must `waitFor` it, and XState `SYNC_SLOTS` /
 * `SelectionSummary` / the CommandDock AUTO filler would see a one-tick-stale
 * slot count. (This was verified empirically; the plan's assumption that
 * `setQueryData` notifies `useQuery` subscribers synchronously does not hold for
 * v5's batched notifyManager.) `useSyncExternalStore` subscribed directly to the
 * QueryCache re-renders SYNCHRONOUSLY when `setQueryData` fires during an event —
 * the same guarantee Zustand gave. The plan explicitly sanctioned this
 * alternative ("via useQuery OR useSyncExternalStore on the cache").
 *
 * A `useQuery` is ALSO mounted here, but ONLY to drive the COLD-CACHE FALLBACK
 * fetch + client-committed-record semantics (staleTime/gcTime Infinity, no
 * focus/mount/reconnect refetch). Its `.data` is ignored for reads — the read
 * comes from the cache via `useSyncExternalStore`. PR-4's dual-write funnel
 * pre-seeds the key on every load/create/advance, so the fallback never fires in
 * practice.
 *
 * The gameId BOOTSTRAP: `useGameState` must know WHICH game to subscribe to
 * before the cache has data. `gameId` is still read from Zustand — a tiny
 * session pointer (`s.gameState?.id`) — while the record itself comes from the
 * cache. PR-4's funnel seeds the new key BEFORE any gameId flip is observable,
 * so game-switch never shows a stale record.
 *
 * LOADING/NULL semantics are identical to the old Zustand read: before any game
 * loads, `useGameState()` returns `null` (not undefined, not a loading throw).
 * Do NOT expose `isLoading`/query-object semantics here; callers null-check the
 * returned value exactly like they did against the store.
 *
 * `useGameState` accepts an optional selector so call sites can keep
 * selector-level subscription granularity (e.g. `useGameState((gs) =>
 * gs?.money)`) instead of subscribing to the whole spine object.
 *
 * ROLLBACK: reverting this one file restores the Zustand read path; PR-4's
 * dual-write keeps both sources correct either way.
 *
 * See docs/01-planning/implementation-specs/[READY] phase-3.5-gamestate-tanstack-plan.md
 * (§1 "synchronized copy first, wholesale flip second", §3 PR-5, §0.6).
 */
import { useCallback, useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useGameStore } from '@/store/gameStore';
import type { GameState } from '@shared/types/gameTypes';

/**
 * Query-key scope for the gameState spine record (Phase 3.5 PR-4).
 *
 * The spine (week, money, reputation, creativeCapital, focusSlots, access
 * tiers, flags, A&R fields, embedded `musicLabel`) is a CLIENT-COMMITTED RECORD
 * in the TanStack Query cache — the store's `commitGameState` funnel is the ONLY
 * writer (fan-out seed, advance-week commit, slot math, `adoptServerBalances`).
 * PR-4 makes the store dual-write Zustand + this cache key; `useGameState()`
 * still reads Zustand until PR-5 flips it. Client-committed-record semantics
 * (staleTime/gcTime Infinity, no focus/reconnect refetch) belong to the hook
 * that reads this key in PR-5 — a background refetch here would race the
 * synchronous slot math (see plan §0.6).
 */
export const GAME_STATE_SCOPE = 'gameState:record' as const;

/** The gameState-record cache key for a game: `['gameState:record', gameId]`. */
export function gameStateQueryKey(gameId: string): readonly [string, string] {
  return [GAME_STATE_SCOPE, gameId];
}

/**
 * Cold-cache fallback queryFn. In practice this NEVER fires — PR-4's
 * `commitGameState` funnel pre-seeds `gameStateQueryKey(gameId)` on every load /
 * create / advance-week, so `useQuery` resolves from the seeded cache without
 * fetching. It exists only so a hard cache miss (e.g. a direct navigation that
 * somehow bypassed the store bootstrap) degrades to a full-bundle GET rather
 * than throwing. Mirrors the store's `fetchGameBundle` shape: the server row
 * embeds `musicLabel` as a sibling of `gameState`, which we re-embed into the
 * spine exactly as the store does (`{ ...data.gameState, musicLabel }`).
 */
async function fetchGameStateRecord(gameId: string): Promise<GameState> {
  const response = await apiRequest('GET', `/api/game/${gameId}`);
  const data = await response.json();
  return {
    ...data.gameState,
    musicLabel: data.musicLabel ?? null,
  } as GameState;
}

export function useGameState(): GameState | null;
export function useGameState<T>(selector: (gameState: GameState | null) => T): T;
export function useGameState<T>(
  selector?: (gameState: GameState | null) => T,
): GameState | null | T {
  // gameId bootstrap: still a Zustand-owned session pointer. The RECORD comes
  // from the cache; only the "which game am I on" handle stays in the store.
  const gameId = useGameStore((state) => state.gameState?.id ?? null);

  // The context client — in-app this IS the `@/lib/queryClient` singleton the
  // store's funnel writes to (App.tsx mounts it), so reads and the funnel's
  // writes hit the same cache. Reading via context (not the imported singleton)
  // also lets tests provide their own client + seed it.
  const client = useQueryClient();

  // Cold-cache fallback + client-committed-record semantics. `.data` is
  // deliberately UNUSED for reads (see header) — this exists only to fetch on a
  // hard cache miss and to pin refetch-off / infinite-stale on the record key so
  // no background refetch can race the synchronous slot math (plan §0.6).
  useQuery<GameState>({
    queryKey: gameId ? gameStateQueryKey(gameId) : [GAME_STATE_SCOPE, '__none__'],
    queryFn: () => fetchGameStateRecord(gameId as string),
    enabled: !!gameId,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // SAME-TICK read: subscribe to the QueryCache directly. `setQueryData` fires
  // the cache listener synchronously, and `useSyncExternalStore` re-renders in
  // the same commit — matching the old Zustand subscription's timing exactly.
  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      client.getQueryCache().subscribe(onStoreChange),
    [client],
  );
  // `getQueryData` returns the STORED object reference (stable until the funnel
  // replaces it via setQueryData), so useSyncExternalStore sees no spurious
  // change. Collapse `undefined` (no game / not yet seeded) to `null` for the
  // exact `GameState | null` contract the old Zustand read had.
  const getSnapshot = useCallback((): GameState | null => {
    if (!gameId) return null;
    return client.getQueryData<GameState>(gameStateQueryKey(gameId)) ?? null;
  }, [client, gameId]);

  const gameState = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return selector ? selector(gameState) : gameState;
}

/**
 * Convenience selector: the current game id, or null.
 *
 * Reads the Zustand session pointer DIRECTLY (`s.gameState?.id`) rather than
 * going through the cache-backed `useGameState()`. The id is the bootstrap
 * handle that tells the cache which record to load, so it must be available
 * before (and independent of) the cached record — and reading it from Zustand
 * keeps this a cheap store subscription instead of an extra query subscription.
 * Byte-identical to the 9 domain hooks' original
 * `useGameStore((state) => state.gameState?.id)` derivation.
 */
export function useGameId(): string | null {
  return useGameStore((state) => state.gameState?.id ?? null);
}
