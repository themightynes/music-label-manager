/**
 * Reactive global meetings — prompt placeholder rendering.
 *
 * A meeting with `target_scope: "global"` and a `reactive_trigger` fires
 * because a specific happening occurred (an artist's song charted, a release
 * went out). The server attaches that happening's names as `reactiveContext`
 * on the selected meeting — these tests prove both player-facing prompt
 * surfaces (MeetingSelector brief + DialogueInterface) render the REAL names
 * instead of literal `{artistName}` / `{songTitle}`, and that non-reactive
 * meetings render byte-identically to before.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MeetingSelector } from '../../client/src/components/executive-meetings/MeetingSelector';
import { DialogueInterface } from '../../client/src/components/executive-meetings/DialogueInterface';
import {
  ExecutiveCard,
  meetingDisplayName,
  meetingPreviewSnippet,
} from '../../client/src/components/executive-meetings/ExecutiveCard';
import type { Executive, RoleMeeting } from '../../shared/types/gameTypes';

afterEach(() => cleanup());

const LITERAL_PLACEHOLDER = /\{(artistName|songTitle)\}/;

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

describe('MeetingSelector — reactive prompt placeholders', () => {
  it('renders the triggering song title in a global reactive meeting brief', () => {
    const meeting = makeMeeting({
      id: 'chart_debut_one_hour_window',
      prompt: 'Twenty minutes after {songTitle} charted, the phones lit up.',
      reactiveContext: { trigger: 'chart_debut', artistName: 'Aurora', songTitle: 'Neon Nights' },
    });
    render(
      <MeetingSelector
        meetings={[meeting]}
        signedArtists={[]}
        onSelectMeeting={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(
      screen.getByText(/Twenty minutes after Neon Nights charted, the phones lit up\./)
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(LITERAL_PLACEHOLDER);
  });

  it('renders the triggering artist name in a global reactive meeting brief', () => {
    const meeting = makeMeeting({
      id: 'old_tweets_surface',
      prompt: "Someone dug up {artistName}'s old accounts.",
      reactiveContext: { trigger: 'release_out', artistName: 'Aurora' },
    });
    render(
      <MeetingSelector
        meetings={[meeting]}
        signedArtists={[]}
        onSelectMeeting={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText(/Someone dug up Aurora's old accounts\./)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(LITERAL_PLACEHOLDER);
  });

  it('falls back gracefully when the happening carries no song title — never literal braces', () => {
    const meeting = makeMeeting({
      prompt: 'Twenty minutes after {songTitle} charted.',
      reactiveContext: { trigger: 'chart_debut', artistName: 'Aurora' },
    });
    render(
      <MeetingSelector
        meetings={[meeting]}
        signedArtists={[]}
        onSelectMeeting={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText(/Twenty minutes after Aurora's song charted\./)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(LITERAL_PLACEHOLDER);
  });

  it('leaves a non-reactive global meeting brief unchanged', () => {
    const meeting = makeMeeting({ prompt: 'We can only push two initiatives next week.' });
    render(
      <MeetingSelector
        meetings={[meeting]}
        signedArtists={[]}
        onSelectMeeting={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(
      screen.getByText(/We can only push two initiatives next week\./)
    ).toBeInTheDocument();
  });
});

describe('Exec-card grid preview — reactive prompt placeholders (F4)', () => {
  // ExecutiveMeetings' prefetch builds each card's preview snippet via
  // meetingPreviewSnippet — these tests prove that path resolves placeholders
  // (same context source as the brief: the meeting's reactiveContext).

  it('meetingPreviewSnippet resolves {songTitle} against reactiveContext', () => {
    const meeting = makeMeeting({
      id: 'chart_debut_one_hour_window',
      prompt: 'Twenty minutes after {songTitle} charted, the phones lit up.',
      reactiveContext: { trigger: 'chart_debut', artistName: 'Aurora', songTitle: 'Neon Nights' },
    });
    const snippet = meetingPreviewSnippet(meeting);
    expect(snippet).toBe('Twenty minutes after Neon Nights charted, the phones lit up.');
    expect(snippet).not.toMatch(LITERAL_PLACEHOLDER);
  });

  it('meetingPreviewSnippet prefers prompt_before_selection and resolves {artistName}', () => {
    const meeting = makeMeeting({
      target_scope: 'user_selected',
      prompt: 'unused when prompt_before_selection exists',
      prompt_before_selection: "Someone dug up {artistName}'s old accounts.",
      reactiveContext: { trigger: 'release_out', artistName: 'Aurora' },
    } as Partial<RoleMeeting>);
    expect(meetingPreviewSnippet(meeting)).toBe("Someone dug up Aurora's old accounts.");
  });

  it('degrades via the utility fallback when the happening carries no song title', () => {
    const meeting = makeMeeting({
      prompt: 'Twenty minutes after {songTitle} charted.',
      reactiveContext: { trigger: 'chart_debut', artistName: 'Aurora' },
    });
    const snippet = meetingPreviewSnippet(meeting);
    expect(snippet).toBe("Twenty minutes after Aurora's song charted.");
    expect(snippet).not.toMatch(LITERAL_PLACEHOLDER);
  });

  it('renders no literal {songTitle} token on the executive card readout', () => {
    const meeting = makeMeeting({
      id: 'chart_debut_one_hour_window',
      prompt: 'Twenty minutes after {songTitle} charted, the phones lit up.',
      reactiveContext: { trigger: 'chart_debut', artistName: 'Aurora', songTitle: 'Neon Nights' },
    });
    const executive = { id: 'e-cmo', role: 'cmo', level: 1, mood: 50, loyalty: 50 } as unknown as Executive;
    render(
      <ExecutiveCard
        executive={executive}
        meetingPreview={{
          name: meetingDisplayName(meeting),
          snippet: meetingPreviewSnippet(meeting),
          moreCount: 0,
        }}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByTestId('meeting-preview-snippet-cmo')).toHaveTextContent(
      'Twenty minutes after Neon Nights charted'
    );
    expect(document.body.textContent).not.toMatch(LITERAL_PLACEHOLDER);
  });
});

describe('DialogueInterface — reactive prompt placeholders', () => {
  const dialogueFor = (prompt: string) => ({
    prompt,
    choices: [],
  });

  it('renders the triggering song title for a global reactive meeting', () => {
    render(
      <DialogueInterface
        dialogue={dialogueFor('Twenty minutes after {songTitle} charted, their manager called.')}
        onSelectChoice={vi.fn()}
        onBack={vi.fn()}
        targetScope="global"
        reactiveContext={{ artistName: 'Aurora', songTitle: 'Neon Nights' }}
      />
    );
    expect(
      screen.getByText(/Twenty minutes after Neon Nights charted, their manager called\./)
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(LITERAL_PLACEHOLDER);
  });

  it('renders the triggering artist name for a global reactive meeting', () => {
    render(
      <DialogueInterface
        dialogue={dialogueFor("Someone dug up {artistName}'s old accounts.")}
        onSelectChoice={vi.fn()}
        onBack={vi.fn()}
        targetScope="global"
        reactiveContext={{ artistName: 'Aurora' }}
      />
    );
    expect(screen.getByText(/Someone dug up Aurora's old accounts\./)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(LITERAL_PLACEHOLDER);
  });

  it('still prefers the player-picked artist (user_selected scope)', () => {
    render(
      <DialogueInterface
        dialogue={dialogueFor('Talk to {artistName} today.')}
        onSelectChoice={vi.fn()}
        onBack={vi.fn()}
        targetScope="user_selected"
        selectedArtistName="Nova"
      />
    );
    expect(screen.getByText(/Talk to Nova today\./)).toBeInTheDocument();
  });

  it('leaves a non-reactive placeholder-free prompt unchanged', () => {
    render(
      <DialogueInterface
        dialogue={dialogueFor('A plain prompt with no placeholders.')}
        onSelectChoice={vi.fn()}
        onBack={vi.fn()}
        targetScope="global"
      />
    );
    expect(screen.getByText(/A plain prompt with no placeholders\./)).toBeInTheDocument();
  });
});
