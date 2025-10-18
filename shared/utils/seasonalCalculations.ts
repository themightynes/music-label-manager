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
 * REMOVED: Static seasonal multipliers - now loaded dynamically from balance data
 * Fallback multipliers for compatibility when balance data unavailable
 */
const FALLBACK_SEASONAL_MULTIPLIERS = {
  q1: 0.85,  // -15%
  q2: 0.95,  // -5%
  q3: 1.1,   // +10%
  q4: 1.4    // +40%
} as const;

/**
 * Get seasonal multipliers from balance data dynamically
 * CRITICAL FIX: Single source of truth for seasonal calculations
 */
export function getSeasonalMultipliersFromBalance(balanceData?: any): Record<string, number> {
  if (!balanceData?.market_formulas?.release_planning?.seasonal_cost_multipliers) {
    throw new Error('[SEASONAL] CRITICAL: Balance data not available or invalid structure. Expected balanceData.market_formulas.release_planning.seasonal_cost_multipliers');
  }

  return balanceData.market_formulas.release_planning.seasonal_cost_multipliers;
}

/**
 * Legacy export removed - will hard fail without balance data
 */
// export const SEASONAL_MULTIPLIERS = FALLBACK_SEASONAL_MULTIPLIERS;

/**
 * Gets seasonal multiplier from game data configuration (backend)
 * Single source of truth for seasonal effects
 */
export function getSeasonalMultiplier(week: number, gameData: any): number {
  const quarter = getSeasonFromWeek(week);
  const seasonalModifiers = gameData?.getBalanceConfigSync?.()?.time_progression?.seasonal_modifiers;

  if (!seasonalModifiers) {
    console.warn('[SEASONAL] seasonal_modifiers not found in balance data, using fallback');
    return FALLBACK_SEASONAL_MULTIPLIERS[quarter as keyof typeof FALLBACK_SEASONAL_MULTIPLIERS] || 1.0;
  }

  return seasonalModifiers[quarter] || 1.0;
}

/**
 * Gets seasonal multiplier value with dynamic balance data (preferred method)
 * CRITICAL FIX: Uses balance data when available, falls back to constants
 */
export function getSeasonalMultiplierValue(week: number, balanceData?: any): number {
  const quarter = getSeasonFromWeek(week);

  if (!balanceData) {
    throw new Error('[SEASONAL] CRITICAL: Balance data is required. No fallback to hardcoded values allowed.');
  }

  const multipliers = getSeasonalMultipliersFromBalance(balanceData);
  return multipliers[quarter] || 1.0;
}

/**
 * Legacy frontend helper (backward compatibility)
 * Uses fallback multipliers - prefer the version with balanceData parameter
 */
export function getSeasonalMultiplierValueLegacy(week: number): number {
  const quarter = getSeasonFromWeek(week);
  return FALLBACK_SEASONAL_MULTIPLIERS[quarter as keyof typeof FALLBACK_SEASONAL_MULTIPLIERS] || 1.0;
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
export interface WeekDateRange {
  start: Date;
  end: Date;
}

export interface WeekDateRangeOptions {
  /** Day the week starts on: 0 = Sunday, 1 = Monday, ... */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

const DEFAULT_WEEK_START_DAY: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0;

export function getWeekDateRange(
  startYear: number,
  week: number,
  options: WeekDateRangeOptions = {}
): WeekDateRange {
  const weekStartsOn = options.weekStartsOn ?? DEFAULT_WEEK_START_DAY;
  const safeWeek = Math.max(1, Math.floor(week));
  const year = Number.isFinite(startYear) ? Math.trunc(startYear) : new Date().getFullYear();

  const yearStart = new Date(year, 0, 1);
  const firstWeekStart = new Date(yearStart);
  const dayOfWeek = yearStart.getDay();
  const offset = (7 + dayOfWeek - weekStartsOn) % 7;
  firstWeekStart.setDate(yearStart.getDate() - offset);

  const startDate = new Date(firstWeekStart);
  startDate.setDate(firstWeekStart.getDate() + (safeWeek - 1) * 7);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  return { start: startDate, end: endDate };
}

export function formatWeekEndDate(
  startYear: number,
  week: number,
  options: WeekDateRangeOptions = {}
): string {
  const { end } = getWeekDateRange(startYear, week, options);
  const month = String(end.getMonth() + 1).padStart(2, '0');
  const day = String(end.getDate()).padStart(2, '0');
  const year = String(end.getFullYear()).slice(-2);
  return `${month}/${day}/${year}`;
}

export function getWeekDates(
  startYear: number,
  week: number,
  options: WeekDateRangeOptions = {}
): Date[] {
  const { start } = getWeekDateRange(startYear, week, options);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}
