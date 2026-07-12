/**
 * WeekSummary "While you were out" autonomous-resolution digest (Executive
 * Delegation & Trust arc, Track D — client-side, spec §4.5/§4.6, fork c
 * DECIDED: quiet grouped digest, collapsed by default).
 *
 * The engine emits autonomous exec resolutions as ordinary 'meeting' change
 * entries with an additive `autonomous: true` marker (spec §4.6's exact JSON
 * shape). categorizeChanges splits those into a separate bucket so the
 * WeekSummary meetings card can render player decisions first, unaffected,
 * then a collapsed-by-default "While you were out" group below them.
 */
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';

const mockUseReducedMotion = vi.fn(() => true);
vi.mock('motion/react', async () => {
  const actual = await vi.importActual<typeof import('motion/react')>('motion/react');
  return {
    ...actual,
    useReducedMotion: () => mockUseReducedMotion(),
  };
});

vi.mock('@/hooks/useGameState', () => ({
  useGameState: (selector?: (gs: unknown) => unknown) => {
    const gs = { id: 'game-1', flags: {} };
    return selector ? selector(gs) : gs;
  },
  useGameId: () => 'game-1',
}));

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

const AUTONOMOUS_ENTRY: GameChange = {
  type: 'meeting',
  autonomous: true,
  roleId: 'cmo',
  meetingId: 'cmo_awards',
  choiceId: 'full_campaign',
  choiceLabel: 'Go all in on the awards campaign',
  appliedEffects: { money: -20000, award_chances: 5 },
  description: 'Samara ran the awards campaign while you were out',
  importance: 'routine',
} as GameChange;

const PLAYER_ENTRY: GameChange = {
  type: 'meeting',
  description: 'Met with Role ceo',
  roleId: 'ceo',
  meetingId: 'strategy_session',
  choiceId: 'choice_a',
  choiceLabel: 'Double down on the studio budget',
  appliedEffects: { money: -1000, reputation: 2 },
  importance: 'routine',
} as GameChange;

describe('WeekSummary "While you were out" digest', () => {
  afterEach(() => {
    mockUseReducedMotion.mockReturnValue(true);
    vi.clearAllMocks();
  });

  it('groups autonomous meeting entries under a collapsed-by-default digest header', () => {
    renderSummary([AUTONOMOUS_ENTRY]);

    expect(screen.getByText('Meetings')).toBeInTheDocument();
    expect(screen.getByText('Made Without You')).toBeInTheDocument();
    expect(screen.getByText('Your team made 1 decision on their own')).toBeInTheDocument();

    // Collapsed by default: the entry description/attribution are not rendered.
    expect(screen.queryByText('Samara ran the awards campaign while you were out')).not.toBeInTheDocument();
    expect(screen.queryByText('Samara Chen · CMO')).not.toBeInTheDocument();

    const toggle = screen.getByTestId('autonomous-digest-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('expands to show entries with exec attribution and effect badges on click', () => {
    renderSummary([AUTONOMOUS_ENTRY]);

    const toggle = screen.getByTestId('autonomous-digest-toggle');
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Samara ran the awards campaign while you were out')).toBeInTheDocument();
    expect(screen.getByText('Samara Chen · CMO')).toBeInTheDocument();
    // Choice label is now prefixed as the exec's past call (Entry 1 reframe).
    expect(screen.getByText(/Their call:.*Go all in on the awards campaign/)).toBeInTheDocument();
    expect(screen.getByText('-20000 Money')).toBeInTheDocument();
    expect(screen.getByText('+5 Prestige')).toBeInTheDocument();

    // Clicking again collapses it.
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Samara ran the awards campaign while you were out')).not.toBeInTheDocument();
  });

  it('renders player-chosen meeting entries unaffected alongside the digest', () => {
    renderSummary([PLAYER_ENTRY, AUTONOMOUS_ENTRY]);

    // Player entry renders exactly as before, immediately visible.
    expect(screen.getByText('Met with Role ceo')).toBeInTheDocument();
    expect(screen.getByText('Double down on the studio budget')).toBeInTheDocument();
    expect(screen.getByText('-1000 Money')).toBeInTheDocument();
    expect(screen.getByText('+2 Rep')).toBeInTheDocument();

    // Autonomous entry is folded into the collapsed digest, not the player list.
    expect(screen.getByText('Made Without You')).toBeInTheDocument();
    expect(screen.queryByText('Samara ran the awards campaign while you were out')).not.toBeInTheDocument();
  });

  it('renders no digest header in a zero-autonomous week', () => {
    renderSummary([PLAYER_ENTRY]);

    expect(screen.getByText('Meetings')).toBeInTheDocument();
    expect(screen.queryByText('Made Without You')).not.toBeInTheDocument();
    expect(screen.queryByTestId('autonomous-digest-toggle')).not.toBeInTheDocument();
  });

  it('renders the Meetings card and digest even when every entry is autonomous (no player meetings)', () => {
    renderSummary([AUTONOMOUS_ENTRY]);

    expect(screen.getByText('Meetings')).toBeInTheDocument();
    expect(screen.getByText('Made Without You')).toBeInTheDocument();
  });
});
