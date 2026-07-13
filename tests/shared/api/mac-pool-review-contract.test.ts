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
  AnyAdminFeedbackResponsesSchema,
  AnyPlaytestFeedbackResponsesSchema,
  buildEmptyMacPoolReviewResponses,
  buildEmptyAdminFeedbackResponsesFor,
  MAC_POOL_REVIEW_FORM_ID,
  MAC_POOL_REVIEW_MEETING_IDS,
  PLAYTEST_FORM_REGISTRY,
  PLAYTEST_FEEDBACK_FORM_ID,
  PLAYTEST_FEEDBACK_FORM_ID_V2,
  PLAYTEST_FEEDBACK_FORM_ID_V3,
  ACTIVE_PLAYTEST_FORM_ID,
  isAdminFeedbackFormId,
  isPlaytestFormId,
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
      AnyAdminFeedbackResponsesSchema.parse({ formId: 'v3-sam-pool-review' })
    ).toThrow();
    expect(isAdminFeedbackFormId('v3-sam-pool-review')).toBe(false);
  });

  it('isAdminFeedbackFormId accepts all three rounds plus the review id', () => {
    expect(isAdminFeedbackFormId(PLAYTEST_FEEDBACK_FORM_ID)).toBe(true);
    expect(isAdminFeedbackFormId(PLAYTEST_FEEDBACK_FORM_ID_V2)).toBe(true);
    expect(isAdminFeedbackFormId(PLAYTEST_FEEDBACK_FORM_ID_V3)).toBe(true);
    expect(isAdminFeedbackFormId(MAC_POOL_REVIEW_FORM_ID)).toBe(true);
  });

  it('the round-shaped PLAYTEST_FORM_REGISTRY stays untouched (review is not a round)', () => {
    expect(Object.keys(PLAYTEST_FORM_REGISTRY).sort()).toEqual(
      [PLAYTEST_FEEDBACK_FORM_ID, PLAYTEST_FEEDBACK_FORM_ID_V2, PLAYTEST_FEEDBACK_FORM_ID_V3].sort()
    );
    expect(isPlaytestFormId(MAC_POOL_REVIEW_FORM_ID)).toBe(false);
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
