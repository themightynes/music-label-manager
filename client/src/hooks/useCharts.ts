/**
 * Chart Hooks
 *
 * TanStack Query hooks for the Top 10 / Top 100 chart reads. Charts are pure
 * server reads never mirrored into the Zustand store (see Phase 3 PR-5 plan).
 * Follows the scoped-key pattern from `useEmails.ts`: [SCOPE, gameId, ...].
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGameStore } from '@/store/gameStore';
import { apiRequest } from '@/lib/queryClient';
import type { ChartEntry } from '@/components/chart/chartColumns';

export const CHART_TOP10_SCOPE = 'charts:top10';
export const CHART_TOP100_SCOPE = 'charts:top100';

export interface Top10ChartData {
  chartWeek: string;
  currentWeek: number;
  top10: ChartEntry[];
}

export interface Top100ChartData {
  chartWeek: string;
  currentWeek: number;
  top100: ChartEntry[];
}

export function useTop10Chart() {
  const gameId = useGameStore((state) => state.gameState?.id);

  const queryKey = useMemo(
    () => [CHART_TOP10_SCOPE, gameId ?? null] as const,
    [gameId],
  );

  return useQuery<Top10ChartData>({
    queryKey,
    enabled: Boolean(gameId),
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/game/${gameId}/charts/top10`);
      return response.json();
    },
  });
}

export function useTop100Chart() {
  const gameId = useGameStore((state) => state.gameState?.id);

  const queryKey = useMemo(
    () => [CHART_TOP100_SCOPE, gameId ?? null] as const,
    [gameId],
  );

  return useQuery<Top100ChartData>({
    queryKey,
    enabled: Boolean(gameId),
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/game/${gameId}/charts/top100`);
      return response.json();
    },
  });
}
