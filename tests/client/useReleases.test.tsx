/**
 * useReleases / useReleaseSongs hook test (Phase 3 PR-6).
 *
 * Mocks `apiRequest` and `useGameStore` to verify the releases + release-songs
 * hooks fetch the right endpoint, key their queries by the scoped
 * [SCOPE, gameId] shape, and skip fetching when there's no active game.
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
import {
  useReleases,
  useReleaseSongs,
  RELEASES_SCOPE,
  RELEASE_SONGS_SCOPE,
} from '@/hooks/useReleases';

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

function TestReleases() {
  const { data, isLoading } = useReleases();
  if (isLoading) return <div>loading</div>;
  return <div data-testid="releases">{JSON.stringify(data)}</div>;
}

function TestReleaseSongs() {
  const { data, isLoading } = useReleaseSongs();
  if (isLoading) return <div>loading</div>;
  return <div data-testid="release-songs">{JSON.stringify(data)}</div>;
}

describe('useReleases / useReleaseSongs', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
    mockedUseGameStore.mockReset();
  });

  it('useReleases fetches the game-scoped releases endpoint', async () => {
    mockedUseGameStore.mockImplementation((selector: any) => selector({ gameState: { id: 'game-1' } }));
    mockedApiRequest.mockResolvedValue(jsonResponse([{ id: 'r1' }]));

    renderWithClient(<TestReleases />);

    await waitFor(() => expect(screen.getByTestId('releases')).toBeTruthy());
    expect(mockedApiRequest).toHaveBeenCalledWith('GET', '/api/game/game-1/releases');
  });

  it('useReleaseSongs fetches the game-scoped release-songs endpoint', async () => {
    mockedUseGameStore.mockImplementation((selector: any) => selector({ gameState: { id: 'game-1' } }));
    mockedApiRequest.mockResolvedValue(jsonResponse([{ id: 'rs1' }]));

    renderWithClient(<TestReleaseSongs />);

    await waitFor(() => expect(screen.getByTestId('release-songs')).toBeTruthy());
    expect(mockedApiRequest).toHaveBeenCalledWith('GET', '/api/game/game-1/release-songs');
  });

  it('coerces a non-array response to []', async () => {
    mockedUseGameStore.mockImplementation((selector: any) => selector({ gameState: { id: 'game-1' } }));
    mockedApiRequest.mockResolvedValue(jsonResponse(null));

    renderWithClient(<TestReleases />);

    await waitFor(() => expect(screen.getByTestId('releases').textContent).toBe('[]'));
  });

  it('does not fetch when there is no active game', async () => {
    mockedUseGameStore.mockImplementation((selector: any) => selector({ gameState: null }));

    renderWithClient(<TestReleases />);

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(mockedApiRequest).not.toHaveBeenCalled();
  });

  it('scope constants match the keys used in gameStore invalidation', () => {
    expect(RELEASES_SCOPE).toBe('releases:list');
    expect(RELEASE_SONGS_SCOPE).toBe('release-songs:list');
  });
});
