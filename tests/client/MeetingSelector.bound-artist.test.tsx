/**
 * Item 5 (2026-07-25) — auto_bind_artist meetings: the exec walks in already
 * naming the subject artist.
 *
 * The route attaches `boundArtist` (seeded weighted draw) on flagged
 * user_selected meetings. The brief must render the NAMED `prompt`
 * ("a journalist is sitting on a story about Diego Morales"), not the
 * artist-agnostic `prompt_before_selection`, and Start Meeting selects the
 * bound artist directly — no picker. Unbound user_selected meetings are
 * unchanged (picker + prompt_before_selection).
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MeetingSelector } from '../../client/src/components/executive-meetings/MeetingSelector';
import type { RoleMeeting } from '../../shared/types/gameTypes';

afterEach(() => cleanup());

const ARTISTS = [
  { id: 'a1', name: 'Aurora' } as any,
  { id: 'a2', name: 'Diego Morales' } as any,
];

function makeMeeting(overrides: Partial<RoleMeeting> = {}): RoleMeeting {
  return {
    id: 'the_dossier',
    name: 'The Dossier',
    prompt: 'A journalist is sitting on a story about {artistName}.',
    prompt_before_selection: 'Which artist is the story about?',
    target_scope: 'user_selected',
    auto_bind_artist: true,
    choices: [
      { id: 'a', label: 'Choice A', effects_immediate: {}, effects_delayed: {} },
    ],
    ...overrides,
  } as RoleMeeting;
}

describe('MeetingSelector — auto-bound artist (item 5)', () => {
  it('renders the NAMED prompt as the brief when boundArtist is present', () => {
    const meeting = makeMeeting({
      boundArtist: { artistId: 'a2', artistName: 'Diego Morales' },
    });
    render(
      <MeetingSelector
        meetings={[meeting]}
        signedArtists={ARTISTS}
        onSelectMeeting={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(
      screen.getByText(/A journalist is sitting on a story about Diego Morales\./)
    ).toBeInTheDocument();
    expect(screen.queryByText('Which artist is the story about?')).not.toBeInTheDocument();
  });

  it('Start Meeting selects the bound artist directly, skipping the picker', () => {
    const onSelectMeeting = vi.fn();
    const meeting = makeMeeting({
      boundArtist: { artistId: 'a2', artistName: 'Diego Morales' },
    });
    render(
      <MeetingSelector
        meetings={[meeting]}
        signedArtists={ARTISTS}
        onSelectMeeting={onSelectMeeting}
        onBack={vi.fn()}
      />
    );
    // Bound meeting: no "pick an artist" suffix on the CTA.
    fireEvent.click(screen.getByText('Start Meeting'));
    expect(onSelectMeeting).toHaveBeenCalledWith(meeting, 'a2');
    expect(screen.queryByTestId('console-artist-pick-a1')).not.toBeInTheDocument();
  });

  it('an unbound user_selected meeting still shows prompt_before_selection and the picker CTA', () => {
    const meeting = makeMeeting(); // auto_bind_artist authored but server attached no boundArtist
    render(
      <MeetingSelector
        meetings={[meeting]}
        signedArtists={ARTISTS}
        onSelectMeeting={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText(/Which artist is the story about\?/)).toBeInTheDocument();
    expect(screen.getByText('Start Meeting — pick an artist')).toBeInTheDocument();
  });
});
