/**
 * Tier 2 (PR-2) — AutoSelectReviewPanel "why now" reason line.
 *
 * Same shared formatter/render contract as MeetingSelector: a row whose
 * meeting carries `reactiveContext` gets the reason line; a normal row
 * doesn't.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { AutoSelectReviewPanel } from '../../client/src/components/executive-meetings/AutoSelectReviewPanel';
import type { RoleMeeting, DialogueChoice, Executive } from '../../shared/types/gameTypes';

afterEach(() => cleanup());

function makeOption(meetingOverrides: Partial<RoleMeeting> = {}) {
  const executive: Executive = { id: 'cmo', role: 'cmo', level: 1, mood: 50, loyalty: 50 } as Executive;
  const meeting: RoleMeeting = {
    id: 'test_meeting',
    name: 'Test Meeting',
    prompt: 'A generic prompt.',
    target_scope: 'global',
    choices: [],
    ...meetingOverrides,
  } as RoleMeeting;
  const choice: DialogueChoice = {
    id: 'a',
    label: 'Choice A',
    effects_immediate: {},
    effects_delayed: {},
  } as DialogueChoice;
  return { executive, meeting, choice };
}

describe('AutoSelectReviewPanel — why-now line', () => {
  it('renders the why-now line for a row whose meeting carries reactiveContext', () => {
    const option = makeOption({
      reactiveContext: { trigger: 'recent_signing', artistName: 'Jaxon' },
    });
    render(
      <AutoSelectReviewPanel
        options={[option]}
        onConfirmAll={vi.fn()}
        onCancel={vi.fn()}
        onOverrideRow={vi.fn()}
      />
    );
    expect(screen.getByTestId('why-now-line')).toHaveTextContent('Because Jaxon signed last week');
  });

  it('omits the why-now line for a normal (non-reactive) row', () => {
    const option = makeOption();
    render(
      <AutoSelectReviewPanel
        options={[option]}
        onConfirmAll={vi.fn()}
        onCancel={vi.fn()}
        onOverrideRow={vi.fn()}
      />
    );
    expect(screen.queryByTestId('why-now-line')).not.toBeInTheDocument();
  });
});
