/**
 * WeekSummary side-event beat tests (Tier 2 PR-4).
 *
 * The engine (PR-3) pushes the FULL side-event payload into summary.events
 * ({id, title, occurred, category, prompt, choices}) and sets
 * flags.pending_side_event on a hit. This beat renders that payload as a
 * choice card in the staged reveal, resolves via the store's resolveSideEvent
 * action (POST /api/game/:gameId/side-event-choice — never a raw fetch), and
 * reconciles the gameState spine + artists query on success.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';

const mockUseReducedMotion = vi.fn(() => true);
vi.mock('motion/react', async () => {
  const actual = await vi.importActual<typeof import('motion/react')>('motion/react');
  return {
    ...actual,
    useReducedMotion: () => mockUseReducedMotion(),
  };
});

const { mockResolveSideEvent, mockUseGameStore } = vi.hoisted(() => ({
  mockResolveSideEvent: vi.fn(),
  mockUseGameStore: vi.fn(),
}));
vi.mock('@/store/gameStore', () => ({
  useGameStore: (selector?: (s: unknown) => unknown) => {
    const state = { resolveSideEvent: mockResolveSideEvent };
    return selector ? selector(state) : state;
  },
}));

const { mockUseGameState } = vi.hoisted(() => ({ mockUseGameState: vi.fn() }));
vi.mock('@/hooks/useGameState', () => ({
  useGameState: (selector?: (gs: unknown) => unknown) => {
    const gs = mockUseGameState();
    return selector ? selector(gs) : gs;
  },
  useGameId: () => (mockUseGameState() as { id?: string } | null)?.id ?? null,
}));

const { mockInvalidateQueries } = vi.hoisted(() => ({ mockInvalidateQueries: vi.fn() }));
vi.mock('@/lib/queryClient', () => ({
  queryClient: { invalidateQueries: mockInvalidateQueries },
}));

import { WeekSummary } from '../WeekSummary';
import type { WeekSummary as WeekSummaryType, GameChange, EventOccurrence } from '@shared/types/gameTypes';

const GAME_ID = 'game-1';
const WEEK = 5;

function buildEvent(overrides?: Partial<EventOccurrence>): EventOccurrence {
  return {
    id: 'evt_sync_offer',
    title: 'A Sync Licensing Offer',
    occurred: true,
    category: 'sync_licensing',
    prompt: 'A streaming show wants to license your track. Take the deal?',
    choices: [
      {
        id: 'accept',
        label: 'Accept the offer',
        effects_immediate: { money: 5000 },
        effects_delayed: {},
      },
      {
        id: 'negotiate',
        label: 'Negotiate for more',
        effects_immediate: { reputation: 1 },
        effects_delayed: { money: 2000 },
      },
      {
        id: 'decline',
        label: 'Decline',
        effects_immediate: {},
        effects_delayed: {},
      },
    ],
    ...overrides,
  };
}

function buildStats(opts: { events?: EventOccurrence[]; changes?: GameChange[] } = {}): WeekSummaryType {
  return {
    week: WEEK,
    changes: opts.changes ?? [],
    revenue: 1000,
    expenses: 500,
    reputationChanges: {},
    events: opts.events ?? [],
    artistChanges: {},
    chartUpdates: [],
  } as any;
}

function renderSummary(
  events: EventOccurrence[],
  pendingSideEvent?: { eventId: string; week: number }
) {
  mockUseGameState.mockReturnValue({
    id: GAME_ID,
    flags: pendingSideEvent ? { pending_side_event: pendingSideEvent } : {},
  });
  return render(
    <WeekSummary
      weeklyStats={buildStats({ events })}
      onAdvanceWeek={() => {}}
      isWeekResults
      gameId={GAME_ID}
    />
  );
}

describe('WeekSummary side-event beat', () => {
  beforeEach(() => {
    mockResolveSideEvent.mockReset();
    mockInvalidateQueries.mockReset();
    mockUseGameState.mockReset();
  });
  afterEach(() => {
    mockUseReducedMotion.mockReturnValue(true);
    vi.clearAllMocks();
  });

  it('does not render a beat for a week with no full-payload event', () => {
    renderSummary([]);
    expect(screen.queryByText('And Then...')).not.toBeInTheDocument();
  });

  it('does not render a beat for a legacy {id,title,occurred} occurrence with no choices', () => {
    renderSummary([{ id: 'tour_wrapped', title: 'Tour Wrapped', occurred: true } as EventOccurrence]);
    expect(screen.queryByText('And Then...')).not.toBeInTheDocument();
  });

  it('renders the event card with category header, prompt, and whitelisted-only choice badges', () => {
    const event = buildEvent();
    renderSummary([event], { eventId: event.id, week: WEEK });

    expect(screen.getByText('And Then...')).toBeInTheDocument();
    expect(screen.getByText('Sync Licensing')).toBeInTheDocument();
    expect(screen.getByText(event.prompt as string)).toBeInTheDocument();
    expect(screen.getByText('Accept the offer')).toBeInTheDocument();
    expect(screen.getByText('Negotiate for more')).toBeInTheDocument();
    expect(screen.getByText('Decline')).toBeInTheDocument();

    // Whitelisted effect badges render (money/reputation are in LIVE_EFFECT_KEYS).
    expect(screen.getByText(/\+\$5,000/)).toBeInTheDocument();
    expect(screen.getByText(/\+1 Rep/)).toBeInTheDocument();
  });

  it('never renders a badge for a key outside LIVE_EFFECT_KEYS', () => {
    const event = buildEvent({
      choices: [
        {
          id: 'weird',
          label: 'Take the weird path',
          effects_immediate: { totally_not_a_real_key: 99 } as any,
          effects_delayed: {},
        },
      ],
    });
    renderSummary([event], { eventId: event.id, week: WEEK });

    expect(screen.getByText('No direct effects')).toBeInTheDocument();
    expect(screen.queryByText(/totally_not_a_real_key/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/99/)).not.toBeInTheDocument();
  });

  it('POSTs the right body via resolveSideEvent on choice click and shows the resolved state', async () => {
    const event = buildEvent();
    mockResolveSideEvent.mockResolvedValue({
      success: true,
      eventId: event.id,
      choiceId: 'accept',
      effects: { money: 5000 },
      delayedEffects: {},
      message: 'Side event resolved',
    });

    renderSummary([event], { eventId: event.id, week: WEEK });

    fireEvent.click(screen.getAllByRole('button', { name: 'Choose' })[0]);

    await waitFor(() => {
      expect(mockResolveSideEvent).toHaveBeenCalledWith(GAME_ID, event.id, 'accept');
    });

    await waitFor(() => {
      expect(screen.getByText(/You chose: Accept the offer/)).toBeInTheDocument();
    });
    expect(screen.getByText(/\+5000 money/)).toBeInTheDocument();

    // artist-scoped keys absent from the response -> no artists invalidation.
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it('invalidates the artists query when the resolved effects touch an artist-scoped key', async () => {
    const event = buildEvent();
    mockResolveSideEvent.mockResolvedValue({
      success: true,
      eventId: event.id,
      choiceId: 'accept',
      effects: { artist_mood: -5 },
      delayedEffects: {},
      message: 'Side event resolved',
    });

    renderSummary([event], { eventId: event.id, week: WEEK });
    fireEvent.click(screen.getAllByRole('button', { name: 'Choose' })[0]);

    await waitFor(() => {
      expect(mockInvalidateQueries).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: expect.arrayContaining(['artists:list', GAME_ID]) })
      );
    });
  });

  it('shows the quiet "moment passed" state on a 409 (already resolved/lapsed)', async () => {
    const event = buildEvent();
    const err: any = new Error('409: conflict');
    err.status = 409;
    mockResolveSideEvent.mockRejectedValue(err);

    renderSummary([event], { eventId: event.id, week: WEEK });
    fireEvent.click(screen.getAllByRole('button', { name: 'Choose' })[0]);

    await waitFor(() => {
      expect(screen.getByText('The moment passed.')).toBeInTheDocument();
    });
  });

  it('shows the already-passed fallback (not fresh choices) when the spine no longer carries the pending flag', () => {
    const event = buildEvent();
    // No pendingSideEvent passed -> flags.pending_side_event absent.
    renderSummary([event]);

    expect(screen.getByText('This moment has already passed.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Choose' })).not.toBeInTheDocument();
  });
});

describe('WeekSummary — Mandatory Side Events resolved beat ("Crisis Handled")', () => {
  beforeEach(() => {
    mockResolveSideEvent.mockReset();
    mockInvalidateQueries.mockReset();
    mockUseGameState.mockReset();
  });
  afterEach(() => {
    mockUseReducedMotion.mockReturnValue(true);
    vi.clearAllMocks();
  });

  it('renders "You spent the week handling: …" with the chosen label and effect badges for a resolved event', () => {
    const resolved: EventOccurrence = {
      id: 'gm_crisis',
      title: 'Catalog deal',
      occurred: true,
      resolved: true,
      category: 'business_opportunities',
      prompt: 'A distributor offers a risky catalog deal.',
      choiceId: 'accept',
      choiceLabel: 'Take the deal',
      effects: { money: 12000 },
      delayedEffects: { reputation: 2 },
    };
    renderSummary([resolved]);

    expect(screen.getByText('Crisis Handled')).toBeInTheDocument();
    expect(
      screen.getByText(/You spent the week handling: A distributor offers a risky catalog deal\./)
    ).toBeInTheDocument();
    expect(screen.getByText(/You chose: Take the deal/)).toBeInTheDocument();
    // Immediate + delayed effect badges (both whitelisted keys).
    expect(screen.getByText(/\+12000 money/)).toBeInTheDocument();
    expect(screen.getByText(/\+2 reputation \(next wk\)/)).toBeInTheDocument();
  });

  it('does not render the interactive beat for a mandatory occurrence that carries no choices', () => {
    // Mandatory deferral: the fresh occurrence has NO choices (handled next week
    // by the crisis card), so the legacy interactive beat must not appear.
    const deferred: EventOccurrence = {
      id: 'gm_crisis',
      title: 'Catalog deal',
      occurred: true,
      category: 'business_opportunities',
      prompt: 'A distributor offers a risky catalog deal.',
    };
    renderSummary([deferred]);

    expect(screen.queryByText('And Then...')).not.toBeInTheDocument();
    expect(screen.queryByText('Crisis Handled')).not.toBeInTheDocument();
  });
});
