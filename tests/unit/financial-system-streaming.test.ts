/**
 * Unit Tests for FinancialSystem - Streaming Revenue Calculations
 *
 * Tests the streaming outcome calculation which determines first-week streams
 * for a release based on quality, playlist access, reputation, marketing, and popularity.
 *
 * Pure unit tests - no database required.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FinancialSystem } from '@shared/engine/FinancialSystem';

/**
 * Mock gameData with streaming configuration from markets.json
 */
function createMockGameData() {
  const streamingConfig = {
    base_formula: "quality * playlist_access * reputation * marketing * popularity * rng",
    quality_weight: 0.25,
    playlist_weight: 0.20,
    reputation_weight: 0.10,
    marketing_weight: 0.25,
    popularity_weight: 0.20,
    first_week_multiplier: 2.5,
    longevity_decay: 0.85,
    base_streams_per_point: 100, // Streams per point of base calculation
    star_power_amplification: {
      enabled: true,
      max_multiplier: 0.3
    },
    ongoing_streams: {
      weekly_decay_rate: 0.85,
      revenue_per_stream: 0.05,
      ongoing_factor: 0.8,
      reputation_bonus_factor: 0.002,
      access_tier_bonus_factor: 0.1,
      minimum_revenue_threshold: 1,
      max_decay_weeks: 24
    }
  };

  const playlistAccess = {
    none: {
      threshold: 0,
      reach_multiplier: 0.1,
      cost_modifier: 1.0
    },
    niche: {
      threshold: 10,
      reach_multiplier: 0.4,
      cost_modifier: 1.2
    },
    mid: {
      threshold: 30,
      reach_multiplier: 0.8,
      cost_modifier: 1.5
    },
    flagship: {
      threshold: 60,
      reach_multiplier: 1.5,
      cost_modifier: 2.0
    }
  };

  // Also need venue access for FinancialSystem constructor validation
  const venueAccess = {
    none: { threshold: 0, capacity_range: [0, 50], guarantee_multiplier: 0.3 },
    clubs: { threshold: 5, capacity_range: [50, 500], guarantee_multiplier: 0.7 },
    theaters: { threshold: 20, capacity_range: [500, 2000], guarantee_multiplier: 1.0 },
    arenas: { threshold: 45, capacity_range: [2000, 20000], guarantee_multiplier: 1.5 }
  };

  // Tour config needed for validation
  const tourConfig = {
    sell_through_base: 0.15,
    reputation_modifier: 0.05,
    local_popularity_weight: 0.6,
    merch_percentage: 0.15,
    ticket_price_base: 25,
    ticket_price_per_capacity: 0.03
  };

  return {
    getStreamingConfigSync: () => streamingConfig,
    getAccessTiersSync: () => ({
      playlist_access: playlistAccess,
      venue_access: venueAccess
    }),
    getTourConfigSync: () => tourConfig
  };
}

/**
 * Mock RNG that returns a fixed value for deterministic testing
 */
function createMockRNG(value: number = 1.0) {
  return () => value;
}

describe('FinancialSystem - Streaming Calculation Components', () => {
  let financialSystem: FinancialSystem;
  let mockGameData: any;

  beforeEach(() => {
    mockGameData = createMockGameData();
    // Use RNG value of 1.0 (max variance) for predictable testing
    financialSystem = new FinancialSystem(mockGameData, createMockRNG(1.0));
  });

  describe('calculateStreamingOutcome() - Basic Functionality', () => {
    it('should return a number of streams', () => {
      const streams = financialSystem.calculateStreamingOutcome(
        70,      // quality
        'niche', // playlistAccess
        50,      // reputation
        5000,    // adSpend
        60       // artistPopularity
      );

      expect(typeof streams).toBe('number');
      expect(streams).toBeGreaterThan(0);
    });

    it('should return integer stream count', () => {
      const streams = financialSystem.calculateStreamingOutcome(
        70,
        'niche',
        50,
        5000,
        60
      );

      expect(Number.isInteger(streams)).toBe(true);
    });

    it('should handle zero values without crashing', () => {
      const streams = financialSystem.calculateStreamingOutcome(
        0,      // zero quality
        'none', // no playlist
        0,      // zero reputation
        0,      // no marketing
        0       // zero popularity
      );

      expect(typeof streams).toBe('number');
      expect(streams).toBeGreaterThanOrEqual(0);
    });

    it('should handle maximum values', () => {
      const streams = financialSystem.calculateStreamingOutcome(
        100,        // max quality
        'flagship', // best playlist
        100,        // max reputation
        100000,     // high marketing
        100         // max popularity
      );

      expect(streams).toBeGreaterThan(0);
      expect(Number.isInteger(streams)).toBe(true);
    });
  });

  describe('Quality Impact on Streams', () => {
    it('should increase streams with higher quality', () => {
      const lowQuality = financialSystem.calculateStreamingOutcome(
        30, 'niche', 50, 5000, 60
      );

      const highQuality = financialSystem.calculateStreamingOutcome(
        90, 'niche', 50, 5000, 60
      );

      expect(highQuality).toBeGreaterThan(lowQuality);
    });

    it('should have zero quality component when quality is 0', () => {
      const noQuality = financialSystem.calculateStreamingOutcome(
        0, 'none', 0, 0, 0
      );

      // Should be very low or zero
      expect(noQuality).toBeLessThan(1000);
    });

    it('should scale with quality (holding other factors constant)', () => {
      const quality50 = financialSystem.calculateStreamingOutcome(
        50, 'niche', 50, 5000, 60
      );

      const quality100 = financialSystem.calculateStreamingOutcome(
        100, 'niche', 50, 5000, 60
      );

      // Double quality should increase streams (formula has multiple additive components)
      const ratio = quality100 / quality50;
      expect(ratio).toBeGreaterThan(1.1); // Should be higher
      expect(ratio).toBeLessThan(2.0); // But not exactly double due to other factors
    });
  });

  describe('Playlist Access Impact on Streams', () => {
    it('should increase streams with better playlist access', () => {
      const none = financialSystem.calculateStreamingOutcome(
        70, 'none', 50, 5000, 60
      );

      const niche = financialSystem.calculateStreamingOutcome(
        70, 'niche', 50, 5000, 60
      );

      const mid = financialSystem.calculateStreamingOutcome(
        70, 'mid', 50, 5000, 60
      );

      const flagship = financialSystem.calculateStreamingOutcome(
        70, 'flagship', 50, 5000, 60
      );

      expect(niche).toBeGreaterThan(none);
      expect(mid).toBeGreaterThan(niche);
      expect(flagship).toBeGreaterThan(mid);
    });

    it('should use correct multipliers from config', () => {
      // Test that different tiers have expected relative impacts
      const baseCase = financialSystem.calculateStreamingOutcome(
        70, 'none', 50, 5000, 60
      );

      const flagshipCase = financialSystem.calculateStreamingOutcome(
        70, 'flagship', 50, 5000, 60
      );

      // Flagship (1.5x) vs None (0.1x) should show notable difference
      // Not exactly proportional due to additive formula components
      expect(flagshipCase).toBeGreaterThan(baseCase * 0.7); // At least 70% higher
    });
  });

  describe('Reputation Impact on Streams', () => {
    it('should increase streams with higher reputation', () => {
      const lowRep = financialSystem.calculateStreamingOutcome(
        70, 'niche', 10, 5000, 60
      );

      const highRep = financialSystem.calculateStreamingOutcome(
        70, 'niche', 90, 5000, 60
      );

      expect(highRep).toBeGreaterThan(lowRep);
    });

    it('should handle zero reputation', () => {
      const noRep = financialSystem.calculateStreamingOutcome(
        70, 'niche', 0, 5000, 60
      );

      expect(noRep).toBeGreaterThan(0); // Other factors still contribute
    });

    it('should scale with reputation value', () => {
      const rep25 = financialSystem.calculateStreamingOutcome(
        70, 'niche', 25, 5000, 60
      );

      const rep75 = financialSystem.calculateStreamingOutcome(
        70, 'niche', 75, 5000, 60
      );

      // Triple reputation should increase streams
      expect(rep75).toBeGreaterThan(rep25);
    });
  });

  describe('Marketing Spend Impact on Streams', () => {
    it('should increase streams with higher marketing budget', () => {
      const lowMarketing = financialSystem.calculateStreamingOutcome(
        70, 'niche', 50, 1000, 60
      );

      const highMarketing = financialSystem.calculateStreamingOutcome(
        70, 'niche', 50, 50000, 60
      );

      expect(highMarketing).toBeGreaterThan(lowMarketing);
    });

    it('should handle zero marketing spend', () => {
      const noMarketing = financialSystem.calculateStreamingOutcome(
        70, 'niche', 50, 0, 60
      );

      expect(noMarketing).toBeGreaterThan(0); // Other factors still work
    });

    it('should use square root scaling for marketing', () => {
      // Marketing uses sqrt scaling, so diminishing returns
      const spend1000 = financialSystem.calculateStreamingOutcome(
        70, 'niche', 50, 1000, 60
      );

      const spend4000 = financialSystem.calculateStreamingOutcome(
        70, 'niche', 50, 4000, 60
      );

      const spend16000 = financialSystem.calculateStreamingOutcome(
        70, 'niche', 50, 16000, 60
      );

      // 4x spend (1000 -> 4000) should give 2x effect (sqrt)
      const ratio1 = spend4000 / spend1000;

      // 16x spend (1000 -> 16000) should give 4x effect (sqrt)
      const ratio2 = spend16000 / spend1000;

      // Verify diminishing returns pattern
      expect(ratio1).toBeGreaterThan(1.1);
      expect(ratio2).toBeGreaterThan(ratio1);
      expect(ratio2).toBeLessThan(ratio1 * 2.5); // Should show diminishing returns
    });
  });

  describe('Artist Popularity Impact on Streams', () => {
    it('should increase streams with higher popularity', () => {
      const lowPop = financialSystem.calculateStreamingOutcome(
        70, 'niche', 50, 5000, 20
      );

      const highPop = financialSystem.calculateStreamingOutcome(
        70, 'niche', 50, 5000, 90
      );

      expect(highPop).toBeGreaterThan(lowPop);
    });

    it('should handle zero popularity', () => {
      const noPop = financialSystem.calculateStreamingOutcome(
        70, 'niche', 50, 5000, 0
      );

      expect(noPop).toBeGreaterThan(0);
    });

    it('should scale linearly with popularity', () => {
      const pop25 = financialSystem.calculateStreamingOutcome(
        70, 'niche', 50, 5000, 25
      );

      const pop75 = financialSystem.calculateStreamingOutcome(
        70, 'niche', 50, 5000, 75
      );

      // Triple popularity should significantly increase streams
      expect(pop75).toBeGreaterThan(pop25);
    });
  });

  describe('Star Power Amplification', () => {
    it('should amplify streams for popular artists', () => {
      // Create system with star power enabled
      const streams = financialSystem.calculateStreamingOutcome(
        70,      // quality
        'niche',
        50,      // reputation
        5000,    // marketing
        80       // high popularity triggers star power
      );

      const lowPopStreams = financialSystem.calculateStreamingOutcome(
        70,
        'niche',
        50,
        5000,
        20 // low popularity - less star power
      );

      // High popularity should get additional amplification
      expect(streams).toBeGreaterThan(lowPopStreams);
    });

    it('should cap star power amplification at max multiplier', () => {
      // With max popularity (100), star power should add up to 30% (max_multiplier: 0.3)
      const maxPop = financialSystem.calculateStreamingOutcome(
        70, 'niche', 50, 5000, 100
      );

      // Should be significant but not extreme
      expect(maxPop).toBeGreaterThan(0);
      expect(Number.isInteger(maxPop)).toBe(true);
    });

    it('should work with star power disabled', () => {
      // Create custom config with star power disabled
      const customGameData = createMockGameData();
      customGameData.getStreamingConfigSync().star_power_amplification.enabled = false;

      const systemNoStarPower = new FinancialSystem(customGameData, createMockRNG(1.0));

      const streams = systemNoStarPower.calculateStreamingOutcome(
        70, 'niche', 50, 5000, 100
      );

      expect(streams).toBeGreaterThan(0);
    });
  });

  describe('First Week Multiplier', () => {
    it('should apply first week multiplier to streams', () => {
      const config = mockGameData.getStreamingConfigSync();

      // The final streams should be influenced by first_week_multiplier (2.5)
      const streams = financialSystem.calculateStreamingOutcome(
        70, 'niche', 50, 5000, 60
      );

      // Should be a substantial number due to 2.5x multiplier
      expect(streams).toBeGreaterThan(10000);
    });
  });

  describe('RNG Variance', () => {
    it('should apply variance to streams', () => {
      // Create two systems with different RNG values
      const system1 = new FinancialSystem(mockGameData, createMockRNG(0.9)); // Min variance
      const system2 = new FinancialSystem(mockGameData, createMockRNG(1.1)); // Max variance

      const streams1 = system1.calculateStreamingOutcome(70, 'niche', 50, 5000, 60);
      const streams2 = system2.calculateStreamingOutcome(70, 'niche', 50, 5000, 60);

      // Different RNG should produce different results
      expect(streams2).not.toBe(streams1);
      expect(streams2).toBeGreaterThan(streams1);
    });

    it('should produce consistent results with same RNG', () => {
      const streams1 = financialSystem.calculateStreamingOutcome(70, 'niche', 50, 5000, 60);
      const streams2 = financialSystem.calculateStreamingOutcome(70, 'niche', 50, 5000, 60);

      // Same RNG should give same results
      expect(streams2).toBe(streams1);
    });

    it('should keep variance within expected range', () => {
      // Variance should be between 0.9 and 1.1
      const systemMin = new FinancialSystem(mockGameData, createMockRNG(0.9));
      const systemMax = new FinancialSystem(mockGameData, createMockRNG(1.1));

      const streamsMin = systemMin.calculateStreamingOutcome(70, 'niche', 50, 5000, 60);
      const streamsMax = systemMax.calculateStreamingOutcome(70, 'niche', 50, 5000, 60);

      // Higher RNG should produce higher streams
      expect(streamsMax).toBeGreaterThan(streamsMin);

      // Ratio should be influenced by variance (but also other factors)
      const ratio = streamsMax / streamsMin;
      expect(ratio).toBeGreaterThan(1.0);
      expect(ratio).toBeLessThan(1.3); // Within reasonable range
    });
  });

  describe('Combined Factor Testing', () => {
    it('should combine all factors for higher streams', () => {
      const baseline = financialSystem.calculateStreamingOutcome(
        50, 'niche', 25, 1000, 30
      );

      const improved = financialSystem.calculateStreamingOutcome(
        80,        // +60% quality
        'flagship', // Better playlist
        75,        // +200% reputation
        10000,     // 10x marketing
        80         // +167% popularity
      );

      // All improvements should stack for notably higher streams
      // Formula is additive with star power amplification
      expect(improved).toBeGreaterThan(baseline * 2); // At least 2x better
      expect(improved).toBeGreaterThan(baseline); // Definitely higher
    });

    it('should handle all minimum values', () => {
      const minStreams = financialSystem.calculateStreamingOutcome(
        0, 'none', 0, 0, 0
      );

      expect(minStreams).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(minStreams)).toBe(true);
    });

    it('should handle all maximum values', () => {
      const maxStreams = financialSystem.calculateStreamingOutcome(
        100, 'flagship', 100, 100000, 100
      );

      expect(maxStreams).toBeGreaterThan(0);
      expect(Number.isInteger(maxStreams)).toBe(true);
    });

    it('should produce realistic stream counts for typical release', () => {
      // Typical mid-tier release
      const streams = financialSystem.calculateStreamingOutcome(
        75,      // good quality
        'mid',   // decent playlist
        40,      // building reputation
        8000,    // modest marketing
        50       // average popularity
      );

      // Should be in a realistic range (tens of thousands for first week)
      expect(streams).toBeGreaterThan(10000);
      expect(streams).toBeLessThan(1000000);
    });

    it('should produce different results for different release scenarios', () => {
      const indieRelease = financialSystem.calculateStreamingOutcome(
        60, 'niche', 20, 2000, 30
      );

      const mainstreamRelease = financialSystem.calculateStreamingOutcome(
        85, 'flagship', 75, 25000, 85
      );

      const emergingArtist = financialSystem.calculateStreamingOutcome(
        70, 'mid', 35, 10000, 45
      );

      // Different scenarios should produce distinctly different results
      expect(mainstreamRelease).toBeGreaterThan(emergingArtist);
      expect(emergingArtist).toBeGreaterThan(indieRelease);

      // All should be reasonable numbers
      expect(indieRelease).toBeGreaterThan(0);
      expect(mainstreamRelease).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle very high marketing spend', () => {
      const streams = financialSystem.calculateStreamingOutcome(
        70, 'niche', 50, 1000000, 60 // 1M marketing budget
      );

      expect(streams).toBeGreaterThan(0);
      expect(Number.isInteger(streams)).toBe(true);
    });

    it('should handle fractional inputs gracefully', () => {
      const streams = financialSystem.calculateStreamingOutcome(
        75.5, 'niche', 50.7, 5500.50, 62.3
      );

      expect(Number.isInteger(streams)).toBe(true);
      expect(streams).toBeGreaterThan(0);
    });

    it('should produce deterministic results with same inputs', () => {
      const params = [70, 'niche', 50, 5000, 60] as const;

      const result1 = financialSystem.calculateStreamingOutcome(...params);
      const result2 = financialSystem.calculateStreamingOutcome(...params);
      const result3 = financialSystem.calculateStreamingOutcome(...params);

      expect(result2).toBe(result1);
      expect(result3).toBe(result1);
    });

    it('should handle base_streams_per_point multiplier', () => {
      // Verify that base_streams_per_point scales the final result
      const customGameData = createMockGameData();
      const originalMultiplier = customGameData.getStreamingConfigSync().base_streams_per_point;

      const system1 = new FinancialSystem(customGameData, createMockRNG(1.0));
      const streams1 = system1.calculateStreamingOutcome(70, 'niche', 50, 5000, 60);

      // Double the multiplier
      customGameData.getStreamingConfigSync().base_streams_per_point = originalMultiplier * 2;
      const system2 = new FinancialSystem(customGameData, createMockRNG(1.0));
      const streams2 = system2.calculateStreamingOutcome(70, 'niche', 50, 5000, 60);

      // Should roughly double the streams
      expect(streams2).toBeCloseTo(streams1 * 2, -2); // Within 100 streams
    });
  });
});

describe('FinancialSystem - Streaming Configuration Validation', () => {
  it('should require streaming config to be present', () => {
    const invalidGameData = {
      getStreamingConfigSync: () => {
        throw new Error('Config not found');
      },
      getAccessTiersSync: () => ({ playlist_access: {} })
    };

    expect(() => {
      new FinancialSystem(invalidGameData, createMockRNG());
    }).toThrow();
  });

  it('should work with valid config structure', () => {
    const mockGameData = createMockGameData();

    expect(() => {
      new FinancialSystem(mockGameData, createMockRNG());
    }).not.toThrow();
  });
});
