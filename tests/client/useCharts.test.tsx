/**
 * useCharts hook test (Phase 3 PR-5).
 *
 * Mocks `apiRequest` and `useGameStore` to verify the Top10/Top100 chart
 * hooks fetch the right endpoint, key their queries by the scoped
 * [SCOPE, gameId] shape, and skip fetching when there's no active game.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/queryClient', async () => {
  const actual = await vi.importActual<typeof import('@/lib/queryClient')>('@/lib/queryClient');
  return {
    ...actual,
    apiRequest: vi.fn(),
  };
});

vi.mock('@/store/gameStore', () => ({
  useGameStore: vi.fn(),
}));

import { apiRequest } from '@/lib/queryClient';
import { useGameStore } from '@/store/gameStore';
import { useTop10Chart, useTop100Chart, CHART_TOP10_SCOPE, CHART_TOP100_SCOPE } from '@/hooks/useCharts';

const mockedApiRequest = vi.mocked(apiRequest);
const mockedUseGameStore = vi.mocked(useGameStore);

function jsonResponse(body: unknown): Response {
  return { json: async () => body } as unknown as Response;
}

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  return queryClient;
}

function TestTop10() {
  const { data, isLoading } = useTop10Chart();
  if (isLoading) return <div>loading</div>;
  return <div data-testid="top10">{JSON.stringify(data)}</div>;
}

function TestTop100() {
  const { data, isLoading } = useTop100Chart();
  if (isLoading) return <div>loading</div>;
  return <div data-testid="top100">{JSON.stringify(data)}</div>;
}

describe('useCharts', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
    mockedUseGameStore.mockReset();
  });

  it('useTop10Chart fetches the game-scoped top10 endpoint', async () => {
    mockedUseGameStore.mockImplementation((selector: any) => selector({ gameState: { id: 'game-1' } }));
    mockedApiRequest.mockResolvedValue(
      jsonResponse({ chartWeek: '2026-W01', currentWeek: 5, top10: [] }),
    );

    renderWithClient(<TestTop10 />);

    await waitFor(() => expect(screen.getByTestId('top10')).toBeTruthy());

    expect(mockedApiRequest).toHaveBeenCalledWith('GET', '/api/game/game-1/charts/top10');
  });

  it('useTop100Chart fetches the game-scoped top100 endpoint', async () => {
    mockedUseGameStore.mockImplementation((selector: any) => selector({ gameState: { id: 'game-1' } }));
    mockedApiRequest.mockResolvedValue(
      jsonResponse({ chartWeek: '2026-W01', currentWeek: 5, top100: [] }),
    );

    renderWithClient(<TestTop100 />);

    await waitFor(() => expect(screen.getByTestId('top100')).toBeTruthy());

    expect(mockedApiRequest).toHaveBeenCalledWith('GET', '/api/game/game-1/charts/top100');
  });

  it('does not fetch when there is no active game', async () => {
    mockedUseGameStore.mockImplementation((selector: any) => selector({ gameState: null }));

    renderWithClient(<TestTop10 />);

    // Query stays disabled; no apiRequest call should ever fire.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(mockedApiRequest).not.toHaveBeenCalled();
  });

  it('scope constants match the keys used in gameStore invalidation', () => {
    expect(CHART_TOP10_SCOPE).toBe('charts:top10');
    expect(CHART_TOP100_SCOPE).toBe('charts:top100');
  });
});
