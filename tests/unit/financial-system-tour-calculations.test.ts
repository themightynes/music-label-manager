/**
 * Unit Tests for FinancialSystem - Tour Calculations
 *
 * Tests tour revenue, cost, and sell-through rate calculations.
 * These are the core financial calculations for tour planning and execution.
 *
 * Pure unit tests - no database required.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FinancialSystem } from '@shared/engine/FinancialSystem';
import type { TourCalculationParams } from '@shared/engine/FinancialSystem';

/**
 * Mock gameData with tour configuration from markets.json
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

  const tourConfig = {
    sell_through_base: 0.15,
    reputation_modifier: 0.05,
    local_popularity_weight: 0.6,
    merch_percentage: 0.15,
    ticket_price_base: 25,
    ticket_price_per_capacity: 0.03
  };

  return {
    getAccessTiersSync: () => ({
      venue_access: venueAccess
    }),
    getTourConfigSync: () => tourConfig
  };
}

/**
 * Mock RNG that returns predictable values
 */
function createMockRNG(value: number = 0.5) {
  return () => value;
}

describe('FinancialSystem - Tour Parameter Validation', () => {
  let financialSystem: FinancialSystem;
  let mockGameData: any;

  beforeEach(() => {
    mockGameData = createMockGameData();
    financialSystem = new FinancialSystem(mockGameData, createMockRNG());
  });

  describe('validateTourParameters()', () => {
    it('should accept valid tour parameters', () => {
      const params: TourCalculationParams = {
        venueCapacity: 200,
        venueTier: 'clubs',
        artistPopularity: 50,
        localReputation: 30,
        cities: 5,
        marketingBudget: 10000
      };

      expect(() => financialSystem.validateTourParameters(params)).not.toThrow();
    });

    it('should reject invalid venue tier', () => {
      const params: TourCalculationParams = {
        venueCapacity: 200,
        venueTier: 'none',
        artistPopularity: 50,
        localReputation: 30,
        cities: 5,
        marketingBudget: 10000
      };

      expect(() => financialSystem.validateTourParameters(params)).toThrow(/Invalid venue tier/);
    });

    it('should reject missing venue tier', () => {
      const params: TourCalculationParams = {
        venueCapacity: 200,
        venueTier: undefined as any,
        artistPopularity: 50,
        localReputation: 30,
        cities: 5,
        marketingBudget: 10000
      };

      expect(() => financialSystem.validateTourParameters(params)).toThrow(/Invalid venue tier/);
    });

    it('should reject negative artist popularity', () => {
      const params: TourCalculationParams = {
        venueCapacity: 200,
        venueTier: 'clubs',
        artistPopularity: -10,
        localReputation: 30,
        cities: 5,
        marketingBudget: 10000
      };

      expect(() => financialSystem.validateTourParameters(params)).toThrow(/Invalid artist popularity/);
    });

    it('should reject artist popularity above 100', () => {
      const params: TourCalculationParams = {
        venueCapacity: 200,
        venueTier: 'clubs',
        artistPopularity: 150,
        localReputation: 30,
        cities: 5,
        marketingBudget: 10000
      };

      expect(() => financialSystem.validateTourParameters(params)).toThrow(/Invalid artist popularity/);
    });

    it('should reject negative reputation', () => {
      const params: TourCalculationParams = {
        venueCapacity: 200,
        venueTier: 'clubs',
        artistPopularity: 50,
        localReputation: -5,
        cities: 5,
        marketingBudget: 10000
      };

      expect(() => financialSystem.validateTourParameters(params)).toThrow(/Invalid reputation/);
    });

    it('should reject zero cities', () => {
      const params: TourCalculationParams = {
        venueCapacity: 200,
        venueTier: 'clubs',
        artistPopularity: 50,
        localReputation: 30,
        cities: 0,
        marketingBudget: 10000
      };

      expect(() => financialSystem.validateTourParameters(params)).toThrow(/Invalid cities count/);
    });

    it('should reject more than 10 cities', () => {
      const params: TourCalculationParams = {
        venueCapacity: 200,
        venueTier: 'clubs',
        artistPopularity: 50,
        localReputation: 30,
        cities: 15,
        marketingBudget: 10000
      };

      expect(() => financialSystem.validateTourParameters(params)).toThrow(/Invalid cities count/);
    });

    it('should reject negative marketing budget', () => {
      const params: TourCalculationParams = {
        venueCapacity: 200,
        venueTier: 'clubs',
        artistPopularity: 50,
        localReputation: 30,
        cities: 5,
        marketingBudget: -1000
      };

      expect(() => financialSystem.validateTourParameters(params)).toThrow(/Invalid marketing budget/);
    });

    it('should accept zero marketing budget', () => {
      const params: TourCalculationParams = {
        venueCapacity: 200,
        venueTier: 'clubs',
        artistPopularity: 50,
        localReputation: 30,
        cities: 5,
        marketingBudget: 0
      };

      expect(() => financialSystem.validateTourParameters(params)).not.toThrow();
    });

    it('should accept maximum valid values', () => {
      const params: TourCalculationParams = {
        venueCapacity: 500,
        venueTier: 'clubs',
        artistPopularity: 100,
        localReputation: 100,
        cities: 10,
        marketingBudget: 50000
      };

      expect(() => financialSystem.validateTourParameters(params)).not.toThrow();
    });
  });
});

describe('FinancialSystem - Tour Breakdown Calculation', () => {
  let financialSystem: FinancialSystem;
  let mockGameData: any;

  beforeEach(() => {
    mockGameData = createMockGameData();
    financialSystem = new FinancialSystem(mockGameData, createMockRNG(0.5));
  });

  describe('calculateDetailedTourBreakdown()', () => {
    it('should calculate tour breakdown with all required fields', () => {
      const params: TourCalculationParams = {
        venueCapacity: 200,
        venueTier: 'clubs',
        artistPopularity: 50,
        localReputation: 30,
        cities: 5,
        marketingBudget: 10000
      };

      const breakdown = financialSystem.calculateDetailedTourBreakdown(params);

      expect(breakdown).toHaveProperty('totalRevenue');
      expect(breakdown).toHaveProperty('totalCosts');
      expect(breakdown).toHaveProperty('netProfit');
      expect(breakdown).toHaveProperty('cities');
      expect(breakdown).toHaveProperty('costBreakdown');
      expect(breakdown).toHaveProperty('sellThroughAnalysis');
    });

    it('should calculate net profit correctly', () => {
      const params: TourCalculationParams = {
        venueCapacity: 200,
        venueTier: 'clubs',
        artistPopularity: 50,
        localReputation: 30,
        cities: 5,
        marketingBudget: 10000
      };

      const breakdown = financialSystem.calculateDetailedTourBreakdown(params);

      expect(breakdown.netProfit).toBe(breakdown.totalRevenue - breakdown.totalCosts);
    });

    it('should generate city breakdowns for each city', () => {
      const params: TourCalculationParams = {
        venueCapacity: 200,
        venueTier: 'clubs',
        artistPopularity: 50,
        localReputation: 30,
        cities: 5,
        marketingBudget: 10000
      };

      const breakdown = financialSystem.calculateDetailedTourBreakdown(params);

      expect(breakdown.cities).toHaveLength(5);
      expect(breakdown.cities[0].cityNumber).toBe(1);
      expect(breakdown.cities[4].cityNumber).toBe(5);
    });

    it('should include sell-through analysis', () => {
      const params: TourCalculationParams = {
        venueCapacity: 200,
        venueTier: 'clubs',
        artistPopularity: 50,
        localReputation: 30,
        cities: 5,
        marketingBudget: 10000
      };

      const breakdown = financialSystem.calculateDetailedTourBreakdown(params);

      expect(breakdown.sellThroughAnalysis).toHaveProperty('baseRate');
      expect(breakdown.sellThroughAnalysis).toHaveProperty('reputationBonus');
      expect(breakdown.sellThroughAnalysis).toHaveProperty('popularityBonus');
      expect(breakdown.sellThroughAnalysis).toHaveProperty('budgetQualityBonus');
      expect(breakdown.sellThroughAnalysis).toHaveProperty('finalRate');
    });

    it('should cap sell-through rate at 1.0', () => {
      const params: TourCalculationParams = {
        venueCapacity: 100, // Small venue
        venueTier: 'clubs',
        artistPopularity: 100, // Max popularity
        localReputation: 100, // Max reputation
        cities: 5,
        marketingBudget: 50000 // High marketing
      };

      const breakdown = financialSystem.calculateDetailedTourBreakdown(params);

      expect(breakdown.sellThroughAnalysis.finalRate).toBeLessThanOrEqual(1.0);
    });

    it('should have higher revenue with higher popularity', () => {
      const lowPopParams: TourCalculationParams = {
        venueCapacity: 200,
        venueTier: 'clubs',
        artistPopularity: 20,
        localReputation: 30,
        cities: 5,
        marketingBudget: 10000
      };

      const highPopParams: TourCalculationParams = {
        ...lowPopParams,
        artistPopularity: 80
      };

      const lowBreakdown = financialSystem.calculateDetailedTourBreakdown(lowPopParams);
      const highBreakdown = financialSystem.calculateDetailedTourBreakdown(highPopParams);

      expect(highBreakdown.totalRevenue).toBeGreaterThan(lowBreakdown.totalRevenue);
    });

    it('should have higher costs with more cities', () => {
      const fewCities: TourCalculationParams = {
        venueCapacity: 200,
        venueTier: 'clubs',
        artistPopularity: 50,
        localReputation: 30,
        cities: 3,
        marketingBudget: 10000
      };

      const manyCities: TourCalculationParams = {
        ...fewCities,
        cities: 8
      };

      const fewBreakdown = financialSystem.calculateDetailedTourBreakdown(fewCities);
      const manyBreakdown = financialSystem.calculateDetailedTourBreakdown(manyCities);

      expect(manyBreakdown.totalCosts).toBeGreaterThan(fewBreakdown.totalCosts);
    });
  });

  describe('City Breakdown Details', () => {
    it('should calculate consistent sell-through rate across all cities', () => {
      const params: TourCalculationParams = {
        venueCapacity: 200,
        venueTier: 'clubs',
        artistPopularity: 50,
        localReputation: 30,
        cities: 5,
        marketingBudget: 10000
      };

      const breakdown = financialSystem.calculateDetailedTourBreakdown(params);

      // All cities should have same sell-through rate
      const firstRate = breakdown.cities[0].sellThroughRate;
      breakdown.cities.forEach(city => {
        expect(city.sellThroughRate).toBe(firstRate);
      });
    });

    it('should include all required city breakdown fields', () => {
      const params: TourCalculationParams = {
        venueCapacity: 200,
        venueTier: 'clubs',
        artistPopularity: 50,
        localReputation: 30,
        cities: 3,
        marketingBudget: 10000
      };

      const breakdown = financialSystem.calculateDetailedTourBreakdown(params);
      const city = breakdown.cities[0];

      expect(city).toHaveProperty('cityNumber');
      expect(city).toHaveProperty('venueCapacity');
      expect(city).toHaveProperty('sellThroughRate');
      expect(city).toHaveProperty('ticketRevenue');
      expect(city).toHaveProperty('merchRevenue');
      expect(city).toHaveProperty('totalRevenue');
      expect(city).toHaveProperty('venueFee');
      expect(city).toHaveProperty('productionFee');
      expect(city).toHaveProperty('marketingCost');
      expect(city).toHaveProperty('totalCosts');
      expect(city).toHaveProperty('profit');
    });

    it('should calculate city profit correctly', () => {
      const params: TourCalculationParams = {
        venueCapacity: 200,
        venueTier: 'clubs',
        artistPopularity: 50,
        localReputation: 30,
        cities: 3,
        marketingBudget: 10000
      };

      const breakdown = financialSystem.calculateDetailedTourBreakdown(params);
      const city = breakdown.cities[0];

      expect(city.profit).toBe(city.totalRevenue - city.totalCosts);
    });

    it('should split marketing budget evenly across cities', () => {
      const totalMarketing = 10000;
      const numCities = 5;

      const params: TourCalculationParams = {
        venueCapacity: 200,
        venueTier: 'clubs',
        artistPopularity: 50,
        localReputation: 30,
        cities: numCities,
        marketingBudget: totalMarketing
      };

      const breakdown = financialSystem.calculateDetailedTourBreakdown(params);

      const expectedPerCity = totalMarketing / numCities;
      breakdown.cities.forEach(city => {
        expect(city.marketingCost).toBe(expectedPerCity);
      });
    });

    it('should have zero marketing cost when budget is zero', () => {
      const params: TourCalculationParams = {
        venueCapacity: 200,
        venueTier: 'clubs',
        artistPopularity: 50,
        localReputation: 30,
        cities: 5,
        marketingBudget: 0
      };

      const breakdown = financialSystem.calculateDetailedTourBreakdown(params);

      breakdown.cities.forEach(city => {
        expect(city.marketingCost).toBe(0);
      });
    });
  });
});

describe('FinancialSystem - Tour Cost Calculations', () => {
  let financialSystem: FinancialSystem;
  let mockGameData: any;

  beforeEach(() => {
    mockGameData = createMockGameData();
    financialSystem = new FinancialSystem(mockGameData, createMockRNG());
  });

  it('should have higher costs for larger venues', () => {
    const smallVenue: TourCalculationParams = {
      venueCapacity: 100,
      venueTier: 'clubs',
      artistPopularity: 50,
      localReputation: 30,
      cities: 5,
      marketingBudget: 10000
    };

    const largeVenue: TourCalculationParams = {
      ...smallVenue,
      venueCapacity: 400
    };

    const smallBreakdown = financialSystem.calculateDetailedTourBreakdown(smallVenue);
    const largeBreakdown = financialSystem.calculateDetailedTourBreakdown(largeVenue);

    // Larger venues should have higher venue fees and production costs
    expect(largeBreakdown.costBreakdown.venueFees).toBeGreaterThan(smallBreakdown.costBreakdown.venueFees);
    expect(largeBreakdown.costBreakdown.productionFees).toBeGreaterThan(smallBreakdown.costBreakdown.productionFees);
  });

  it('should include marketing budget in total costs', () => {
    const params: TourCalculationParams = {
      venueCapacity: 200,
      venueTier: 'clubs',
      artistPopularity: 50,
      localReputation: 30,
      cities: 5,
      marketingBudget: 10000
    };

    const breakdown = financialSystem.calculateDetailedTourBreakdown(params);

    expect(breakdown.costBreakdown.marketingBudget).toBe(10000);
  });

  it('should calculate total costs as sum of all cost components', () => {
    const params: TourCalculationParams = {
      venueCapacity: 200,
      venueTier: 'clubs',
      artistPopularity: 50,
      localReputation: 30,
      cities: 5,
      marketingBudget: 10000
    };

    const breakdown = financialSystem.calculateDetailedTourBreakdown(params);
    const costs = breakdown.costBreakdown;

    const expectedTotal = costs.venueFees + costs.productionFees + costs.marketingBudget;

    expect(costs.totalCosts).toBe(expectedTotal);
  });
});

describe('FinancialSystem - Sell-Through Rate Calculations', () => {
  let financialSystem: FinancialSystem;
  let mockGameData: any;

  beforeEach(() => {
    mockGameData = createMockGameData();
    financialSystem = new FinancialSystem(mockGameData, createMockRNG());
  });

  it('should have base rate from config', () => {
    const params: TourCalculationParams = {
      venueCapacity: 200,
      venueTier: 'clubs',
      artistPopularity: 0, // Zero out bonuses
      localReputation: 0,
      cities: 5,
      marketingBudget: 0
    };

    const breakdown = financialSystem.calculateDetailedTourBreakdown(params);
    const config = mockGameData.getTourConfigSync();

    // With zero bonuses, should be close to base rate (plus venue size modifier)
    expect(breakdown.sellThroughAnalysis.baseRate).toBe(config.sell_through_base);
  });

  it('should increase sell-through with higher reputation', () => {
    const lowRep: TourCalculationParams = {
      venueCapacity: 200,
      venueTier: 'clubs',
      artistPopularity: 50,
      localReputation: 10,
      cities: 5,
      marketingBudget: 10000
    };

    const highRep: TourCalculationParams = {
      ...lowRep,
      localReputation: 80
    };

    const lowBreakdown = financialSystem.calculateDetailedTourBreakdown(lowRep);
    const highBreakdown = financialSystem.calculateDetailedTourBreakdown(highRep);

    expect(highBreakdown.sellThroughAnalysis.reputationBonus)
      .toBeGreaterThan(lowBreakdown.sellThroughAnalysis.reputationBonus);

    expect(highBreakdown.sellThroughAnalysis.finalRate)
      .toBeGreaterThan(lowBreakdown.sellThroughAnalysis.finalRate);
  });

  it('should increase sell-through with higher popularity', () => {
    const lowPop: TourCalculationParams = {
      venueCapacity: 200,
      venueTier: 'clubs',
      artistPopularity: 20,
      localReputation: 30,
      cities: 5,
      marketingBudget: 10000
    };

    const highPop: TourCalculationParams = {
      ...lowPop,
      artistPopularity: 90
    };

    const lowBreakdown = financialSystem.calculateDetailedTourBreakdown(lowPop);
    const highBreakdown = financialSystem.calculateDetailedTourBreakdown(highPop);

    expect(highBreakdown.sellThroughAnalysis.popularityBonus)
      .toBeGreaterThan(lowBreakdown.sellThroughAnalysis.popularityBonus);

    expect(highBreakdown.sellThroughAnalysis.finalRate)
      .toBeGreaterThan(lowBreakdown.sellThroughAnalysis.finalRate);
  });

  it('should increase sell-through with higher marketing budget', () => {
    const lowBudget: TourCalculationParams = {
      venueCapacity: 200,
      venueTier: 'clubs',
      artistPopularity: 50,
      localReputation: 30,
      cities: 5,
      marketingBudget: 1000
    };

    const highBudget: TourCalculationParams = {
      ...lowBudget,
      marketingBudget: 20000
    };

    const lowBreakdown = financialSystem.calculateDetailedTourBreakdown(lowBudget);
    const highBreakdown = financialSystem.calculateDetailedTourBreakdown(highBudget);

    expect(highBreakdown.sellThroughAnalysis.budgetQualityBonus)
      .toBeGreaterThan(lowBreakdown.sellThroughAnalysis.budgetQualityBonus);

    expect(highBreakdown.sellThroughAnalysis.finalRate)
      .toBeGreaterThan(lowBreakdown.sellThroughAnalysis.finalRate);
  });

  it('should never exceed 100% sell-through rate', () => {
    const maxParams: TourCalculationParams = {
      venueCapacity: 100, // Small venue helps
      venueTier: 'clubs',
      artistPopularity: 100,
      localReputation: 100,
      cities: 5,
      marketingBudget: 100000 // Huge budget
    };

    const breakdown = financialSystem.calculateDetailedTourBreakdown(maxParams);

    expect(breakdown.sellThroughAnalysis.finalRate).toBeLessThanOrEqual(1.0);
  });
});

describe('FinancialSystem - Tour Estimate', () => {
  let financialSystem: FinancialSystem;
  let mockGameData: any;

  beforeEach(() => {
    mockGameData = createMockGameData();
    financialSystem = new FinancialSystem(mockGameData, createMockRNG());
  });

  describe('calculateTourEstimate()', () => {
    it('should return tour estimate with required fields', () => {
      const params: TourCalculationParams = {
        venueCapacity: 200,
        venueTier: 'clubs',
        artistPopularity: 50,
        localReputation: 30,
        cities: 5,
        marketingBudget: 10000
      };

      const estimate = financialSystem.calculateTourEstimate(params);

      expect(estimate).toHaveProperty('estimatedRevenue');
      expect(estimate).toHaveProperty('totalCosts');
      expect(estimate).toHaveProperty('estimatedProfit');
      expect(estimate).toHaveProperty('roi');
      expect(estimate).toHaveProperty('canAfford');
      expect(estimate).toHaveProperty('breakdown');
      expect(estimate).toHaveProperty('sellThroughRate');
    });

    it('should calculate ROI correctly', () => {
      const params: TourCalculationParams = {
        venueCapacity: 200,
        venueTier: 'clubs',
        artistPopularity: 50,
        localReputation: 30,
        cities: 5,
        marketingBudget: 10000
      };

      const estimate = financialSystem.calculateTourEstimate(params);

      const expectedROI = (estimate.estimatedProfit / estimate.totalCosts) * 100;
      expect(estimate.roi).toBeCloseTo(expectedROI, 2);
    });

    it('should have consistent values with detailed breakdown', () => {
      const params: TourCalculationParams = {
        venueCapacity: 200,
        venueTier: 'clubs',
        artistPopularity: 50,
        localReputation: 30,
        cities: 5,
        marketingBudget: 10000
      };

      const estimate = financialSystem.calculateTourEstimate(params);
      const breakdown = financialSystem.calculateDetailedTourBreakdown(params);

      expect(estimate.estimatedRevenue).toBe(breakdown.totalRevenue);
      expect(estimate.totalCosts).toBe(breakdown.totalCosts);
      expect(estimate.estimatedProfit).toBe(breakdown.netProfit);
      expect(estimate.sellThroughRate).toBe(breakdown.sellThroughAnalysis.finalRate);
    });

    it('should handle zero costs scenario', () => {
      // This shouldn't happen in practice, but test defensive programming
      const params: TourCalculationParams = {
        venueCapacity: 0,
        venueTier: 'clubs',
        artistPopularity: 50,
        localReputation: 30,
        cities: 1,
        marketingBudget: 0
      };

      // Should not throw on division by zero
      expect(() => financialSystem.calculateTourEstimate(params)).not.toThrow();
    });

    it('should calculate negative ROI for unprofitable tour', () => {
      const params: TourCalculationParams = {
        venueCapacity: 100, // Small venue
        venueTier: 'clubs',
        artistPopularity: 10, // Low popularity
        localReputation: 5, // Low reputation
        cities: 10, // Many cities = high costs
        marketingBudget: 50000 // High marketing spend
      };

      const estimate = financialSystem.calculateTourEstimate(params);

      // Should lose money with low sell-through and high costs
      expect(estimate.estimatedProfit).toBeLessThan(0);
      expect(estimate.roi).toBeLessThan(0);
    });
  });
});

describe('FinancialSystem - Edge Cases', () => {
  let financialSystem: FinancialSystem;
  let mockGameData: any;

  beforeEach(() => {
    mockGameData = createMockGameData();
    financialSystem = new FinancialSystem(mockGameData, createMockRNG());
  });

  it('should handle minimum valid tour (1 city, minimal stats)', () => {
    const params: TourCalculationParams = {
      venueCapacity: 51, // Just above clubs minimum
      venueTier: 'clubs',
      artistPopularity: 0,
      localReputation: 0,
      cities: 1,
      marketingBudget: 0
    };

    const breakdown = financialSystem.calculateDetailedTourBreakdown(params);

    expect(breakdown.cities).toHaveLength(1);
    expect(breakdown.totalRevenue).toBeGreaterThanOrEqual(0);
    expect(breakdown.totalCosts).toBeGreaterThan(0);
  });

  it('should handle maximum valid tour (10 cities, max stats)', () => {
    const params: TourCalculationParams = {
      venueCapacity: 500, // Clubs maximum
      venueTier: 'clubs',
      artistPopularity: 100,
      localReputation: 100,
      cities: 10,
      marketingBudget: 100000
    };

    const breakdown = financialSystem.calculateDetailedTourBreakdown(params);

    expect(breakdown.cities).toHaveLength(10);
    expect(breakdown.totalRevenue).toBeGreaterThan(0);
    expect(breakdown.sellThroughAnalysis.finalRate).toBeLessThanOrEqual(1.0);
  });

  it('should handle very large venue capacity', () => {
    const params: TourCalculationParams = {
      venueCapacity: 10000, // Large arena
      venueTier: 'arenas',
      artistPopularity: 80,
      localReputation: 70,
      cities: 5,
      marketingBudget: 50000
    };

    const breakdown = financialSystem.calculateDetailedTourBreakdown(params);

    expect(breakdown.totalRevenue).toBeGreaterThan(0);
    expect(breakdown.costBreakdown.venueFees).toBeGreaterThan(0);
  });

  it('should produce consistent results with same inputs', () => {
    const params: TourCalculationParams = {
      venueCapacity: 200,
      venueTier: 'clubs',
      artistPopularity: 50,
      localReputation: 30,
      cities: 5,
      marketingBudget: 10000
    };

    const breakdown1 = financialSystem.calculateDetailedTourBreakdown(params);
    const breakdown2 = financialSystem.calculateDetailedTourBreakdown(params);

    expect(breakdown1.totalRevenue).toBe(breakdown2.totalRevenue);
    expect(breakdown1.totalCosts).toBe(breakdown2.totalCosts);
    expect(breakdown1.netProfit).toBe(breakdown2.netProfit);
  });
});
