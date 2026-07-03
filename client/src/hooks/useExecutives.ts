import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useGameStore } from '@/store/gameStore';
import { fetchExecutives } from '@/services/executiveService';
import type { Executive } from '@shared/types/gameTypes';

/**
 * Executives query hook (Phase 3 PR-8).
 *
 * Single cached source of truth for the executive roster. Collapses the former
 * triple copy (Zustand store array + `executiveMeetingMachine` context copy +
 * save-snapshot need) onto ONE TanStack Query cache entry.
 *
 * Key convention: this hook supplies its own explicit `queryFn` (it wraps
 * `executiveService.fetchExecutives`, which also synthesizes the CEO row and
 * sorts by display order), so it does NOT route through the default
 * `getQueryFn` in `queryClient.ts` that requires the request URL at element 0.
 * That default-key contract only applies to queries relying on the shared
 * default queryFn (`useEmails` is the precedent: scoped string at element 0,
 * gameId at element 1, own queryFn). So we follow the plan's literal
 * `['executives', gameId]` key here.
 *
 * The meeting machine keeps its injected-service pattern; it is handed a
 * cache-backed fetch (see `fetchExecutivesThroughCache`) so the machine and any
 * UI consumers share this one cached source.
 */
export const EXECUTIVES_SCOPE = 'executives';

export function executivesQueryKey(gameId: string | null | undefined) {
  return [EXECUTIVES_SCOPE, gameId ?? null] as const;
}

/**
 * Fetch executives through the TanStack Query cache using the same key as
 * `useExecutives`. Intended to be injected into `executiveMeetingMachine` as its
 * `fetchExecutives` service so the machine reads/writes the shared cache instead
 * of firing its own uncached request. `ensureQueryData` returns the cached value
 * when fresh and fetches otherwise; the weekly-refresh flow invalidates the key
 * (see gameStore.advanceWeek) so post-week mood/loyalty changes refetch.
 */
export function makeCachedFetchExecutives(
  queryClient: ReturnType<typeof useQueryClient>,
): (gameId: string) => Promise<Executive[]> {
  return (gameId: string) =>
    queryClient.ensureQueryData({
      queryKey: executivesQueryKey(gameId),
      queryFn: () => fetchExecutives(gameId),
    });
}

export function useExecutives() {
  const gameId = useGameStore((state) => state.gameState?.id);

  const queryKey = useMemo(() => executivesQueryKey(gameId), [gameId]);

  return useQuery<Executive[]>({
    queryKey,
    enabled: Boolean(gameId),
    staleTime: 30_000,
    queryFn: async () => {
      if (!gameId) return [];
      return fetchExecutives(gameId);
    },
  });
}
