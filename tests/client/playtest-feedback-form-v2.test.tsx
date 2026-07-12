/**
 * Playtest feedback form tests — Round 2 (2026-07-12 recording surface).
 *
 * Mirrors the round-1 suite (tests/client/playtest-feedback-form.test.tsx):
 * 1. Lockstep guard: the V2 form definition's section/knob ids must match
 *    PLAYTEST_SECTION_IDS_V2 / PLAYTEST_KNOB_IDS_V2 exactly and in order.
 * 2. Voice guard (helpTopics fork-E precedent): no engine numbers/multipliers
 *    in any label or copy.
 * 3. Follow-through guard: every round-1 "too weak" verdict has a v2 section
 *    that explicitly frames itself as a round-one follow-up.
 * 4. Light render test of PlaytestFeedbackForm handed the V2 definition.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  PLAYTEST_SECTION_IDS_V2,
  PLAYTEST_KNOB_IDS_V2,
  PLAYTEST_FEEDBACK_FORM_ID_V2,
  buildEmptyPlaytestFeedbackResponsesV2,
  PlaytestFeedbackResponsesV2Schema,
  type AnyPlaytestFeedbackResponses,
} from '@shared/api/contracts';
import {
  PLAYTEST_FORM_V2,
  PLAYTEST_FORM_SECTIONS_V2,
  PLAYTEST_FORM_KNOBS_V2,
} from '@/admin/playtestFeedbackFormV2';
import { PlaytestFeedbackForm } from '@/admin/PlaytestFeedbackPage';

const ALL_COPY = [
  PLAYTEST_FORM_V2.title,
  PLAYTEST_FORM_V2.intro,
  PLAYTEST_FORM_V2.knobSectionTitle,
  PLAYTEST_FORM_V2.knobSectionBlurb,
  PLAYTEST_FORM_V2.oneKnobPrompt,
  PLAYTEST_FORM_V2.prioritiesSectionTitle,
  PLAYTEST_FORM_V2.prioritiesSectionBlurb,
  PLAYTEST_FORM_V2.pullBackPrompt,
  PLAYTEST_FORM_V2.gutCheckPrompt,
  PLAYTEST_FORM_V2.anythingOffPrompt,
  ...PLAYTEST_FORM_SECTIONS_V2.flatMap((s) => [
    s.title,
    s.blurb,
    s.exposurePrompt,
    ...s.exposureOptions.map((o) => o.label),
    ...s.designerQuestions,
  ]),
  ...PLAYTEST_FORM_KNOBS_V2.map((k) => k.label),
].join('\n');

describe('playtestFeedbackFormV2 — contract lockstep', () => {
  it('section ids match PLAYTEST_SECTION_IDS_V2 exactly and in order', () => {
    expect(PLAYTEST_FORM_SECTIONS_V2.map((s) => s.id)).toEqual([...PLAYTEST_SECTION_IDS_V2]);
  });

  it('knob ids match PLAYTEST_KNOB_IDS_V2 exactly and in order', () => {
    expect(PLAYTEST_FORM_KNOBS_V2.map((k) => k.id)).toEqual([...PLAYTEST_KNOB_IDS_V2]);
  });

  it('the bundle formId matches the canonical V2 form id', () => {
    expect(PLAYTEST_FORM_V2.formId).toBe(PLAYTEST_FEEDBACK_FORM_ID_V2);
  });

  it('section numbers are 1..10 in order and §1–§3 + §9 are the multi-tick sections', () => {
    expect(PLAYTEST_FORM_SECTIONS_V2.map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const multi = PLAYTEST_FORM_SECTIONS_V2.filter((s) => s.exposureMulti).map((s) => s.number);
    expect(multi).toEqual([1, 2, 3, 9]);
  });

  it('every section has at least one designer question and exposure option ids are unique', () => {
    for (const section of PLAYTEST_FORM_SECTIONS_V2) {
      expect(section.designerQuestions.length).toBeGreaterThan(0);
      const ids = section.exposureOptions.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('the empty V2 default document parses against the V2 response schema', () => {
    const empty = buildEmptyPlaytestFeedbackResponsesV2();
    expect(() => PlaytestFeedbackResponsesV2Schema.parse(empty)).not.toThrow();
    expect(Object.keys(empty.sections)).toEqual([...PLAYTEST_SECTION_IDS_V2]);
    expect(Object.keys(empty.knobStrength)).toEqual([...PLAYTEST_KNOB_IDS_V2]);
  });
});

describe('playtestFeedbackFormV2 — voice guards (no engine numbers)', () => {
  it('has no multiplier-number leakage (e.g. "2x", "1.5×")', () => {
    expect(ALL_COPY).not.toMatch(/\d+(\.\d+)?\s*[x×]/i);
  });

  it('has no percentages anywhere', () => {
    expect(ALL_COPY).not.toContain('%');
  });
});

describe('playtestFeedbackFormV2 — round-1 follow-through', () => {
  // Every round-1 "too weak" verdict (flop penalty, mood variance, energy,
  // meeting relevance) plus the two one-knob complaints (rep pacing, CC) must
  // have a v2 section that explicitly frames itself as a round-one follow-up
  // — the whole point of round 2 is closing those loops.
  const FOLLOW_THROUGH_SECTION_IDS = [
    'energy_lifecycle',
    'mood_outcomes',
    'mood_recording_variance_retest',
    'flop_drama',
    'reputation_pacing',
    'creative_capital_income',
    'meeting_relevance_whynow',
  ];

  it.each(FOLLOW_THROUGH_SECTION_IDS)('section %s references round one', (id) => {
    const section = PLAYTEST_FORM_SECTIONS_V2.find((s) => s.id === id);
    expect(section).toBeDefined();
    const copy = [section!.blurb, ...section!.designerQuestions].join('\n');
    expect(copy.toLowerCase()).toMatch(/round[- ]one/);
  });

  it('the crisis section quotes the round-1 "OH MY" ask', () => {
    const crisis = PLAYTEST_FORM_SECTIONS_V2.find((s) => s.id === 'mandatory_crisis_events');
    expect(crisis).toBeDefined();
    expect(crisis!.designerQuestions.join('\n')).toContain('OH MY');
  });
});

describe('PlaytestFeedbackForm — render + interaction (V2 definition)', () => {
  function renderForm(initial?: AnyPlaytestFeedbackResponses) {
    const onChange = vi.fn();
    const responses = initial ?? buildEmptyPlaytestFeedbackResponsesV2();
    render(<PlaytestFeedbackForm form={PLAYTEST_FORM_V2} responses={responses} onChange={onChange} />);
    return { onChange, responses };
  }

  it('renders all 10 mechanic sections plus the knob table and priorities sections', () => {
    renderForm();
    for (const section of PLAYTEST_FORM_SECTIONS_V2) {
      expect(screen.getByTestId(`section-${section.id}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId('section-knob-strength')).toBeInTheDocument();
    expect(screen.getByTestId('section-priorities')).toBeInTheDocument();
  });

  it('numbers the knob and priorities sections after the last mechanic section', () => {
    renderForm();
    expect(screen.getByText('11.')).toBeInTheDocument();
    expect(screen.getByText('12.')).toBeInTheDocument();
  });

  it('single-tick exposure replaces the previous tick (one tick per question)', () => {
    const initial = buildEmptyPlaytestFeedbackResponsesV2();
    initial.sections.flop_drama = {
      exposure: ['natural'],
      feel: null,
      anythingOff: '',
      designerAnswers: [],
    };
    const { onChange } = renderForm(initial);

    fireEvent.click(screen.getByLabelText('Never flopped this run'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as AnyPlaytestFeedbackResponses;
    expect(next.sections.flop_drama.exposure).toEqual(['never']);
  });

  it('multi-tick exposure accumulates ticks (§1 crisis "tick all you saw")', () => {
    const initial = buildEmptyPlaytestFeedbackResponsesV2();
    initial.sections.mandatory_crisis_events = {
      exposure: ['crisis_card'],
      feel: null,
      anythingOff: '',
      designerAnswers: [],
    };
    const { onChange } = renderForm(initial);

    fireEvent.click(screen.getByLabelText('The advance blocked until I resolved it'));

    const next = onChange.mock.calls[0][0] as AnyPlaytestFeedbackResponses;
    expect(next.sections.mandatory_crisis_events.exposure).toEqual([
      'crisis_card',
      'advance_blocked',
    ]);
  });

  it('selecting a knob strength reports through onChange', () => {
    const { onChange } = renderForm();

    fireEvent.click(screen.getByLabelText('Crisis frequency — Too strong'));

    const next = onChange.mock.calls[0][0] as AnyPlaytestFeedbackResponses;
    expect(next.knobStrength.crisis_frequency).toBe('too_strong');
  });

  it('typing a top priority reports through onChange', () => {
    const { onChange } = renderForm();

    fireEvent.change(screen.getByLabelText('Priority 1'), {
      target: { value: 'crisis slot cost feels right, keep it' },
    });

    const next = onChange.mock.calls[0][0] as AnyPlaytestFeedbackResponses;
    expect(next.topPriorities[0]).toBe('crisis slot cost feels right, keep it');
  });
});
