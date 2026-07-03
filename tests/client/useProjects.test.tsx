/**
 * useProjects hook test (Phase 3 PR-7).
 *
 * Mocks `apiRequest` and `useGameStore` to verify the projects hook fetches the
 * base game endpoint, selects `.projects` from the payload, keys its query by
 * the scoped [SCOPE, gameId] shape, and skips fetching when there's no active
 * game. Unlike releases/songs (PR-6) there is NO dedicated projects endpoint —
 * projects arrive inside `/api/game/:id`, so the queryFn selects them from there.
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
import { useProjects, PROJECTS_SCOPE, projectsQueryKey } from '@/hooks/useProjects';

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

function TestProjects() {
  const { data, isLoading } = useProjects();
  if (isLoading) return <div>loading</div>;
  return <div data-testid="projects">{JSON.stringify(data)}</div>;
}

describe('useProjects', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
    mockedUseGameStore.mockReset();
  });

  it('fetches the base game endpoint and selects the projects array', async () => {
    mockedUseGameStore.mockImplementation((selector: any) => selector({ gameState: { id: 'game-1' } }));
    mockedApiRequest.mockResolvedValue(
      jsonResponse({ gameState: { id: 'game-1' }, projects: [{ id: 'p1' }, { id: 'p2' }] }),
    );

    renderWithClient(<TestProjects />);

    await waitFor(() => expect(screen.getByTestId('projects')).toBeTruthy());

    expect(mockedApiRequest).toHaveBeenCalledWith('GET', '/api/game/game-1');
    expect(screen.getByTestId('projects').textContent).toBe(
      JSON.stringify([{ id: 'p1' }, { id: 'p2' }]),
    );
  });

  it('resolves [] when the payload has no projects field', async () => {
    mockedUseGameStore.mockImplementation((selector: any) => selector({ gameState: { id: 'game-1' } }));
    mockedApiRequest.mockResolvedValue(jsonResponse({ gameState: { id: 'game-1' } }));

    renderWithClient(<TestProjects />);

    await waitFor(() => expect(screen.getByTestId('projects')).toBeTruthy());
    expect(screen.getByTestId('projects').textContent).toBe('[]');
  });

  it('does not fetch when there is no active game', async () => {
    mockedUseGameStore.mockImplementation((selector: any) => selector({ gameState: null }));

    renderWithClient(<TestProjects />);

    // Query stays disabled; no apiRequest call should ever fire.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(mockedApiRequest).not.toHaveBeenCalled();
  });

  it('scope constant and key builder match the store invalidation shape', () => {
    expect(PROJECTS_SCOPE).toBe('projects:list');
    expect(projectsQueryKey('game-1')).toEqual(['projects:list', 'game-1']);
  });
});
