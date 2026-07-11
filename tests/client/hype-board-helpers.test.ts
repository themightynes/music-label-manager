/**
 * Hype-board UX arc — pure display helpers in lib/releaseBuzz.ts.
 *
 * listBankedHypePools / summarizeHypeAttachPreview read the SAME client-visible
 * flag fields as summarizeBankedHype (flags.pendingAwarenessBoost +
 * flags.hypeArtistPools) — the per-pool list and the aggregate chip total must
 * stay consistent. hypeStrengthBand / anticipationMomentum are DISPLAY-ONLY
 * qualitative bands (fork E standing rule: wording, never mechanics).
 */
import { describe, it, expect } from 'vitest';
import {
  listBankedHypePools,
  summarizeHypeAttachPreview,
  summarizeBankedHype,
  hypeStrengthBand,
  anticipationMomentum,
  BANKED_HYPE_EXPIRY_WEEKS,
  HYPE_STRENGTH_STRONG_MIN,
  HYPE_STRENGTH_SOLID_MIN,
} from '@/lib/releaseBuzz';

const flags = {
  pendingAwarenessBoost: 2,
  pendingAwarenessBoostWeek: 5,
  hypeArtistPools: {
    a1: { amount: 3, week: 6 },
    a2: { amount: -2, week: 4 },
    a3: { amount: 0, week: 9 },
  },
};
const names = { a1: 'Nova Sterling', a2: 'Mars Vega' };

describe('hypeStrengthBand', () => {
  it('bands positive amounts and returns null otherwise', () => {
    expect(hypeStrengthBand(HYPE_STRENGTH_STRONG_MIN)).toBe('strong');
    expect(hypeStrengthBand(HYPE_STRENGTH_SOLID_MIN)).toBe('solid');
    expect(hypeStrengthBand(1)).toBe('modest');
    expect(hypeStrengthBand(0)).toBeNull();
    expect(hypeStrengthBand(-4)).toBeNull();
  });
});

describe('listBankedHypePools', () => {
  it('lists label + nonzero artist pools with display names and fade weeks', () => {
    const pools = listBankedHypePools(flags, names);
    expect(pools).toHaveLength(3); // label, a1, a2 (a3 is zero → dropped)
    const label = pools.find((p) => p.scope === 'label')!;
    expect(label).toMatchObject({
      name: 'Label',
      amount: 2,
      week: 5,
      fadesWeek: 5 + BANKED_HYPE_EXPIRY_WEEKS,
      strength: 'modest',
    });
    const nova = pools.find((p) => p.artistId === 'a1')!;
    expect(nova).toMatchObject({
      scope: 'artist',
      name: 'Nova Sterling',
      amount: 3,
      fadesWeek: 6 + BANKED_HYPE_EXPIRY_WEEKS,
      strength: 'solid',
    });
    // Negative pool is listed (attach-preview honesty) but has no strength band.
    const mars = pools.find((p) => p.artistId === 'a2')!;
    expect(mars).toMatchObject({ amount: -2, strength: null });
  });

  it('falls back to "an artist" for ids missing from the roster cache', () => {
    const pools = listBankedHypePools(flags, {});
    expect(pools.find((p) => p.artistId === 'a1')!.name).toBe('an artist');
  });

  it('handles undated pools (null week and fadesWeek)', () => {
    const pools = listBankedHypePools({ pendingAwarenessBoost: 4 });
    expect(pools[0]).toMatchObject({ week: null, fadesWeek: null });
  });

  it('returns [] for empty/missing flags', () => {
    expect(listBankedHypePools({})).toEqual([]);
    expect(listBankedHypePools(undefined)).toEqual([]);
    expect(listBankedHypePools(null)).toEqual([]);
  });

  it('stays consistent with the summarizeBankedHype chip total (positive pools)', () => {
    const pools = listBankedHypePools(flags, names);
    const positiveSum = pools.filter((p) => p.amount > 0).reduce((s, p) => s + p.amount, 0);
    expect(positiveSum).toBe(summarizeBankedHype(flags).total);
  });
});

describe('summarizeHypeAttachPreview (Task 1 — plan-time attach preview)', () => {
  it('includes the selected artist pool + the entire label pool (server attach rule)', () => {
    const preview = summarizeHypeAttachPreview(flags, 'a1', names);
    expect(preview.pools.map((p) => p.scope).sort()).toEqual(['artist', 'label']);
    expect(preview.total).toBe(5); // 2 label + 3 artist
    expect(preview.strength).toBe('solid');
    expect(preview.suppressed).toBe(false);
  });

  it("excludes OTHER artists' pools (they stay banked)", () => {
    const preview = summarizeHypeAttachPreview(flags, 'a1', names);
    expect(preview.pools.some((p) => p.artistId === 'a2')).toBe(false);
  });

  it('label pool alone attaches for an artist with no pool of their own', () => {
    const preview = summarizeHypeAttachPreview(flags, 'a-none', names);
    expect(preview.pools).toHaveLength(1);
    expect(preview.pools[0].scope).toBe('label');
    expect(preview.total).toBe(2);
  });

  it('flags net-negative attachments as suppressed (no strength band)', () => {
    const preview = summarizeHypeAttachPreview(
      { hypeArtistPools: { a2: { amount: -2, week: 4 } } },
      'a2',
      names
    );
    expect(preview.suppressed).toBe(true);
    expect(preview.strength).toBeNull();
  });

  it('returns no pools when nothing is banked', () => {
    expect(summarizeHypeAttachPreview({}, 'a1').pools).toEqual([]);
    expect(summarizeHypeAttachPreview(undefined, 'a1').total).toBe(0);
  });
});

describe('anticipationMomentum (Task 2 — weekly readout band)', () => {
  it('bands the weekly applied gain into direction + word', () => {
    expect(anticipationMomentum(6)).toEqual({ direction: 'up', word: 'surging' });
    expect(anticipationMomentum(4)).toEqual({ direction: 'up', word: 'surging' });
    expect(anticipationMomentum(2)).toEqual({ direction: 'up', word: 'building' });
    expect(anticipationMomentum(1)).toEqual({ direction: 'up', word: 'building' });
    expect(anticipationMomentum(0)).toEqual({ direction: 'steady', word: 'holding' });
  });

  it('tolerates missing amounts (malformed entry counts as holding)', () => {
    expect(anticipationMomentum(undefined)).toEqual({ direction: 'steady', word: 'holding' });
  });
});
