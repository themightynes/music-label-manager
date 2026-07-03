/**
 * Discovered A&R artists query hook (Phase 3 PR-9).
 *
 * The pool of artists surfaced by A&R sourcing operations. Formerly owned by the
 * Zustand store (`discoveredArtists`, loaded by `loadDiscoveredArtists` via a raw
 * `apiRequest` + a flags-fallback synthesis block). Phase 3 PR-9 moves the READ
 * PATH onto the TanStack Query cache.
 *
 * Persistence note (plan step 4): the client `persist` partialize NEVER included
 * `discoveredArtists` (only `gameState.id`, `selectedActions`, `isAdvancingWeek`
 * — see gameStore.ts). Discovered artists survive a reload via the SERVER: the
 * A&R GET reads the canonical `flags.ar_office_discovered_artists` array persisted
 * in game state (server/routes/arOffice.ts, a pure read since Phase 2). So moving
 * the read path behind this hook loses nothing across reloads — no client-side
 * persistence is load-bearing here.
 *
 * The flags-fallback synthesis (the subtle part the plan calls out) is preserved
 * VERBATIM below — byte-identical to the former `gameStore.loadDiscoveredArtists`
 * body — so a legacy-only save (singular `ar_office_discovered_artist_id` flag
 * set, array absent) still surfaces the singular artist locally.
 *
 * Key convention: scoped string at element 0, gameId at element 1
 * (`[SCOPE, gameId]`), matching useEmails/useProjects. This hook supplies its own
 * explicit queryFn (it does not route through the default getQueryFn that keys on
 * the request URL at element 0).
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGameStore } from '@/store/gameStore';
import { apiRequest } from '@/lib/queryClient';

export const DISCOVERED_ARTISTS_SCOPE = 'discovered-artists:list';

export function discoveredArtistsQueryKey(gameId: string | null | undefined) {
  return [DISCOVERED_ARTISTS_SCOPE, gameId ?? null] as const;
}

/**
 * Fetch + synthesize discovered artists for a game. Exported so the store can
 * seed/refetch this key through the same code path (e.g. after an A&R operation
 * completes) and the query cache stays the single source of truth.
 *
 * The `flags` argument carries `gameState.flags` for the legacy singular-key
 * fallback synthesis, preserved byte-identically from the former store action.
 */
export async function fetchDiscoveredArtists(
  gameId: string,
  flags: Record<string, any> | null | undefined,
): Promise<any[]> {
  const res = await apiRequest('GET', `/api/game/${gameId}/ar-office/artists`);
  const data = await res.json();

  let artists = Array.isArray(data.artists) ? data.artists : [];

  // Enhanced fallback with better error messages
  if ((!artists || artists.length === 0) && flags) {
    const discoveredId = flags?.ar_office_discovered_artist_id;
    const info = flags?.ar_office_discovered_artist_info || {};
    if (discoveredId) {
      const synthesized = {
        id: discoveredId,
        name: info.name ?? 'Unknown Artist',
        archetype: info.archetype ?? 'Unknown',
        talent: info.talent ?? 0,
        popularity: info.popularity ?? 0,
        genre: info.genre ?? null,
        signed: false,
      } as any;
      artists = [synthesized];
    }
  }

  return artists;
}

export function useDiscoveredArtists() {
  const gameId = useGameStore((state) => state.gameState?.id);
  const flags = useGameStore((state) => (state.gameState as any)?.flags);
  const arOfficeSlotUsed = useGameStore((state) => state.gameState?.arOfficeSlotUsed);

  const queryKey = useMemo(() => discoveredArtistsQueryKey(gameId), [gameId]);

  return useQuery<any[]>({
    queryKey,
    // Mirror the store's old guard: only load when no A&R operation is active
    // (an active operation always returns an empty list from the server).
    enabled: Boolean(gameId) && !arOfficeSlotUsed,
    staleTime: 30_000,
    queryFn: async () => {
      if (!gameId) return [];
      return fetchDiscoveredArtists(gameId, flags);
    },
  });
}
