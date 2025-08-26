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
 */

// Import types from game-engine.ts where they're defined
import type { MonthSummary, MonthlyFinancials } from './game-engine';

export class FinancialSystem {
  private gameData: any;
  private rng: () => number;
  
  constructor(gameData: any, rng: () => number) {
    this.gameData = gameData;
    this.rng = rng;
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
      return tierData[tier]?.reach_multiplier || 0.1;
    }
    
    // Default fallback
    return 0.1;
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
    return 100;
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
    console.log(`[DEBUG] Streaming config loaded:`, {
      hasConfig: !!config,
      quality_weight: config?.quality_weight,
      playlist_weight: config?.playlist_weight,
      base_streams_per_point: config?.base_streams_per_point,
      first_week_multiplier: config?.first_week_multiplier
    });
    
    // Get playlist multiplier from real access tiers
    const playlistMultiplier = this.getAccessMultiplier('playlist', playlistAccess);
    console.log(`[DEBUG] Access multiplier for ${playlistAccess}:`, playlistMultiplier);
    
    // Calculate base streams using proper formula
    const baseStreams = 
      (quality * config.quality_weight) +
      (playlistMultiplier * config.playlist_weight * 100) +
      (reputation * config.reputation_weight) +
      (Math.sqrt(adSpend / 1000) * config.marketing_weight * 50);
    
    console.log(`[DEBUG] Stream calculation components:`, {
      quality: quality,
      qualityComponent: quality * config.quality_weight,
      playlistComponent: playlistMultiplier * config.playlist_weight * 100,
      reputationComponent: reputation * config.reputation_weight,
      marketingComponent: Math.sqrt(adSpend / 1000) * config.marketing_weight * 50,
      baseStreams: baseStreams
    });
    
    // Apply RNG variance from balance config
    const variance = this.getRandom(0.9, 1.1);
    
    // Apply first week multiplier
    const streams = baseStreams * variance * config.first_week_multiplier * config.base_streams_per_point;
    
    console.log(`[DEBUG] Final stream calculation:`, {
      baseStreams,
      variance,
      firstWeekMultiplier: config.first_week_multiplier,
      baseStreamsPerPoint: config.base_streams_per_point,
      finalStreams: Math.round(streams)
    });
    
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
   * Calculates ongoing revenue for a released project using streaming decay formula
   * Originally from game-engine.ts line 1742-1812
   */
  calculateOngoingRevenue(
    project: any, 
    currentMonth: number, 
    reputation: number, 
    playlistAccess: string
  ): number {
    const metadata = project.metadata || {};
    const initialStreams = metadata.streams || 0;
    const releaseMonth = metadata.releaseMonth || 1;
    const monthsSinceRelease = currentMonth - releaseMonth;
    
    console.log(`[REVENUE CALC] === Calculating for ${project.title} ===`);
    console.log(`[REVENUE CALC] Initial streams: ${initialStreams}`);
    console.log(`[REVENUE CALC] Release month: ${releaseMonth}`);
    console.log(`[REVENUE CALC] Current month: ${currentMonth}`);
    console.log(`[REVENUE CALC] Months since release: ${monthsSinceRelease}`);
    
    // No revenue if just released this month or no initial streams
    if (monthsSinceRelease <= 0) {
      console.log(`[REVENUE CALC] No revenue - just released or future release (monthsSinceRelease: ${monthsSinceRelease})`);
      return 0;
    }
    
    if (initialStreams === 0) {
      console.log(`[REVENUE CALC] No revenue - no initial streams`);
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
      console.log(`[REVENUE CALC] Project too old (${monthsSinceRelease} > ${maxDecayMonths} months), returning $0`);
      return 0;
    }
    
    // Decay formula: starts high, gradually decreases
    const baseDecay = Math.pow(decayRate, monthsSinceRelease);
    console.log(`[REVENUE CALC] Decay rate: ${decayRate}, Base decay: ${baseDecay.toFixed(4)}`);
    
    // Apply current reputation and access tier bonuses
    const reputationBonus = 1 + (reputation - 50) * reputationBonusFactor;
    const playlistMultiplier = this.getAccessMultiplier('playlist', playlistAccess);
    const accessBonus = 1 + (playlistMultiplier - 1) * accessTierBonusFactor;
    console.log(`[REVENUE CALC] Reputation: ${reputation}, Reputation bonus: ${reputationBonus.toFixed(4)}`);
    console.log(`[REVENUE CALC] Playlist access: ${playlistAccess}, Multiplier: ${playlistMultiplier}, Access bonus: ${accessBonus.toFixed(4)}`);
    
    // Calculate monthly streams with decay
    const monthlyStreams = initialStreams * baseDecay * reputationBonus * accessBonus * ongoingFactor;
    console.log(`[REVENUE CALC] Monthly streams calculation: ${initialStreams} * ${baseDecay.toFixed(4)} * ${reputationBonus.toFixed(4)} * ${accessBonus.toFixed(4)} * ${ongoingFactor} = ${monthlyStreams.toFixed(2)}`);
    
    // Convert to revenue
    const revenue = Math.max(0, Math.round(monthlyStreams * revenuePerStream));
    console.log(`[REVENUE CALC] Revenue calculation: ${monthlyStreams.toFixed(2)} streams * $${revenuePerStream} = $${revenue}`);
    
    // Apply minimum threshold
    if (revenue < minimumThreshold) {
      console.log(`[REVENUE CALC] Revenue below threshold ($${revenue} < $${minimumThreshold}), returning $0`);
      return 0;
    }
    
    console.log(`[REVENUE CALC] Final revenue: $${revenue}`);
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
    
    console.log(`[SONG REVENUE CALC] === Calculating for "${song.title}" ===`);
    console.log(`[SONG REVENUE CALC] Quality: ${song.quality}, Initial streams: ${initialStreams}`);
    console.log(`[SONG REVENUE CALC] Release month: ${releaseMonth}, Current month: ${currentMonth}`);
    console.log(`[SONG REVENUE CALC] Months since release: ${monthsSinceRelease}`);
    
    // No revenue if just released this month or no initial streams
    if (monthsSinceRelease <= 0) {
      console.log(`[SONG REVENUE CALC] No revenue - just released or future release`);
      return 0;
    }
    
    if (initialStreams === 0) {
      console.log(`[SONG REVENUE CALC] No revenue - no initial streams`);
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
      console.log(`[SONG REVENUE CALC] Song too old (${monthsSinceRelease} > ${maxDecayMonths} months), returning $0`);
      return 0;
    }
    
    // Individual song decay formula
    const baseDecay = Math.pow(decayRate, monthsSinceRelease);
    console.log(`[SONG REVENUE CALC] Base decay: ${baseDecay.toFixed(4)}`);
    
    // Apply current reputation and access tier bonuses
    const reputationBonus = 1 + (reputation - 50) * reputationBonusFactor;
    const playlistMultiplier = this.getAccessMultiplier('playlist', playlistAccess);
    const accessBonus = 1 + (playlistMultiplier - 1) * accessTierBonusFactor;
    
    // Calculate monthly streams for this individual song
    const monthlyStreams = initialStreams * baseDecay * reputationBonus * accessBonus * ongoingFactor;
    console.log(`[SONG REVENUE CALC] Monthly streams: ${initialStreams} * ${baseDecay.toFixed(4)} * ${reputationBonus.toFixed(4)} * ${accessBonus.toFixed(4)} * ${ongoingFactor} = ${monthlyStreams.toFixed(2)}`);
    
    // Convert to revenue
    const revenue = Math.max(0, Math.round(monthlyStreams * revenuePerStream));
    console.log(`[SONG REVENUE CALC] Revenue: ${monthlyStreams.toFixed(2)} streams * $${revenuePerStream} = $${revenue}`);
    
    // Apply minimum threshold
    if (revenue < minimumThreshold) {
      console.log(`[SONG REVENUE CALC] Revenue below threshold ($${revenue} < $${minimumThreshold}), returning $0`);
      return 0;
    }
    
    console.log(`[SONG REVENUE CALC] Final revenue for "${song.title}": $${revenue}`);
    return revenue;
  }

  /**
   * Calculates budget bonus for song quality using diminishing returns
   * Originally from game-engine.ts line 1559-1619
   */
  calculateBudgetQualityBonus(
    budgetPerSong: number,
    projectType: string,
    producerTier: string,
    timeInvestment: string,
    songCount: number = 1
  ): number {
    const balance = this.gameData.getBalanceConfigSync();
    const budgetSystem = balance.quality_system.budget_quality_system;
    
    if (!budgetSystem?.enabled) {
      return 0;
    }
    
    // Calculate minimum viable per-song cost for this configuration
    const minTotalCost = this.calculateEnhancedProjectCost(projectType, producerTier, timeInvestment, 30, songCount);
    const minPerSongCost = minTotalCost / songCount;
    
    // Calculate budget ratio relative to minimum viable per-song cost
    const budgetRatio = budgetPerSong / minPerSongCost;
    
    let budgetBonus = 0;
    const breakpoints = budgetSystem.efficiency_breakpoints;
    const maxBonus = budgetSystem.max_budget_bonus;
    
    if (budgetRatio < breakpoints.minimum_viable) {
      // Below minimum viable - penalty
      budgetBonus = -5;
    } else if (budgetRatio <= breakpoints.optimal_efficiency) {
      // Linear scaling from 0 to 40% of max bonus in optimal range
      budgetBonus = ((budgetRatio - breakpoints.minimum_viable) / (breakpoints.optimal_efficiency - breakpoints.minimum_viable)) * (maxBonus * 0.4);
    } else if (budgetRatio <= breakpoints.luxury_threshold) {
      // Linear scaling from 40% to 80% of max bonus in luxury range
      const baseBonus = maxBonus * 0.4;
      const luxuryBonus = ((budgetRatio - breakpoints.optimal_efficiency) / (breakpoints.luxury_threshold - breakpoints.optimal_efficiency)) * (maxBonus * 0.4);
      budgetBonus = baseBonus + luxuryBonus;
    } else if (budgetRatio <= breakpoints.diminishing_threshold) {
      // Linear scaling from 80% to 100% of max bonus before diminishing returns
      const baseBonus = maxBonus * 0.8;
      const highEndBonus = ((budgetRatio - breakpoints.luxury_threshold) / (breakpoints.diminishing_threshold - breakpoints.luxury_threshold)) * (maxBonus * 0.2);
      budgetBonus = baseBonus + highEndBonus;
    } else {
      // Diminishing returns beyond threshold
      const excessRatio = budgetRatio - breakpoints.diminishing_threshold;
      const diminishingBonus = Math.log(1 + excessRatio) * budgetSystem.diminishing_returns_factor * maxBonus * 0.1;
      budgetBonus = maxBonus + diminishingBonus;
    }
    
    console.log(`[BUDGET CALC] Per-song budget quality bonus calculation:`, {
      budgetPerSong: budgetPerSong.toFixed(0),
      minPerSongCost: minPerSongCost.toFixed(0),
      songCount,
      budgetRatio: budgetRatio.toFixed(2),
      budgetBonus: budgetBonus.toFixed(2),
      projectType,
      producerTier,
      timeInvestment
    });
    
    return Math.round(budgetBonus * 100) / 100; // Round to 2 decimal places
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
    
    console.log(`[SONG COUNT IMPACT] Quality impact calculation:`, {
      songCount,
      baseQualityPerSong,
      qualityImpact: qualityImpact.toFixed(3),
      finalImpact: finalImpact.toFixed(3)
    });
    
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
    
    console.log(`[COST CALC] Enhanced project cost for ${projectType}:`, {
      projectType,
      actualSongCount,
      totalBaseCost,
      producerTier,
      producerMultiplier,
      timeInvestment,
      timeMultiplier,
      finalCost
    });
    
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
    
    console.log('[PER-SONG COST CALC]', breakdown);
    
    return { baseCost, totalCost, breakdown };
  }

  /**
   * Calculates economies of scale multiplier for song count
   * Originally from game-engine.ts line 3067-3084
   */
  private calculateEconomiesOfScale(songCount: number, economiesConfig: any): number {
    if (!economiesConfig?.enabled) {
      return 1.0;
    }
    
    const breakpoints = economiesConfig.breakpoints;
    const thresholds = economiesConfig.thresholds;
    
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
   * Calculates monthly burn with detailed breakdown
   * Originally from game-engine.ts line 572-617
   * Note: This requires storage access, so it needs GameEngine context
   * TODO: Refactor to accept artist data as parameter instead of fetching
   */
  async calculateMonthlyBurnWithBreakdown(
    gameStateId: string,
    storage?: any
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
    
    try {
      if (storage && storage.getArtistsByGame) {
        const signedArtists = await storage.getArtistsByGame(gameStateId);
        artistDetails = signedArtists.map((artist: any) => ({
          name: artist.name,
          monthlyFee: artist.monthlyFee || 1200
        }));
        
        artistCosts = artistDetails.reduce((sum, artist) => sum + artist.monthlyFee, 0);
        
        console.log(`[ARTIST COSTS BREAKDOWN] Base operations: $${baseBurn}`);
        console.log(`[ARTIST COSTS BREAKDOWN] Artist details:`, artistDetails);
        console.log(`[ARTIST COSTS BREAKDOWN] Total artist costs: $${artistCosts}`);
        console.log(`[ARTIST COSTS BREAKDOWN] Total monthly burn: $${baseBurn + artistCosts}`);
      } else {
        throw new Error('Storage not available for database operations');
      }
    } catch (error) {
      console.error('[ARTIST COSTS] Error fetching signed artists, using fallback calculation:', error);
      // Fallback to flag-based estimation if database query fails
      // TODO: Pass flags as parameter instead
      const estimatedArtists = 1;
      artistCosts = estimatedArtists * 1200; // Use average cost as fallback
      artistDetails = [{name: 'Estimated Artists', monthlyFee: artistCosts}];
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
      total: (summary.expenseBreakdown?.monthlyOperations || 0) + (summary.expenseBreakdown?.artistSalaries || 0)
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
}