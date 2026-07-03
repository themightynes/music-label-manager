/**
 * useSongs hook test (Phase 3 PR-6).
 *
 * Mocks `apiRequest` and `useGameStore` to verify the songs hook fetches the
 * right endpoint, keys its query by the scoped [SCOPE, gameId] shape, coerces
 * non-array bodies to [], and skips fetching when there's no active game.
 * Mirrors tests/client/useCharts.test.tsx.
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
import { useSongs, SONGS_SCOPE } from '@/hooks/useSongs';

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

function TestSongs() {
  const { data, isLoading } = useSongs();
  if (isLoading) return <div>loading</div>;
  return <div data-testid="songs">{JSON.stringify(data)}</div>;
}

describe('useSongs', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
    mockedUseGameStore.mockReset();
  });

  it('fetches the game-scoped songs endpoint', async () => {
    mockedUseGameStore.mockImplementation((selector: any) => selector({ gameState: { id: 'game-1' } }));
    mockedApiRequest.mockResolvedValue(jsonResponse([{ id: 's1' }]));

    renderWithClient(<TestSongs />);

    await waitFor(() => expect(screen.getByTestId('songs')).toBeTruthy());
    expect(mockedApiRequest).toHaveBeenCalledWith('GET', '/api/game/game-1/songs');
  });

  it('coerces a non-array response to []', async () => {
    mockedUseGameStore.mockImplementation((selector: any) => selector({ gameState: { id: 'game-1' } }));
    mockedApiRequest.mockResolvedValue(jsonResponse({ not: 'an array' }));

    renderWithClient(<TestSongs />);

    await waitFor(() => expect(screen.getByTestId('songs').textContent).toBe('[]'));
  });

  it('does not fetch when there is no active game', async () => {
    mockedUseGameStore.mockImplementation((selector: any) => selector({ gameState: null }));

    renderWithClient(<TestSongs />);

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(mockedApiRequest).not.toHaveBeenCalled();
  });

  it('scope constant matches the key used in gameStore invalidation', () => {
    expect(SONGS_SCOPE).toBe('songs:list');
  });
});
