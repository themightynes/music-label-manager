/**
 * Tier 2 (PR-2, Nes amendment 1) — urgency indicator on the exec card.
 *
 * `hasReactiveMeeting` shows a small dot/pulse signaling "something happened"
 * this week, WITHOUT revealing the reactive TRIGGER (the "why now" line stays
 * a reveal-on-open payoff). Suppressed when the exec is sitting out (no
 * meeting to open).
 *
 * Hype-board UX Task 4 (July 2026 playtest) revised the ORIGINAL "no meeting
 * name on the card" stance: the strip's open state may now preview the waiting
 * meeting's name + prompt snippet (ExecutiveCard.meetingPreview.test.tsx) —
 * but the trigger/why-now copy still never leaks onto the card, which is what
 * this file pins.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ExecutiveCard } from '../../client/src/components/executive-meetings/ExecutiveCard';
import type { Executive } from '../../shared/types/gameTypes';

afterEach(() => cleanup());

function makeExec(role: string): Executive {
  return { id: role, role, level: 1, mood: 50, loyalty: 50 } as Executive;
}

describe('ExecutiveCard — urgency indicator', () => {
  it('shows the urgency dot when hasReactiveMeeting is true (non-CEO card)', () => {
    render(
      <ExecutiveCard executive={makeExec('cmo')} hasReactiveMeeting onSelect={vi.fn()} />
    );
    expect(screen.getByTestId('urgency-dot-cmo')).toBeInTheDocument();
  });

  it('does not show the urgency dot when hasReactiveMeeting is false', () => {
    render(
      <ExecutiveCard executive={makeExec('cmo')} hasReactiveMeeting={false} onSelect={vi.fn()} />
    );
    expect(screen.queryByTestId('urgency-dot-cmo')).not.toBeInTheDocument();
  });

  it('suppresses the dot when the exec is sitting out, even if hasReactiveMeeting is true', () => {
    render(
      <ExecutiveCard
        executive={makeExec('cmo')}
        hasReactiveMeeting
        sitOut
        onSelect={vi.fn()}
      />
    );
    expect(screen.queryByTestId('urgency-dot-cmo')).not.toBeInTheDocument();
  });

  it('shows the urgency dot on the CEO card variant', () => {
    render(
      <ExecutiveCard executive={makeExec('ceo')} hasReactiveMeeting onSelect={vi.fn()} />
    );
    expect(screen.getByTestId('urgency-dot-ceo')).toBeInTheDocument();
  });

  it('never renders trigger/meeting content on the card itself', () => {
    render(
      <ExecutiveCard executive={makeExec('cmo')} hasReactiveMeeting onSelect={vi.fn()} />
    );
    // The dot exists, but no "why now" style copy leaks onto the card.
    expect(screen.queryByTestId('why-now-line')).not.toBeInTheDocument();
    expect(screen.queryByText(/chart_debut|mood_crater|recent_signing|release_out/i)).not.toBeInTheDocument();
  });
});
