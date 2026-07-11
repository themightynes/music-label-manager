/**
 * PlaytestFeedbackResponsesSchema contract tests (events-config-contract
 * precedent). Guards the recording-surface document shape for the
 * 2026-07-11 playtest form: defaults fill every field, the feel/strength
 * enums are closed, and topPriorities is exactly three slots.
 */
import { describe, it, expect } from 'vitest';
import {
  PlaytestFeedbackResponsesSchema,
  buildEmptyPlaytestFeedbackResponses,
  PLAYTEST_FEEDBACK_FORM_ID,
} from '@shared/api/contracts';

describe('PlaytestFeedbackResponsesSchema', () => {
  it('parses an empty object into the fully-defaulted document', () => {
    const parsed = PlaytestFeedbackResponsesSchema.parse({});
    expect(parsed.formId).toBe(PLAYTEST_FEEDBACK_FORM_ID);
    expect(parsed.savedAt).toBeNull();
    expect(parsed.sections).toEqual({});
    expect(parsed.topPriorities).toEqual(['', '', '']);
    expect(parsed.oneKnobChange).toBe('');
  });

  it('round-trips the canonical empty default unchanged', () => {
    const empty = buildEmptyPlaytestFeedbackResponses();
    expect(PlaytestFeedbackResponsesSchema.parse(empty)).toEqual(empty);
  });

  it('rejects an out-of-scale feel rating', () => {
    const bad = {
      sections: {
        flop_penalty: { exposure: [], feel: 'transcendent', anythingOff: '', designerAnswers: [] },
      },
    };
    expect(() => PlaytestFeedbackResponsesSchema.parse(bad)).toThrow();
  });

  it('rejects an out-of-scale knob strength', () => {
    const bad = { knobStrength: { side_event_frequency: 'way_too_strong' } };
    expect(() => PlaytestFeedbackResponsesSchema.parse(bad)).toThrow();
  });

  it('rejects topPriorities that are not exactly three entries', () => {
    expect(() => PlaytestFeedbackResponsesSchema.parse({ topPriorities: ['only one'] })).toThrow();
  });

  it('rejects a foreign formId', () => {
    expect(() => PlaytestFeedbackResponsesSchema.parse({ formId: 'some-other-form' })).toThrow();
  });
});
