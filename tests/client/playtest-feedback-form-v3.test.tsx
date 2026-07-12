/**
 * Playtest feedback form tests — Round 3 (2026-07-12 delegation recording surface).
 *
 * Mirrors the round-2 suite (tests/client/playtest-feedback-form-v2.test.tsx):
 * 1. Lockstep guard: the V3 form definition's section/knob ids must match
 *    PLAYTEST_SECTION_IDS_V3 / PLAYTEST_KNOB_IDS_V3 exactly and in order.
 * 2. Voice guard (helpTopics fork-E precedent): no engine numbers/multipliers
 *    in any label or copy.
 * 3. Light render test of PlaytestFeedbackForm handed the V3 definition.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  PLAYTEST_SECTION_IDS_V3,
  PLAYTEST_KNOB_IDS_V3,
  PLAYTEST_FEEDBACK_FORM_ID_V3,
  buildEmptyPlaytestFeedbackResponsesV3,
  PlaytestFeedbackResponsesV3Schema,
  type AnyPlaytestFeedbackResponses,
} from '@shared/api/contracts';
import {
  PLAYTEST_FORM_V3,
  PLAYTEST_FORM_SECTIONS_V3,
  PLAYTEST_FORM_KNOBS_V3,
} from '@/admin/playtestFeedbackFormV3';
import { PlaytestFeedbackForm } from '@/admin/PlaytestFeedbackPage';

const ALL_COPY = [
  PLAYTEST_FORM_V3.title,
  PLAYTEST_FORM_V3.intro,
  PLAYTEST_FORM_V3.knobSectionTitle,
  PLAYTEST_FORM_V3.knobSectionBlurb,
  PLAYTEST_FORM_V3.oneKnobPrompt,
  PLAYTEST_FORM_V3.prioritiesSectionTitle,
  PLAYTEST_FORM_V3.prioritiesSectionBlurb,
  PLAYTEST_FORM_V3.pullBackPrompt,
  PLAYTEST_FORM_V3.gutCheckPrompt,
  PLAYTEST_FORM_V3.anythingOffPrompt,
  ...PLAYTEST_FORM_SECTIONS_V3.flatMap((s) => [
    s.title,
    s.blurb,
    s.exposurePrompt,
    ...s.exposureOptions.map((o) => o.label),
    ...s.designerQuestions,
  ]),
  ...PLAYTEST_FORM_KNOBS_V3.map((k) => k.label),
].join('\n');

describe('playtestFeedbackFormV3 — contract lockstep', () => {
  it('section ids match PLAYTEST_SECTION_IDS_V3 exactly and in order', () => {
    expect(PLAYTEST_FORM_SECTIONS_V3.map((s) => s.id)).toEqual([...PLAYTEST_SECTION_IDS_V3]);
  });

  it('knob ids match PLAYTEST_KNOB_IDS_V3 exactly and in order', () => {
    expect(PLAYTEST_FORM_KNOBS_V3.map((k) => k.id)).toEqual([...PLAYTEST_KNOB_IDS_V3]);
  });

  it('the bundle formId matches the canonical V3 form id', () => {
    expect(PLAYTEST_FORM_V3.formId).toBe(PLAYTEST_FEEDBACK_FORM_ID_V3);
  });

  it('section numbers are 1..8 in order', () => {
    expect(PLAYTEST_FORM_SECTIONS_V3.map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('every section has at least one designer question and exposure option ids are unique', () => {
    for (const section of PLAYTEST_FORM_SECTIONS_V3) {
      expect(section.designerQuestions.length).toBeGreaterThan(0);
      const ids = section.exposureOptions.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('the empty V3 default document parses against the V3 response schema', () => {
    const empty = buildEmptyPlaytestFeedbackResponsesV3();
    expect(() => PlaytestFeedbackResponsesV3Schema.parse(empty)).not.toThrow();
    expect(Object.keys(empty.sections)).toEqual([...PLAYTEST_SECTION_IDS_V3]);
    expect(Object.keys(empty.knobStrength)).toEqual([...PLAYTEST_KNOB_IDS_V3]);
  });
});

describe('playtestFeedbackFormV3 — voice guards (no engine numbers)', () => {
  it('has no multiplier-number leakage (e.g. "2x", "1.5×")', () => {
    expect(ALL_COPY).not.toMatch(/\d+(\.\d+)?\s*[x×]/i);
  });

  it('has no percentages anywhere', () => {
    expect(ALL_COPY).not.toContain('%');
  });
});

describe('PlaytestFeedbackForm — render + interaction (V3 definition)', () => {
  function renderForm(initial?: AnyPlaytestFeedbackResponses) {
    const onChange = vi.fn();
    const responses = initial ?? buildEmptyPlaytestFeedbackResponsesV3();
    render(<PlaytestFeedbackForm form={PLAYTEST_FORM_V3} responses={responses} onChange={onChange} />);
    return { onChange, responses };
  }

  it('renders all 8 mechanic sections plus the knob table and priorities sections', () => {
    renderForm();
    for (const section of PLAYTEST_FORM_SECTIONS_V3) {
      expect(screen.getByTestId(`section-${section.id}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId('section-knob-strength')).toBeInTheDocument();
    expect(screen.getByTestId('section-priorities')).toBeInTheDocument();
  });

  it('numbers the knob and priorities sections after the last mechanic section', () => {
    renderForm();
    expect(screen.getByText('9.')).toBeInTheDocument();
    expect(screen.getByText('10.')).toBeInTheDocument();
  });

  it('single-tick exposure replaces the previous tick (one tick per question)', () => {
    const initial = buildEmptyPlaytestFeedbackResponsesV3();
    initial.sections.auto_vs_neglect_legibility = {
      exposure: ['used_auto'],
      feel: null,
      anythingOff: '',
      designerAnswers: [],
    };
    const { onChange } = renderForm(initial);

    fireEvent.click(screen.getByLabelText("Couldn't tell the difference between AUTO and neglect from the results"));

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as AnyPlaytestFeedbackResponses;
    expect(next.sections.auto_vs_neglect_legibility.exposure).toEqual(['couldnt_tell']);
  });

  it('multi-tick exposure accumulates ticks (§1 autonomous spend "tick all you saw")', () => {
    const initial = buildEmptyPlaytestFeedbackResponsesV3();
    initial.sections.autonomous_spend_feel = {
      exposure: ['saw_money_spent'],
      feel: null,
      anythingOff: '',
      designerAnswers: [],
    };
    const { onChange } = renderForm(initial);

    fireEvent.click(screen.getByLabelText('Noticed the "While you were out" group in the week summary'));

    const next = onChange.mock.calls[0][0] as AnyPlaytestFeedbackResponses;
    expect(next.sections.autonomous_spend_feel.exposure).toEqual([
      'saw_money_spent',
      'saw_while_you_were_out',
    ]);
  });

  it('selecting a knob strength reports through onChange', () => {
    const { onChange } = renderForm();

    fireEvent.click(screen.getByLabelText('Escalation frequency — Too strong'));

    const next = onChange.mock.calls[0][0] as AnyPlaytestFeedbackResponses;
    expect(next.knobStrength.escalation_frequency).toBe('too_strong');
  });

  it('typing a top priority reports through onChange', () => {
    const { onChange } = renderForm();

    fireEvent.change(screen.getByLabelText('Priority 1'), {
      target: { value: 'buzz hidden-at-zero still open' },
    });

    const next = onChange.mock.calls[0][0] as AnyPlaytestFeedbackResponses;
    expect(next.topPriorities[0]).toBe('buzz hidden-at-zero still open');
  });
});
