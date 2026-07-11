/**
 * Hype-board UX Task 4 — The Board's open-channel state previews WHAT is
 * waiting: the meeting name + a one-line prompt snippet (prefetched by the
 * existing sit-out/urgency sweep — zero new requests).
 *
 * Precedence contract: the preview ONLY replaces the generic "Has something
 * for you" open state — busy/queued/sit-out/no-slots status copy always wins.
 * The reactive TRIGGER ("why now" copy) still reveals only on open; the
 * urgency dot stays a content-free pulse (ExecutiveCard.urgency-dot.test.tsx).
 */
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { ExecutiveCard, meetingDisplayName, snippetOf, MEETING_SNIPPET_MAX } from '../ExecutiveCard';
import type { Executive } from '../../../../../shared/types/gameTypes';

afterEach(() => cleanup());

function exec(role = 'cmo'): Executive {
  return { id: `e-${role}`, role, level: 1, mood: 50, loyalty: 50 } as any;
}

const preview = {
  name: 'CMO: Brand Crossroads',
  snippet: 'A lifestyle brand wants your artist for a national campaign…',
  moreCount: 1,
};

describe('ExecutiveCard — meeting preview (Task 4)', () => {
  it('previews the waiting meeting name + prompt snippet in the open state', () => {
    render(<ExecutiveCard executive={exec()} meetingPreview={preview} onSelect={vi.fn()} />);
    const readout = screen.getByTestId('status-readout-cmo');
    expect(readout).toHaveTextContent('CMO: Brand Crossroads');
    expect(screen.getByTestId('meeting-preview-snippet-cmo')).toHaveTextContent(
      'A lifestyle brand wants your artist'
    );
    expect(readout).toHaveTextContent('+1 more brief');
    expect(readout).not.toHaveTextContent('Has something for you');
  });

  it('falls back to the generic open copy when no preview was prefetched', () => {
    render(<ExecutiveCard executive={exec()} onSelect={vi.fn()} />);
    expect(screen.getByTestId('status-readout-cmo')).toHaveTextContent('Has something for you');
  });

  it('queued status wins over the preview', () => {
    render(<ExecutiveCard executive={exec()} meetingPreview={preview} queued onSelect={vi.fn()} />);
    const readout = screen.getByTestId('status-readout-cmo');
    expect(readout).toHaveTextContent('Meeting queued for this week');
    expect(readout).not.toHaveTextContent('Brand Crossroads');
  });

  it('sit-out status wins over the preview', () => {
    render(<ExecutiveCard executive={exec()} meetingPreview={preview} sitOut onSelect={vi.fn()} />);
    const readout = screen.getByTestId('status-readout-cmo');
    expect(readout).toHaveTextContent('Nothing needs their call this week');
    expect(readout).not.toHaveTextContent('Brand Crossroads');
  });

  it('no-slots status wins over the preview', () => {
    render(
      <ExecutiveCard executive={exec()} meetingPreview={preview} noSlots disabled onSelect={vi.fn()} />
    );
    const readout = screen.getByTestId('status-readout-cmo');
    expect(readout).toHaveTextContent('No focus slots remaining');
    expect(readout).not.toHaveTextContent('Brand Crossroads');
  });

  it('the CEO master strip previews the meeting name (narrow strip — name only)', () => {
    render(<ExecutiveCard executive={exec('ceo')} meetingPreview={preview} onSelect={vi.fn()} />);
    expect(screen.getByTestId('meeting-preview-ceo')).toHaveTextContent('CMO: Brand Crossroads');
  });

  it('the CEO strip suppresses the preview when queued or sitting out', () => {
    render(
      <ExecutiveCard executive={exec('ceo')} meetingPreview={preview} queued onSelect={vi.fn()} />
    );
    expect(screen.queryByTestId('meeting-preview-ceo')).toBeNull();
    cleanup();
    render(
      <ExecutiveCard executive={exec('ceo')} meetingPreview={preview} sitOut onSelect={vi.fn()} />
    );
    expect(screen.queryByTestId('meeting-preview-ceo')).toBeNull();
  });
});

describe('meetingDisplayName / snippetOf (preview helpers)', () => {
  it('prefers the authored name, else prettifies the id (MeetingSelector rule)', () => {
    expect(meetingDisplayName({ id: 'cmo_brand', name: 'CMO: Brand Crossroads' })).toBe(
      'CMO: Brand Crossroads'
    );
    expect(meetingDisplayName({ id: 'brand_crossroads' })).toBe('Brand Crossroads');
  });

  it('returns short prompts untouched and truncates long ones at a word boundary', () => {
    expect(snippetOf('Short prompt.')).toBe('Short prompt.');
    const long = 'word '.repeat(40).trim();
    const snippet = snippetOf(long);
    expect(snippet.length).toBeLessThanOrEqual(MEETING_SNIPPET_MAX + 1); // +1 for the ellipsis
    expect(snippet.endsWith('…')).toBe(true);
    expect(snippet).not.toMatch(/\swor…$/); // no mid-word cut
    expect(snippetOf(undefined)).toBe('');
  });
});
