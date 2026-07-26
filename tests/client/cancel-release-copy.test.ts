/**
 * summarizeCancelRelease — pure-logic test (buzz-v2 slice 4, C43).
 *
 * The cancel-confirmation Dialog is driven by this pure helper (client/src/lib/
 * releaseBuzz.ts). The money is ONE POT: the full paid amount (main marketing +
 * lead single) is stored on release.marketingBudget; the pre-campaign pot is a
 * SHARE of it, not an extra charge. Refund PREVIEW = marketingBudget − the
 * pre-campaign share already CONVERTED to awareness (spentToDate clamped into
 * [0, preCampaign.totalBudget]), floored at 0 — mirroring the server rule —
 * plus qualitative consequence copy (fork E). Testing the helper instead of the
 * Dialog DOM keeps the coverage load-bearing without rendering Radix.
 */
import { describe, it, expect } from 'vitest';
import { summarizeCancelRelease } from '@/lib/releaseBuzz';

describe('summarizeCancelRelease — refund preview (fork E)', () => {
  it('paid budget MINUS converted pre-campaign share', () => {
    const preview = summarizeCancelRelease({
      marketingBudget: 12000, // full paid pot
      metadata: {
        attachedHype: 6,
        preCampaign: { pct: 30, totalBudget: 3600, spentToDate: 1200 },
      },
    });
    // 12000 paid − 1200 converted = 10800 (never more than was paid).
    expect(preview.refundAmount).toBe(10800);
    expect(preview.hasPreBuzz).toBe(true);
    expect(preview.hasAttachedHype).toBe(true);
  });

  it('fully-spent pre-campaign deducts the whole share', () => {
    const preview = summarizeCancelRelease({
      marketingBudget: 12000,
      metadata: { attachedHype: 0, preCampaign: { pct: 30, totalBudget: 3600, spentToDate: 3600 } },
    });
    expect(preview.refundAmount).toBe(12000 - 3600);
  });

  it('a drifted spentToDate greater than totalBudget deducts at most the share (clamped)', () => {
    const preview = summarizeCancelRelease({
      marketingBudget: 12000,
      metadata: { preCampaign: { pct: 30, totalBudget: 3600, spentToDate: 5000 } },
    });
    expect(preview.refundAmount).toBe(12000 - 3600);
  });

  it('a negative drifted spentToDate deducts nothing (never over-credits)', () => {
    const preview = summarizeCancelRelease({
      marketingBudget: 12000,
      metadata: { preCampaign: { pct: 30, totalBudget: 3600, spentToDate: -500 } },
    });
    expect(preview.refundAmount).toBe(12000);
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

// C83 — the preview mirrors releasePlanningService.deleteRelease's lead-single
// rule: a SHIPPED lead single's budget share (leadSingleBudgetBreakdown summed)
// is deducted from the refund; unshipped deducts nothing. Shipped status comes
// from the optional `songs` arg (the lead single's song row, isReleased /
// is_released tolerant).
describe('summarizeCancelRelease — lead-single share (C83, server parity)', () => {
  const release = {
    marketingBudget: 12000, // ONE POT: 10000 main + 2000 lead single
    metadata: {
      leadSingleStrategy: {
        leadSingleId: 'song-lead',
        leadSingleReleaseWeek: 3,
        leadSingleBudgetBreakdown: { pr: 1500, digital: 500 },
      },
    },
  };

  it('lead single SHIPPED: preview excludes the lead-single share', () => {
    const preview = summarizeCancelRelease(release, [
      { id: 'song-lead', isReleased: true },
      { id: 'song-other', isReleased: false },
    ]);
    // 12000 − 2000 shipped lead-single share = 10000 (same math as the server).
    expect(preview.refundAmount).toBe(10000);
  });

  it('tolerates the raw-column is_released shape', () => {
    const preview = summarizeCancelRelease(release, [{ id: 'song-lead', is_released: true }]);
    expect(preview.refundAmount).toBe(10000);
  });

  it('lead single NOT shipped: full pot previews (unchanged rule)', () => {
    const preview = summarizeCancelRelease(release, [{ id: 'song-lead', isReleased: false }]);
    expect(preview.refundAmount).toBe(12000);
  });

  it('without songs data the deduction is skipped (server stays authoritative)', () => {
    expect(summarizeCancelRelease(release).refundAmount).toBe(12000);
    expect(summarizeCancelRelease(release, []).refundAmount).toBe(12000);
  });

  it('shipped lead single stacks with the converted pre-campaign share', () => {
    const preview = summarizeCancelRelease(
      {
        marketingBudget: 12000,
        metadata: {
          ...release.metadata,
          preCampaign: { pct: 30, totalBudget: 3000, spentToDate: 1200 },
        },
      },
      [{ id: 'song-lead', isReleased: true }]
    );
    // 12000 − 1200 (pre-campaign converted) − 2000 (lead single shipped) = 8800.
    expect(preview.refundAmount).toBe(8800);
  });

  it('legacy leadSingleBudget field (no breakdown) is honored, negatives ignored', () => {
    const preview = summarizeCancelRelease(
      {
        marketingBudget: 5000,
        metadata: {
          leadSingleStrategy: {
            leadSingleId: 'song-lead',
            leadSingleBudget: { pr: 800, digital: -100 },
          },
        },
      },
      [{ id: 'song-lead', isReleased: true }]
    );
    expect(preview.refundAmount).toBe(5000 - 800);
  });
});

describe('summarizeCancelRelease — consequence copy', () => {
  it('includes the anticipation-lost line only when a pre-campaign was diverted', () => {
    const withPre = summarizeCancelRelease({
      marketingBudget: 1000,
      metadata: { preCampaign: { pct: 20, totalBudget: 200, spentToDate: 0 } },
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
      marketingBudget: 12000,
      metadata: { attachedHype: 6, preCampaign: { pct: 30, totalBudget: 3600, spentToDate: 1200 } },
    });
    for (const line of preview.consequences) {
      expect(line).not.toMatch(/[×x]\s*\d/);
    }
  });
});
