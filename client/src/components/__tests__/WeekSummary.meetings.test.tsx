/**
 * WeekSummary meetings-card tests (exec-meetings-revival PR-2).
 *
 * Meeting / executive_interaction / delayed_effect changes used to be silently
 * dropped into the "other" bucket and never rendered — exec loyalty-decay
 * notices were invisible (case file §2/§6d). categorizeChanges now buckets them
 * into `meetings`, rendered by a card mirroring the Mood Changes card, slotted
 * into the existing STAGE_ROUTINE reveal stage (no new stage added).
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';

const mockUseReducedMotion = vi.fn(() => true);
vi.mock('motion/react', async () => {
  const actual = await vi.importActual<typeof import('motion/react')>('motion/react');
  return {
    ...actual,
    useReducedMotion: () => mockUseReducedMotion(),
  };
});

import { WeekSummary } from '../WeekSummary';
import type { WeekSummary as WeekSummaryType, GameChange } from '@shared/types/gameTypes';

function buildStats(changes: GameChange[]): WeekSummaryType {
  return {
    week: 5,
    changes,
    revenue: 1000,
    expenses: 500,
    reputationChanges: {},
    events: [],
    artistChanges: {},
    chartUpdates: [],
  } as any;
}

function renderSummary(changes: GameChange[]) {
  return render(
    <WeekSummary
      weeklyStats={buildStats(changes)}
      onAdvanceWeek={() => {}}
      isWeekResults
    />
  );
}

describe('WeekSummary meetings card', () => {
  afterEach(() => {
    mockUseReducedMotion.mockReturnValue(true);
    vi.clearAllMocks();
  });

  it('renders the meeting name, choice label, and applied effect deltas', () => {
    renderSummary([
      {
        type: 'meeting',
        description: 'Met with Role ceo',
        roleId: 'ceo',
        meetingId: 'strategy_session',
        choiceId: 'choice_a',
        choiceLabel: 'Double down on the studio budget',
        appliedEffects: { money: -1000, reputation: 2 },
        importance: 'routine',
      } as GameChange,
    ]);

    expect(screen.getByText('Meetings')).toBeInTheDocument();
    expect(screen.getByText('Met with Role ceo')).toBeInTheDocument();
    expect(screen.getByText('Double down on the studio budget')).toBeInTheDocument();
    expect(screen.getByText('-1000 Money')).toBeInTheDocument();
    expect(screen.getByText('+2 Rep')).toBeInTheDocument();
  });

  it('renders exec mood/loyalty deltas for an executive_interaction "Met with X" entry', () => {
    renderSummary([
      {
        type: 'executive_interaction',
        description: 'Met with head_ar',
        moodChange: 5,
        newMood: 60,
        loyaltyBoost: 5,
        newLoyalty: 65,
        importance: 'routine',
      } as GameChange,
    ]);

    expect(screen.getByText('Met with head_ar')).toBeInTheDocument();
    expect(screen.getByText('+5 Mood')).toBeInTheDocument();
    expect(screen.getByText('+5 Loyalty')).toBeInTheDocument();
  });

  it('renders a loyalty-decay executive_interaction entry (previously invisible)', () => {
    renderSummary([
      {
        type: 'executive_interaction',
        description: "Head of A&R's loyalty decreased (ignored for 5 weeks)",
        amount: -5,
        loyaltyChange: -5,
        importance: 'notable',
      } as GameChange,
    ]);

    expect(screen.getByText("Head of A&R's loyalty decreased (ignored for 5 weeks)")).toBeInTheDocument();
    expect(screen.getByText('-5 Loyalty')).toBeInTheDocument();
  });

  it('renders a delayed_effect payoff entry', () => {
    renderSummary([
      {
        type: 'delayed_effect',
        description: 'Delayed effect triggered for artist a1',
        meetingId: 'strategy_session',
        choiceId: 'choice_a',
        appliedEffects: { artist_mood: 3 },
      } as GameChange,
    ]);

    expect(screen.getByText('Delayed effect triggered for artist a1')).toBeInTheDocument();
    expect(screen.getByText('+3 Mood')).toBeInTheDocument();
  });

  it('does not render the meetings card when there are no meeting-bucket changes', () => {
    renderSummary([
      { type: 'revenue', description: 'Streaming revenue', amount: 1000, importance: 'routine' } as GameChange,
    ]);

    expect(screen.queryByText('Meetings')).not.toBeInTheDocument();
  });

  it('surfaces the meetings card under the staged reveal (non-reduced-motion) once the routine stage completes', () => {
    mockUseReducedMotion.mockReturnValue(false);
    vi.useFakeTimers();
    renderSummary([
      {
        type: 'meeting',
        description: 'Met with Role ceo',
        meetingId: 'strategy_session',
        choiceId: 'choice_a',
        choiceLabel: 'Choice A',
        appliedEffects: { reputation: 1 },
        importance: 'routine',
      } as GameChange,
    ]);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText('Meetings')).toBeInTheDocument();
    expect(screen.getByText('Met with Role ceo')).toBeInTheDocument();
    vi.useRealTimers();
  });
});
