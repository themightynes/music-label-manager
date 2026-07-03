/**
 * useArtists hook test (Phase 3 PR-9).
 *
 * Mocks `apiRequest` and `useGameStore` to verify the artists hook fetches the
 * base game endpoint, selects `.artists` from the payload, keys its query by the
 * scoped [SCOPE, gameId] shape, and skips fetching when there's no active game.
 * Like projects (PR-7) and unlike releases/songs (PR-6) there is NO dedicated
 * artists endpoint — artists arrive inside `/api/game/:id`, so the queryFn selects
 * them from there.
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
import { useArtists, ARTISTS_SCOPE, artistsQueryKey } from '@/hooks/useArtists';

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

function TestArtists() {
  const { data, isLoading } = useArtists();
  if (isLoading) return <div>loading</div>;
  return <div data-testid="artists">{JSON.stringify(data)}</div>;
}

describe('useArtists', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
    mockedUseGameStore.mockReset();
  });

  it('fetches the base game endpoint and selects the artists array', async () => {
    mockedUseGameStore.mockImplementation((selector: any) => selector({ gameState: { id: 'game-1' } }));
    mockedApiRequest.mockResolvedValue(
      jsonResponse({ gameState: { id: 'game-1' }, artists: [{ id: 'a1' }, { id: 'a2' }] }),
    );

    renderWithClient(<TestArtists />);

    await waitFor(() => expect(screen.getByTestId('artists')).toBeTruthy());

    expect(mockedApiRequest).toHaveBeenCalledWith('GET', '/api/game/game-1');
    expect(screen.getByTestId('artists').textContent).toBe(
      JSON.stringify([{ id: 'a1' }, { id: 'a2' }]),
    );
  });

  it('resolves [] when the payload has no artists field', async () => {
    mockedUseGameStore.mockImplementation((selector: any) => selector({ gameState: { id: 'game-1' } }));
    mockedApiRequest.mockResolvedValue(jsonResponse({ gameState: { id: 'game-1' } }));

    renderWithClient(<TestArtists />);

    await waitFor(() => expect(screen.getByTestId('artists')).toBeTruthy());
    expect(screen.getByTestId('artists').textContent).toBe('[]');
  });

  it('does not fetch when there is no active game', async () => {
    mockedUseGameStore.mockImplementation((selector: any) => selector({ gameState: null }));

    renderWithClient(<TestArtists />);

    // Query stays disabled; no apiRequest call should ever fire.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(mockedApiRequest).not.toHaveBeenCalled();
  });

  it('scope constant and key builder match the store invalidation shape', () => {
    expect(ARTISTS_SCOPE).toBe('artists:list');
    expect(artistsQueryKey('game-1')).toEqual(['artists:list', 'game-1']);
  });
});
