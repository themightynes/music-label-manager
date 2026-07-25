/**
 * Reactive user_selected meetings bind the triggering artist — no picker
 * (2026-07-25 playtest finding, item 2).
 *
 * The route now forwards the happening's `artistId` on `reactiveContext`.
 * When present on a user_selected meeting, Start Meeting must select that
 * artist directly (the fiction already chose — "the one that made me sign
 * {artistName}") instead of offering a picker the player could use to
 * contradict the trigger. Without an artistId (non-reactive user_selected,
 * or a happening that doesn't know its artist) the picker is unchanged.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MeetingSelector } from '../../client/src/components/executive-meetings/MeetingSelector';
import type { RoleMeeting } from '../../shared/types/gameTypes';

afterEach(() => cleanup());

const ARTISTS = [
  { id: 'a1', name: 'Aurora' } as any,
  { id: 'a2', name: 'Mason Beat' } as any,
];

function makeMeeting(overrides: Partial<RoleMeeting> = {}): RoleMeeting {
  return {
    id: 'demo_ethics_one',
    name: 'The Demo Ethics One',
    prompt: 'The demo — the one that made me sign {artistName}.',
    prompt_before_selection: 'Whose signing demo has the co-writer problem?',
    target_scope: 'user_selected',
    choices: [
      { id: 'a', label: 'Choice A', effects_immediate: {}, effects_delayed: {} },
    ],
    ...overrides,
  } as RoleMeeting;
}

describe('MeetingSelector — reactive artist binding (no picker)', () => {
  it('reactiveContext.artistId: Start Meeting selects that artist directly, skipping the picker', () => {
    const onSelectMeeting = vi.fn();
    const meeting = makeMeeting({
      reactiveContext: { trigger: 'recent_signing', artistId: 'a2', artistName: 'Mason Beat' },
    });
    render(
      <MeetingSelector
        meetings={[meeting]}
        signedArtists={ARTISTS}
        onSelectMeeting={onSelectMeeting}
        onBack={vi.fn()}
      />
    );
    // Bound meeting: the CTA drops the "pick an artist" suffix.
    fireEvent.click(screen.getByText('Start Meeting'));
    expect(onSelectMeeting).toHaveBeenCalledWith(meeting, 'a2');
    // No picker view was entered.
    expect(screen.queryByTestId('console-artist-pick-a1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('console-artist-pick-a2')).not.toBeInTheDocument();
  });

  it('no artistId (non-reactive user_selected): the picker flow is unchanged', () => {
    const onSelectMeeting = vi.fn();
    const meeting = makeMeeting();
    render(
      <MeetingSelector
        meetings={[meeting]}
        signedArtists={ARTISTS}
        onSelectMeeting={onSelectMeeting}
        onBack={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Start Meeting — pick an artist'));
    expect(onSelectMeeting).not.toHaveBeenCalled();
    // Picker is showing; picking an artist starts the meeting with that id.
    fireEvent.click(screen.getByTestId('console-artist-pick-a1'));
    expect(onSelectMeeting).toHaveBeenCalledWith(meeting, 'a1');
  });

  it('reactive but WITHOUT artistId (happening did not know its artist): picker still offered', () => {
    const onSelectMeeting = vi.fn();
    const meeting = makeMeeting({
      reactiveContext: { trigger: 'recent_signing', artistName: 'Mason Beat' },
    });
    render(
      <MeetingSelector
        meetings={[meeting]}
        signedArtists={ARTISTS}
        onSelectMeeting={onSelectMeeting}
        onBack={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Start Meeting — pick an artist'));
    expect(onSelectMeeting).not.toHaveBeenCalled();
    expect(screen.getByTestId('console-artist-pick-a1')).toBeInTheDocument();
  });
});
