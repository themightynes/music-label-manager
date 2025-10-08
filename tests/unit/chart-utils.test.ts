/**
 * Unit Tests for chartUtils
 *
 * Tests all pure utility functions for chart position calculations,
 * formatting, and display logic.
 *
 * Pure unit tests - no dependencies required.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateChartMovement,
  formatChartPosition,
  formatChartMovement,
  getChartTier,
  isValidChartPosition,
  getChartPositionOrdinal,
  formatStreamCount,
  formatWeeksOnChart,
  getChartExitRisk,
  isSignificantMovement
} from '@shared/utils/chartUtils';

describe('chartUtils - Chart Movement', () => {
  describe('calculateChartMovement()', () => {
    it('should return 0 when currentPosition is null', () => {
      expect(calculateChartMovement(null, 50)).toBe(0);
    });

    it('should return 0 when previousPosition is null (debut)', () => {
      expect(calculateChartMovement(10, null)).toBe(0);
    });

    it('should return positive for upward movement', () => {
      // Moved from #50 to #30 (up 20 positions)
      expect(calculateChartMovement(30, 50)).toBe(20);
    });

    it('should return negative for downward movement', () => {
      // Moved from #20 to #40 (down 20 positions)
      expect(calculateChartMovement(40, 20)).toBe(-20);
    });

    it('should return 0 for no movement', () => {
      expect(calculateChartMovement(25, 25)).toBe(0);
    });

    it('should handle movement to #1', () => {
      expect(calculateChartMovement(1, 10)).toBe(9);
    });

    it('should handle movement from #1', () => {
      expect(calculateChartMovement(10, 1)).toBe(-9);
    });
  });

  describe('formatChartMovement()', () => {
    it('should return "—" for no movement', () => {
      expect(formatChartMovement(0)).toBe('—');
    });

    it('should return up arrow for positive movement', () => {
      expect(formatChartMovement(5)).toBe('↑5');
      expect(formatChartMovement(20)).toBe('↑20');
    });

    it('should return down arrow for negative movement', () => {
      expect(formatChartMovement(-5)).toBe('↓5');
      expect(formatChartMovement(-20)).toBe('↓20');
    });
  });

  describe('isSignificantMovement()', () => {
    it('should return true for movement >= 5', () => {
      expect(isSignificantMovement(5)).toBe(true);
      expect(isSignificantMovement(10)).toBe(true);
      expect(isSignificantMovement(-5)).toBe(true);
      expect(isSignificantMovement(-10)).toBe(true);
    });

    it('should return false for movement < 5', () => {
      expect(isSignificantMovement(4)).toBe(false);
      expect(isSignificantMovement(-4)).toBe(false);
      expect(isSignificantMovement(0)).toBe(false);
    });
  });
});

describe('chartUtils - Position Formatting', () => {
  describe('formatChartPosition()', () => {
    it('should format valid positions with #', () => {
      expect(formatChartPosition(1)).toBe('#1');
      expect(formatChartPosition(50)).toBe('#50');
      expect(formatChartPosition(100)).toBe('#100');
    });

    it('should return "NC" for null position', () => {
      expect(formatChartPosition(null)).toBe('NC');
    });
  });

  describe('getChartPositionOrdinal()', () => {
    it('should format 1st correctly', () => {
      expect(getChartPositionOrdinal(1)).toBe('1st');
    });

    it('should format 2nd correctly', () => {
      expect(getChartPositionOrdinal(2)).toBe('2nd');
    });

    it('should format 3rd correctly', () => {
      expect(getChartPositionOrdinal(3)).toBe('3rd');
    });

    it('should format 4th-10th correctly', () => {
      expect(getChartPositionOrdinal(4)).toBe('4th');
      expect(getChartPositionOrdinal(5)).toBe('5th');
      expect(getChartPositionOrdinal(10)).toBe('10th');
    });

    it('should handle 11th-13th correctly', () => {
      expect(getChartPositionOrdinal(11)).toBe('11th');
      expect(getChartPositionOrdinal(12)).toBe('12th');
      expect(getChartPositionOrdinal(13)).toBe('13th');
    });

    it('should handle 21st, 22nd, 23rd correctly', () => {
      expect(getChartPositionOrdinal(21)).toBe('21st');
      expect(getChartPositionOrdinal(22)).toBe('22nd');
      expect(getChartPositionOrdinal(23)).toBe('23rd');
    });

    it('should handle 101st correctly', () => {
      expect(getChartPositionOrdinal(101)).toBe('101st');
    });

    it('should return "NC" for null', () => {
      expect(getChartPositionOrdinal(null)).toBe('NC');
    });
  });
});

describe('chartUtils - Chart Tiers', () => {
  describe('getChartTier()', () => {
    it('should return "Top 10" for positions 1-10', () => {
      expect(getChartTier(1)).toBe('Top 10');
      expect(getChartTier(5)).toBe('Top 10');
      expect(getChartTier(10)).toBe('Top 10');
    });

    it('should return "Top 40" for positions 11-40', () => {
      expect(getChartTier(11)).toBe('Top 40');
      expect(getChartTier(25)).toBe('Top 40');
      expect(getChartTier(40)).toBe('Top 40');
    });

    it('should return "Top 100" for positions 41-100', () => {
      expect(getChartTier(41)).toBe('Top 100');
      expect(getChartTier(75)).toBe('Top 100');
      expect(getChartTier(100)).toBe('Top 100');
    });

    it('should return "Bubbling Under" for positions > 100', () => {
      expect(getChartTier(101)).toBe('Bubbling Under');
      expect(getChartTier(200)).toBe('Bubbling Under');
    });

    it('should return "Not Charting" for null', () => {
      expect(getChartTier(null)).toBe('Not Charting');
    });
  });

  describe('isValidChartPosition()', () => {
    it('should validate positions 1-100', () => {
      expect(isValidChartPosition(1)).toBe(true);
      expect(isValidChartPosition(50)).toBe(true);
      expect(isValidChartPosition(100)).toBe(true);
    });

    it('should reject positions < 1', () => {
      expect(isValidChartPosition(0)).toBe(false);
      expect(isValidChartPosition(-1)).toBe(false);
    });

    it('should reject positions > 100', () => {
      expect(isValidChartPosition(101)).toBe(false);
      expect(isValidChartPosition(200)).toBe(false);
    });

    it('should accept null', () => {
      expect(isValidChartPosition(null)).toBe(true);
    });

    it('should reject non-integers', () => {
      expect(isValidChartPosition(1.5)).toBe(false);
      expect(isValidChartPosition(50.1)).toBe(false);
    });
  });
});

describe('chartUtils - Stream Formatting', () => {
  describe('formatStreamCount()', () => {
    it('should format millions with M suffix', () => {
      expect(formatStreamCount(1000000)).toBe('1.0M');
      expect(formatStreamCount(1500000)).toBe('1.5M');
      expect(formatStreamCount(2000000)).toBe('2.0M');
    });

    it('should format thousands with K suffix', () => {
      expect(formatStreamCount(1000)).toBe('1K');
      expect(formatStreamCount(5000)).toBe('5K');
      expect(formatStreamCount(50000)).toBe('50K');
    });

    it('should format numbers under 1000 with commas', () => {
      expect(formatStreamCount(999)).toBe('999');
      expect(formatStreamCount(500)).toBe('500');
      expect(formatStreamCount(100)).toBe('100');
    });

    it('should handle large millions correctly', () => {
      expect(formatStreamCount(10500000)).toBe('10.5M');
      expect(formatStreamCount(100000000)).toBe('100.0M');
    });
  });

  describe('formatWeeksOnChart()', () => {
    it('should return empty string for 0 weeks', () => {
      expect(formatWeeksOnChart(0)).toBe('');
    });

    it('should return empty string for null/undefined', () => {
      expect(formatWeeksOnChart(null)).toBe('');
      expect(formatWeeksOnChart(undefined)).toBe('');
    });

    it('should format 1 week correctly', () => {
      expect(formatWeeksOnChart(1)).toBe('1 week');
    });

    it('should format multiple weeks correctly', () => {
      expect(formatWeeksOnChart(2)).toBe('2 weeks');
      expect(formatWeeksOnChart(10)).toBe('10 weeks');
      expect(formatWeeksOnChart(50)).toBe('50 weeks');
    });
  });
});

describe('chartUtils - Chart Exit Risk', () => {
  describe('getChartExitRisk()', () => {
    it('should return "high" for large drops', () => {
      expect(getChartExitRisk(-15, 5)).toBe('high');
      expect(getChartExitRisk(-20, 10)).toBe('high');
    });

    it('should return "high" for long tenure with negative movement', () => {
      expect(getChartExitRisk(-1, 25)).toBe('high');
      expect(getChartExitRisk(-5, 30)).toBe('high');
    });

    it('should return "medium" for moderate drops', () => {
      expect(getChartExitRisk(-7, 5)).toBe('medium');
      expect(getChartExitRisk(-6, 10)).toBe('medium');
    });

    it('should return "medium" for long tenure with no growth', () => {
      expect(getChartExitRisk(0, 18)).toBe('medium');
      expect(getChartExitRisk(-1, 16)).toBe('medium');
    });

    it('should return "low" for stable or growing', () => {
      expect(getChartExitRisk(0, 5)).toBe('low');
      expect(getChartExitRisk(5, 10)).toBe('low');
      expect(getChartExitRisk(10, 20)).toBe('low');
    });

    it('should return "low" for small drops with short tenure', () => {
      expect(getChartExitRisk(-3, 5)).toBe('low');
      expect(getChartExitRisk(-1, 2)).toBe('low');
    });
  });
});

describe('chartUtils - Edge Cases', () => {
  it('should handle movement at chart boundaries', () => {
    // Entry at #100
    expect(calculateChartMovement(100, null)).toBe(0);

    // Exit from chart
    expect(calculateChartMovement(null, 95)).toBe(0);
  });

  it('should handle large position changes', () => {
    expect(calculateChartMovement(1, 100)).toBe(99);
    expect(calculateChartMovement(100, 1)).toBe(-99);
  });

  it('should handle formatting with very large numbers', () => {
    expect(formatStreamCount(999999999)).toBe('1000.0M');
  });

  it('should consistently handle null positions across functions', () => {
    expect(formatChartPosition(null)).toBe('NC');
    expect(getChartTier(null)).toBe('Not Charting');
    expect(getChartPositionOrdinal(null)).toBe('NC');
    expect(isValidChartPosition(null)).toBe(true);
  });
});
