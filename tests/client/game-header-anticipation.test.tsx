/**
 * GameHeader advance-week anticipation test (Phase 4 PR-4).
 *
 * Pins the charging treatment: while `isAdvancingWeek` the button shows the
 * shimmer/pulse charged state (plain "Processing…" text under reduced
 * motion), and the pre-existing disabled logic
 * (`selectedActions.length === 0 || isAdvancingWeek`) is unchanged.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// C74: GameHeader now uses wouter's useLocation to navigate to the Executive
// Suite when AUTO is clicked, so the router hook must be mocked here too.
vi.mock('wouter', () => ({
  useLocation: () => ['/game', vi.fn()],
}));

const mockUseReducedMotion = vi.fn(() => false);
vi.mock('motion/react', async () => {
  const actual =
    await vi.importActual<typeof import('motion/react')>('motion/react');
  return {
    ...actual,
    useReducedMotion: () => mockUseReducedMotion(),
  };
});

const fakeGameState = {
  id: 'game-1',
  currentWeek: 5,
  money: 250_000,
  focusSlots: 3,
  usedFocusSlots: 3, // no free slots -> AUTO button not rendered
};
vi.mock('@/hooks/useGameState', () => ({
  useGameState: vi.fn((selector?: (gs: any) => any) =>
    selector ? selector(fakeGameState) : fakeGameState,
  ),
}));

const fakeStore = {
  selectedActions: [] as string[],
  isAdvancingWeek: false,
  advanceWeek: vi.fn(),
  selectAction: vi.fn(),
  // C74: intent flag + setter consumed by the header AUTO button.
  pendingAutoSelectIntent: false,
  setPendingAutoSelectIntent: vi.fn(),
};
vi.mock('@/store/gameStore', () => ({
  useGameStore: vi.fn((selector?: (s: any) => any) =>
    selector ? selector(fakeStore) : fakeStore,
  ),
}));

vi.mock('@/contexts/GameContext', () => ({
  useGameContext: () => ({ gameId: 'game-1' }),
}));

vi.mock('@/services/executiveService', () => ({
  fetchExecutives: vi.fn(),
  fetchRoleMeetings: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

import { GameHeader } from '@/components/GameHeader';

const advanceButton = () =>
  screen.getByRole('button', { name: /advance week|processing/i });

describe('GameHeader advance-week anticipation', () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReturnValue(false);
    fakeStore.selectedActions = ['action-1'];
    fakeStore.isAdvancingWeek = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the normal state when not advancing: label text, enabled, no charging layer', () => {
    render(<GameHeader />);
    const button = advanceButton();
    expect(button).toHaveTextContent('Advance Week');
    expect(button).not.toBeDisabled();
    expect(
      screen.queryByTestId('advance-week-charging'),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('week-transition')).not.toBeInTheDocument();
  });

  it('is disabled when no actions are selected', () => {
    fakeStore.selectedActions = [];
    render(<GameHeader />);
    expect(advanceButton()).toBeDisabled();
  });

  it('renders the charging state while advancing: Processing text, shimmer layer, still disabled', () => {
    fakeStore.isAdvancingWeek = true;
    render(<GameHeader />);
    const button = advanceButton();
    expect(button).toHaveTextContent('Processing…');
    expect(button).toBeDisabled();
    expect(screen.getByTestId('advance-week-charging')).toBeInTheDocument();
    expect(button.className).toContain('animate-pulse');
    // gradient + layout classes untouched (no layout shift)
    expect(button.className).toContain('from-action-pink');
    expect(button.className).toContain('to-action-purple');
  });

  it('mounts the WeekTransition interstitial while advancing', () => {
    fakeStore.isAdvancingWeek = true;
    render(<GameHeader />);
    expect(screen.getByTestId('week-transition')).toBeInTheDocument();
  });

  it('reduced motion: plain Processing text, no shimmer, no interstitial', () => {
    mockUseReducedMotion.mockReturnValue(true);
    fakeStore.isAdvancingWeek = true;
    render(<GameHeader />);
    const button = advanceButton();
    expect(button).toHaveTextContent('Processing…');
    expect(button).toBeDisabled();
    expect(
      screen.queryByTestId('advance-week-charging'),
    ).not.toBeInTheDocument();
    expect(button.className).not.toContain('animate-pulse');
    expect(screen.queryByTestId('week-transition')).not.toBeInTheDocument();
  });

  it('disabled logic is unchanged: advancing wins even with actions selected', () => {
    fakeStore.selectedActions = ['a', 'b'];
    fakeStore.isAdvancingWeek = true;
    render(<GameHeader />);
    expect(advanceButton()).toBeDisabled();
  });
});
