/**
 * TourProcessor — weekly tour revenue processing + performance impacts.
 *
 * Phase 2 engine-seams §2 row 4. VERBATIM move of three `GameEngine` methods:
 * `processUnifiedTourRevenue`, `getVenueNameFromAccess`, and
 * `applyTourPerformanceImpacts`. Every log line, branch, RNG draw, summary
 * mutation, and storage call is preserved character-for-character, with only
 * `this.` rebound to the injected `WeekContext` (`this.gameData` → `ctx.gameData`,
 * `this.gameState` → `ctx.gameState`, `this.financialSystem` → `ctx.financialSystem`,
 * `this.storage` → `ctx.storage`, `this.getRandom` → `ctx.getRandom`) and the
 * two intra-class calls rebound to `this.getVenueNameFromAccess(...)` /
 * `this.applyTourPerformanceImpacts(ctx, ...)`.
 *
 * RNG INVARIANT (see ./types.ts): the ±20% attendance variance draw
 * (`ctx.getRandom(0, 1)` — the PR-1 seeded-variance fix) MUST come from the
 * engine's single seeded stream. `getVenueNameFromAccess` is pure and takes no
 * `ctx`. `summary` is read from `ctx.summary`, matching the pre-extraction
 * `summary` parameter.
 *
 * The processor is stateless — all state flows through the `WeekContext`.
 * NOTE: `processUnifiedTourRevenue` is still called from
 * `GameEngine.advanceProjectStages` (which stays in the engine until PR-9); the
 * engine's same-signature delegate keeps that call site working.
 *
 * POST-EXTRACTION CHANGES (July 3, 2026 — sanctioned behavior changes, no
 * longer character-identical to the extracted original):
 * - C47: `artistPopularity` fallback `|| 50` → `|| 1` — a zero/unset-popularity
 *   artist tours as an unknown, not a mid-tier act. Lockstep with the estimate
 *   route (server/routes/tour.ts). No RNG-stream impact.
 * - C41: a missing `metadata.venueCapacity` (legacy/imported tour) no longer
 *   throws and bricks week advancement — it falls back to the deterministic
 *   midpoint of the stored tier's capacity range. No RNG-stream impact.
 * - C48: marketing-budget extraction uses `calculateTourCostsWithCapacity`
 *   with the tour's actual capacity instead of `calculateTourCosts`'s hidden
 *   random tier-capacity draw, so executed marketing spend equals what the
 *   player chose and paid. REMOVES one RNG draw per tour pre-calculation —
 *   the golden-master tour snapshot was regenerated for this.
 */
import type { WeekContext } from './types';
import { VenueCapacityManager } from '../FinancialSystem';

export class TourProcessor {
  /**
   * Processes tour revenue using unified FinancialSystem calculations
   * Replaces legacy random-based city revenue system
   */
  async processUnifiedTourRevenue(ctx: WeekContext, project: any, cityNumber: number, dbTransaction?: any): Promise<any> {
    const { summary } = ctx;
    console.log(`[UNIFIED TOUR] Processing city ${cityNumber} for tour "${project.title}"`);

    // Get artist data for popularity
    let artist;
    try {
      artist = await ctx.gameData.getArtistById(project.artistId);
      if (!artist) {
        console.error(`[UNIFIED TOUR] Artist not found for project: ${project.artistId}`);
        return;
      }
    } catch (error) {
      console.error(`[UNIFIED TOUR] Error getting artist:`, error);
      return;
    }

    const currentMetadata = project.metadata || {};
    let tourStats = currentMetadata.tourStats || { cities: [] };

    // Pre-calculate all tour cities using unified system on first call (city 1)
    if (cityNumber === 1 && !tourStats.preCalculatedCities) {
      console.log(`[UNIFIED TOUR] Pre-calculating all cities using FinancialSystem`);

      // ENHANCED: Extract parameters for FinancialSystem with capacity support
      const venueAccess = currentMetadata.venueAccess || 'none';
      const storedVenueCapacity = currentMetadata.venueCapacity; // New: stored capacity from tour creation
      // Zero/unset popularity floors to 1 (a true unknown draws like a nobody,
      // not a mid-tier act). MUST stay in lockstep with the estimate route's
      // default (server/routes/tour.ts, backlog C47) or preview diverges from
      // execution.
      const artistPopularity = artist.popularity || 1;
      const reputation = ctx.gameState.reputation || 0;
      const totalCities = currentMetadata.cities || 1;

      // Extract marketing budget - CRASH if totalCost is invalid
      if (!project.totalCost || project.totalCost < 0) {
        throw new Error(`Tour ${project.title} has invalid total cost: ${project.totalCost}`);
      }

      // C41: legacy/imported tours can predate stored capacity — fall back to
      // the deterministic midpoint of the stored tier's range instead of
      // throwing, so one malformed project can't brick week advancement.
      // Midpoint, not an RNG draw: the seeded stream stays untouched.
      let venueCapacity = storedVenueCapacity;
      if (venueCapacity) {
        console.log(`[TOUR EXECUTION] Using stored venue capacity: ${venueCapacity}`);
      } else {
        const { min, max } = VenueCapacityManager.getCapacityRangeFromTier(venueAccess, ctx.gameData);
        venueCapacity = Math.round((min + max) / 2);
        console.warn(`[TOUR EXECUTION] Tour "${project.title}" has no stored venue capacity (legacy save?) — falling back to ${venueAccess} tier midpoint ${venueCapacity}`);
      }

      // C48: extract the marketing budget against the SAME capacity the tour
      // actually plays (fixed fees are capacity×4 + capacity×2.7 per city), so
      // marketing spend equals the budgetPerCity × cities the player chose and
      // paid at creation. The old calculateTourCosts call drew a fresh random
      // tier capacity here, silently inflating/deflating the marketing budget.
      const costBreakdown = ctx.financialSystem.calculateTourCostsWithCapacity(venueCapacity, totalCities, 0);
      const marketingBudget = Math.max(0, project.totalCost - costBreakdown.totalCosts);

      console.log(`[TOUR EXECUTION] Pre-calculated ${totalCities} cities for ${project.title}`);

      // ENHANCED: SINGLE SOURCE OF TRUTH with capacity support
      const detailedBreakdown = ctx.financialSystem.calculateDetailedTourBreakdown({
        venueCapacity,
        venueTier: venueAccess, // Keep for backward compatibility
        artistPopularity,
        localReputation: reputation,
        cities: totalCities,
        marketingBudget
      });

      // Store pre-calculated cities - NO MANUAL CALCULATIONS
      const preCalculatedCities = detailedBreakdown.cities.map((city: any, index: number) => {
        // Add variance to actual tour performance (±20% attendance variance)
        // Seeded RNG: getRandom(0, 1) is uniform [0,1), equivalent to Math.random() (Phase 2 PR-1)
        const varianceFactor = 0.8 + (ctx.getRandom(0, 1) * 0.4);
        const actualSellThrough = city.sellThroughRate * varianceFactor;
        const actualRevenue = Math.round(city.totalRevenue * varianceFactor);

        return {
          cityNumber: index + 1,
          venue: this.getVenueNameFromAccess(venueAccess),
          capacity: city.venueCapacity,
          revenue: actualRevenue, // Apply variance to actual revenue
          ticketsSold: Math.round(city.venueCapacity * actualSellThrough),
          attendanceRate: Math.round(actualSellThrough * 100),
          // Enhanced economic breakdown from FinancialSystem
          economics: {
            sellThrough: {
              rate: Math.round(actualSellThrough * 100), // Show actual variance result
              baseRate: Math.round(detailedBreakdown.sellThroughAnalysis.baseRate * 100),
              reputationBonus: Math.round(detailedBreakdown.sellThroughAnalysis.reputationBonus * 100),
              popularityBonus: Math.round(detailedBreakdown.sellThroughAnalysis.popularityBonus * 100),
              marketingBonus: Math.round(detailedBreakdown.sellThroughAnalysis.budgetQualityBonus * 100)
            },
            pricing: {
              ticketPrice: Math.round(city.ticketRevenue / Math.max(1, Math.round(city.venueCapacity * actualSellThrough))),
              basePrice: 0, // Will be calculated by FinancialSystem
              capacityBonus: 0 // Will be calculated by FinancialSystem
            },
            revenue: {
              tickets: Math.round(city.ticketRevenue * varianceFactor),
              merch: Math.round(city.merchRevenue * varianceFactor),
              total: actualRevenue,
              merchRate: 0 // Will be calculated by FinancialSystem
            },
            costs: {
              venue: city.venueFee, // Costs don't vary
              production: city.productionFee, // Costs don't vary
              marketing: city.marketingCost, // Costs don't vary
              total: city.totalCosts // Costs don't vary
            },
            profit: actualRevenue - city.totalCosts // Actual profit with variance
          }
        };
      });

      // Store pre-calculated results
      tourStats.preCalculatedCities = preCalculatedCities;
      console.log(`[UNIFIED TOUR] Pre-calculated ${preCalculatedCities.length} cities`);
    }

    // Reveal one city per week from pre-calculated results
    if (tourStats.preCalculatedCities && tourStats.preCalculatedCities.length >= cityNumber) {
      const cityData = tourStats.preCalculatedCities[cityNumber - 1];

      // Add to revealed cities
      tourStats.cities = tourStats.cities || [];
      tourStats.cities.push(cityData);

      console.log(`[UNIFIED TOUR] Revealed city ${cityNumber}: $${cityData.revenue} revenue, ${cityData.attendanceRate}% attendance`);

      // Apply artist mood and popularity impacts based on performance
      console.log(`[TOUR IMPACTS] About to apply impacts for artist ${project.artistId}, city data:`, cityData);
      const reaction = await this.applyTourPerformanceImpacts(ctx, project.artistId, cityData, dbTransaction);
      console.log(`[TOUR IMPACTS] Completed applying impacts for artist ${project.artistId}`);

      // Add revenue to weekly summary
      const revenue = cityData.revenue;
      summary.revenue += revenue;
      if (!summary.revenueBreakdown) {
        summary.revenueBreakdown = {
          streamingRevenue: 0,
          projectRevenue: 0,
          tourRevenue: 0,
          roleBenefits: 0,
          otherRevenue: 0
        };
      }
      summary.revenueBreakdown.tourRevenue += revenue;

      // Structured city fields (tour-tier1 slice 1) so the client can render a
      // proper tour card. Description string is UNCHANGED — other consumers/tests
      // still match on it.
      summary.changes.push({
        type: 'revenue',
        description: `${project.title} - City ${cityNumber} performance: $${revenue.toLocaleString()} (${cityData.attendanceRate}% attendance)`,
        amount: revenue,
        projectId: project.id,
        source: 'tour_performance',
        venue: cityData.venue,
        attendanceRate: cityData.attendanceRate,
        ticketsSold: cityData.ticketsSold,
        capacity: cityData.capacity,
        cityNumber,
        citiesTotal: currentMetadata.cities || 1,
        costs: cityData.economics?.costs?.total,
        netProfit: cityData.economics?.profit,
        artistId: project.artistId,
        artistName: artist.name,
        // Slice 1b: artist reaction attached to the city entry itself, so the
        // client card doesn't re-match the separate mood/popularity entries.
        moodChange: reaction.moodChange,
        popularityChange: reaction.popularityChange
      });
    }

    // Update project metadata
    const updatedMetadata = { ...currentMetadata, tourStats };
    try {
      await ctx.storage.updateProject(project.id, { metadata: updatedMetadata }, dbTransaction);
      console.log(`[UNIFIED TOUR] Updated project metadata for city ${cityNumber}`);
    } catch (error) {
      console.error(`[UNIFIED TOUR] Error updating project metadata:`, error);
    }

    // Return the UPDATED tourStats (now including the just-revealed city) so a
    // same-pass completion summary computes totals from post-processing data, not
    // the stale project row fetched at loop start. The other call path ignores it.
    return tourStats;
  }

  /**
   * Deterministic planning-week foreshadow for a Mini-Tour advancing
   * planning → production. Reuses the SAME pre-calculation parameter assembly as
   * processUnifiedTourRevenue (C41 midpoint capacity fallback, C47 popularity
   * floor, C48 capacity-based marketing extraction) and takes city 1's
   * PRE-variance sellThroughRate × capacity as the expected ticket count.
   *
   * RNG INVARIANT: makes NO ctx.getRandom draws — the ±20% variance draw happens
   * only at execution time inside processUnifiedTourRevenue. This helper must not
   * touch the seeded stream, so preview and future weekly reveals stay in sync
   * without a shared draw here.
   */
  static estimatePlanningForeshadow(ctx: WeekContext, project: any, artist: any): {
    venue: string;
    capacity: number;
    estTickets: number;
    citiesTotal: number;
  } {
    const currentMetadata = project.metadata || {};
    const venueAccess = currentMetadata.venueAccess || 'none';
    const artistPopularity = artist?.popularity || 1; // C47 floor
    const reputation = ctx.gameState.reputation || 0;
    const totalCities = currentMetadata.cities || 1;

    // C41 midpoint fallback for a missing stored capacity.
    let venueCapacity = currentMetadata.venueCapacity;
    if (!venueCapacity) {
      const { min, max } = VenueCapacityManager.getCapacityRangeFromTier(venueAccess, ctx.gameData);
      venueCapacity = Math.round((min + max) / 2);
    }

    // C48 capacity-based marketing extraction (matches execution path).
    const costBreakdown = ctx.financialSystem.calculateTourCostsWithCapacity(venueCapacity, totalCities, 0);
    const marketingBudget = Math.max(0, (project.totalCost || 0) - costBreakdown.totalCosts);

    const detailedBreakdown = ctx.financialSystem.calculateDetailedTourBreakdown({
      venueCapacity,
      venueTier: venueAccess,
      artistPopularity,
      localReputation: reputation,
      cities: totalCities,
      marketingBudget
    });

    const city1 = detailedBreakdown.cities[0];
    const estTickets = city1 ? Math.round(city1.venueCapacity * city1.sellThroughRate) : 0;

    return {
      venue: new TourProcessor().getVenueNameFromAccess(venueAccess),
      capacity: venueCapacity,
      estTickets,
      citiesTotal: totalCities
    };
  }

  /**
   * Helper method to get venue name from access tier
   */
  getVenueNameFromAccess(venueAccess: string): string {
    const venueNames = {
      'none': 'Small Venues',
      'clubs': 'Club Venues',
      'theaters': 'Theater Venues',
      'arenas': 'Arena Venues'
    };
    return venueNames[venueAccess as keyof typeof venueNames] || 'Small Venues';
  }

  /**
   * Apply artist mood and popularity impacts based on tour performance
   * Uses summary accumulation pattern to avoid conflicts with processWeeklyMoodChanges
   *
   * Returns the computed deltas (tour-tier1 slice 1b) so the caller can attach
   * the artist reaction to the tour_performance change entry itself — the client
   * card then doesn't have to re-match the separate mood/popularity entries or
   * re-derive the attendance thresholds. Zeros on the not-found/error paths.
   */
  async applyTourPerformanceImpacts(
    ctx: WeekContext,
    artistId: string,
    cityData: any,
    dbTransaction: any
  ): Promise<{ moodChange: number; popularityChange: number }> {
    const { summary } = ctx;
    try {
      // Get artist data from storage since this.artists is not initialized
      const artist = await ctx.storage?.getArtist?.(artistId, dbTransaction);
      if (!artist) {
        console.warn(`[TOUR IMPACTS] Artist ${artistId} not found`);
        return { moodChange: 0, popularityChange: 0 };
      }

      const attendanceRate = cityData.attendanceRate || 0;
      const actualAttendees = Math.round((cityData.capacity || 0) * (attendanceRate / 100));

      // Calculate mood impact based on attendance rate
      let moodChange = 0;
      if (attendanceRate < 30) {
        moodChange = -3; // Disappointing show
      } else if (attendanceRate >= 30 && attendanceRate <= 50) {
        moodChange = 0; // Neutral
      } else if (attendanceRate > 50 && attendanceRate <= 85) {
        moodChange = 5; // Good show
      } else if (attendanceRate > 85) {
        moodChange = 8; // Amazing show
      }

      // Calculate popularity impact based on attendance rate and venue size
      let popularityChange = 0;
      if (attendanceRate > 70) {
        if (actualAttendees < 500) {
          popularityChange = 1;
        } else if (actualAttendees < 2000) {
          popularityChange = 2;
        } else if (actualAttendees < 5000) {
          popularityChange = 3;
        } else if (actualAttendees < 10000) {
          popularityChange = 5;
        } else {
          popularityChange = 7;
        }
      }

      // FIXED: Accumulate changes in summary using per-artist object pattern
      // This prevents processWeeklyMoodChanges from overwriting our changes
      if (!summary.artistChanges) {
        summary.artistChanges = {};
      }

      // Store per-artist mood changes using unified object format
      if (!summary.artistChanges[artistId] || typeof summary.artistChanges[artistId] !== 'object') {
        summary.artistChanges[artistId] = {};
      }
      const artistChange = summary.artistChanges[artistId] as { mood?: number; energy?: number; popularity?: number };
      artistChange.mood = (artistChange.mood || 0) + moodChange;

      // UNIFIED FORMAT: Store per-artist popularity changes using consistent object format
      // This matches the mood and energy pattern for consistency
      if (popularityChange > 0) {
        artistChange.popularity = (artistChange.popularity || 0) + popularityChange;
      }

      // Add changes to summary for player visibility
      if (moodChange !== 0) {
        summary.changes.push({
          type: 'mood',
          description: `${artist.name}: ${moodChange > 0 ? '+' : ''}${moodChange} mood from ${attendanceRate}% attendance performance`,
          amount: moodChange,
          moodChange: moodChange,
          artistId: artistId
        });
      }

      if (popularityChange > 0) {
        summary.changes.push({
          type: 'popularity',
          description: `${artist.name}: +${popularityChange} popularity from ${actualAttendees.toLocaleString()} attendees (${attendanceRate}% capacity)`,
          amount: popularityChange,
          artistId: artistId
        });
      }

      console.log(`[TOUR IMPACTS] ${artist.name}: Mood ${moodChange > 0 ? '+' : ''}${moodChange} (${attendanceRate}% attendance), Popularity +${popularityChange} (${actualAttendees} attendees) - accumulated in summary`);

      return { moodChange, popularityChange };
    } catch (error) {
      console.error(`[TOUR IMPACTS] Error applying performance impacts:`, error);
      return { moodChange: 0, popularityChange: 0 };
    }
  }
}
