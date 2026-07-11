/**
 * Playtest feedback form tests (2026-07-11 recording surface).
 *
 * 1. Lockstep guard: the client form definition's section/knob ids must match
 *    the canonical id lists in @shared/api/contracts exactly and in order —
 *    the server writes the responses file keyed by those ids.
 * 2. Voice guard (helpTopics fork-E precedent): no engine numbers/multipliers
 *    in any label or copy. The markdown form complies; this keeps the
 *    on-screen mirror honest.
 * 3. Light render test of the exported PlaytestFeedbackForm component (no
 *    layout, no network): all sections render, single-tick exposure replaces
 *    the tick, multi-tick accumulates, feel radio and knob table report
 *    through onChange.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  PLAYTEST_SECTION_IDS,
  PLAYTEST_KNOB_IDS,
  buildEmptyPlaytestFeedbackResponses,
  PlaytestFeedbackResponsesSchema,
  type PlaytestFeedbackResponses,
} from '@shared/api/contracts';
import {
  PLAYTEST_FORM_SECTIONS,
  PLAYTEST_FORM_KNOBS,
  FORM_TITLE,
  FORM_INTRO,
  KNOB_SECTION_BLURB,
  PRIORITIES_SECTION_BLURB,
  ONE_KNOB_PROMPT,
  PULL_BACK_PROMPT,
  GUT_CHECK_PROMPT,
  ANYTHING_OFF_PROMPT,
} from '@/admin/playtestFeedbackForm';
import { PlaytestFeedbackForm } from '@/admin/PlaytestFeedbackPage';

const ALL_COPY = [
  FORM_TITLE,
  FORM_INTRO,
  KNOB_SECTION_BLURB,
  PRIORITIES_SECTION_BLURB,
  ONE_KNOB_PROMPT,
  PULL_BACK_PROMPT,
  GUT_CHECK_PROMPT,
  ANYTHING_OFF_PROMPT,
  ...PLAYTEST_FORM_SECTIONS.flatMap((s) => [
    s.title,
    s.blurb,
    s.exposurePrompt,
    ...s.exposureOptions.map((o) => o.label),
    ...s.designerQuestions,
  ]),
  ...PLAYTEST_FORM_KNOBS.map((k) => k.label),
].join('\n');

describe('playtestFeedbackForm — contract lockstep', () => {
  it('section ids match PLAYTEST_SECTION_IDS exactly and in order', () => {
    expect(PLAYTEST_FORM_SECTIONS.map((s) => s.id)).toEqual([...PLAYTEST_SECTION_IDS]);
  });

  it('knob ids match PLAYTEST_KNOB_IDS exactly and in order', () => {
    expect(PLAYTEST_FORM_KNOBS.map((k) => k.id)).toEqual([...PLAYTEST_KNOB_IDS]);
  });

  it('section numbers are 1..11 in order and §7–§9 are the multi-tick sections', () => {
    expect(PLAYTEST_FORM_SECTIONS.map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const multi = PLAYTEST_FORM_SECTIONS.filter((s) => s.exposureMulti).map((s) => s.number);
    expect(multi).toEqual([7, 8, 9]);
  });

  it('every section has at least one designer question and exposure option ids are unique', () => {
    for (const section of PLAYTEST_FORM_SECTIONS) {
      expect(section.designerQuestions.length).toBeGreaterThan(0);
      const ids = section.exposureOptions.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('the empty default document parses against the response schema', () => {
    const empty = buildEmptyPlaytestFeedbackResponses();
    expect(() => PlaytestFeedbackResponsesSchema.parse(empty)).not.toThrow();
  });
});

describe('playtestFeedbackForm — voice guards (no engine numbers)', () => {
  it('has no multiplier-number leakage (e.g. "2x", "1.5×")', () => {
    expect(ALL_COPY).not.toMatch(/\d+(\.\d+)?\s*[x×]/i);
  });

  it('has no percentages anywhere', () => {
    expect(ALL_COPY).not.toContain('%');
  });
});

describe('PlaytestFeedbackForm — render + interaction', () => {
  function renderForm(initial?: PlaytestFeedbackResponses) {
    const onChange = vi.fn();
    const responses = initial ?? buildEmptyPlaytestFeedbackResponses();
    render(<PlaytestFeedbackForm responses={responses} onChange={onChange} />);
    return { onChange, responses };
  }

  it('renders all 11 mechanic sections plus the knob table and priorities sections', () => {
    renderForm();
    for (const section of PLAYTEST_FORM_SECTIONS) {
      expect(screen.getByTestId(`section-${section.id}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId('section-knob-strength')).toBeInTheDocument();
    expect(screen.getByTestId('section-priorities')).toBeInTheDocument();
  });

  it('single-tick exposure replaces the previous tick (one tick per question)', () => {
    const initial = buildEmptyPlaytestFeedbackResponses();
    initial.sections.flop_penalty = {
      exposure: ['natural'],
      feel: null,
      anythingOff: '',
      designerAnswers: [],
    };
    const { onChange } = renderForm(initial);

    fireEvent.click(screen.getByLabelText('Never saw it fire'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as PlaytestFeedbackResponses;
    expect(next.sections.flop_penalty.exposure).toEqual(['never']);
  });

  it('multi-tick exposure accumulates ticks (§7 "tick all you saw")', () => {
    const initial = buildEmptyPlaytestFeedbackResponses();
    initial.sections.awareness_surfacing = {
      exposure: ['hottest_track'],
      feel: null,
      anythingOff: '',
      designerAnswers: [],
    };
    const { onChange } = renderForm(initial);

    fireEvent.click(screen.getByLabelText('The buzz section on a release card'));

    const next = onChange.mock.calls[0][0] as PlaytestFeedbackResponses;
    expect(next.sections.awareness_surfacing.exposure).toEqual([
      'hottest_track',
      'release_buzz_section',
    ]);
  });

  it('selecting a knob strength reports through onChange', () => {
    const { onChange } = renderForm();

    fireEvent.click(screen.getByLabelText('Side-event frequency — Too strong'));

    const next = onChange.mock.calls[0][0] as PlaytestFeedbackResponses;
    expect(next.knobStrength.side_event_frequency).toBe('too_strong');
  });

  it('typing a top priority reports through onChange', () => {
    const { onChange } = renderForm();

    fireEvent.change(screen.getByLabelText('Priority 1'), {
      target: { value: 'make breakthroughs louder' },
    });

    const next = onChange.mock.calls[0][0] as PlaytestFeedbackResponses;
    expect(next.topPriorities[0]).toBe('make breakthroughs louder');
  });
});
