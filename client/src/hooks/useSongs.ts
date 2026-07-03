/**
 * Songs query hook (Phase 3 PR-6).
 *
 * The full song catalog for the current game. Formerly mirrored into the Zustand
 * store by the loadGame/advanceWeek/loadGameFromSave fan-out; Phase 3 PR-6 moves
 * ownership onto the TanStack Query cache. The fan-out seeds this key via
 * `queryClient.setQueryData` (zero extra requests) and mutations invalidate it.
 *
 * Key convention mirrors `useCharts`/`useEmails`: `[SCOPE, gameId]`. The scope
 * constant and key builder are exported so `gameStore.ts` can seed/invalidate
 * the exact same key and the query-key contract test can assert they match.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGameId } from '@/hooks/useGameState';
import { apiRequest } from '@/lib/queryClient';

export const SONGS_SCOPE = 'songs:list';

export function songsQueryKey(gameId: string | null | undefined) {
  return [SONGS_SCOPE, gameId ?? null] as const;
}

export function useSongs() {
  const gameId = useGameId();

  const queryKey = useMemo(() => songsQueryKey(gameId), [gameId]);

  return useQuery<any[]>({
    queryKey,
    enabled: Boolean(gameId),
    staleTime: 30_000,
    queryFn: async () => {
      if (!gameId) return [];
      const response = await apiRequest('GET', `/api/game/${gameId}/songs`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });
}
