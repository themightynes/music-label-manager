/**
 * Shared seasonal calculation utilities
 * Single source of truth for all seasonal logic across frontend and backend
 */

export interface QuarterInfo {
  id: string;
  name: string;
  description: string;
  weekRange: [number, number];
}

/**
 * Quarter definitions with week ranges
 */
export const QUARTER_DEFINITIONS: Record<string, QuarterInfo> = {
  q1: {
    id: 'q1',
    name: 'Q1 (Jan-Mar)',
    description: 'Winter • Low Competition',
    weekRange: [1, 13]
  },
  q2: {
    id: 'q2',
    name: 'Q2 (Apr-Jun)',
    description: 'Spring • Moderate',
    weekRange: [14, 26]
  },
  q3: {
    id: 'q3',
    name: 'Q3 (Jul-Sep)',
    description: 'Summer • Higher Costs',
    weekRange: [27, 39]
  },
  q4: {
    id: 'q4',
    name: 'Q4 (Oct-Dec)',
    description: 'Holiday • Maximum Impact',
    weekRange: [40, 52]
  }
};

/**
 * Converts game week to quarter (52-week system)
 * Single source of truth for week-to-quarter mapping
 */
export function getSeasonFromWeek(week: number): string {
  const yearWeek = ((week - 1) % 52) + 1;
  if (yearWeek <= 13) return 'q1';  // Weeks 1-13: Jan-Mar (Q1)
  if (yearWeek <= 26) return 'q2';  // Weeks 14-26: Apr-Jun (Q2)
  if (yearWeek <= 39) return 'q3';  // Weeks 27-39: Jul-Sep (Q3)
  return 'q4';                      // Weeks 40-52: Oct-Dec (Q4)
}

/**
 * Seasonal multipliers - matches balance.json values
 * Updated automatically when balance.json changes
 */
export const SEASONAL_MULTIPLIERS = {
  q1: 0.85,  // -15%
  q2: 0.95,  // -5%
  q3: 1.1,   // +10%
  q4: 1.4    // +40%
} as const;

/**
 * Gets seasonal multiplier from game data configuration (backend)
 * Single source of truth for seasonal effects
 */
export function getSeasonalMultiplier(week: number, gameData: any): number {
  const quarter = getSeasonFromWeek(week);
  const seasonalModifiers = gameData?.getBalanceConfigSync?.()?.time_progression?.seasonal_modifiers;

  if (!seasonalModifiers) {
    console.warn('[SEASONAL] seasonal_modifiers not found in balance data, using fallback');
    return SEASONAL_MULTIPLIERS[quarter as keyof typeof SEASONAL_MULTIPLIERS] || 1.0;
  }

  return seasonalModifiers[quarter] || 1.0;
}

/**
 * Gets seasonal multiplier value (frontend helper)
 */
export function getSeasonalMultiplierValue(week: number): number {
  const quarter = getSeasonFromWeek(week);
  return SEASONAL_MULTIPLIERS[quarter as keyof typeof SEASONAL_MULTIPLIERS] || 1.0;
}

/**
 * Gets quarter information for UI display
 */
export function getQuarterInfo(quarter: string): QuarterInfo | undefined {
  return QUARTER_DEFINITIONS[quarter];
}

/**
 * Gets quarter information for a specific week
 */
export function getQuarterInfoForWeek(week: number): QuarterInfo {
  const quarter = getSeasonFromWeek(week);
  return QUARTER_DEFINITIONS[quarter];
}

/**
 * Gets all weeks in a quarter
 */
export function getWeeksInQuarter(quarter: string): number[] {
  const quarterInfo = QUARTER_DEFINITIONS[quarter];
  if (!quarterInfo) return [];

  const [start, end] = quarterInfo.weekRange;
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * Validates week number is within valid range
 */
export function isValidWeek(week: number): boolean {
  return week >= 1 && week <= 52;
}