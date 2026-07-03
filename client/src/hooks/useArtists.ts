/**
 * Artists roster query hook (Phase 3 PR-9).
 *
 * The signed-artist roster for the current game. Formerly mirrored into the
 * Zustand store by the loadGame/advanceWeek/loadGameFromSave fan-out; Phase 3
 * PR-9 moves ownership onto the TanStack Query cache. The fan-out seeds this key
 * via `queryClient.setQueryData` (zero extra requests) and mutations invalidate
 * it.
 *
 * Endpoint note: like projects (PR-7) and unlike releases/songs (PR-6), there is
 * NO dedicated `GET /api/game/:id/artists` route on the server, and Phase 3 is
 * client-only (no server changes). Artists arrive inside the `/api/game/:id`
 * payload as `data.artists` — the exact same source the store read before. So the
 * queryFn fetches `/api/game/:id` and selects `.artists`. In practice the fan-out
 * pre-seeds the cache from the same body, so this queryFn only fires when a
 * mutation invalidates the key (signArtist/updateArtist), faithfully re-reading
 * the server's authoritative roster.
 *
 * Key convention mirrors `useProjects`/`useSongs`/`useReleases`: `[SCOPE, gameId]`.
 * The scope constant and key builder are exported so `gameStore.ts` can
 * seed/invalidate the exact same key and the query-key contract test can assert
 * they match.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGameId } from '@/hooks/useGameState';
import { apiRequest } from '@/lib/queryClient';
import type { Artist } from '@shared/schema';

export const ARTISTS_SCOPE = 'artists:list';

export function artistsQueryKey(gameId: string | null | undefined) {
  return [ARTISTS_SCOPE, gameId ?? null] as const;
}

export function useArtists() {
  const gameId = useGameId();

  const queryKey = useMemo(() => artistsQueryKey(gameId), [gameId]);

  return useQuery<Artist[]>({
    queryKey,
    enabled: Boolean(gameId),
    staleTime: 30_000,
    queryFn: async () => {
      if (!gameId) return [];
      // No dedicated artists endpoint (client-only PR): read the artists
      // collection off the base game payload, matching the store's old source.
      const response = await apiRequest('GET', `/api/game/${gameId}`);
      const data = await response.json();
      return Array.isArray(data?.artists) ? data.artists : [];
    },
  });
}
