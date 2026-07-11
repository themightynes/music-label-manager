/**
 * Tier 2 (PR-2) — MeetingSelector "why now" reason line.
 *
 * The carousel card renders the shared formatWhyNow() line when the meeting
 * carries `reactiveContext`, and omits it entirely for a normal (non-reactive)
 * meeting — the reveal is the payoff, not the card itself.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MeetingSelector } from '../../client/src/components/executive-meetings/MeetingSelector';
import type { RoleMeeting } from '../../shared/types/gameTypes';

afterEach(() => cleanup());

function makeMeeting(overrides: Partial<RoleMeeting> = {}): RoleMeeting {
  return {
    id: 'test_meeting',
    name: 'Test Meeting',
    prompt: 'A generic prompt.',
    target_scope: 'global',
    choices: [
      { id: 'a', label: 'Choice A', effects_immediate: {}, effects_delayed: {} },
    ],
    ...overrides,
  } as RoleMeeting;
}

describe('MeetingSelector — why-now line', () => {
  it('renders the why-now line for a meeting with reactiveContext', () => {
    const meeting = makeMeeting({
      reactiveContext: { trigger: 'chart_debut', songTitle: 'Neon Nights' },
    });
    render(
      <MeetingSelector
        meetings={[meeting]}
        signedArtists={[]}
        onSelectMeeting={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByTestId('why-now-line')).toHaveTextContent(
      'Because "Neon Nights" hit the charts last week'
    );
  });

  it('omits the why-now line for a normal (non-reactive) meeting', () => {
    const meeting = makeMeeting();
    render(
      <MeetingSelector
        meetings={[meeting]}
        signedArtists={[]}
        onSelectMeeting={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.queryByTestId('why-now-line')).not.toBeInTheDocument();
  });

  it('renders the why-now line on the artist-selection confirm view too', () => {
    const meeting = makeMeeting({
      target_scope: 'user_selected',
      prompt_before_selection: 'Which artist?',
      prompt: 'Pick for {artistName}.',
      reactiveContext: { trigger: 'mood_crater', artistName: 'Aurora' },
    });
    render(
      <MeetingSelector
        meetings={[meeting]}
        signedArtists={[{ id: 'a1', name: 'Aurora' } as any]}
        onSelectMeeting={vi.fn()}
        onBack={vi.fn()}
      />
    );
    // Enter the artist-picker view by starting the meeting (console redesign:
    // the brief's CTA reads "Start Meeting — pick an artist").
    screen.getByText('Start Meeting — pick an artist').click();
    expect(screen.getByTestId('why-now-line')).toHaveTextContent('Because Aurora is in crisis');
  });
});
