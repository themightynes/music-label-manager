/**
 * CommandDock HoloDisc ambient pulse (Phase 4 PR-7).
 *
 * Two independent triggers drive the dock's HoloDisc `pulse` prop, both pure
 * garnish with no gameplay effect:
 *   (1) a NEW weeklyOutcome (tracked by week number) carrying a hero/notable
 *       change or chart update (or, absent `importance`, a `type: 'unlock'`
 *       change) -> pulse ~6s.
 *   (2) selectedActions.length growing -> a brief ~1s acknowledgment pulse.
 *
 * The dock pulls in Clerk, wouter, TanStack Query dropdown/tooltip primitives,
 * the audio manager, and both game-state hooks. All are mocked so this test
 * exercises only the pulse-trigger logic added in PR-7.
 */
import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('wouter', () => ({
  useLocation: () => ['/game', vi.fn()],
}));

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: { username: 'tester', primaryEmailAddress: { emailAddress: 't@example.com' } } }),
  UserButton: () => React.createElement('div', { 'data-testid': 'user-button' }),
}));

vi.mock('@/auth/useCurrentUser', () => ({
  useIsAdmin: () => ({ isAdmin: false, loading: false }),
}));

vi.mock('@/contexts/GameContext', () => ({
  useGameContext: () => ({ gameId: 'game-1' }),
}));

vi.mock('./BugReportModal', () => ({
  BugReportModal: () => null,
}));

vi.mock('@/lib/audio', () => ({
  audioManager: {
    getSettings: () => ({ muted: false, volume: 0.5 }),
    subscribe: () => () => {},
    setMuted: vi.fn(),
    setVolume: vi.fn(),
  },
}));

// Fake gameState spine — only fields CommandDock reads.
const fakeGameState = {
  focusSlots: 3,
  usedFocusSlots: 0,
  currentWeek: 5,
};
vi.mock('@/hooks/useGameState', () => ({
  useGameState: () => fakeGameState,
}));

// Store mock: mimic the harness pattern from the task brief — selector-aware
// mockImplementation so `useGameStore()` (no selector) and any selector usage
// both resolve against the same fake state object, which the test mutates
// between renders to simulate weeklyOutcome/selectedActions changes.
let fakeStoreState: { weeklyOutcome: any; selectedActions: string[] };
const useGameStoreMock = vi.fn((selector?: (s: typeof fakeStoreState) => unknown) =>
  selector ? selector(fakeStoreState) : fakeStoreState,
);
vi.mock('@/store/gameStore', () => ({
  useGameStore: (selector?: any) => useGameStoreMock(selector),
}));

import { CommandDock } from './CommandDock';

function makeChange(overrides: Record<string, any> = {}) {
  return { type: 'mood_change', description: 'routine', ...overrides };
}

describe('CommandDock HoloDisc ambient pulse', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fakeStoreState = { weeklyOutcome: null, selectedActions: [] };
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
  });

  function getHoloDiscPulseState(container: HTMLElement) {
    // The dock HoloDisc renders the pulse halo via data-testid when active.
    return container.querySelector('[data-testid="holo-disc-pulse"]');
  }

  it('does not pulse on a routine-only weeklyOutcome', () => {
    const { container, rerender } = render(<CommandDock />);
    expect(getHoloDiscPulseState(container)).toBeNull();

    act(() => {
      fakeStoreState = {
        weeklyOutcome: { week: 1, changes: [makeChange({ importance: 'routine' })], chartUpdates: [] },
        selectedActions: [],
      };
    });
    rerender(<CommandDock />);

    expect(getHoloDiscPulseState(container)).toBeNull();
  });

  it('pulses on a hero-bearing weeklyOutcome and expires after ~6s', () => {
    const { container, rerender } = render(<CommandDock />);

    act(() => {
      fakeStoreState = {
        weeklyOutcome: {
          week: 1,
          changes: [makeChange({ importance: 'hero', type: 'chart_debut' })],
          chartUpdates: [],
        },
        selectedActions: [],
      };
    });
    rerender(<CommandDock />);

    expect(getHoloDiscPulseState(container)).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(6000);
    });
    rerender(<CommandDock />);

    expect(getHoloDiscPulseState(container)).toBeNull();
  });

  it('pulses on a notable chart update even without a hero change', () => {
    const { container, rerender } = render(<CommandDock />);

    act(() => {
      fakeStoreState = {
        weeklyOutcome: {
          week: 2,
          changes: [makeChange({ importance: 'routine' })],
          chartUpdates: [{ importance: 'notable', position: 8 }],
        },
        selectedActions: [],
      };
    });
    rerender(<CommandDock />);

    expect(getHoloDiscPulseState(container)).not.toBeNull();
  });

  it('falls back to type === "unlock" when importance is absent', () => {
    const { container, rerender } = render(<CommandDock />);

    act(() => {
      fakeStoreState = {
        weeklyOutcome: {
          week: 3,
          changes: [makeChange({ type: 'unlock', importance: undefined })],
          chartUpdates: [],
        },
        selectedActions: [],
      };
    });
    rerender(<CommandDock />);

    expect(getHoloDiscPulseState(container)).not.toBeNull();
  });

  it('does not re-pulse for the same week rendered again', () => {
    const { container, rerender } = render(<CommandDock />);

    act(() => {
      fakeStoreState = {
        weeklyOutcome: { week: 4, changes: [makeChange({ importance: 'hero' })], chartUpdates: [] },
        selectedActions: [],
      };
    });
    rerender(<CommandDock />);
    expect(getHoloDiscPulseState(container)).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(6000);
    });
    rerender(<CommandDock />);
    expect(getHoloDiscPulseState(container)).toBeNull();

    // Same weeklyOutcome object/week re-rendered (e.g. an unrelated parent
    // re-render) must not re-trigger the pulse.
    act(() => {
      fakeStoreState = { ...fakeStoreState };
    });
    rerender(<CommandDock />);
    expect(getHoloDiscPulseState(container)).toBeNull();
  });

  it('gives a brief ~1s acknowledgment pulse when selectedActions grows', () => {
    const { container, rerender } = render(<CommandDock />);
    expect(getHoloDiscPulseState(container)).toBeNull();

    act(() => {
      fakeStoreState = { weeklyOutcome: null, selectedActions: ['action-1'] };
    });
    rerender(<CommandDock />);

    expect(getHoloDiscPulseState(container)).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    rerender(<CommandDock />);

    expect(getHoloDiscPulseState(container)).toBeNull();
  });

  it('does not pulse when selectedActions shrinks (deselecting an action)', () => {
    fakeStoreState = { weeklyOutcome: null, selectedActions: ['action-1'] };
    const { container, rerender } = render(<CommandDock />);

    act(() => {
      fakeStoreState = { weeklyOutcome: null, selectedActions: [] };
    });
    rerender(<CommandDock />);

    expect(getHoloDiscPulseState(container)).toBeNull();
  });
});
