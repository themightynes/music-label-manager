import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ArtistRoster } from '../ArtistRoster';

const { mockUseGameStore, modalRenderSpy, setLocationMock } = vi.hoisted(() => ({
  mockUseGameStore: vi.fn(),
  modalRenderSpy: vi.fn(),
  setLocationMock: vi.fn(),
}));

vi.mock('@/store/gameStore', () => ({
  useGameStore: mockUseGameStore,
}));

// Phase 3 PR-7: ArtistRoster now reads projects via useProjects (TanStack).
// Mock it so this component test stays store-only and needs no QueryClient.
vi.mock('@/hooks/useProjects', () => ({
  useProjects: () => ({ data: [] }),
}));

// Phase 3 PR-9: ArtistRoster now reads the roster via useArtists (TanStack).
// Mock it so this component test stays store-only and needs no QueryClient.
const { mockUseArtists } = vi.hoisted(() => ({ mockUseArtists: vi.fn() }));
vi.mock('@/hooks/useArtists', () => ({
  useArtists: mockUseArtists,
}));

vi.mock('wouter', () => ({
  useLocation: () => [null, setLocationMock],
}));

vi.mock('../ArtistDiscoveryModal', () => ({
  ArtistDiscoveryModal: ({ open }: { open: boolean }) => (open ? <div data-testid="artist-discovery-modal" /> : null),
}));

vi.mock('../ArtistDashboardCard', () => ({
  ArtistDashboardCard: ({ artist, status, mood, energy, popularity, onNavigate }: any) => (
    <div data-testid="artist-dashboard-card">
      <span>{artist.name}</span>
      <span>{status}</span>
      <span>{mood}</span>
      <span>{energy}</span>
      <span>{popularity}</span>
      {onNavigate && (
        <button type="button" onClick={onNavigate}>
          Navigate
        </button>
      )}
    </div>
  ),
}));

vi.mock('../artist-dialogue/ArtistDialogueModal', () => ({
  ArtistDialogueModal: (props: any) => {
    modalRenderSpy(props);
    if (!props.open) {
      return null;
    }
    return (
      <div data-testid="artist-dialogue-modal">
        Dialogue with {props.artist.name}
      </div>
    );
  },
}));

describe('ArtistRoster', () => {
  beforeEach(() => {
    modalRenderSpy.mockClear();
    setLocationMock.mockClear();
    mockUseGameStore.mockReset();
    mockUseArtists.mockReset();

    mockUseArtists.mockReturnValue({
      data: [
        {
          id: 'artist-1',
          name: 'Nova Sterling',
          archetype: 'Visionary',
          mood: 70,
          energy: 60,
          popularity: 55,
          talent: 80,
          workEthic: 75,
        },
      ],
    });

    // The store mock must honor zustand's selector-style calls: useGameState()
    // (the spine facade) calls useGameStore((s) => s.gameState), while the
    // component's action destructure calls useGameStore() with no selector.
    const fakeState = {
      gameState: { id: 'game-1', currentWeek: 12 },
      signArtist: vi.fn(),
      loadGame: vi.fn().mockResolvedValue(undefined),
    };
    mockUseGameStore.mockImplementation((selector?: (state: typeof fakeState) => unknown) =>
      selector ? selector(fakeState) : fakeState,
    );
  });

  it('opens the artist dialogue modal when selecting the meet action', async () => {
    render(<ArtistRoster />);

    const actionsTrigger = screen.getByRole('menuitem', { name: /actions/i });
    fireEvent.pointerDown(actionsTrigger, { button: 0 });
    fireEvent.click(actionsTrigger);

    const meetAction = await screen.findByRole('menuitem', { name: /meet/i });
    fireEvent.click(meetAction);

    const modal = await screen.findByTestId('artist-dialogue-modal');
    expect(modal).toBeInTheDocument();

    const lastCall = modalRenderSpy.mock.calls.at(-1)?.[0];
    expect(lastCall?.open).toBe(true);
    expect(lastCall?.artist?.name).toBe('Nova Sterling');
    expect(lastCall?.gameId).toBe('game-1');
  });
});
