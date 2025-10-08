/**
 * Unit Tests for FinancialSystem - VenueCapacityManager
 *
 * Tests the VenueCapacityManager static methods that handle venue capacity
 * calculations, tier detection, and venue categorization.
 *
 * These are pure unit tests - no database required.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VenueCapacityManager } from '@shared/engine/FinancialSystem';

/**
 * Mock gameData based on actual progression.json structure
 * This simulates the real data from data/balance/progression.json
 */
function createMockGameData() {
  const venueAccess = {
    none: {
      threshold: 0,
      capacity_range: [0, 50],
      guarantee_multiplier: 0.3
    },
    clubs: {
      threshold: 5,
      capacity_range: [50, 500],
      guarantee_multiplier: 0.7
    },
    theaters: {
      threshold: 20,
      capacity_range: [500, 2000],
      guarantee_multiplier: 1.0
    },
    arenas: {
      threshold: 45,
      capacity_range: [2000, 20000],
      guarantee_multiplier: 1.5
    }
  };

  return {
    getAccessTiersSync: () => ({
      venue_access: venueAccess
    })
  };
}

describe('VenueCapacityManager - Configuration Reading', () => {
  let mockGameData: any;

  beforeEach(() => {
    mockGameData = createMockGameData();
  });

  describe('getTierRanges()', () => {
    it('should return tier ranges from config', () => {
      const ranges = VenueCapacityManager.getTierRanges(mockGameData);

      expect(ranges).toEqual({
        small: { min: 50, max: 500 },      // clubs
        medium: { min: 500, max: 2000 },   // theaters
        large: { min: 2000, max: 20000 }   // arenas
      });
    });

    it('should read ranges directly from progression.json structure', () => {
      const ranges = VenueCapacityManager.getTierRanges(mockGameData);

      // Verify it matches our mock data structure
      expect(ranges.small.min).toBe(50);
      expect(ranges.small.max).toBe(500);
      expect(ranges.medium.min).toBe(500);
      expect(ranges.medium.max).toBe(2000);
      expect(ranges.large.min).toBe(2000);
      expect(ranges.large.max).toBe(20000);
    });
  });

  describe('getMinimumCapacity()', () => {
    it('should return minimum capacity across all tiers', () => {
      const min = VenueCapacityManager.getMinimumCapacity(mockGameData);
      expect(min).toBe(0); // From 'none' tier
    });

    it('should handle venue configs with different minimums', () => {
      // Test that it finds the absolute minimum across all tiers
      const customGameData = createMockGameData();
      const venueAccess = customGameData.getAccessTiersSync().venue_access;
      venueAccess.clubs.capacity_range = [100, 500];
      venueAccess.none.capacity_range = [25, 50]; // Still lowest

      const min = VenueCapacityManager.getMinimumCapacity(customGameData);
      expect(min).toBe(25);
    });
  });

  describe('getCapacityRangeFromTier()', () => {
    it('should return correct range for clubs tier', () => {
      const range = VenueCapacityManager.getCapacityRangeFromTier('clubs', mockGameData);
      expect(range).toEqual({ min: 50, max: 500 });
    });

    it('should return correct range for theaters tier', () => {
      const range = VenueCapacityManager.getCapacityRangeFromTier('theaters', mockGameData);
      expect(range).toEqual({ min: 500, max: 2000 });
    });

    it('should return correct range for arenas tier', () => {
      const range = VenueCapacityManager.getCapacityRangeFromTier('arenas', mockGameData);
      expect(range).toEqual({ min: 2000, max: 20000 });
    });

    it('should throw error for invalid tier', () => {
      expect(() => {
        VenueCapacityManager.getCapacityRangeFromTier('invalid', mockGameData);
      }).toThrow(/Invalid venue tier/);
    });

    it('should include available tiers in error message', () => {
      expect(() => {
        VenueCapacityManager.getCapacityRangeFromTier('stadiums', mockGameData);
      }).toThrow(/Available:/);
    });
  });
});

describe('VenueCapacityManager - Tier Detection', () => {
  let mockGameData: any;

  beforeEach(() => {
    mockGameData = createMockGameData();
  });

  describe('detectTierFromCapacity()', () => {
    it('should detect none tier for capacity 25', () => {
      const tier = VenueCapacityManager.detectTierFromCapacity(25, mockGameData);
      expect(tier).toBe('none');
    });

    it('should detect first matching tier for boundary capacity 50', () => {
      // Capacity 50 is at the boundary: max of 'none' (0-50) and min of 'clubs' (50-500)
      // Implementation returns first matching tier in object iteration order
      const tier = VenueCapacityManager.detectTierFromCapacity(50, mockGameData);
      expect(tier).toBe('none'); // 'none' comes first in iteration
    });

    it('should detect clubs tier for capacity 51', () => {
      // Use 51 to avoid boundary overlap
      const tier = VenueCapacityManager.detectTierFromCapacity(51, mockGameData);
      expect(tier).toBe('clubs');
    });

    it('should detect clubs tier for capacity 300', () => {
      const tier = VenueCapacityManager.detectTierFromCapacity(300, mockGameData);
      expect(tier).toBe('clubs');
    });

    it('should detect first matching tier for boundary capacity 500', () => {
      // Capacity 500 is at boundary: max of 'clubs' and min of 'theaters'
      const tier = VenueCapacityManager.detectTierFromCapacity(500, mockGameData);
      expect(tier).toBe('clubs'); // 'clubs' comes first in iteration
    });

    it('should detect theaters tier for capacity 501', () => {
      // Use 501 to avoid boundary overlap
      const tier = VenueCapacityManager.detectTierFromCapacity(501, mockGameData);
      expect(tier).toBe('theaters');
    });

    it('should detect theaters tier for capacity 1500', () => {
      const tier = VenueCapacityManager.detectTierFromCapacity(1500, mockGameData);
      expect(tier).toBe('theaters');
    });

    it('should detect first matching tier for boundary capacity 2000', () => {
      // Capacity 2000 is at boundary: max of 'theaters' and min of 'arenas'
      const tier = VenueCapacityManager.detectTierFromCapacity(2000, mockGameData);
      expect(tier).toBe('theaters'); // 'theaters' comes first in iteration
    });

    it('should detect arenas tier for capacity 2001', () => {
      // Use 2001 to avoid boundary overlap
      const tier = VenueCapacityManager.detectTierFromCapacity(2001, mockGameData);
      expect(tier).toBe('arenas');
    });

    it('should detect arenas tier for capacity 10000', () => {
      const tier = VenueCapacityManager.detectTierFromCapacity(10000, mockGameData);
      expect(tier).toBe('arenas');
    });

    it('should throw error for capacity above maximum', () => {
      expect(() => {
        VenueCapacityManager.detectTierFromCapacity(25000, mockGameData);
      }).toThrow(/No tier found/);
    });

    it('should throw error for negative capacity', () => {
      expect(() => {
        VenueCapacityManager.detectTierFromCapacity(-100, mockGameData);
      }).toThrow(/No tier found/);
    });
  });

  describe('getCategoryThresholds()', () => {
    it('should calculate intimate threshold at 40% of club max', () => {
      const thresholds = VenueCapacityManager.getCategoryThresholds(mockGameData);
      // clubs max = 500, so 40% = 200
      expect(thresholds.intimate).toBe(200);
    });

    it('should calculate midSize threshold at 40% of theater max', () => {
      const thresholds = VenueCapacityManager.getCategoryThresholds(mockGameData);
      // theaters max = 2000, so 40% = 800
      expect(thresholds.midSize).toBe(800);
    });

    it('should return rounded integers', () => {
      const thresholds = VenueCapacityManager.getCategoryThresholds(mockGameData);
      expect(Number.isInteger(thresholds.intimate)).toBe(true);
      expect(Number.isInteger(thresholds.midSize)).toBe(true);
    });
  });
});

describe('VenueCapacityManager - Capacity Generation', () => {
  let mockGameData: any;

  beforeEach(() => {
    mockGameData = createMockGameData();
  });

  describe('generateCapacityFromTier()', () => {
    it('should generate capacity within clubs range', () => {
      const mockRng = () => 0.5; // Mid-range
      const capacity = VenueCapacityManager.generateCapacityFromTier('clubs', mockGameData, mockRng);

      expect(capacity).toBeGreaterThanOrEqual(50);
      expect(capacity).toBeLessThanOrEqual(500);
    });

    it('should generate minimum capacity when rng returns 0', () => {
      const mockRng = () => 0; // Minimum
      const capacity = VenueCapacityManager.generateCapacityFromTier('clubs', mockGameData, mockRng);

      expect(capacity).toBe(50);
    });

    it('should generate maximum capacity when rng returns 1', () => {
      const mockRng = () => 1; // Maximum
      const capacity = VenueCapacityManager.generateCapacityFromTier('clubs', mockGameData, mockRng);

      expect(capacity).toBe(500);
    });

    it('should generate mid-range capacity for theaters', () => {
      const mockRng = () => 0.5;
      const capacity = VenueCapacityManager.generateCapacityFromTier('theaters', mockGameData, mockRng);

      // theaters: 500-2000, mid = 1250
      expect(capacity).toBe(1250);
    });

    it('should return integer values', () => {
      const mockRng = () => 0.333;
      const capacity = VenueCapacityManager.generateCapacityFromTier('arenas', mockGameData, mockRng);

      expect(Number.isInteger(capacity)).toBe(true);
    });

    it('should handle different rng values for same tier', () => {
      const capacity1 = VenueCapacityManager.generateCapacityFromTier('clubs', mockGameData, () => 0.1);
      const capacity2 = VenueCapacityManager.generateCapacityFromTier('clubs', mockGameData, () => 0.9);

      expect(capacity1).toBeLessThan(capacity2);
      expect(capacity1).toBeGreaterThanOrEqual(50);
      expect(capacity2).toBeLessThanOrEqual(500);
    });
  });
});

describe('VenueCapacityManager - Validation', () => {
  let mockGameData: any;

  beforeEach(() => {
    mockGameData = createMockGameData();
  });

  describe('validateCapacity()', () => {
    it('should validate capacity 100 without tier constraint', () => {
      expect(() => {
        VenueCapacityManager.validateCapacity(100, undefined, mockGameData);
      }).not.toThrow();
    });

    it('should validate capacity 300 for clubs tier', () => {
      expect(() => {
        VenueCapacityManager.validateCapacity(300, 'clubs', mockGameData);
      }).not.toThrow();
    });

    it('should throw error for capacity below minimum', () => {
      expect(() => {
        VenueCapacityManager.validateCapacity(-10, undefined, mockGameData);
      }).toThrow(/below minimum/);
    });

    it('should throw error for capacity outside tier range', () => {
      expect(() => {
        VenueCapacityManager.validateCapacity(1000, 'clubs', mockGameData);
      }).toThrow(/outside clubs range/);
    });

    it('should throw error when gameData is missing', () => {
      expect(() => {
        VenueCapacityManager.validateCapacity(100, undefined, undefined);
      }).toThrow(/GameData required/);
    });

    it('should validate minimum capacity for tier', () => {
      expect(() => {
        VenueCapacityManager.validateCapacity(50, 'clubs', mockGameData);
      }).not.toThrow();
    });

    it('should validate maximum capacity for tier', () => {
      expect(() => {
        VenueCapacityManager.validateCapacity(500, 'clubs', mockGameData);
      }).not.toThrow();
    });

    it('should reject capacity below tier minimum', () => {
      expect(() => {
        VenueCapacityManager.validateCapacity(49, 'clubs', mockGameData);
      }).toThrow(/outside clubs range/);
    });

    it('should reject capacity above tier maximum', () => {
      expect(() => {
        VenueCapacityManager.validateCapacity(501, 'clubs', mockGameData);
      }).toThrow(/outside clubs range/);
    });
  });
});

describe('VenueCapacityManager - Position Calculations', () => {
  let mockGameData: any;

  beforeEach(() => {
    mockGameData = createMockGameData();
  });

  describe('calculatePositionInTier()', () => {
    it('should calculate position 0 at minimum capacity', () => {
      const position = VenueCapacityManager.calculatePositionInTier(0, undefined, mockGameData);
      expect(position).toBe(0);
    });

    it('should calculate position 1.0 at maximum club capacity', () => {
      const position = VenueCapacityManager.calculatePositionInTier(500, 'clubs', mockGameData);
      expect(position).toBe(1.0);
    });

    it('should calculate position 0.5 at mid-range club capacity', () => {
      // clubs: 50-500, mid = 275
      // position = (275 - 0) / (500 - 0) = 0.55
      const position = VenueCapacityManager.calculatePositionInTier(275, 'clubs', mockGameData);
      expect(position).toBeCloseTo(0.55, 2);
    });

    it('should throw error when gameData is missing', () => {
      expect(() => {
        VenueCapacityManager.calculatePositionInTier(100, undefined, undefined);
      }).toThrow(/GameData required/);
    });

    it('should calculate position for theater tier', () => {
      // theaters: 500-2000
      // min capacity = 0, max in tier = 2000
      // position = (1000 - 0) / (2000 - 0) = 0.5
      const position = VenueCapacityManager.calculatePositionInTier(1000, 'theaters', mockGameData);
      expect(position).toBe(0.5);
    });

    it('should auto-detect tier when not provided', () => {
      // Capacity 300 is in clubs tier (50-500)
      const position = VenueCapacityManager.calculatePositionInTier(300, undefined, mockGameData);
      expect(position).toBeGreaterThan(0);
      expect(position).toBeLessThan(1);
    });
  });
});

describe('VenueCapacityManager - Venue Categorization', () => {
  let mockGameData: any;

  beforeEach(() => {
    mockGameData = createMockGameData();
  });

  describe('categorizeVenue()', () => {
    it('should categorize small capacity as Intimate Club', () => {
      const result = VenueCapacityManager.categorizeVenue(100, mockGameData);

      expect(result.category).toBe('Intimate Club');
      expect(result.riskLevel).toBe('low');
      expect(result.description).toContain('Small');
      expect(result.advice).toContain('Lower revenue');
    });

    it('should categorize medium capacity as Mid-Size Venue', () => {
      const result = VenueCapacityManager.categorizeVenue(400, mockGameData);

      expect(result.category).toBe('Mid-Size Venue');
      expect(result.riskLevel).toBe('medium');
      expect(result.description).toContain('Balanced');
      expect(result.advice).toContain('Balanced risk');
    });

    it('should categorize large capacity as Large Venue', () => {
      const result = VenueCapacityManager.categorizeVenue(1500, mockGameData);

      expect(result.category).toBe('Large Venue');
      expect(result.riskLevel).toBe('high');
      expect(result.description).toContain('High capacity');
      expect(result.advice).toContain('High revenue potential');
    });

    it('should categorize at intimate threshold boundary', () => {
      // Threshold = 200 (40% of 500)
      const resultBelow = VenueCapacityManager.categorizeVenue(200, mockGameData);
      const resultAbove = VenueCapacityManager.categorizeVenue(201, mockGameData);

      expect(resultBelow.category).toBe('Intimate Club');
      expect(resultAbove.category).toBe('Mid-Size Venue');
    });

    it('should categorize at midSize threshold boundary', () => {
      // Threshold = 800 (40% of 2000)
      const resultBelow = VenueCapacityManager.categorizeVenue(800, mockGameData);
      const resultAbove = VenueCapacityManager.categorizeVenue(801, mockGameData);

      expect(resultBelow.category).toBe('Mid-Size Venue');
      expect(resultAbove.category).toBe('Large Venue');
    });

    it('should include advice for all categories', () => {
      const intimate = VenueCapacityManager.categorizeVenue(100, mockGameData);
      const midSize = VenueCapacityManager.categorizeVenue(400, mockGameData);
      const large = VenueCapacityManager.categorizeVenue(1500, mockGameData);

      expect(intimate.advice).toBeTruthy();
      expect(midSize.advice).toBeTruthy();
      expect(large.advice).toBeTruthy();
    });

    it('should have appropriate risk levels for categories', () => {
      const intimate = VenueCapacityManager.categorizeVenue(100, mockGameData);
      const midSize = VenueCapacityManager.categorizeVenue(400, mockGameData);
      const large = VenueCapacityManager.categorizeVenue(1500, mockGameData);

      expect(intimate.riskLevel).toBe('low');
      expect(midSize.riskLevel).toBe('medium');
      expect(large.riskLevel).toBe('high');
    });
  });
});

describe('VenueCapacityManager - Edge Cases', () => {
  let mockGameData: any;

  beforeEach(() => {
    mockGameData = createMockGameData();
  });

  it('should handle capacity exactly at tier boundaries', () => {
    // Boundary values match first tier in iteration order (overlapping ranges)
    expect(VenueCapacityManager.detectTierFromCapacity(50, mockGameData)).toBe('none');
    expect(VenueCapacityManager.detectTierFromCapacity(500, mockGameData)).toBe('clubs');
    expect(VenueCapacityManager.detectTierFromCapacity(2000, mockGameData)).toBe('theaters');
  });

  it('should handle capacity just above tier boundaries', () => {
    // Non-boundary values clearly in next tier
    expect(VenueCapacityManager.detectTierFromCapacity(51, mockGameData)).toBe('clubs');
    expect(VenueCapacityManager.detectTierFromCapacity(501, mockGameData)).toBe('theaters');
    expect(VenueCapacityManager.detectTierFromCapacity(2001, mockGameData)).toBe('arenas');
  });

  it('should handle zero capacity', () => {
    const tier = VenueCapacityManager.detectTierFromCapacity(0, mockGameData);
    expect(tier).toBe('none');
  });

  it('should handle maximum arena capacity', () => {
    const tier = VenueCapacityManager.detectTierFromCapacity(20000, mockGameData);
    expect(tier).toBe('arenas');
  });

  it('should validate capacity with all tier names from config', () => {
    // Should not throw for any valid tier name from progression.json
    expect(() => VenueCapacityManager.validateCapacity(25, 'none', mockGameData)).not.toThrow();
    expect(() => VenueCapacityManager.validateCapacity(100, 'clubs', mockGameData)).not.toThrow();
    expect(() => VenueCapacityManager.validateCapacity(1000, 'theaters', mockGameData)).not.toThrow();
    expect(() => VenueCapacityManager.validateCapacity(5000, 'arenas', mockGameData)).not.toThrow();
  });
});
