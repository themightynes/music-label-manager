import { describe, it, expect } from 'vitest';
import { FinancialSystem } from '@shared/engine/FinancialSystem';

/**
 * C69 regression: FinancialSystem.calculateAwarenessGain previously called a
 * non-existent `getArtistSync`, which threw and was swallowed by the method's
 * try/catch — silently returning 0 for the ENTIRE marketing-awareness gain for
 * ~9 months. These tests pin that:
 *   (a) the gain is NON-ZERO for real marketing spend, and
 *   (b) the artist-popularity bonus is actually applied (real getArtistById), and
 *   (c) a gameData WITHOUT getArtistById degrades to no bonus (×1.0) rather than
 *       nuking the whole gain to 0.
 */

const AWARENESS_BALANCE = {
  market_formulas: {
    awareness_system: {
      enabled: true,
      channel_awareness_coefficients: { radio: 0.1, digital: 0.2, pr: 0.4, influencer: 0.3 },
      per_unit_spend: 1000,
    },
  },
};

// The FinancialSystem constructor validates tour + venue config on startup, so a
// bare mock isn't enough — supply the minimum config it requires (mirrors
// tests/unit/financial-system-streaming.test.ts).
const VENUE_ACCESS = {
  none: { threshold: 0, capacity_range: [0, 50], guarantee_multiplier: 0.3 },
  clubs: { threshold: 5, capacity_range: [50, 500], guarantee_multiplier: 0.7 },
  theaters: { threshold: 20, capacity_range: [500, 2000], guarantee_multiplier: 1.0 },
  arenas: { threshold: 45, capacity_range: [2000, 20000], guarantee_multiplier: 1.5 },
};
const TOUR_CONFIG = {
  sell_through_base: 0.15,
  reputation_modifier: 0.05,
  local_popularity_weight: 0.6,
  merch_percentage: 0.15,
  ticket_price_base: 25,
  ticket_price_per_capacity: 0.03,
};

function makeGameData(overrides: any = {}) {
  return {
    getBalanceConfigSync: () => AWARENESS_BALANCE,
    getAccessTiersSync: () => ({ venue_access: VENUE_ACCESS }),
    getTourConfigSync: () => TOUR_CONFIG,
    ...overrides,
  };
}

// pr $1000 / per_unit_spend 1000 * pr coeff 0.4 = 0.4 base; quality 100 => ×1.0.
const SONG = { id: 'song-1', artistId: 'artist-1', quality: 100 };
const MARKETING = { pr: 1000 };

describe('FinancialSystem.calculateAwarenessGain — C69', () => {
  it('returns a NON-ZERO gain and applies the artist popularity bonus', async () => {
    const gameData = makeGameData({
      getArtistById: async () => ({ id: 'artist-1', popularity: 100 }),
    });
    const fs = new FinancialSystem(gameData as any, () => 0.5);

    // popularity 100 => bonus 1 + 100/200 = 1.5 => 0.4 * 1.5 = 0.6
    const gain = await fs.calculateAwarenessGain(SONG, MARKETING);
    expect(gain).toBeCloseTo(0.6, 5);
    expect(gain).toBeGreaterThan(0); // the bug returned 0
  });

  it('applies no popularity bonus for a zero-popularity artist (still non-zero)', async () => {
    const gameData = makeGameData({
      getArtistById: async () => ({ id: 'artist-1', popularity: 0 }),
    });
    const fs = new FinancialSystem(gameData as any, () => 0.5);

    const gain = await fs.calculateAwarenessGain(SONG, MARKETING);
    expect(gain).toBeCloseTo(0.4, 5); // base only, bonus ×1.0
  });

  it('degrades gracefully (no bonus, NOT zero) when gameData lacks getArtistById', async () => {
    const gameData = makeGameData(); // no getArtistById
    const fs = new FinancialSystem(gameData as any, () => 0.5);

    // The old bug swallowed the missing-accessor throw and returned 0. Now the
    // base gain survives (bonus skipped): 0.4, not 0.
    const gain = await fs.calculateAwarenessGain(SONG, MARKETING);
    expect(gain).toBeCloseTo(0.4, 5);
    expect(gain).toBeGreaterThan(0);
  });

  it('returns 0 when the awareness system is disabled in config', async () => {
    const gameData = makeGameData({
      getBalanceConfigSync: () => ({ market_formulas: { awareness_system: { enabled: false } } }),
      getArtistById: async () => ({ id: 'artist-1', popularity: 100 }),
    });
    const fs = new FinancialSystem(gameData as any, () => 0.5);
    expect(await fs.calculateAwarenessGain(SONG, MARKETING)).toBe(0);
  });
});
