/**
 * WeekSummary notable-stage chime tests (Phase 4 PR-5).
 *
 * The NOTABLE stage of the staged reveal plays `notable-chime` once — but only
 * when there is notable content, and never under reduced motion or when the
 * player skips the sequence (both collapse straight to the final state). The
 * store owns the week's priority sting (hero-fanfare/campaign-end/etc.), so the
 * stage chime here is additive, not a duplicate.
 *
 * jsdom drives the setTimeout-based reveal via fake timers.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';

const mockUseReducedMotion = vi.fn(() => false);
vi.mock('motion/react', async () => {
  const actual = await vi.importActual<typeof import('motion/react')>('motion/react');
  return {
    ...actual,
    useReducedMotion: () => mockUseReducedMotion(),
  };
});

const playSound = vi.fn();
vi.mock('@/lib/audio', () => ({
  playSound: (key: string) => playSound(key),
}));

import { WeekSummary } from '@/components/WeekSummary';

// A player-facing top-10 chart update with upward movement classifies as
// `notable` (not hero, not routine) — driving the notable stage's content.
const NOTABLE_STATS = {
  week: 12,
  revenue: 5000,
  expenses: 2000,
  changes: [],
  chartUpdates: [
    {
      songTitle: 'Neon Nights',
      artistName: 'Aurora',
      position: 5,
      movement: 3,
      isDebut: false,
      isCompetitorSong: false,
    },
  ],
} as any;

// Time to reach the NOTABLE stage (index 3): STAGE_DELAYS = [0,450,500,450,400]
// → cumulative before stage 3 = 450 + 500 + 450 = 1400ms.
const TIME_TO_NOTABLE = 1400;
// Beyond that reaches routine/complete.
const TIME_TO_COMPLETE = 2000;

const renderSummary = () =>
  render(
    <WeekSummary
      weeklyStats={NOTABLE_STATS}
      onAdvanceWeek={() => {}}
      isWeekResults
    />
  );

describe('WeekSummary notable-stage chime', () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReturnValue(false);
    playSound.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('plays notable-chime once when the NOTABLE stage reveals with notable content', () => {
    vi.useFakeTimers();
    renderSummary();

    expect(playSound).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(TIME_TO_NOTABLE);
    });

    expect(playSound).toHaveBeenCalledWith('notable-chime');
    expect(playSound).toHaveBeenCalledTimes(1);

    // Does not re-fire as the sequence completes.
    act(() => {
      vi.advanceTimersByTime(TIME_TO_COMPLETE);
    });
    expect(playSound).toHaveBeenCalledTimes(1);
  });

  it('does NOT play the chime under reduced motion (instant render)', () => {
    mockUseReducedMotion.mockReturnValue(true);
    vi.useFakeTimers();
    renderSummary();

    act(() => {
      vi.advanceTimersByTime(TIME_TO_COMPLETE);
    });

    expect(playSound).not.toHaveBeenCalled();
  });

  it('does NOT play the chime when the sequence is skipped before the notable stage', () => {
    vi.useFakeTimers();
    renderSummary();

    // Skip immediately (before the notable stage would naturally reveal).
    const panel = screen.getByText(/Week 12 Results/).closest('div')!;
    act(() => {
      fireEvent.click(panel);
    });

    act(() => {
      vi.advanceTimersByTime(TIME_TO_COMPLETE);
    });

    expect(playSound).not.toHaveBeenCalled();
  });
});
