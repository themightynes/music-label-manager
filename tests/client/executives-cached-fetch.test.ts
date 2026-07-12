import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';

// The machine's injected fetch (makeCachedFetchExecutives) wraps
// executiveService.fetchExecutives. We mock that module so we can vary what the
// "server" returns between calls and assert what the cache-backed fetch yields.
vi.mock('@/services/executiveService', () => ({
  fetchExecutives: vi.fn(),
}));

import { fetchExecutives } from '@/services/executiveService';
import {
  makeCachedFetchExecutives,
  executivesQueryKey,
} from '@/hooks/useExecutives';

const GAME_ID = 'game-abc';

function execRoster(loyalty: number) {
  return [
    { id: 'e1', role: 'head_distribution', level: 1, mood: 50, loyalty },
  ] as any[];
}

describe('makeCachedFetchExecutives — invalidation refetch (live-decay staleness bug)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    (fetchExecutives as any).mockReset();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('returns fresh DB state after the executives key is invalidated (not the stale cache entry)', async () => {
    // Week N: server reports loyalty 55; machine fetch seeds the cache.
    (fetchExecutives as any).mockResolvedValueOnce(execRoster(55));
    const cachedFetch = makeCachedFetchExecutives(queryClient as any);

    const first = await cachedFetch(GAME_ID);
    expect(first[0].loyalty).toBe(55);
    expect(fetchExecutives).toHaveBeenCalledTimes(1);

    // Weeks pass: the engine decays loyalty in the DB. advanceWeek invalidates
    // the shared key (this is exactly what gameStore.advanceWeek does).
    await queryClient.invalidateQueries({ queryKey: executivesQueryKey(GAME_ID) });

    // Week N+4: the server now reports the decayed loyalty. The machine's next
    // deliberate refresh (REFRESH_EXECUTIVES / refreshingExecutives) must observe
    // it. Regression guard: the old ensureQueryData implementation returned the
    // stale (55) cache entry here because the entry still existed — the console
    // only self-corrected on a full page reload.
    (fetchExecutives as any).mockResolvedValueOnce(execRoster(35));

    const second = await cachedFetch(GAME_ID);
    expect(second[0].loyalty).toBe(35);
    expect(fetchExecutives).toHaveBeenCalledTimes(2);
  });

  it('writes through the shared cache key so a useExecutives observer sees the same data', async () => {
    (fetchExecutives as any).mockResolvedValueOnce(execRoster(70));
    const cachedFetch = makeCachedFetchExecutives(queryClient as any);

    await cachedFetch(GAME_ID);

    const cached = queryClient.getQueryData(executivesQueryKey(GAME_ID)) as any[];
    expect(cached?.[0]?.loyalty).toBe(70);
  });
});
