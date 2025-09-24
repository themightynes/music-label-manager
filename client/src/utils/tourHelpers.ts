/**
 * Tour System Type Safety Utilities
 *
 * Provides type-safe access to tour project metadata stored in generic JSONB fields.
 * This eliminates TypeScript 'unknown' type errors while maintaining runtime compatibility.
 */

export interface CityPerformanceData {
  cityName?: string;
  cityNumber?: number;
  revenue?: number;
  attendanceRate?: number;
  profit?: number;
  costs?: number;
  sellThroughRate?: number;
  venueCapacity?: number;
  ticketsSold?: number;
  tickets?: number; // Alternative field name for ticketsSold
  venue?: string;
  capacity?: number;
  week?: number;
  economics?: {
    profit?: number;
    costs?: {
      total?: number;
      venue?: number;
      production?: number;
      marketing?: number;
    };
    sellThrough?: {
      baseRate?: number;
      reputationBonus?: number;
      popularityBonus?: number;
      marketingBonus?: number;
      rate?: number;
    };
    pricing?: {
      ticketPrice?: number;
      basePrice?: number;
      capacityBonus?: number;
    };
    revenue?: {
      tickets?: number;
      merch?: number;
      total?: number;
      merchRate?: number;
    };
  };
}

export interface TourStats {
  cities?: CityPerformanceData[];
  totalRevenue?: number;
  totalCosts?: number;
  totalProfit?: number;
  averageAttendance?: number;
}

export interface TourMetadata {
  cities?: number; // Planned number of cities
  tourStats?: TourStats;
  producerTier?: string;
  timeInvestment?: string;
  enhancedProject?: boolean;
  createdAt?: string;
  venueAccess?: string;
  capacity?: number;
}

/**
 * Type-safe accessor for tour project metadata.
 *
 * @param project - Project object with generic metadata field
 * @returns Typed tour metadata object
 */
export function getTourMetadata(project: any): TourMetadata {
  return (project?.metadata as TourMetadata) || {};
}

/**
 * Helper to get tour statistics safely.
 *
 * @param project - Project object
 * @returns Tour statistics or empty object if not available
 */
export function getTourStats(project: any): TourStats {
  const metadata = getTourMetadata(project);
  return metadata.tourStats || {};
}

/**
 * Helper to get completed cities data safely.
 *
 * @param project - Project object
 * @returns Array of completed city performance data
 */
export function getCompletedCities(project: any): CityPerformanceData[] {
  const stats = getTourStats(project);
  return stats.cities || [];
}

/**
 * Helper to get planned vs completed city counts.
 *
 * @param project - Project object
 * @returns Object with planned and completed city counts
 */
export function getCityCounts(project: any) {
  const metadata = getTourMetadata(project);
  const completedCities = getCompletedCities(project);

  return {
    planned: metadata.cities || 1,
    completed: completedCities.length,
    remaining: Math.max(0, (metadata.cities || 1) - completedCities.length)
  };
}