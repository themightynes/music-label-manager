/**
 * WeekSummary staged-reveal tests (Phase 4 PR-3).
 *
 * jsdom cannot see motion, so these assert observable STATES rather than
 * animation quality:
 *   - Characterization: after the full reveal (timers flushed), every fact that
 *     was visible before this PR is still present (same strings/amounts).
 *   - Skip: a click during the sequence surfaces all content immediately.
 *   - Reduced motion: `useReducedMotion() === true` renders everything on the
 *     first paint, no staging, no count-up.
 *   - Tier unlocks appear in the modal with hero ("Milestone Moments") treatment.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';

// Flip reduced motion per-test; keep the rest of motion/react real so the
// AnimatedNumber spring and layout animations behave as in production.
const mockUseReducedMotion = vi.fn(() => false);
vi.mock('motion/react', async () => {
  const actual = await vi.importActual<typeof import('motion/react')>('motion/react');
  return {
    ...actual,
    useReducedMotion: () => mockUseReducedMotion(),
  };
});

import { WeekSummary } from '../WeekSummary';
import type { WeekSummary as WeekSummaryType, GameChange, ChartUpdate } from '@shared/types/gameTypes';

// A representative payload: hero (unlock + No.1 chart) + notable + routine.
function buildPayload(): WeekSummaryType {
  const changes: GameChange[] = [
    { type: 'revenue', description: 'Streaming revenue', amount: 12000, importance: 'routine' },
    { type: 'ongoing_revenue', description: 'Catalog royalties', amount: 3400, importance: 'routine' },
    { type: 'unlock', description: 'Playlist Tier: Mid unlocked', importance: 'hero' },
    { type: 'reputation', description: 'Label reputation grew', amount: 6, importance: 'notable' },
    { type: 'mood', description: 'Nova is thrilled', moodChange: 8, source: 'user_selected', artistId: 'a1', importance: 'routine' },
  ];
  const chartUpdates: ChartUpdate[] = [
    { songTitle: 'Skyline', artistName: 'Nova', position: 1, movement: 4, isDebut: true, importance: 'hero' },
    { songTitle: 'Undertow', artistName: 'Echo', position: 7, movement: 2, isDebut: false, importance: 'notable' },
    { songTitle: 'Rival Anthem', artistName: 'Competitor', position: 3, movement: 1, isDebut: false, isCompetitorSong: true, importance: 'routine' },
  ];
  return {
    week: 5,
    changes,
    revenue: 15400,
    expenses: 5400,
    reputationChanges: {},
    events: [],
    artistChanges: {},
    chartUpdates,
  };
}

function renderSummary() {
  const onAdvanceWeek = vi.fn();
  const onClose = vi.fn();
  const result = render(
    <WeekSummary
      weeklyStats={buildPayload()}
      onAdvanceWeek={onAdvanceWeek}
      isWeekResults
      onClose={onClose}
    />
  );
  return { ...result, onAdvanceWeek, onClose };
}

describe('WeekSummary staged reveal', () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('characterization: after the full reveal, all pre-PR facts are visible', () => {
    vi.useFakeTimers();
    renderSummary();

    // Advance past the full staged timeline (sum of STAGE_DELAYS = 1800ms).
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Header + financial frame
    expect(screen.getByText('Week 5 Results')).toBeInTheDocument();
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('Expenses')).toBeInTheDocument();
    expect(screen.getByText('Net Income')).toBeInTheDocument();

    // Revenue sources
    expect(screen.getByText('Streaming revenue')).toBeInTheDocument();
    expect(screen.getByText('Catalog royalties')).toBeInTheDocument();

    // Hero unlock (moved into the modal)
    expect(screen.getByText('Playlist Tier: Mid unlocked')).toBeInTheDocument();

    // Notable reputation + routine mood still present
    expect(screen.getByText('Label reputation grew')).toBeInTheDocument();
    expect(screen.getByText(/Nova is thrilled/)).toBeInTheDocument();

    // Performance summary line (net income = 15400 - 5400 = 10000)
    expect(screen.getByText(/generated \$10,000 in profit/)).toBeInTheDocument();
  });

  it('renders a tier unlock with hero ("Milestone Moments") treatment', () => {
    vi.useFakeTimers();
    renderSummary();
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Hero section header exists and the unlock is labeled as new access.
    expect(screen.getByText('Milestone Moments')).toBeInTheDocument();
    expect(screen.getByText('New Access Unlocked')).toBeInTheDocument();
    // The No. 1 debut is also surfaced as a hero moment. (Skyline also appears
    // in the Chart Highlights card — information parity — so match ≥1.)
    expect(screen.getByText('No. 1 Debut')).toBeInTheDocument();
    expect(screen.getAllByText(/Skyline/).length).toBeGreaterThan(0);
  });

  it('skip: a click during the sequence surfaces all content immediately', () => {
    vi.useFakeTimers();
    const { container } = renderSummary();

    // Before any timer flush, click the modal to skip.
    act(() => {
      fireEvent.click(container.firstChild as Element);
    });

    // No timer advancement — content is present because skip jumped to final.
    expect(screen.getByText('Playlist Tier: Mid unlocked')).toBeInTheDocument();
    expect(screen.getByText('Label reputation grew')).toBeInTheDocument();
    expect(screen.getByText(/Nova is thrilled/)).toBeInTheDocument();
    expect(screen.getByText('Milestone Moments')).toBeInTheDocument();
  });

  it('reduced motion: everything renders on first paint, no staging needed', () => {
    mockUseReducedMotion.mockReturnValue(true);
    renderSummary();

    // No fake timers, no interaction — all content present immediately.
    expect(screen.getByText('Streaming revenue')).toBeInTheDocument();
    expect(screen.getByText('Playlist Tier: Mid unlocked')).toBeInTheDocument();
    expect(screen.getByText('Milestone Moments')).toBeInTheDocument();
    expect(screen.getByText('Label reputation grew')).toBeInTheDocument();
    expect(screen.getByText(/Nova is thrilled/)).toBeInTheDocument();
    expect(screen.getByText(/generated \$10,000 in profit/)).toBeInTheDocument();
    // Net income count-up is bypassed: the final formatted value shows at once.
    expect(screen.getByText('+$10,000')).toBeInTheDocument();
  });
});
