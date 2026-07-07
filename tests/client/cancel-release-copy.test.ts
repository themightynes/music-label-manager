/**
 * summarizeCancelRelease — pure-logic test (buzz-v2 slice 4, C43).
 *
 * The cancel-confirmation Dialog is driven by this pure helper (client/src/lib/
 * releaseBuzz.ts): refund PREVIEW = stored launch marketingBudget + UNSPENT
 * pre-campaign share (totalBudget − spentToDate, clamped >= 0), plus qualitative
 * consequence copy (fork E). Testing the helper instead of the Dialog DOM keeps
 * the coverage load-bearing without rendering Radix.
 */
import { describe, it, expect } from 'vitest';
import { summarizeCancelRelease } from '@/lib/releaseBuzz';

describe('summarizeCancelRelease — refund preview (fork E)', () => {
  it('launch budget + unspent pre-campaign share', () => {
    const preview = summarizeCancelRelease({
      marketingBudget: 4000,
      metadata: {
        attachedHype: 6,
        preCampaign: { pct: 30, totalBudget: 3600, spentToDate: 1200 },
      },
    });
    // 4000 + (3600 - 1200) = 6400.
    expect(preview.refundAmount).toBe(6400);
    expect(preview.hasPreBuzz).toBe(true);
    expect(preview.hasAttachedHype).toBe(true);
  });

  it('fully-spent pre-campaign contributes 0 to the refund', () => {
    const preview = summarizeCancelRelease({
      marketingBudget: 4000,
      metadata: { attachedHype: 0, preCampaign: { pct: 30, totalBudget: 3600, spentToDate: 3600 } },
    });
    expect(preview.refundAmount).toBe(4000);
  });

  it('a drifted spentToDate greater than totalBudget never credits extra (clamped)', () => {
    const preview = summarizeCancelRelease({
      marketingBudget: 4000,
      metadata: { preCampaign: { pct: 30, totalBudget: 3600, spentToDate: 5000 } },
    });
    expect(preview.refundAmount).toBe(4000);
  });

  it('no pre-campaign / legacy release refunds exactly marketingBudget', () => {
    const preview = summarizeCancelRelease({ marketingBudget: 3000, metadata: {} });
    expect(preview.refundAmount).toBe(3000);
    expect(preview.hasPreBuzz).toBe(false);
    expect(preview.hasAttachedHype).toBe(false);
  });

  it('handles a missing/undefined marketingBudget and metadata gracefully', () => {
    const preview = summarizeCancelRelease({});
    expect(preview.refundAmount).toBe(0);
    expect(preview.hasPreBuzz).toBe(false);
  });
});

describe('summarizeCancelRelease — consequence copy', () => {
  it('includes the anticipation-lost line only when a pre-campaign was diverted', () => {
    const withPre = summarizeCancelRelease({
      marketingBudget: 1000,
      metadata: { preCampaign: { pct: 20, totalBudget: 1000, spentToDate: 0 } },
    });
    expect(withPre.consequences.some((l) => /anticipation/i.test(l))).toBe(true);

    const withoutPre = summarizeCancelRelease({ marketingBudget: 1000, metadata: {} });
    expect(withoutPre.consequences.some((l) => /anticipation/i.test(l))).toBe(false);
  });

  it('includes the attached-Hype-lost line only when hype was attached', () => {
    const withHype = summarizeCancelRelease({ marketingBudget: 0, metadata: { attachedHype: 5 } });
    expect(withHype.consequences.some((l) => /hype/i.test(l))).toBe(true);

    const noHype = summarizeCancelRelease({ marketingBudget: 0, metadata: { attachedHype: 0 } });
    expect(noHype.consequences.some((l) => /hype/i.test(l))).toBe(false);
  });

  it('always tells the player the songs return to the catalog', () => {
    const preview = summarizeCancelRelease({ marketingBudget: 0, metadata: {} });
    expect(preview.consequences.some((l) => /catalog|plan again/i.test(l))).toBe(true);
  });

  // Fork E standing rule: qualitative only — NO ×N multiplier strings anywhere.
  it('emits no ×N / xN multiplier strings in any consequence line', () => {
    const preview = summarizeCancelRelease({
      marketingBudget: 4000,
      metadata: { attachedHype: 6, preCampaign: { pct: 30, totalBudget: 3600, spentToDate: 1200 } },
    });
    for (const line of preview.consequences) {
      expect(line).not.toMatch(/[×x]\s*\d/);
    }
  });
});
