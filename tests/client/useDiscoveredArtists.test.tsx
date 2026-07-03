/**
 * useDiscoveredArtists hook test (Phase 3 PR-9).
 *
 * Mocks `apiRequest` and `useGameStore` to verify the discovered-artists hook:
 *  - fetches the A&R endpoint and returns `data.artists`,
 *  - preserves the flags-fallback SYNTHESIS verbatim (legacy singular
 *    `ar_office_discovered_artist_id` -> a synthesized artist) when the server
 *    returns an empty list,
 *  - stays disabled while an A&R operation is active (arOfficeSlotUsed),
 *  - keys its query by the scoped [SCOPE, gameId] shape.
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
  useDiscoveredArtists,
  fetchDiscoveredArtists,
  DISCOVERED_ARTISTS_SCOPE,
  discoveredArtistsQueryKey,
} from '@/hooks/useDiscoveredArtists';

const mockedApiRequest = vi.mocked(apiRequest);
const mockedUseGameStore = vi.mocked(useGameStore);

function jsonResponse(body: unknown): Response {
  return { json: async () => body } as unknown as Response;
}

/** Drive the three separate selectors the hook reads off a single state object. */
function mockStore(state: any) {
  mockedUseGameStore.mockImplementation((selector: any) => selector(state));
}

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  return queryClient;
}

function TestDiscovered() {
  const { data, isLoading } = useDiscoveredArtists();
  if (isLoading) return <div>loading</div>;
  return <div data-testid="discovered">{JSON.stringify(data)}</div>;
}

describe('useDiscoveredArtists', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
    mockedUseGameStore.mockReset();
  });

  it('fetches the A&R endpoint and returns data.artists', async () => {
    mockStore({ gameState: { id: 'game-1', arOfficeSlotUsed: false, flags: {} } });
    mockedApiRequest.mockResolvedValue(jsonResponse({ artists: [{ id: 'd1' }, { id: 'd2' }] }));

    renderWithClient(<TestDiscovered />);

    await waitFor(() => expect(screen.getByTestId('discovered')).toBeTruthy());
    expect(mockedApiRequest).toHaveBeenCalledWith('GET', '/api/game/game-1/ar-office/artists');
    expect(screen.getByTestId('discovered').textContent).toBe(
      JSON.stringify([{ id: 'd1' }, { id: 'd2' }]),
    );
  });

  it('synthesizes the legacy singular flag artist when the server list is empty', async () => {
    mockStore({
      gameState: {
        id: 'game-1',
        arOfficeSlotUsed: false,
        flags: {
          ar_office_discovered_artist_id: 'legacy-1',
          ar_office_discovered_artist_info: {
            name: 'Legacy Star',
            archetype: 'Visionary',
            talent: 77,
            popularity: 12,
            genre: 'pop',
          },
        },
      },
    });
    mockedApiRequest.mockResolvedValue(jsonResponse({ artists: [] }));

    renderWithClient(<TestDiscovered />);

    await waitFor(() => expect(screen.getByTestId('discovered')).toBeTruthy());
    expect(screen.getByTestId('discovered').textContent).toBe(
      JSON.stringify([
        {
          id: 'legacy-1',
          name: 'Legacy Star',
          archetype: 'Visionary',
          talent: 77,
          popularity: 12,
          genre: 'pop',
          signed: false,
        },
      ]),
    );
  });

  it('does not fetch while an A&R operation is active', async () => {
    mockStore({ gameState: { id: 'game-1', arOfficeSlotUsed: true, flags: {} } });

    renderWithClient(<TestDiscovered />);

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(mockedApiRequest).not.toHaveBeenCalled();
  });

  it('does not fetch when there is no active game', async () => {
    mockStore({ gameState: null });

    renderWithClient(<TestDiscovered />);

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(mockedApiRequest).not.toHaveBeenCalled();
  });

  it('fetchDiscoveredArtists synthesizes verbatim with default fields for a bare legacy id', async () => {
    // No info object: every field falls back to the synthesis defaults, matching
    // the former gameStore.loadDiscoveredArtists block byte-for-byte.
    mockedApiRequest.mockResolvedValue(jsonResponse({ artists: [] }));
    const result = await fetchDiscoveredArtists('game-1', {
      ar_office_discovered_artist_id: 'legacy-2',
    });
    expect(result).toEqual([
      {
        id: 'legacy-2',
        name: 'Unknown Artist',
        archetype: 'Unknown',
        talent: 0,
        popularity: 0,
        genre: null,
        signed: false,
      },
    ]);
  });

  it('scope constant and key builder match the store invalidation shape', () => {
    expect(DISCOVERED_ARTISTS_SCOPE).toBe('discovered-artists:list');
    expect(discoveredArtistsQueryKey('game-1')).toEqual(['discovered-artists:list', 'game-1']);
  });
});
