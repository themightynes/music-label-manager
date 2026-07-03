/**
 * WeekTransition interstitial test (Phase 4 PR-4).
 *
 * The overlay is purely visual: it appears when the week advance starts,
 * holds for a minimum display window so fast responses don't flash, and
 * dismisses as soon as BOTH the advance has completed AND the minimum has
 * elapsed. Under reduced motion it never renders at all. Fake timers drive
 * the minimum-display clock.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

const mockUseReducedMotion = vi.fn(() => false);
vi.mock('motion/react', async () => {
  const actual =
    await vi.importActual<typeof import('motion/react')>('motion/react');
  return {
    ...actual,
    useReducedMotion: () => mockUseReducedMotion(),
  };
});

const fakeGameState = { currentWeek: 5 };
vi.mock('@/hooks/useGameState', () => ({
  useGameState: vi.fn((selector?: (gs: any) => any) =>
    selector ? selector(fakeGameState) : fakeGameState,
  ),
}));

import {
  WeekTransition,
  WEEK_TRANSITION_MIN_MS,
} from '@/components/WeekTransition';

describe('WeekTransition', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUseReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('does not render when no advance is in flight', () => {
    render(<WeekTransition isAdvancing={false} />);
    expect(screen.queryByTestId('week-transition')).not.toBeInTheDocument();
  });

  it('appears when the advance starts and shows the incoming week number', () => {
    render(<WeekTransition isAdvancing={true} />);
    expect(screen.getByTestId('week-transition')).toBeInTheDocument();
    // currentWeek 5 -> transitioning INTO week 6
    expect(screen.getByText(/week 6/i)).toBeInTheDocument();
  });

  it('stays up through the minimum display window when the advance finishes early', () => {
    const { rerender } = render(<WeekTransition isAdvancing={true} />);
    expect(screen.getByTestId('week-transition')).toBeInTheDocument();

    // Server answers fast: advance completes at ~100ms.
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender(<WeekTransition isAdvancing={false} />);

    // Still visible: the minimum has not elapsed yet.
    expect(screen.getByTestId('week-transition')).toBeInTheDocument();

    // Just before the minimum: still visible.
    act(() => {
      vi.advanceTimersByTime(WEEK_TRANSITION_MIN_MS - 101);
    });
    expect(screen.getByTestId('week-transition')).toBeInTheDocument();

    // Minimum reached: dismisses.
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByTestId('week-transition')).not.toBeInTheDocument();
  });

  it('dismisses immediately once the advance completes after the minimum elapsed (no artificial delay)', () => {
    const { rerender } = render(<WeekTransition isAdvancing={true} />);

    // Slow advance: minimum elapses while still in flight.
    act(() => {
      vi.advanceTimersByTime(WEEK_TRANSITION_MIN_MS + 500);
    });
    expect(screen.getByTestId('week-transition')).toBeInTheDocument();

    // Advance completes -> dismisses on the very next render, no extra timer.
    rerender(<WeekTransition isAdvancing={false} />);
    expect(screen.queryByTestId('week-transition')).not.toBeInTheDocument();
  });

  it('re-appears for a subsequent advance', () => {
    const { rerender } = render(<WeekTransition isAdvancing={true} />);
    act(() => {
      vi.advanceTimersByTime(WEEK_TRANSITION_MIN_MS);
    });
    rerender(<WeekTransition isAdvancing={false} />);
    expect(screen.queryByTestId('week-transition')).not.toBeInTheDocument();

    rerender(<WeekTransition isAdvancing={true} />);
    expect(screen.getByTestId('week-transition')).toBeInTheDocument();
  });

  it('never renders under reduced motion, even while advancing', () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { rerender } = render(<WeekTransition isAdvancing={true} />);
    expect(screen.queryByTestId('week-transition')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(WEEK_TRANSITION_MIN_MS * 2);
    });
    rerender(<WeekTransition isAdvancing={false} />);
    expect(screen.queryByTestId('week-transition')).not.toBeInTheDocument();
  });

  it('is pointer-transparent (cannot block the app)', () => {
    render(<WeekTransition isAdvancing={true} />);
    expect(screen.getByTestId('week-transition')).toHaveClass(
      'pointer-events-none',
    );
  });
});
