/**
 * MacPoolReviewResponsesSchema contract tests (playtest-feedback-contract
 * precedent). The v3 Mac pool CONTENT-REVIEW form shares the playtest
 * endpoint pair but is NOT a playtest round: it has its own document shape
 * (per-meeting verdict/notes + two overall fields), its own formId in the
 * widened allowlist (AdminFeedbackFormId), and the round-shaped
 * PLAYTEST_FORM_REGISTRY must stay untouched at exactly three rounds.
 */
import { describe, it, expect } from 'vitest';
import {
  MacPoolReviewResponsesSchema,
  MacPoolReviewVerdictSchema,
  PoolReviewResponsesSchema,
  AnyAdminFeedbackResponsesSchema,
  AnyPlaytestFeedbackResponsesSchema,
  buildEmptyMacPoolReviewResponses,
  buildEmptyPoolReviewResponsesFor,
  buildEmptyAdminFeedbackResponsesFor,
  MAC_POOL_REVIEW_FORM_ID,
  MAC_POOL_REVIEW_MEETING_IDS,
  POOL_REVIEW_FORM_IDS,
  POOL_REVIEW_MEETING_IDS,
  SAM_POOL_REVIEW_FORM_ID,
  DANTE_POOL_REVIEW_FORM_ID,
  PAT_POOL_REVIEW_FORM_ID,
  CEO_POOL_REVIEW_FORM_ID,
  EVENTS_POOL_REVIEW_FORM_ID,
  ESCALATIONS_POOL_REVIEW_FORM_ID,
  PLAYTEST_FORM_REGISTRY,
  PLAYTEST_FEEDBACK_FORM_ID,
  PLAYTEST_FEEDBACK_FORM_ID_V2,
  PLAYTEST_FEEDBACK_FORM_ID_V3,
  ACTIVE_PLAYTEST_FORM_ID,
  isAdminFeedbackFormId,
  isPlaytestFormId,
  isPoolReviewFormId,
} from '@shared/api/contracts';

describe('MacPoolReviewResponsesSchema', () => {
  it('parses an empty object into the fully-defaulted document', () => {
    const parsed = MacPoolReviewResponsesSchema.parse({});
    expect(parsed.formId).toBe(MAC_POOL_REVIEW_FORM_ID);
    expect(parsed.savedAt).toBeNull();
    expect(parsed.meetings).toEqual({});
    expect(parsed.overallNotes).toBe('');
    expect(parsed.voiceConsistency).toBe('');
  });

  it('round-trips the canonical empty default unchanged', () => {
    const empty = buildEmptyMacPoolReviewResponses();
    expect(MacPoolReviewResponsesSchema.parse(empty)).toEqual(empty);
    expect(Object.keys(empty.meetings)).toEqual([...MAC_POOL_REVIEW_MEETING_IDS]);
  });

  it('the verdict scale is closed (approve / approve_with_edits / rework / kill)', () => {
    expect(MacPoolReviewVerdictSchema.options).toEqual([
      'approve',
      'approve_with_edits',
      'rework',
      'kill',
    ]);
    expect(() =>
      MacPoolReviewResponsesSchema.parse({
        meetings: { wall_of_misses: { verdict: 'ship_it', notes: '' } },
      })
    ).toThrow();
  });

  it('rejects a playtest-round formId (each document shape is its own)', () => {
    expect(() =>
      MacPoolReviewResponsesSchema.parse({ formId: PLAYTEST_FEEDBACK_FORM_ID_V3 })
    ).toThrow();
  });
});

describe('AnyAdminFeedbackResponsesSchema — formId routing across the widened allowlist', () => {
  it('routes an explicit mac-pool-review document to the review branch', () => {
    const doc = buildEmptyMacPoolReviewResponses();
    doc.meetings.wall_of_misses = { verdict: 'approve', notes: 'baseline holds' };
    const parsed = AnyAdminFeedbackResponsesSchema.parse(doc);
    expect(parsed.formId).toBe(MAC_POOL_REVIEW_FORM_ID);
  });

  it('a document with no formId still defaults to the ACTIVE playtest form (unchanged behavior)', () => {
    const parsed = AnyAdminFeedbackResponsesSchema.parse({});
    expect(parsed.formId).toBe(ACTIVE_PLAYTEST_FORM_ID);
  });

  it('a mac-pool-review document can NEVER parse as any playtest round', () => {
    const doc = buildEmptyMacPoolReviewResponses();
    expect(() => AnyPlaytestFeedbackResponsesSchema.parse(doc)).toThrow();
  });

  it('rejects a formId outside the widened allowlist', () => {
    expect(() =>
      AnyAdminFeedbackResponsesSchema.parse({ formId: 'v3-nobody-pool-review' })
    ).toThrow();
    expect(isAdminFeedbackFormId('v3-nobody-pool-review')).toBe(false);
    expect(isPoolReviewFormId('v3-nobody-pool-review')).toBe(false);
  });

  it('isAdminFeedbackFormId accepts all three rounds plus all seven pool-review ids', () => {
    expect(isAdminFeedbackFormId(PLAYTEST_FEEDBACK_FORM_ID)).toBe(true);
    expect(isAdminFeedbackFormId(PLAYTEST_FEEDBACK_FORM_ID_V2)).toBe(true);
    expect(isAdminFeedbackFormId(PLAYTEST_FEEDBACK_FORM_ID_V3)).toBe(true);
    for (const formId of POOL_REVIEW_FORM_IDS) {
      expect(isAdminFeedbackFormId(formId), formId).toBe(true);
      expect(isPoolReviewFormId(formId), formId).toBe(true);
    }
  });

  it('the round-shaped PLAYTEST_FORM_REGISTRY stays untouched (reviews are not rounds)', () => {
    expect(Object.keys(PLAYTEST_FORM_REGISTRY).sort()).toEqual(
      [PLAYTEST_FEEDBACK_FORM_ID, PLAYTEST_FEEDBACK_FORM_ID_V2, PLAYTEST_FEEDBACK_FORM_ID_V3].sort()
    );
    for (const formId of POOL_REVIEW_FORM_IDS) {
      expect(isPlaytestFormId(formId), formId).toBe(false);
    }
  });

  it('buildEmptyAdminFeedbackResponsesFor branches by shape', () => {
    const review = buildEmptyAdminFeedbackResponsesFor(MAC_POOL_REVIEW_FORM_ID);
    expect(review.formId).toBe(MAC_POOL_REVIEW_FORM_ID);
    expect('meetings' in review).toBe(true);
    const round = buildEmptyAdminFeedbackResponsesFor(PLAYTEST_FEEDBACK_FORM_ID_V3);
    expect(round.formId).toBe(PLAYTEST_FEEDBACK_FORM_ID_V3);
    expect('sections' in round).toBe(true);
  });
});

describe('PoolReviewResponsesSchema — the generic seven-pool document', () => {
  it('covers exactly seven pools with the expected ids', () => {
    expect([...POOL_REVIEW_FORM_IDS]).toEqual([
      MAC_POOL_REVIEW_FORM_ID,
      SAM_POOL_REVIEW_FORM_ID,
      DANTE_POOL_REVIEW_FORM_ID,
      PAT_POOL_REVIEW_FORM_ID,
      CEO_POOL_REVIEW_FORM_ID,
      EVENTS_POOL_REVIEW_FORM_ID,
      ESCALATIONS_POOL_REVIEW_FORM_ID,
    ]);
    expect(Object.keys(POOL_REVIEW_MEETING_IDS).sort()).toEqual([...POOL_REVIEW_FORM_IDS].sort());
  });

  it('pins each pool review to its expected entry count', () => {
    const counts = Object.fromEntries(
      POOL_REVIEW_FORM_IDS.map((id) => [id, POOL_REVIEW_MEETING_IDS[id].length])
    );
    expect(counts).toEqual({
      [MAC_POOL_REVIEW_FORM_ID]: 15,
      [SAM_POOL_REVIEW_FORM_ID]: 14,
      [DANTE_POOL_REVIEW_FORM_ID]: 15,
      [PAT_POOL_REVIEW_FORM_ID]: 14,
      [CEO_POOL_REVIEW_FORM_ID]: 12,
      [EVENTS_POOL_REVIEW_FORM_ID]: 28,
      [ESCALATIONS_POOL_REVIEW_FORM_ID]: 8,
    });
  });

  it('meeting ids are unique within every pool', () => {
    for (const formId of POOL_REVIEW_FORM_IDS) {
      const ids = POOL_REVIEW_MEETING_IDS[formId];
      expect(new Set(ids).size, formId).toBe(ids.length);
    }
  });

  it('round-trips every pool’s canonical empty default unchanged', () => {
    for (const formId of POOL_REVIEW_FORM_IDS) {
      const empty = buildEmptyPoolReviewResponsesFor(formId);
      expect(PoolReviewResponsesSchema.parse(empty), formId).toEqual(empty);
      expect(Object.keys(empty.meetings), formId).toEqual([...POOL_REVIEW_MEETING_IDS[formId]]);
      // and via the endpoint union
      const parsed = AnyAdminFeedbackResponsesSchema.parse(empty);
      expect(parsed.formId, formId).toBe(formId);
      expect('meetings' in parsed, formId).toBe(true);
    }
  });

  it('requires an explicit formId (no default — {} still routes to the active playtest form)', () => {
    expect(() => PoolReviewResponsesSchema.parse({})).toThrow();
    expect(AnyAdminFeedbackResponsesSchema.parse({}).formId).toBe(ACTIVE_PLAYTEST_FORM_ID);
  });

  it('a non-mac pool document can NEVER parse as any playtest round (and not as the Mac literal)', () => {
    const doc = buildEmptyPoolReviewResponsesFor(SAM_POOL_REVIEW_FORM_ID);
    expect(() => AnyPlaytestFeedbackResponsesSchema.parse(doc)).toThrow();
    expect(() => MacPoolReviewResponsesSchema.parse(doc)).toThrow();
  });

  it('rejects out-of-enum verdicts in any pool document', () => {
    expect(() =>
      PoolReviewResponsesSchema.parse({
        formId: ESCALATIONS_POOL_REVIEW_FORM_ID,
        meetings: { escalation_ar_botched_signing: { verdict: 'ship_it', notes: '' } },
      })
    ).toThrow();
  });
});
