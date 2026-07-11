/**
 * Hype-board UX Task 2 — weekly "Anticipation building" readout in WeekSummary
 * (AnticipationLine renders 'pre_campaign' entries in the hypeRoutine bucket).
 *
 * Fork E standing rule: the entry's raw awareness gain (`amount`) is NEVER
 * rendered — only the derived direction arrow + qualitative band word. The
 * launch countdown (weeks) is the only number allowed.
 *
 * Never-rendered-'other'-bucket trap: hype-routing.test.ts already pins that
 * 'pre_campaign' routes to hypeRoutine (a bucket WeekSummary renders); the
 * routing re-assertion here keeps this file self-proving.
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { AnticipationLine } from '@/components/week-summary/AnticipationLine';
import { categorizeWeekChanges } from '@/components/week-summary/categorizeChanges';
import type { GameChange } from '@shared/types/gameTypes';

afterEach(() => cleanup());

const entry = (overrides: Record<string, any> = {}): GameChange =>
  ({
    type: 'pre_campaign',
    description: '📣 Anticipation building for "Neon Nights" — 3 weeks to launch',
    amount: 7,
    releaseId: 'r1',
    releaseName: 'Neon Nights',
    weeksToLaunch: 3,
    ...overrides,
  }) as GameChange;

describe('AnticipationLine', () => {
  it('renders the release name, a rising band word, and the launch countdown', () => {
    render(<AnticipationLine change={entry()} />);
    const line = screen.getByTestId('anticipation-line');
    expect(line).toHaveTextContent('Neon Nights');
    expect(line).toHaveTextContent('anticipation surging'); // amount 7 → surging band
    expect(line).toHaveTextContent('3 weeks to launch');
    expect(screen.getByLabelText('anticipation rising')).toBeInTheDocument();
  });

  it('NEVER renders the raw weekly gain number (fork E: qualitative only)', () => {
    render(<AnticipationLine change={entry({ amount: 7 })} />);
    const text = screen.getByTestId('anticipation-line').textContent!;
    expect(text).not.toContain('7');
    expect(text).not.toMatch(/[×x]\s*\d/);
    expect(text).not.toMatch(/\+\d/);
  });

  it('shows a steady (holding) readout when the week applied no gain', () => {
    render(<AnticipationLine change={entry({ amount: 0 })} />);
    expect(screen.getByTestId('anticipation-line')).toHaveTextContent('anticipation holding');
    expect(screen.getByLabelText('anticipation holding')).toBeInTheDocument();
  });

  it('uses the building band for a modest weekly gain', () => {
    render(<AnticipationLine change={entry({ amount: 2 })} />);
    expect(screen.getByTestId('anticipation-line')).toHaveTextContent('anticipation building');
  });

  it('falls back to the engine description when structured fields are missing', () => {
    render(
      <AnticipationLine
        change={entry({ releaseName: undefined, weeksToLaunch: undefined })}
      />
    );
    expect(screen.getByTestId('anticipation-line')).toHaveTextContent(
      'Anticipation building for "Neon Nights"'
    );
  });

  it("routes to a RENDERED bucket — 'pre_campaign' lands in hypeRoutine, never 'other'", () => {
    const categories = categorizeWeekChanges([entry()]);
    expect(categories.hypeRoutine).toHaveLength(1);
    expect(categories.other).toEqual([]);
  });
});
