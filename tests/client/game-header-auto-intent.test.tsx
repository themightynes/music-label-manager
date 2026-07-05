/**
 * C74 — GameHeader AUTO routes through the review gate.
 *
 * The old header AUTO path fetched/scored/COMMITTED picks directly, bypassing the
 * Option A propose-then-confirm review panel. It was replaced with a session-scoped
 * intent: the header sets `pendingAutoSelectIntent` + navigates to /executives, and
 * ExecutiveMeetings (which owns the review machine) consumes it once.
 *
 * This suite pins the HEADER side:
 *   - clicking AUTO sets the intent and navigates to the Executive Suite;
 *   - the button is disabled (and does neither) while an intent is already pending;
 *   - no direct commit path remains (selectAction is never called).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/game', mockSetLocation],
}));

vi.mock('motion/react', async () => {
  const actual =
    await vi.importActual<typeof import('motion/react')>('motion/react');
  return { ...actual, useReducedMotion: () => false };
});

// Free focus slots (focusSlots 3 - usedFocusSlots 0) so the AUTO button renders.
const fakeGameState = {
  id: 'game-1',
  currentWeek: 5,
  money: 250_000,
  focusSlots: 3,
  usedFocusSlots: 0,
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
  pendingAutoSelectIntent: false,
  setPendingAutoSelectIntent: vi.fn(),
};
vi.mock('@/store/gameStore', () => ({
  useGameStore: vi.fn((selector?: (s: any) => any) =>
    selector ? selector(fakeStore) : fakeStore,
  ),
}));

vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

import { GameHeader } from '@/components/GameHeader';

const autoButton = () => screen.getByRole('button', { name: /auto|opening/i });

describe('GameHeader AUTO — review-gate intent (C74)', () => {
  beforeEach(() => {
    fakeStore.selectedActions = [];
    fakeStore.isAdvancingWeek = false;
    fakeStore.pendingAutoSelectIntent = false;
  });
  afterEach(() => vi.clearAllMocks());

  it('clicking AUTO sets the pending intent and navigates to /executives', () => {
    render(<GameHeader />);
    fireEvent.click(autoButton());

    expect(fakeStore.setPendingAutoSelectIntent).toHaveBeenCalledTimes(1);
    expect(fakeStore.setPendingAutoSelectIntent).toHaveBeenCalledWith(true);
    expect(mockSetLocation).toHaveBeenCalledWith('/executives');
    // No direct-commit path remains — the header never selects actions itself.
    expect(fakeStore.selectAction).not.toHaveBeenCalled();
  });

  it('is disabled and does nothing while an intent is already pending', () => {
    fakeStore.pendingAutoSelectIntent = true;
    render(<GameHeader />);
    const btn = autoButton();
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent('Opening…');

    fireEvent.click(btn);
    expect(fakeStore.setPendingAutoSelectIntent).not.toHaveBeenCalled();
    expect(mockSetLocation).not.toHaveBeenCalled();
  });
});
