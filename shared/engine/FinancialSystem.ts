/**
 * FinancialSystem.ts
 * 
 * Extracted financial calculation methods from GameEngine
 * Phase 1: Pure calculation functions (no side effects)
 * 
 * This module contains all financial-related calculations including:
 * - Revenue calculations (streaming, tours, ongoing)
 * - Cost calculations (projects, operations, marketing)
 * - Budget and quality calculations
 * - Economic scaling calculations
 * - Investment tracking for ROI analysis
 */

// Import types from game-engine.ts where they're defined
import type { MonthSummary, MonthlyFinancials } from './game-engine';

/**
 * Tracks production and marketing investments at the song level for ROI analysis
 */
export class InvestmentTracker {
  private storage: any; // Will be DatabaseStorage instance
  
  constructor(storage: any) {
    this.storage = storage;
  }
  
  /**
   * Internal helper to apply batch marketing allocation deltas.
   * Expects updates with absolute values already calculated.
   */
  private async applyMarketingAllocations(
    updates: Array<{ songId: string; marketingAllocation: number }>,
    dbTransaction?: any
  ): Promise<void> {
    if (!updates || updates.length === 0) return;
    await this.storage.updateSongs(updates, dbTransaction);
  }
  
  /**
   * Records production investment when a song is created
   * This replaces the old metadata.perSongBudget approach
   */
  async recordProductionInvestment(
    songId: string,
    projectId: string,
    productionBudget: number,
    dbTransaction?: any
  ): Promise<void> {
    await this.storage.updateSong(songId, {
      projectId,
      productionBudget
    }, dbTransaction);
  }
  
  /**
   * Allocates marketing budget across songs when a release is planned
   * Distributes the total marketing budget equally among all songs
   */
  async allocateMarketingInvestment(
    releaseId: string,
    totalMarketingBudget: number,
    dbTransaction?: any
  ): Promise<{ allocations: Array<{ songId: string; delta: number }>; skipped: boolean }> {
    // Idempotency: check release metadata flag and set it within the same transaction
    const release = await this.storage.getRelease(releaseId);
    const releaseMeta = (release?.metadata as any) || {};
    if (releaseMeta.baseMarketingAllocated) {
      return { allocations: [], skipped: true };
    }
    
    const releaseSongs = await this.storage.getSongsByRelease(releaseId, dbTransaction);
    if (releaseSongs.length === 0 || totalMarketingBudget <= 0) {
      // Still set flag to avoid re-entry with zero budget
      await this.storage.updateRelease(releaseId, {
        metadata: { ...(releaseMeta || {}), baseMarketingAllocated: true }
      });
      return { allocations: [], skipped: true };
    }
    
    const count = releaseSongs.length;
    const base = Math.floor(totalMarketingBudget / count);
    const remainder = totalMarketingBudget - (base * count);
    
    // Deterministic: first N songs receive +1 until remainder exhausted (ordered by trackNumber via storage.getSongsByRelease)
    const allocations: Array<{ songId: string; delta: number }> = releaseSongs.map((song: any, index: number) => ({
      songId: song.id,
      delta: base + (index < remainder ? 1 : 0)
    }));
    
    const updates = releaseSongs.map((song: any, index: number) => ({
      songId: song.id,
      marketingAllocation: (song.marketingAllocation || 0) + allocations[index].delta
    }));
    
    await this.applyMarketingAllocations(updates, dbTransaction);
    // Mark idempotency flag
    await this.storage.updateRelease(releaseId, {
      metadata: { ...(releaseMeta || {}), baseMarketingAllocated: true }
    });
    
    return { allocations, skipped: false };
  }

  /**
   * Targeted allocation for a single song (lead single phase).
   * Checks and sets release metadata flag leadMarketingAllocated for idempotency.
   */
  async allocateMarketingToSong(
    releaseId: string,
    songId: string,
    amount: number,
    dbTransaction?: any
  ): Promise<{ allocations: Array<{ songId: string; delta: number }>; skipped: boolean }> {
    const release = await this.storage.getRelease(releaseId);
    const releaseMeta = (release?.metadata as any) || {};
    if (releaseMeta.leadMarketingAllocated || amount <= 0) {
      if (!releaseMeta.leadMarketingAllocated) {
        // Set flag even if amount <= 0 to keep logic idempotent for this phase
        await this.storage.updateRelease(releaseId, {
          metadata: { ...(releaseMeta || {}), leadMarketingAllocated: true }
        });
      }
      return { allocations: [], skipped: true };
    }
    
    const song = await this.storage.getSong(songId);
    if (!song) {
      return { allocations: [], skipped: true };
    }
    
    const newAllocation = (song.marketingAllocation || 0) + amount;
    await this.storage.updateSong(songId, { marketingAllocation: newAllocation }, dbTransaction);
    await this.storage.updateRelease(releaseId, {
      metadata: { ...(releaseMeta || {}), leadMarketingAllocated: true }
    });
    
    return { allocations: [{ songId, delta: amount }], skipped: false };
  }
  
  /**
   * Gets comprehensive investment metrics for an artist
   */
  async getArtistInvestmentMetrics(artistId: string, gameId: string): Promise<{
    totalProductionInvestment: number;
    totalMarketingInvestment: number;
    totalInvestment: number;
    totalRevenue: number;
    overallROI: number;
    songCount: number;
  }> {
    const songs = await this.storage.getSongsByArtist(artistId, gameId);
    
    const metrics = songs.reduce((acc: any, song: any) => ({
      totalProductionInvestment: acc.totalProductionInvestment + (song.productionBudget || 0),
      totalMarketingInvestment: acc.totalMarketingInvestment + (song.marketingAllocation || 0),
      totalRevenue: acc.totalRevenue + (song.totalRevenue || 0),
      songCount: acc.songCount + 1
    }), {
      totalProductionInvestment: 0,
      totalMarketingInvestment: 0,
      totalRevenue: 0,
      songCount: 0
    });
    
    const totalInvestment = metrics.totalProductionInvestment + metrics.totalMarketingInvestment;
    const overallROI = totalInvestment > 0 
      ? ((metrics.totalRevenue - totalInvestment) / totalInvestment) * 100 
      : 0;
    
    return {
      ...metrics,
      totalInvestment,
      overallROI
    };
  }
}

export class FinancialSystem {
  private gameData: any;
  private rng: () => number;
  public investmentTracker: InvestmentTracker | null = null;
  
  // Critical constants extracted for easier balance tweaking
  private readonly CONSTANTS = {
    DEFAULT_PLAYLIST_MULTIPLIER: 0.1,
    DEFAULT_VENUE_CAPACITY: 100,
    PLAYLIST_COMPONENT_SCALE: 100,
    MARKETING_SCALE: {
      DIVISOR: 1000,
      MULTIPLIER: 50
    },
    VARIANCE_RANGE: {
      MIN: 0.9,
      MAX: 1.1
    },
    REPUTATION_BASELINE: 50,
    DEFAULT_ARTIST_FEE: 1200,
    DEFAULT_PRESS_CHANCE: 0.05,
    REPUTATION_GAIN_MULTIPLIER: 2,
    ROUNDING_FACTOR: 100
  };
  
  constructor(gameData: any, rng: () => number, storage?: any) {
    this.gameData = gameData;
    this.rng = rng;
    
    // Initialize InvestmentTracker if storage is provided
    if (storage) {
      this.investmentTracker = new InvestmentTracker(storage);
    }
  }

  /**
   * Gets random number using seeded RNG
   * Originally from game-engine.ts line 498-500
   */
  private getRandom(min: number, max: number): number {
    return min + (this.rng() * (max - min));
  }

  /**
   * Helper to get access tier multipliers
   * Originally from game-engine.ts line 505-515
   */
  private getAccessMultiplier(type: string, tier: string): number {
    const tiers = this.gameData.getAccessTiersSync();
    
    if (type === 'playlist') {
      const tierData = tiers.playlist_access as any;
      return tierData[tier]?.reach_multiplier || this.CONSTANTS.DEFAULT_PLAYLIST_MULTIPLIER;
    }
    
    // Default fallback
    return this.CONSTANTS.DEFAULT_PLAYLIST_MULTIPLIER;
  }

  /**
   * Helper to get venue capacity
   * Originally from game-engine.ts line 535-544
   */
  private getVenueCapacity(tier: string): number {
    const tiers = this.gameData.getAccessTiersSync();
    const venueData = tiers.venue_access as any;
    const venueConfig = venueData[tier];
    if (venueConfig?.capacity_range) {
      const [min, max] = venueConfig.capacity_range;
      return Math.round(this.getRandom(min, max));
    }
    return this.CONSTANTS.DEFAULT_VENUE_CAPACITY;
  }

  /**
   * Calculates streaming revenue outcome for a release
   * Originally from game-engine.ts line 360-410
   */
  calculateStreamingOutcome(
    quality: number,
    playlistAccess: string,
    reputation: number,
    adSpend: number
  ): number {
    const config = this.gameData.getStreamingConfigSync();
    // console.log(`[DEBUG] Streaming config loaded:`, {
    //   hasConfig: !!config,
    //   quality_weight: config?.quality_weight,
    //   playlist_weight: config?.playlist_weight,
    //   base_streams_per_point: config?.base_streams_per_point,
    //   first_week_multiplier: config?.first_week_multiplier
    // });
    
    // Get playlist multiplier from real access tiers
    const playlistMultiplier = this.getAccessMultiplier('playlist', playlistAccess);
    // console.log(`[DEBUG] Access multiplier for ${playlistAccess}:`, playlistMultiplier);
    
    // Calculate base streams using proper formula
    const baseStreams = 
      (quality * config.quality_weight) +
      (playlistMultiplier * config.playlist_weight * this.CONSTANTS.PLAYLIST_COMPONENT_SCALE) +
      (reputation * config.reputation_weight) +
      (Math.sqrt(adSpend / this.CONSTANTS.MARKETING_SCALE.DIVISOR) * config.marketing_weight * this.CONSTANTS.MARKETING_SCALE.MULTIPLIER);
    
    // console.log(`[DEBUG] Stream calculation components:`, {
    //   quality: quality,
    //   qualityComponent: quality * config.quality_weight,
    //   playlistComponent: playlistMultiplier * config.playlist_weight * 100,
    //   reputationComponent: reputation * config.reputation_weight,
    //   marketingComponent: Math.sqrt(adSpend / 1000) * config.marketing_weight * 50,
    //   baseStreams: baseStreams
    // });
    
    // Apply RNG variance from balance config
    const variance = this.getRandom(this.CONSTANTS.VARIANCE_RANGE.MIN, this.CONSTANTS.VARIANCE_RANGE.MAX);
    
    // Apply first week multiplier
    const streams = baseStreams * variance * config.first_week_multiplier * config.base_streams_per_point;
    
    // console.log(`[DEBUG] Final stream calculation:`, {
    //   baseStreams,
    //   variance,
    //   firstWeekMultiplier: config.first_week_multiplier,
    //   baseStreamsPerPoint: config.base_streams_per_point,
    //   finalStreams: Math.round(streams)
    // });
    
    return Math.round(streams);
  }

  /**
   * Calculates tour revenue based on venue, popularity, reputation and cities
   * Originally from game-engine.ts line 469-493
   */
  calculateTourRevenue(
    venueTier: string,
    artistPopularity: number,
    localReputation: number,
    cities: number
  ): number {
    const config = this.gameData.getTourConfigSync();
    const venueCapacity = this.getVenueCapacity(venueTier);
    
    // Calculate sell-through rate
    let sellThrough = config.sell_through_base;
    sellThrough += (localReputation * config.reputation_modifier);
    sellThrough *= (1 + (artistPopularity / 100) * config.local_popularity_weight);
    sellThrough = Math.min(1, sellThrough);
    
    // Calculate revenue per show using real config
    const ticketPrice = config.ticket_price_base + (venueCapacity * config.ticket_price_per_capacity);
    const ticketRevenue = venueCapacity * sellThrough * ticketPrice;
    const merchRevenue = ticketRevenue * config.merch_percentage;
    
    // Total for all cities
    const totalRevenue = (ticketRevenue + merchRevenue) * cities;
    
    return Math.round(totalRevenue);
  }

  /**
   * Common decay calculation logic for both projects and individual songs
   * Extracted to eliminate duplication between calculateOngoingRevenue and calculateOngoingSongRevenue
   */
  private calculateDecayRevenue(
    initialStreams: number,
    monthsSinceRelease: number,
    reputation: number,
    playlistAccess: string,
    entityName: string = 'entity'
  ): number {
    // No revenue if just released this month or no initial streams
    if (monthsSinceRelease <= 0) {
      // console.log(`[DECAY CALC] No revenue for ${entityName} - just released or future release`);
      return 0;
    }
    
    if (initialStreams === 0) {
      // console.log(`[DECAY CALC] No revenue for ${entityName} - no initial streams`);
      return 0;
    }
    
    // Get streaming decay configuration from balance.json
    const streamingConfig = this.gameData.getStreamingConfigSync();
    const ongoingConfig = streamingConfig.ongoing_streams;
    
    const decayRate = ongoingConfig.monthly_decay_rate;
    const maxDecayMonths = ongoingConfig.max_decay_months;
    const revenuePerStream = ongoingConfig.revenue_per_stream;
    const ongoingFactor = ongoingConfig.ongoing_factor;
    const reputationBonusFactor = ongoingConfig.reputation_bonus_factor;
    const accessTierBonusFactor = ongoingConfig.access_tier_bonus_factor;
    const minimumThreshold = ongoingConfig.minimum_revenue_threshold;
    
    // Stop generating revenue after max decay period
    if (monthsSinceRelease > maxDecayMonths) {
      // console.log(`[DECAY CALC] ${entityName} too old (${monthsSinceRelease} > ${maxDecayMonths} months), returning $0`);
      return 0;
    }
    
    // Decay formula: starts high, gradually decreases
    const baseDecay = Math.pow(decayRate, monthsSinceRelease);
    // console.log(`[DECAY CALC] Decay rate: ${decayRate}, Base decay: ${baseDecay.toFixed(4)}`);
    
    // Apply current reputation and access tier bonuses
    const reputationBonus = 1 + (reputation - this.CONSTANTS.REPUTATION_BASELINE) * reputationBonusFactor;
    const playlistMultiplier = this.getAccessMultiplier('playlist', playlistAccess);
    const accessBonus = 1 + (playlistMultiplier - 1) * accessTierBonusFactor;
    
    // Calculate monthly streams with decay
    const monthlyStreams = initialStreams * baseDecay * reputationBonus * accessBonus * ongoingFactor;
    // console.log(`[DECAY CALC] Monthly streams for ${entityName}: ${monthlyStreams.toFixed(2)}`);
    
    // Convert to revenue
    const revenue = Math.max(0, Math.round(monthlyStreams * revenuePerStream));
    
    // Apply minimum threshold
    if (revenue < minimumThreshold) {
      // console.log(`[DECAY CALC] Revenue below threshold for ${entityName} ($${revenue} < $${minimumThreshold}), returning $0`);
      return 0;
    }
    
    // console.log(`[DECAY CALC] Final revenue for ${entityName}: $${revenue}`);
    return revenue;
  }

  /**
   * Calculates ongoing revenue for an individual released song
   * Originally from game-engine.ts line 1666-1732
   */
  calculateOngoingSongRevenue(
    song: any, 
    currentMonth: number, 
    reputation: number, 
    playlistAccess: string
  ): number {
    const releaseMonth = song.releaseMonth || 1;
    const monthsSinceRelease = currentMonth - releaseMonth;
    const initialStreams = song.initialStreams || 0;
    
    // console.log(`[SONG REVENUE CALC] === Calculating for "${song.title}" ===`);
    // console.log(`[SONG REVENUE CALC] Quality: ${song.quality}, Initial streams: ${initialStreams}`);
    // console.log(`[SONG REVENUE CALC] Release month: ${releaseMonth}, Current month: ${currentMonth}`);
    // console.log(`[SONG REVENUE CALC] Months since release: ${monthsSinceRelease}`);
    
    // Use common decay calculation logic
    return this.calculateDecayRevenue(
      initialStreams,
      monthsSinceRelease,
      reputation,
      playlistAccess,
      `"${song.title}"`
    );
  }

  /**
   * Calculates budget multiplier for song quality using diminishing returns
   * Returns a multiplicative factor (0.7 to 1.3) instead of additive bonus
   */
  calculateBudgetQualityMultiplier(
    budgetPerSong: number,
    projectType: string,
    producerTier: string,
    timeInvestment: string,
    songCount: number = 1
  ): number {
    const balance = this.gameData.getBalanceConfigSync();
    const budgetSystem = balance.quality_system.budget_quality_system;
    
    if (!budgetSystem?.enabled) {
      return 1.0; // No impact if system disabled
    }
    
    // Validate input parameters
    if (budgetPerSong < 0 || songCount <= 0) {
      return budgetSystem.neutral_multiplier || 1.0;
    }
    
    // Calculate dynamic minimum viable cost
    const minViableCost = this.calculateDynamicMinimumViableCost(
      projectType,
      producerTier,
      timeInvestment,
      songCount
    );
    
    // Calculate efficiency ratio
    let efficiencyRatio = budgetPerSong / minViableCost;
    
    // Apply dampening factor if configured
    const dampening = budgetSystem.efficiency_dampening;
    if (dampening?.enabled && dampening?.factor !== undefined) {
      // Apply dampening: new_ratio = 1 + factor * (original_ratio - 1)
      // This keeps ratio=1 unchanged and reduces deviations from 1.0
      efficiencyRatio = 1 + dampening.factor * (efficiencyRatio - 1);
    }
    
    // Apply 5-segment piecewise function
    const budgetMultiplier = this.calculatePiecewiseBudgetMultiplier(
      efficiencyRatio,
      budgetSystem
    );
    
    // Log calculation for transparency
    const originalRatio = budgetPerSong / minViableCost;
    console.log(`[BUDGET CALC] Dynamic budget quality calculation:`, {
      budgetPerSong: budgetPerSong.toFixed(0),
      minViableCost: minViableCost.toFixed(0),
      originalRatio: originalRatio.toFixed(2),
      dampenedRatio: efficiencyRatio.toFixed(2),
      dampening: dampening?.enabled ? dampening.factor : 'disabled',
      budgetMultiplier: budgetMultiplier.toFixed(3),
      projectType,
      producerTier,
      timeInvestment,
      songCount
    });
    
    return Math.round(budgetMultiplier * 1000) / 1000;
  }

  /**
   * Calculates dynamic minimum viable cost based on project complexity
   * This addresses the "UI misalignment" issue by providing a consistent reference
   */
  calculateDynamicMinimumViableCost(
    projectType: string,
    producerTier: string,
    timeInvestment: string,
    songCount: number = 1
  ): number {
    const balance = this.gameData.getBalanceConfigSync();
    const economy = balance.economy;
    const producerSystem = balance.producer_tier_system;
    const timeSystem = balance.time_investment_system;
    
    // Base cost calculation using the same logic as project cost calculation
    let baseCostPerSong: number;
    
    // Use per-song cost system if available and appropriate
    const songCountSystem = economy.song_count_cost_system;
    if (songCountSystem?.enabled && songCount > 1) {
      baseCostPerSong = songCountSystem.base_per_song_cost[projectType.toLowerCase()] || 3500;
      
      // Apply economies of scale
      const economiesMultiplier = this.calculateEconomiesOfScale(
        songCount, 
        songCountSystem.economies_of_scale
      );
      baseCostPerSong *= economiesMultiplier;
    } else {
      // Fallback to project-based calculation
      const projectKey = projectType.toLowerCase() === 'single' ? 'single' : 
                        projectType.toLowerCase() === 'ep' ? 'ep' : 'mini_tour';
      const projectConfig = economy.project_costs[projectKey];
      if (projectConfig) {
        // Use minimum cost as base for single songs, average for multi-song
        const defaultSongCount = projectConfig.song_count_default || songCount;
        baseCostPerSong = songCount === 1 ? 
          projectConfig.min / defaultSongCount :
          ((projectConfig.min + projectConfig.max) / 2) / defaultSongCount;
      } else {
        baseCostPerSong = 3500; // Fallback value
      }
    }
    
    // Don't apply producer and time multipliers to minimum viable cost
    // These are already reflected in the actual project cost the player pays
    // The minimum viable should represent the baseline quality expectation
    
    // Apply baseline quality multiplier for recording sessions
    // This ensures minimum selectable budgets don't give quality bonuses
    const baselineQualityMultiplier = (projectType.toLowerCase() === 'single' || projectType.toLowerCase() === 'ep') ? 1.5 : 1.0;
    
    const finalMinViableCost = baseCostPerSong * baselineQualityMultiplier;
    
    return Math.round(finalMinViableCost);
  }

  /**
   * Applies 5-segment piecewise function for budget efficiency
   * This replaces the simple linear interpolation with sophisticated economic modeling
   */
  private calculatePiecewiseBudgetMultiplier(
    efficiencyRatio: number,
    budgetSystem: any
  ): number {
    const breakpoints = budgetSystem.efficiency_breakpoints;
    const slopes = budgetSystem.segment_slopes;
    const minMult = budgetSystem.min_multiplier || 0.65;
    const maxMult = budgetSystem.max_multiplier || 1.35;
    const neutralMult = budgetSystem.neutral_multiplier || 1.0;
    
    let multiplier: number;
    
    if (efficiencyRatio < breakpoints.penalty_threshold) {
      // Segment 1: Heavy penalty for insufficient budget
      // Should go from 0.65 at 0x to 0.65 at 0.6x (flat penalty)
      multiplier = minMult; // 0.65
      
    } else if (efficiencyRatio < breakpoints.minimum_viable) {
      // Segment 2: Below standard to minimum viable
      // Should go from 0.65 to 0.85
      const segmentRange = breakpoints.minimum_viable - breakpoints.penalty_threshold;
      const progress = (efficiencyRatio - breakpoints.penalty_threshold) / segmentRange;
      const startMult = 0.65; // minMult
      const endMult = 0.85;
      multiplier = startMult + (endMult - startMult) * progress;
      
    } else if (efficiencyRatio <= breakpoints.optimal_efficiency) {
      // Segment 3: Minimum viable to optimal efficiency (best value)
      // Should go from 0.85 to 1.05 (neutral + 0.05)
      const segmentRange = breakpoints.optimal_efficiency - breakpoints.minimum_viable;
      const progress = (efficiencyRatio - breakpoints.minimum_viable) / segmentRange;
      const startMult = 0.85; // End of segment 2
      const endMult = 1.05; // neutral + 0.05
      multiplier = startMult + (endMult - startMult) * progress;
      
    } else if (efficiencyRatio <= breakpoints.luxury_threshold) {
      // Segment 4: Optimal to luxury threshold
      // Should go from 1.05 to 1.20
      const segmentRange = breakpoints.luxury_threshold - breakpoints.optimal_efficiency;
      const progress = (efficiencyRatio - breakpoints.optimal_efficiency) / segmentRange;
      const startMult = 1.05; // End of segment 3
      const endMult = 1.20;
      multiplier = startMult + (endMult - startMult) * progress;
      
    } else if (efficiencyRatio <= breakpoints.diminishing_threshold) {
      // Segment 5: Luxury to diminishing threshold
      // Should go from 1.20 to 1.35
      const segmentRange = breakpoints.diminishing_threshold - breakpoints.luxury_threshold;
      const progress = (efficiencyRatio - breakpoints.luxury_threshold) / segmentRange;
      const startMult = 1.20; // End of segment 4
      const endMult = 1.35; // Max multiplier
      multiplier = startMult + (endMult - startMult) * progress;
      
    } else {
      // Segment 6: Diminishing returns (logarithmic)
      const baseMultiplier = 1.35; // Max base multiplier
      const excessRatio = efficiencyRatio - breakpoints.diminishing_threshold;
      const diminishingBonus = Math.log(1 + excessRatio) * slopes.diminishing_factor * 0.1;
      multiplier = baseMultiplier + diminishingBonus;
    }
    
    // Enforce hard limits
    return Math.max(minMult, Math.min(maxMult, multiplier));
  }
  
  /**
   * Legacy method for backward compatibility - redirects to new multiplier method
   * @deprecated Use calculateBudgetQualityMultiplier instead
   */
  calculateBudgetQualityBonus(
    budgetPerSong: number,
    projectType: string,
    producerTier: string,
    timeInvestment: string,
    songCount: number = 1
  ): number {
    // Convert multiplier back to additive bonus for legacy callers
    const multiplier = this.calculateBudgetQualityMultiplier(budgetPerSong, projectType, producerTier, timeInvestment, songCount);
    const neutralMult = this.gameData.getBalanceConfigSync().quality_system.budget_quality_system.neutral_multiplier || 1.0;
    // Convert from multiplier to percentage bonus
    return Math.round((multiplier - neutralMult) * 100);
  }

  /**
   * Calculates economies of scale multiplier for cost reduction
   * Helper method used by dynamic minimum viable cost calculation
   */
  private calculateEconomiesOfScale(songCount: number, economiesConfig: any): number {
    if (!economiesConfig?.enabled) {
      return 1.0;
    }
    
    const thresholds = economiesConfig.thresholds;
    const breakpoints = economiesConfig.breakpoints;
    
    if (songCount >= thresholds.large_project) {
      return breakpoints.large_project;
    } else if (songCount >= thresholds.medium_project) {
      return breakpoints.medium_project;
    } else if (songCount >= thresholds.small_project) {
      return breakpoints.small_project;
    } else {
      return breakpoints.single_song;
    }
  }

  /**
   * Gets the dynamic minimum viable cost for UI display
   * This solves the "UI misalignment" issue
   */
  getMinimumViableCostForUI(
    projectType: string,
    producerTier: string,
    timeInvestment: string,
    songCount: number = 1
  ): number {
    return this.calculateDynamicMinimumViableCost(
      projectType,
      producerTier,
      timeInvestment,
      songCount
    );
  }

  /**
   * Gets budget efficiency rating for transparency
   * This helps make the system more "transparent to players"
   */
  getBudgetEfficiencyRating(
    budgetPerSong: number,
    projectType: string,
    producerTier: string,
    timeInvestment: string,
    songCount: number = 1
  ): { rating: string, description: string, efficiencyRatio: number } {
    const minViableCost = this.calculateDynamicMinimumViableCost(
      projectType, producerTier, timeInvestment, songCount
    );
    let efficiencyRatio = budgetPerSong / minViableCost;
    const balance = this.gameData.getBalanceConfigSync();
    const budgetSystem = balance.quality_system.budget_quality_system;
    
    // Apply dampening if configured (same as in calculateBudgetQualityMultiplier)
    const dampening = budgetSystem.efficiency_dampening;
    if (dampening?.enabled && dampening?.factor !== undefined) {
      efficiencyRatio = 1 + dampening.factor * (efficiencyRatio - 1);
    }
    
    const breakpoints = budgetSystem.efficiency_breakpoints;
    
    let rating: string;
    let description: string;
    
    if (efficiencyRatio < breakpoints.penalty_threshold) {
      rating = "Insufficient";
      description = "Budget too low for quality production";
    } else if (efficiencyRatio < breakpoints.minimum_viable) {
      rating = "Below Standard";
      description = "Minimal quality, corners will be cut";
    } else if (efficiencyRatio <= breakpoints.optimal_efficiency) {
      rating = "Efficient";
      description = "Good value for money, solid quality";
    } else if (efficiencyRatio <= breakpoints.luxury_threshold) {
      rating = "Premium";
      description = "High-end production, excellent quality";
    } else if (efficiencyRatio <= breakpoints.diminishing_threshold) {
      rating = "Luxury";
      description = "Top-tier production, maximum quality";
    } else {
      rating = "Excessive";
      description = "Diminishing returns, money could be better spent";
    }
    
    return { rating, description, efficiencyRatio };
  }

  /**
   * Calculates song count impact on individual song quality
   * Originally from game-engine.ts line 1534-1560
   */
  calculateSongCountQualityImpact(songCount: number): number {
    const balance = this.gameData.getBalanceConfigSync();
    const songCountSystem = balance.economy.song_count_cost_system?.quality_per_song_impact;
    
    if (!songCountSystem?.enabled || songCount <= 1) {
      return 1.0; // No impact for single songs
    }
    
    // Quality decreases slightly for each additional song due to divided attention
    const baseQualityPerSong = songCountSystem.base_quality_per_song;
    const minMultiplier = songCountSystem.min_quality_multiplier;
    
    // Exponential decay: quality = baseQualityPerSong^(songCount-1)
    const qualityImpact = Math.pow(baseQualityPerSong, songCount - 1);
    
    // Ensure it doesn't go below minimum
    const finalImpact = Math.max(minMultiplier, qualityImpact);
    
    // console.log(`[SONG COUNT IMPACT] Quality impact calculation:`, {
    //   songCount,
    //   baseQualityPerSong,
    //   qualityImpact: qualityImpact.toFixed(3),
    //   finalImpact: finalImpact.toFixed(3)
    // });
    
    return finalImpact;
  }

  /**
   * Calculates enhanced project cost with multiple factors
   * Originally from game-engine.ts line 2967-3022
   */
  calculateEnhancedProjectCost(
    projectType: string, 
    producerTier: string, 
    timeInvestment: string, 
    quality: number = 50,
    songCount?: number
  ): number {
    const producerSystem = this.gameData.getProducerTierSystemSync();
    const timeSystem = this.gameData.getTimeInvestmentSystemSync();
    
    // Get base cost
    const balance = this.gameData.getBalanceConfigSync();
    const projectCosts = balance.economy.project_costs[projectType.toLowerCase()];
    if (!projectCosts) {
      throw new Error(`Unknown project type: ${projectType}`);
    }
    
    // Determine actual song count
    const actualSongCount = songCount || projectCosts.song_count_default || 1;
    
    // Calculate base cost per song
    const songCountSystem = balance.economy.song_count_cost_system;
    let totalBaseCost: number;
    
    if (songCountSystem?.enabled && actualSongCount > 1) {
      // Use per-song cost system
      const baseCostPerSong = songCountSystem.base_per_song_cost[projectType.toLowerCase()] || projectCosts.min;
      
      // Calculate economies of scale
      const economiesMultiplier = this.calculateEconomiesOfScale(actualSongCount, songCountSystem.economies_of_scale);
      
      totalBaseCost = baseCostPerSong * actualSongCount * economiesMultiplier;
    } else {
      // Use traditional single-song cost
      totalBaseCost = projectCosts.min + ((projectCosts.max - projectCosts.min) * (quality / 100));
    }
    
    // Apply multipliers
    const producerMultiplier = producerSystem[producerTier]?.multiplier || 1.0;
    const timeMultiplier = timeSystem[timeInvestment]?.multiplier || 1.0;
    
    const finalCost = Math.floor(totalBaseCost * producerMultiplier * timeMultiplier);
    
    // console.log(`[COST CALC] Enhanced project cost for ${projectType}:`, {
    //   projectType,
    //   actualSongCount,
    //   totalBaseCost,
    //   producerTier,
    //   producerMultiplier,
    //   timeInvestment,
    //   timeMultiplier,
    //   finalCost
    // });
    
    return finalCost;
  }

  /**
   * Calculates enhanced project cost with per-song budget semantics
   * Originally from game-engine.ts line 3029-3061
   */
  calculatePerSongProjectCost(
    budgetPerSong: number,
    songCount: number,
    producerTier: string,
    timeInvestment: string
  ): { baseCost: number; totalCost: number; breakdown: any } {
    const producerSystem = this.gameData.getProducerTierSystemSync();
    const timeSystem = this.gameData.getTimeInvestmentSystemSync();
    
    // Calculate base cost: budgetPerSong × songCount
    const baseCost = budgetPerSong * songCount;
    
    // Apply multipliers
    const producerMultiplier = producerSystem[producerTier]?.multiplier || 1.0;
    const timeMultiplier = timeSystem[timeInvestment]?.multiplier || 1.0;
    
    const totalCost = Math.round(baseCost * producerMultiplier * timeMultiplier);
    
    const breakdown = {
      budgetPerSong,
      songCount,
      baseCost,
      producerTier,
      producerMultiplier,
      timeInvestment,
      timeMultiplier,
      totalCost
    };
    
    // console.log('[PER-SONG COST CALC]', breakdown);
    
    return { baseCost, totalCost, breakdown };
  }


  /**
   * Calculates executive salaries for the month
   * Gets executives from the database and looks up their salaries from roles.json
   * @param gameId The game ID to get executives for
   * @param storage The storage instance to fetch executives
   * @returns Total executive salaries and breakdown by role
   */
  async calculateExecutiveSalaries(
    gameId: string,
    storage?: any
  ): Promise<{
    total: number;
    breakdown: Array<{ role: string, name: string, salary: number }>;
  }> {
    console.log('\n========== EXECUTIVE SALARY CALCULATION START ==========');
    console.log('[DEBUG] calculateExecutiveSalaries called with gameId:', gameId);
    console.log('[DEBUG] Storage provided:', !!storage);
    console.log('[DEBUG] Storage has getExecutivesByGame:', !!(storage && storage.getExecutivesByGame));
    
    let executiveBreakdown: Array<{ role: string, name: string, salary: number }> = [];
    let totalSalaries = 0;

    try {
      if (storage && storage.getExecutivesByGame) {
        console.log('[DEBUG] Calling storage.getExecutivesByGame...');
        // Get executives from database
        const executives = await storage.getExecutivesByGame(gameId);
        console.log('[DEBUG] Executives returned from database:', executives);
        console.log('[DEBUG] Number of executives found:', executives ? executives.length : 0);
        
        if (executives && executives.length > 0) {
          console.log('[DEBUG] Processing executives to get salaries...');
          console.log('[DEBUG] gameData available:', !!this.gameData);
          console.log('[DEBUG] gameData.getRoleById available:', !!(this.gameData && this.gameData.getRoleById));
          
          // Map each executive to their salary from roles.json
          executiveBreakdown = await Promise.all(executives.map(async (exec: any, index: number) => {
            console.log(`[DEBUG] Processing executive ${index + 1}:`, exec);
            // Get role data from roles.json using gameData
            console.log(`[DEBUG] Calling gameData.getRoleById for role: "${exec.role}"`);
            const roleData = await this.gameData.getRoleById(exec.role);
            console.log(`[DEBUG] Role data for ${exec.role}:`, roleData);
            const salary = roleData?.baseSalary || 0;
            console.log(`[DEBUG] Salary for ${exec.role}: $${salary}`);
            
            return {
              role: exec.role,
              name: roleData?.title || roleData?.name || exec.role,
              salary: salary
            };
          }));
          
          // Calculate total
          totalSalaries = executiveBreakdown.reduce((sum, exec) => sum + exec.salary, 0);
          
          console.log('[DEBUG] Final executive salary breakdown:', executiveBreakdown);
          console.log('[DEBUG] Total executive salaries calculated: $' + totalSalaries);
        } else {
          console.log('[DEBUG] No executives found for game:', gameId);
          console.log('[DEBUG] executives value:', executives);
        }
      } else {
        console.warn('[DEBUG] Storage not available or missing getExecutivesByGame method');
        console.log('[DEBUG] Storage object:', storage);
      }
    } catch (error) {
      console.error('[DEBUG] ERROR calculating executive salaries:', error);
      console.error('[DEBUG] Error stack:', error.stack);
      // Return empty breakdown on error
      executiveBreakdown = [];
      totalSalaries = 0;
    }

    const result = {
      total: totalSalaries,
      breakdown: executiveBreakdown
    };
    
    console.log('[DEBUG] Returning result:', result);
    console.log('========== EXECUTIVE SALARY CALCULATION END ==========\n');
    
    return result;
  }

  /**
   * Calculates monthly burn with detailed breakdown
   * Originally from game-engine.ts line 572-617
   * Now accepts optional artist data to maintain pure function principle
   */
  async calculateMonthlyBurnWithBreakdown(
    gameStateId: string,
    storageOrArtistData?: any
  ): Promise<{
    total: number;
    baseBurn: number;
    artistCosts: number;
    artistDetails: Array<{name: string, monthlyFee: number}>;
  }> {
    const [min, max] = this.gameData.getMonthlyBurnRangeSync();
    const baseBurn = Math.round(this.getRandom(min, max));
    
    // Add actual artist costs from signed artists
    let artistCosts = 0;
    let artistDetails: Array<{name: string, monthlyFee: number}> = [];
    
    // Check if we received artist data directly (preferred) or need to fetch from storage
    if (Array.isArray(storageOrArtistData)) {
      // Artist data was passed directly - use it
      artistDetails = storageOrArtistData.map((artist: any) => ({
        name: artist.name,
        monthlyFee: artist.monthlyFee || 1200
      }));
      
      artistCosts = artistDetails.reduce((sum, artist) => sum + artist.monthlyFee, 0);
      
      // console.log(`[ARTIST COSTS BREAKDOWN] Base operations: $${baseBurn}`);
      // console.log(`[ARTIST COSTS BREAKDOWN] Artist details:`, artistDetails);
      // console.log(`[ARTIST COSTS BREAKDOWN] Total artist costs: $${artistCosts}`);
      // console.log(`[ARTIST COSTS BREAKDOWN] Total monthly burn: $${baseBurn + artistCosts}`);
    } else {
      // Legacy path: storageOrArtistData is a storage object
      try {
        if (storageOrArtistData && storageOrArtistData.getArtistsByGame) {
          const signedArtists = await storageOrArtistData.getArtistsByGame(gameStateId);
          artistDetails = signedArtists.map((artist: any) => ({
            name: artist.name,
            monthlyFee: artist.monthlyFee || this.CONSTANTS.DEFAULT_ARTIST_FEE
          }));
          
          artistCosts = artistDetails.reduce((sum, artist) => sum + artist.monthlyFee, 0);
          
          // console.log(`[ARTIST COSTS BREAKDOWN] Base operations: $${baseBurn}`);
          // console.log(`[ARTIST COSTS BREAKDOWN] Artist details:`, artistDetails);
          // console.log(`[ARTIST COSTS BREAKDOWN] Total artist costs: $${artistCosts}`);
          // console.log(`[ARTIST COSTS BREAKDOWN] Total monthly burn: $${baseBurn + artistCosts}`);
        } else {
          // No storage or artist data available - use fallback
          // console.warn('[ARTIST COSTS] No artist data or storage provided, using default estimation');
          const estimatedArtists = 1;
          artistCosts = estimatedArtists * this.CONSTANTS.DEFAULT_ARTIST_FEE; // Use average cost as fallback
          artistDetails = [{name: 'Estimated Artists', monthlyFee: artistCosts}];
        }
      } catch (error) {
        // console.error('[ARTIST COSTS] Error fetching signed artists, using fallback calculation:', error);
        // Fallback estimation if database query fails
        const estimatedArtists = 1;
        artistCosts = estimatedArtists * 1200; // Use average cost as fallback
        artistDetails = [{name: 'Estimated Artists', monthlyFee: artistCosts}];
      }
    }
    
    return {
      total: baseBurn + artistCosts,
      baseBurn,
      artistCosts,
      artistDetails
    };
  }

  /**
   * Calculates comprehensive monthly financials
   * Originally from game-engine.ts line 3126-3172
   */
  calculateMonthlyFinancials(
    summary: MonthSummary, 
    startingMoney: number
  ): MonthlyFinancials {
    const starting = startingMoney || 0;
    
    // Use the already-calculated operations costs from the expense breakdown
    // This ensures we don't recalculate with a different random value
    const operations = { 
      base: summary.expenseBreakdown?.monthlyOperations || 0, 
      artists: summary.expenseBreakdown?.artistSalaries || 0, 
      executives: summary.expenseBreakdown?.executiveSalaries || 0,
      total: (summary.expenseBreakdown?.monthlyOperations || 0) + 
             (summary.expenseBreakdown?.artistSalaries || 0) + 
             (summary.expenseBreakdown?.executiveSalaries || 0)
    };
    
    // Use actual values from summary expense breakdown
    const projects = { 
      costs: summary.expenseBreakdown?.projectCosts || 0,
      revenue: 0  // Project revenue is included in summary.revenue
    };
    const marketing = { 
      costs: summary.expenseBreakdown?.marketingCosts || 0 
    };
    const roleEffects = { 
      costs: summary.expenseBreakdown?.roleMeetingCosts || 0, 
      revenue: 0  // Role revenue is included in summary.revenue
    };
    
    // All revenue is already tracked in summary.revenue
    const streamingRevenue = summary.revenue || 0;
    
    // Use the already accumulated totals from the summary
    const totalExpenses = summary.expenses; // Already accumulated throughout the month
    const totalRevenue = summary.revenue;   // Already accumulated throughout the month
    
    const financials: MonthlyFinancials = {
      startingBalance: starting,
      operations,
      projects,
      marketing,
      roleEffects,
      streamingRevenue,
      netChange: totalRevenue - totalExpenses,
      endingBalance: starting + (totalRevenue - totalExpenses),
      breakdown: '' // Will be set below
    };
    
    financials.breakdown = this.generateFinancialBreakdown(financials);
    
    return financials;
  }

  /**
   * Generates human-readable financial breakdown string
   * Originally from game-engine.ts line 3089-3120
   */
  private generateFinancialBreakdown(f: MonthlyFinancials): string {
    const parts: string[] = [`$${f.startingBalance.toLocaleString()}`];
    
    if (f.operations.base > 0) {
      parts.push(`- $${f.operations.base.toLocaleString()} (operations)`);
    }
    if (f.operations.artists > 0) {
      parts.push(`- $${f.operations.artists.toLocaleString()} (artists)`);
    }
    if (f.operations.executives > 0) {
      parts.push(`- $${f.operations.executives.toLocaleString()} (executives)`);
    }
    if (f.projects.costs > 0) {
      parts.push(`- $${f.projects.costs.toLocaleString()} (projects)`);
    }
    if (f.projects.revenue > 0) {
      parts.push(`+ $${f.projects.revenue.toLocaleString()} (project revenue)`);
    }
    if (f.marketing.costs > 0) {
      parts.push(`- $${f.marketing.costs.toLocaleString()} (marketing)`);
    }
    if (f.roleEffects.costs > 0) {
      parts.push(`- $${f.roleEffects.costs.toLocaleString()} (role costs)`);
    }
    if (f.roleEffects.revenue > 0) {
      parts.push(`+ $${f.roleEffects.revenue.toLocaleString()} (role benefits)`);
    }
    if (f.streamingRevenue > 0) {
      parts.push(`+ $${f.streamingRevenue.toLocaleString()} (streaming)`);
    }
    
    parts.push(`= $${f.endingBalance.toLocaleString()}`);
    
    return parts.join(' ');
  }

  /**
   * Calculates press coverage for a release
   * Originally from game-engine.ts line 381-410
   */
  calculatePressPickups(
    pressAccess: string,
    prSpend: number,
    reputation: number,
    hasStoryFlag: boolean,
    getRandomFn: () => number,
    getAccessChanceFn: (type: string, tier: string) => number
  ): number {
    const config = this.gameData.getPressConfigSync();
    
    // Get base chance from access tier
    const accessChance = getAccessChanceFn('press', pressAccess);
    
    // Calculate pickup chance
    let chance = config.base_chance + accessChance;
    chance += (prSpend * config.pr_spend_modifier);
    chance += (reputation * config.reputation_modifier);
    
    if (hasStoryFlag) {
      chance += config.story_flag_bonus;
    }
    
    // Roll for each potential pickup
    let pickups = 0;
    for (let i = 0; i < config.max_pickups_per_release; i++) {
      if (getRandomFn() < chance) {
        pickups++;
      }
    }
    
    return pickups;
  }

  /**
   * Calculates press coverage outcome including pickups and reputation gain
   * Originally from game-engine.ts line 415-430
   */
  calculatePressOutcome(
    quality: number,
    pressAccess: string,
    reputation: number,
    marketingBudget: number,
    getRandomFn: () => number,
    getAccessChanceFn: (type: string, tier: string) => number
  ): { pickups: number; reputationGain: number } {
    const pickups = this.calculatePressPickups(
      pressAccess, 
      marketingBudget, 
      reputation, 
      false,
      getRandomFn,
      getAccessChanceFn
    );
    
    // Calculate reputation gain based on pickups and quality
    const reputationGain = pickups > 0 ? Math.floor(pickups * (quality / 100) * this.CONSTANTS.REPUTATION_GAIN_MULTIPLIER) : 0;
    
    return {
      pickups,
      reputationGain
    };
  }

  /**
   * Helper to get access tier chances
   * Originally from game-engine.ts line 460-470
   */
  getAccessChance(type: string, tier: string): number {
    const tiers = this.gameData.getAccessTiersSync();
    
    if (type === 'press') {
      const tierData = tiers.press_access as any;
      return tierData[tier]?.pickup_chance || this.CONSTANTS.DEFAULT_PRESS_CHANCE;
    }
    
    // Default fallback
    return this.CONSTANTS.DEFAULT_PRESS_CHANCE;
  }

  /**
   * Generates economic insight summary for song creation
   * Originally from game-engine.ts line 1488-1519
   */
  static generateSongEconomicInsight(song: any, project: any): string {
    const metadata = song.metadata || {};
    const qualityCalc = metadata.qualityCalculation || {};
    
    let insight = `Quality: ${song.quality}/100`;
    
    // Add producer tier insight
    if (song.producerTier && song.producerTier !== 'local') {
      insight += ` (${song.producerTier} producer`;
      if (qualityCalc.producerBonus > 0) {
        insight += ` +${qualityCalc.producerBonus}`;
      }
      insight += ')';
    }
    
    // Add budget efficiency insight
    if (metadata.perSongBudget > 0) {
      const efficiency = parseFloat(metadata.economicEfficiency) || 0;
      insight += `, $${metadata.perSongBudget.toLocaleString()}/song`;
      if (efficiency > 0) {
        insight += ` (${efficiency} quality/$1k)`;
      }
    }
    
    // Add multi-song impact insight
    if (metadata.songCountQualityImpact && metadata.songCountQualityImpact !== 1.0) {
      const impactPercent = (metadata.songCountQualityImpact - 1.0) * 100;
      insight += `, Multi-song: ${impactPercent > 0 ? '+' : ''}${impactPercent.toFixed(1)}%`;
    }
    
    return insight;
  }
  
  /**
   * Generates economic summary for project completion
   * Originally from game-engine.ts line 1524-1560
   */
  static generateProjectCompletionSummary(project: any): string {
    const metadata = project.metadata || {};
    const economicDecisions = metadata.economicDecisions || {};
    
    let summary = `Total investment: $${(project.budget || 0).toLocaleString()}`;
    
    if (project.songCount > 1) {
      const perSongCost = Math.round((project.budget || 0) / project.songCount);
      summary += ` ($${perSongCost.toLocaleString()}/song)`;
    }
    
    // Add producer tier insight
    if (project.producerTier && project.producerTier !== 'local') {
      summary += `, ${project.producerTier} producer`;
    }
    
    // Add time investment insight
    if (project.timeInvestment && project.timeInvestment !== 'standard') {
      summary += `, ${project.timeInvestment} timeline`;
    }
    
    // Add expected quality range if available
    if (economicDecisions.expectedQuality) {
      summary += `, Target quality: ${economicDecisions.expectedQuality.toFixed(1)}/100`;
    }
    
    // Add budget efficiency insight
    if (economicDecisions.budgetRatio) {
      const ratio = economicDecisions.budgetRatio;
      if (ratio > 1.5) {
        summary += `, Premium budget (${ratio.toFixed(1)}x minimum)`;
      } else if (ratio < 1.0) {
        summary += `, Tight budget (${ratio.toFixed(1)}x minimum)`;
      }
    }
    
    return summary;
  }
}