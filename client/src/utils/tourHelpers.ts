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

/**
 * C51: Shared artist-status derivation for ArtistCard/ArtistRoster.
 *
 * ActiveTours considers a Mini-Tour COMPLETE the week its last city plays
 * (metadata city-count check), but the engine's ProjectStageProcessor only
 * advances the project stage from 'production' to 'recorded' the following
 * week (strictly-greater check). Deriving "on tour" from stage alone caused
 * the artist badge to say "On Tour" for one extra week after ActiveTours
 * already showed the tour as complete.
 *
 * This mirrors ActiveTours' completion check (getCityCounts) so a tour only
 * counts as active while it's in 'production' AND not all planned cities
 * have completed yet. If city-count metadata is missing/malformed, this
 * falls back to the previous stage-only behavior (fail open, not closed).
 *
 * @param artistId - Artist to compute status for
 * @param currentWeek - Current game week
 * @param projects - All projects (unfiltered)
 * @returns 'ON TOUR' | 'RECORDING' | 'IDLE'
 */
export function getArtistStatus(artistId: string, currentWeek: number, projects: any[]): 'ON TOUR' | 'RECORDING' | 'IDLE' {
  if (!projects || !Array.isArray(projects)) return 'IDLE';

  // Find active projects for this artist in the current week
  const artistProjects = projects.filter(project =>
    project.artistId === artistId &&
    project.stage === 'production' &&
    project.startWeek &&
    currentWeek >= project.startWeek
  );

  // Check for active tours (Mini-Tour type in production, not yet fully completed)
  const activeTour = artistProjects.find(project => {
    if (project.type !== 'Mini-Tour') return false;

    const metadata = getTourMetadata(project);
    if (metadata.cities == null) {
      // MISSING metadata: fall back to stage-based behavior (previous behavior).
      return true;
    }

    const cityCounts = getCityCounts(project);
    return !(cityCounts.completed >= cityCounts.planned);
  });
  if (activeTour) return 'ON TOUR';

  // Check for active recordings (Single/EP type in production)
  const activeRecording = artistProjects.find(project =>
    (project.type === 'Single' || project.type === 'EP')
  );
  if (activeRecording) return 'RECORDING';

  return 'IDLE';
}