/**
 * CommandDock Weekly Results auto-open (playtest bug #2 fix).
 *
 * The one-shot `weeklyOutcomeAutoShow` store flag (set by advanceWeek, consumed
 * on first show) is consumed HERE — on the always-mounted CommandDock — rather
 * than on the Dashboard. The Dashboard is unmounted when the player advances the
 * week from the executive-meetings / live-performance routes, so a Dashboard-only
 * consumer silently skipped the popup for those advances. This suite pins that
 * the dock's WeekSummary modal auto-opens exactly once per advance regardless of
 * route, and that load/restore (flag false) never pops it.
 *
 * Same mock harness as CommandDock.pulse.test.tsx — Clerk, wouter, primitives,
 * audio, and both game-state hooks are mocked so only the auto-open effect runs.
 */
import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('wouter', () => ({
  useLocation: () => ['/executives', vi.fn()],
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

// Stub WeekSummary so the test asserts on its presence, not its internals.
vi.mock('./WeekSummary', () => ({
  WeekSummary: () => React.createElement('div', { 'data-testid': 'week-summary' }),
}));

vi.mock('@/lib/audio', () => ({
  audioManager: {
    getSettings: () => ({ muted: false, volume: 0.5 }),
    subscribe: () => () => {},
    setMuted: vi.fn(),
    setVolume: vi.fn(),
  },
}));

const fakeGameState = { focusSlots: 3, usedFocusSlots: 0, currentWeek: 5 };
vi.mock('@/hooks/useGameState', () => ({
  useGameState: () => fakeGameState,
}));

let fakeStoreState: {
  weeklyOutcome: any;
  selectedActions: string[];
  isAdvancingWeek: boolean;
  weeklyOutcomeAutoShow: boolean;
  consumeWeeklyOutcomeAutoShow: () => void;
};
const useGameStoreMock = vi.fn((selector?: (s: typeof fakeStoreState) => unknown) =>
  selector ? selector(fakeStoreState) : fakeStoreState,
);
vi.mock('@/store/gameStore', () => ({
  useGameStore: (selector?: any) => useGameStoreMock(selector),
}));

import { CommandDock } from './CommandDock';

function summaryVisible(container: HTMLElement) {
  return container.querySelector('[data-testid="week-summary"]');
}

describe('CommandDock Weekly Results auto-open', () => {
  beforeEach(() => {
    fakeStoreState = {
      weeklyOutcome: null,
      selectedActions: [],
      isAdvancingWeek: false,
      weeklyOutcomeAutoShow: false,
      consumeWeeklyOutcomeAutoShow: vi.fn(() => {
        fakeStoreState.weeklyOutcomeAutoShow = false;
      }),
    };
  });

  it('auto-opens the WeekSummary modal when the one-shot flag is set (even on a non-dashboard route)', () => {
    const { container, rerender } = render(<CommandDock />);
    expect(summaryVisible(container)).toBeNull();

    // advanceWeek resolved: outcome present, flag set, no longer advancing.
    act(() => {
      fakeStoreState = {
        ...fakeStoreState,
        weeklyOutcome: { week: 6, changes: [], chartUpdates: [] },
        weeklyOutcomeAutoShow: true,
      };
    });
    rerender(<CommandDock />);

    expect(summaryVisible(container)).not.toBeNull();
    expect(fakeStoreState.consumeWeeklyOutcomeAutoShow).toHaveBeenCalledTimes(1);
  });

  it('does NOT auto-open while the week is still advancing', () => {
    const { container, rerender } = render(<CommandDock />);

    act(() => {
      fakeStoreState = {
        ...fakeStoreState,
        weeklyOutcome: { week: 6, changes: [], chartUpdates: [] },
        weeklyOutcomeAutoShow: true,
        isAdvancingWeek: true,
      };
    });
    rerender(<CommandDock />);

    expect(summaryVisible(container)).toBeNull();
    expect(fakeStoreState.consumeWeeklyOutcomeAutoShow).not.toHaveBeenCalled();
  });

  it('does NOT auto-open on load/restore (outcome present but flag false)', () => {
    const { container, rerender } = render(<CommandDock />);

    act(() => {
      fakeStoreState = {
        ...fakeStoreState,
        weeklyOutcome: { week: 6, changes: [], chartUpdates: [] },
        weeklyOutcomeAutoShow: false,
      };
    });
    rerender(<CommandDock />);

    expect(summaryVisible(container)).toBeNull();
    expect(fakeStoreState.consumeWeeklyOutcomeAutoShow).not.toHaveBeenCalled();
  });

  it('consumes the flag exactly once — a subsequent re-render does not re-open after close', () => {
    const consume = vi.fn(() => {
      fakeStoreState.weeklyOutcomeAutoShow = false;
    });
    fakeStoreState = {
      ...fakeStoreState,
      consumeWeeklyOutcomeAutoShow: consume,
    };

    const { container, rerender } = render(<CommandDock />);

    act(() => {
      fakeStoreState = {
        ...fakeStoreState,
        weeklyOutcome: { week: 6, changes: [], chartUpdates: [] },
        weeklyOutcomeAutoShow: true,
      };
    });
    rerender(<CommandDock />);
    expect(consume).toHaveBeenCalledTimes(1);

    // Flag now cleared (one-shot). Any later parent re-render with the same
    // outcome must NOT consume again.
    act(() => {
      fakeStoreState = { ...fakeStoreState };
    });
    rerender(<CommandDock />);
    expect(consume).toHaveBeenCalledTimes(1);
  });
});
