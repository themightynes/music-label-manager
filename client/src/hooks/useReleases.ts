/**
 * Releases + Release-Songs query hooks (Phase 3 PR-6).
 *
 * `releases` and `releaseSongs` are server-canonical collections that used to be
 * mirrored into the Zustand store by the loadGame/advanceWeek/loadGameFromSave
 * fan-out. Phase 3 PR-6 moves ownership onto the TanStack Query cache: the
 * fan-out seeds these keys via `queryClient.setQueryData` (zero extra requests)
 * and mutations invalidate them.
 *
 * Key convention mirrors `useCharts`/`useEmails`: a scoped string at element 0
 * and the gameId at element 1 (`[SCOPE, gameId]`). The scope constants and key
 * builders are exported so `gameStore.ts` can seed/invalidate the exact same
 * keys and the query-key contract test can assert they match.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGameStore } from '@/store/gameStore';
import { apiRequest } from '@/lib/queryClient';

export const RELEASES_SCOPE = 'releases:list';
export const RELEASE_SONGS_SCOPE = 'release-songs:list';

export function releasesQueryKey(gameId: string | null | undefined) {
  return [RELEASES_SCOPE, gameId ?? null] as const;
}

export function releaseSongsQueryKey(gameId: string | null | undefined) {
  return [RELEASE_SONGS_SCOPE, gameId ?? null] as const;
}

export function useReleases() {
  const gameId = useGameStore((state) => state.gameState?.id);

  const queryKey = useMemo(() => releasesQueryKey(gameId), [gameId]);

  return useQuery<any[]>({
    queryKey,
    enabled: Boolean(gameId),
    staleTime: 30_000,
    queryFn: async () => {
      if (!gameId) return [];
      const response = await apiRequest('GET', `/api/game/${gameId}/releases`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useReleaseSongs() {
  const gameId = useGameStore((state) => state.gameState?.id);

  const queryKey = useMemo(() => releaseSongsQueryKey(gameId), [gameId]);

  return useQuery<any[]>({
    queryKey,
    enabled: Boolean(gameId),
    staleTime: 30_000,
    queryFn: async () => {
      if (!gameId) return [];
      const response = await apiRequest('GET', `/api/game/${gameId}/release-songs`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });
}
