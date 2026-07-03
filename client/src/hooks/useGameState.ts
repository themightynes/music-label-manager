/**
 * gameState spine façade (Phase 3.5 PR-3a).
 *
 * `gameState` (week, money, reputation, creativeCapital, focusSlots, access
 * tiers, flags, A&R fields, embedded `musicLabel`) is still owned by the
 * Zustand store today. This hook is the READ façade the rest of the app goes
 * through so the eventual ownership flip onto the TanStack Query cache
 * (Phase 3.5 PRs 4-6) is a one-file change (`useGameState.ts` only) instead of
 * a 25-file rewrite.
 *
 * Right now `useGameState()` is LITERALLY `useGameStore((s) => s.gameState)`
 * — zero behavior change, same Zustand subscription, same re-render
 * granularity. Do not add `isLoading`/query-object semantics here; callers
 * null-check the returned value exactly like they did against the store.
 *
 * `useGameState` accepts an optional selector so call sites can keep
 * selector-level subscription granularity (e.g. `useGameState((gs) =>
 * gs?.money)`) instead of subscribing to the whole spine object.
 *
 * See docs/01-planning/implementation-specs/[READY] phase-3.5-gamestate-tanstack-plan.md
 * (§1 "synchronized copy first, wholesale flip second", §3 PR-3).
 */
import { useGameStore } from '@/store/gameStore';
import type { GameState } from '@shared/types/gameTypes';

export function useGameState(): GameState | null;
export function useGameState<T>(selector: (gameState: GameState | null) => T): T;
export function useGameState<T>(
  selector?: (gameState: GameState | null) => T,
): GameState | null | T {
  return useGameStore((state) =>
    selector ? selector(state.gameState) : state.gameState,
  );
}

/** Convenience selector: the current game id, or null. Mirrors the 9 domain
 * hooks' `useGameStore((state) => state.gameState?.id)` derivation. */
export function useGameId(): string | null {
  return useGameState((gameState) => gameState?.id ?? null);
}
