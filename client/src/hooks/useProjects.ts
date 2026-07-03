/**
 * Projects query hook (Phase 3 PR-7).
 *
 * The full project list for the current game. Formerly mirrored into the Zustand
 * store by the loadGame/advanceWeek/loadGameFromSave fan-out; Phase 3 PR-7 moves
 * ownership onto the TanStack Query cache. The fan-out seeds this key via
 * `queryClient.setQueryData` (zero extra requests) and mutations invalidate it.
 *
 * Endpoint note: unlike releases/songs (PR-6), there is NO dedicated
 * `GET /api/game/:id/projects` route on the server, and Phase 3 is client-only
 * (no server changes). Projects arrive inside the `/api/game/:id` payload as
 * `data.projects` — the exact same source the store read before. So the queryFn
 * fetches `/api/game/:id` and selects `.projects`. In practice the fan-out
 * pre-seeds the cache from the same body, so this queryFn only fires when a
 * mutation invalidates the key (createProject/updateProject/cancelProject),
 * faithfully re-reading the server's authoritative project list.
 *
 * Key convention mirrors `useSongs`/`useReleases`: `[SCOPE, gameId]`. The scope
 * constant and key builder are exported so `gameStore.ts` can seed/invalidate
 * the exact same key and the query-key contract test can assert they match.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGameStore } from '@/store/gameStore';
import { apiRequest } from '@/lib/queryClient';

export const PROJECTS_SCOPE = 'projects:list';

export function projectsQueryKey(gameId: string | null | undefined) {
  return [PROJECTS_SCOPE, gameId ?? null] as const;
}

export function useProjects() {
  const gameId = useGameStore((state) => state.gameState?.id);

  const queryKey = useMemo(() => projectsQueryKey(gameId), [gameId]);

  return useQuery<any[]>({
    queryKey,
    enabled: Boolean(gameId),
    staleTime: 30_000,
    queryFn: async () => {
      if (!gameId) return [];
      // No dedicated projects endpoint (client-only PR): read the projects
      // collection off the base game payload, matching the store's old source.
      const response = await apiRequest('GET', `/api/game/${gameId}`);
      const data = await response.json();
      return Array.isArray(data?.projects) ? data.projects : [];
    },
  });
}
