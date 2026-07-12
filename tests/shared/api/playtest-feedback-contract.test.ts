/**
 * PlaytestFeedbackResponsesSchema contract tests (events-config-contract
 * precedent). Guards the recording-surface document shape for the
 * 2026-07-11 playtest form: defaults fill every field, the feel/strength
 * enums are closed, and topPriorities is exactly three slots.
 *
 * Round 2 (2026-07-12) adds: the V2 schema (same shape, V2 formId literal),
 * the endpoint union that routes by formId, the fixed two-entry form
 * registry, and a loadability guard for the round-1 historical responses
 * file (when present on disk).
 *
 * Round 3 (2026-07-12-delegation) adds: the V3 schema, the now-three-entry
 * registry (V3 active), and a loadability guard for the round-2 historical
 * responses file.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import {
  PlaytestFeedbackResponsesSchema,
  PlaytestFeedbackResponsesV2Schema,
  PlaytestFeedbackResponsesV3Schema,
  AnyPlaytestFeedbackResponsesSchema,
  buildEmptyPlaytestFeedbackResponses,
  buildEmptyPlaytestFeedbackResponsesV2,
  buildEmptyPlaytestFeedbackResponsesV3,
  PLAYTEST_FEEDBACK_FORM_ID,
  PLAYTEST_FEEDBACK_FORM_ID_V2,
  PLAYTEST_FEEDBACK_FORM_ID_V3,
  PLAYTEST_FORM_REGISTRY,
  ACTIVE_PLAYTEST_FORM_ID,
  isPlaytestFormId,
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

describe('PlaytestFeedbackResponsesV2Schema (round 2)', () => {
  it('parses an empty object into a V2-defaulted document', () => {
    const parsed = PlaytestFeedbackResponsesV2Schema.parse({});
    expect(parsed.formId).toBe(PLAYTEST_FEEDBACK_FORM_ID_V2);
    expect(parsed.savedAt).toBeNull();
    expect(parsed.topPriorities).toEqual(['', '', '']);
  });

  it('round-trips the canonical empty V2 default unchanged', () => {
    const empty = buildEmptyPlaytestFeedbackResponsesV2();
    expect(PlaytestFeedbackResponsesV2Schema.parse(empty)).toEqual(empty);
  });

  it('rejects the V1 formId (each round is its own document)', () => {
    expect(() =>
      PlaytestFeedbackResponsesV2Schema.parse({ formId: PLAYTEST_FEEDBACK_FORM_ID })
    ).toThrow();
  });

  it('shares the closed feel scale with V1', () => {
    const bad = {
      sections: {
        flop_drama: { exposure: [], feel: 'transcendent', anythingOff: '', designerAnswers: [] },
      },
    };
    expect(() => PlaytestFeedbackResponsesV2Schema.parse(bad)).toThrow();
  });
});

describe('PlaytestFeedbackResponsesV3Schema (round 3)', () => {
  it('parses an empty object into a V3-defaulted document', () => {
    const parsed = PlaytestFeedbackResponsesV3Schema.parse({});
    expect(parsed.formId).toBe(PLAYTEST_FEEDBACK_FORM_ID_V3);
    expect(parsed.savedAt).toBeNull();
    expect(parsed.topPriorities).toEqual(['', '', '']);
  });

  it('round-trips the canonical empty V3 default unchanged', () => {
    const empty = buildEmptyPlaytestFeedbackResponsesV3();
    expect(PlaytestFeedbackResponsesV3Schema.parse(empty)).toEqual(empty);
  });

  it('rejects the V2 formId (each round is its own document)', () => {
    expect(() =>
      PlaytestFeedbackResponsesV3Schema.parse({ formId: PLAYTEST_FEEDBACK_FORM_ID_V2 })
    ).toThrow();
  });
});

describe('AnyPlaytestFeedbackResponsesSchema — formId routing', () => {
  it('routes a document with no formId to the ACTIVE (v3) form', () => {
    const parsed = AnyPlaytestFeedbackResponsesSchema.parse({});
    expect(parsed.formId).toBe(ACTIVE_PLAYTEST_FORM_ID);
    expect(ACTIVE_PLAYTEST_FORM_ID).toBe(PLAYTEST_FEEDBACK_FORM_ID_V3);
  });

  it('still parses an explicit V1 document (historical record stays loadable)', () => {
    const v1 = buildEmptyPlaytestFeedbackResponses();
    const parsed = AnyPlaytestFeedbackResponsesSchema.parse(v1);
    expect(parsed.formId).toBe(PLAYTEST_FEEDBACK_FORM_ID);
  });

  it('still parses an explicit V2 document (historical record stays loadable)', () => {
    const v2 = buildEmptyPlaytestFeedbackResponsesV2();
    const parsed = AnyPlaytestFeedbackResponsesSchema.parse(v2);
    expect(parsed.formId).toBe(PLAYTEST_FEEDBACK_FORM_ID_V2);
  });

  it('rejects a formId outside the fixed allowlist', () => {
    expect(() =>
      AnyPlaytestFeedbackResponsesSchema.parse({ formId: 'playtest-feedback-2027-01-01' })
    ).toThrow();
    expect(isPlaytestFormId('playtest-feedback-2027-01-01')).toBe(false);
  });

  it('the registry holds exactly the three known form ids, active (v3) included', () => {
    expect(Object.keys(PLAYTEST_FORM_REGISTRY).sort()).toEqual(
      [PLAYTEST_FEEDBACK_FORM_ID, PLAYTEST_FEEDBACK_FORM_ID_V2, PLAYTEST_FEEDBACK_FORM_ID_V3].sort()
    );
    expect(isPlaytestFormId(PLAYTEST_FEEDBACK_FORM_ID)).toBe(true);
    expect(isPlaytestFormId(PLAYTEST_FEEDBACK_FORM_ID_V2)).toBe(true);
    expect(isPlaytestFormId(PLAYTEST_FEEDBACK_FORM_ID_V3)).toBe(true);
  });
});

describe('round-1 responses file — historical record stays loadable', () => {
  // The real round-1 responses file lives on the owner's machine (written at
  // runtime by the admin page; not committed). When it is present, it must
  // keep parsing against the V1 branch of the union — this is the regression
  // tripwire for any future schema change that would strand the history.
  const v1FilePath = path.join(
    process.cwd(),
    'docs',
    '01-planning',
    'playtest-feedback-2026-07-11.responses.json'
  );

  it.skipIf(!existsSync(v1FilePath))('parses against the union with the V1 formId', () => {
    const raw = JSON.parse(readFileSync(v1FilePath, 'utf8'));
    const parsed = AnyPlaytestFeedbackResponsesSchema.parse(raw);
    expect(parsed.formId).toBe(PLAYTEST_FEEDBACK_FORM_ID);
  });
});

describe('round-2 responses file — historical record stays loadable', () => {
  const v2FilePath = path.join(
    process.cwd(),
    'docs',
    '01-planning',
    'playtest-feedback-2026-07-12.responses.json'
  );

  it.skipIf(!existsSync(v2FilePath))('parses against the union with the V2 formId', () => {
    const raw = JSON.parse(readFileSync(v2FilePath, 'utf8'));
    const parsed = AnyPlaytestFeedbackResponsesSchema.parse(raw);
    expect(parsed.formId).toBe(PLAYTEST_FEEDBACK_FORM_ID_V2);
  });
});
