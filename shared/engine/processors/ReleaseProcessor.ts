/**
 * ReleaseProcessor — the release / streaming / awareness domain (Phase 2 engine-seams §2 row 7).
 *
 * This is the biggest engine module (~1,250 lines), extracted VERBATIM from
 * `GameEngine`. Every log line, branch, config lookup, summary mutation, and
 * storage/gameData/tx call is preserved character-for-character. Only `this.`
 * is rebound to the injected `WeekContext`:
 *   this.gameState        → ctx.gameState
 *   this.gameData         → ctx.gameData
 *   this.storage          → ctx.storage
 *   this.financialSystem  → ctx.financialSystem
 *   this.getRandom(0,1)   → ctx.getRandom(0,1)
 * Intra-domain calls (`this.calculateReleasePreview`, `this.calculatePressOutcome`,
 * `this.calculateStreamingOutcome`, `this.calculateSophisticatedReleaseOutcome`,
 * `this.calculateOngoingSongRevenue`, `this.calculateStreamingPopularityBonus`,
 * `this.calculateReleaseRisks`, `this.getChannelSynergiesFromBalance`,
 * `this.generateReleaseRecommendations`) become `this.` calls WITHIN this processor
 * (the methods moved together), so behavior is unchanged.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * RNG INVARIANT (see ./types.ts): the release domain draws from the engine's
 * single seeded stream ONLY through `ctx.getRandom`, used inside
 * `calculatePressOutcome` (press-pickup rolls). The engine's pre-extraction
 * wrapper passed `() => this.getRandom(0, 1)` into
 * `FinancialSystem.calculatePressOutcome`; the processor passes
 * `() => ctx.getRandom(0, 1)`, the SAME seeded draw in the SAME pipeline position,
 * so stream order — and therefore golden-master output — is byte-identical.
 * (The awareness breakthrough "roll" at weeks 3-6 is a DETERMINISTIC
 * `Math.sin(seedVal)` hash of song properties, NOT an RNG draw, so it does not
 * touch the seeded stream — preserved verbatim.)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * COMMIT SPLIT (plan §2 row 7 allows 10a/10b): this domain moved across two
 * commits on ONE branch, but the dependency direction forced PREVIEW-FIRST
 * (the weekly pipeline calls `calculateSophisticatedReleaseOutcome` →
 * `calculateReleasePreview`, so the preview cluster is a leaf the pipeline needs):
 *   • commit A (10a) = the preview/outcome + calc cluster:
 *       calculateReleasePreview, calculateSophisticatedReleaseOutcome,
 *       calculatePressOutcome, calculateStreamingOutcome,
 *       calculateOngoingSongRevenue, calculateReleaseRisks,
 *       getChannelSynergiesFromBalance, generateReleaseRecommendations.
 *   • commit B (10b) = the weekly pipeline: processReleasedProjects,
 *       processLeadSingles, processPlannedReleases, processSongRelease,
 *       processProjectSongsRelease, + exclusive helpers
 *       calculateStreamingPopularityBonus, getReleaseTypeMultiplier.
 *
 * ENGINE DELEGATES kept (same-signature, thin wrappers) for EXTERNAL callers:
 *   • calculateReleasePreview — server/routes/releases.ts:429 builds a GameEngine
 *     for the preview endpoint and calls this on the instance. Guarded by
 *     tests/endpoints/releases.characterization.test.ts.
 *   • calculateStreamingOutcome / calculatePressOutcome / calculateOngoingSongRevenue
 *     stay as engine wrappers (they were already thin FinancialSystem delegates and
 *     are part of the engine's public/diagnostic surface).
 *   • processSongRelease / processProjectSongsRelease stay as public engine methods.
 *
 * The processor is stateless — all state flows through the `WeekContext`.
 */
import type { WeekContext } from './types';
import type { WeekSummary } from '../../types/gameTypes';
import { ArtistChangeHelpers } from '../../types/gameTypes';
import { getSeasonFromWeek, getSeasonalMultiplier } from '../../utils/seasonalCalculations';

// Patch type for song updates applied during weekly processing. Mirrors the
// module-level SongUpdatePatch in game-engine.ts: `processReleasedProjects`'s
// awareness-only `else if` branch references this outer type (its `if`-block
// declares an identically-shaped local one), so it must resolve here exactly as
// it did in the engine. Kept structurally identical to preserve verbatim behavior.
type SongUpdatePatch = {
  songId: string;
  weeklyStreams?: number;
  lastWeekRevenue?: number;
  totalRevenue?: number;
  totalStreams?: number;
  awareness?: number;
  peak_awareness?: number;
  awareness_decay_rate?: number;
};

export class ReleaseProcessor {
  /**
   * Calculates streaming revenue for a release
   * Uses the formula from balance.json
   */
  // DELEGATED TO FinancialSystem (originally lines 360-410)
  calculateStreamingOutcome(
    ctx: WeekContext,
    quality: number,
    playlistAccess: string,
    reputation: number,
    adSpend: number,
    artistPopularity: number
  ): number {
    return ctx.financialSystem.calculateStreamingOutcome(
      quality,
      playlistAccess,
      reputation,
      adSpend,
      artistPopularity
    );
  }

  /**
   * Calculates press coverage outcome including pickups and reputation gain
   */
  // DELEGATED TO FinancialSystem
  calculatePressOutcome(
    ctx: WeekContext,
    quality: number,
    pressAccess: string,
    reputation: number,
    marketingBudget: number
  ): { pickups: number; reputationGain: number } {
    return ctx.financialSystem.calculatePressOutcome(
      quality,
      pressAccess,
      reputation,
      marketingBudget,
      () => ctx.getRandom(0, 1),
      ctx.financialSystem.getAccessChance.bind(ctx.financialSystem)
    );
  }

  /**
   * Calculates ongoing revenue for an individual released song using streaming decay formula
   * Each song has its own decay pattern based on individual quality and release timing
   */
  // DELEGATED TO FinancialSystem (originally lines 1714-1782)
  async calculateOngoingSongRevenue(ctx: WeekContext, song: any): Promise<number> {
    return await ctx.financialSystem.calculateOngoingSongRevenue(
      song,
      ctx.gameState.currentWeek || 1,
      ctx.gameState.reputation || 0,
      ctx.gameState.playlistAccess || 'none'
    );
  }

  /**
   * Calculates comprehensive release preview metrics using GameEngine formulas
   * This method provides accurate economic projections for release planning
   */
  calculateReleasePreview(
    ctx: WeekContext,
    songs: any[],
    artist: any,
    releaseConfig: {
      releaseType: 'single' | 'ep' | 'album';
      leadSingleId?: string;
      seasonalTiming: string;
      scheduledReleaseWeek: number;
      marketingBudget: Record<string, number>;
      leadSingleStrategy?: {
        leadSingleId: string;
        leadSingleReleaseWeek: number;
        leadSingleBudget: Record<string, number>;
      };
    }
  ) {
    const balance = ctx.gameData.getBalanceConfigSync();

    // Auto-detect season from release week
    const mainReleaseSeason = getSeasonFromWeek(releaseConfig.scheduledReleaseWeek);

    // Calculate base song metrics using existing GameEngine methods
    const averageQuality = songs.reduce((sum, song) => sum + song.quality, 0) / songs.length;

    // Calculate total base streams using sophisticated streaming calculation
    let totalBaseStreams = 0;
    let totalBaseRevenue = 0;

    for (const song of songs) {
      const songStreams = this.calculateStreamingOutcome(
        ctx,
        song.quality,
        ctx.gameState.playlistAccess || 'none',
        ctx.gameState.reputation || 0,
        0, // No marketing spend for base calculation
        artist.popularity || 0
      );
      totalBaseStreams += songStreams;
      const revenuePerStream = balance?.market_formulas?.streaming_calculation?.ongoing_streams?.revenue_per_stream || 0.05;
      if (!balance?.market_formulas?.streaming_calculation?.ongoing_streams?.revenue_per_stream) {
        console.warn('[GameEngine] revenue_per_stream not found in balance data, using default: 0.05');
      }
      totalBaseRevenue += songStreams * revenuePerStream;
    }

    // Get release planning configuration from balance.json with fallbacks
    const releasePlanningConfig = balance?.market_formulas?.release_planning || {
      release_type_bonuses: {
        single: { revenue_multiplier: 1.2 },
        ep: { revenue_multiplier: 1.15 },
        album: { revenue_multiplier: 1.25 }
      },
      marketing_channels: {},
      seasonal_cost_multipliers: { q1: 0.85, q2: 0.95, q3: 1.1, q4: 1.4 },
      diversity_bonus: { base: 1, per_additional_channel: 0.08, maximum: 1.4 },
      channel_synergy_bonuses: {},
      lead_single_strategy: { optimal_timing_bonus: 1.25, default_bonus: 1.05 }
    };

    if (!balance?.market_formulas?.release_planning) {
      console.warn('[GameEngine] release_planning not found in balance data, using defaults');
    }

    // Apply release type multipliers from balance.json
    const releaseTypeBonuses = releasePlanningConfig.release_type_bonuses;
    const releaseTypeData = releaseTypeBonuses[releaseConfig.releaseType];
    if (!releaseTypeData) {
      throw new Error(`Release type ${releaseConfig.releaseType} not found in balance.json release_type_bonuses`);
    }

    const releaseMultiplier = releaseTypeData.revenue_multiplier;
    // Calculate bonus percentage from multiplier for display
    const releaseBonus = Math.round((releaseMultiplier - 1) * 100);

    // Use shared seasonal calculation utility
    const seasonalRevenueMultiplier = getSeasonalMultiplier(releaseConfig.scheduledReleaseWeek, ctx.gameData);

    // Calculate marketing effectiveness using balance.json formulas
    const totalMarketingBudget = Object.values(releaseConfig.marketingBudget).reduce((sum, budget) => sum + budget, 0);

    // Channel-specific effectiveness from balance.json
    const channelEffectiveness = releasePlanningConfig.marketing_channels;

    // Calculate weighted marketing effectiveness based on channel allocation
    let weightedEffectiveness = 0;
    const activeChannels = Object.entries(releaseConfig.marketingBudget).filter(([_, budget]) => budget > 0);

    if (activeChannels.length > 0) {
      activeChannels.forEach(([channelId, budget]) => {
        const channelWeight = budget / totalMarketingBudget;
        const channelData = channelEffectiveness[channelId as keyof typeof channelEffectiveness];
        const effectiveness = channelData?.effectiveness || 0.75;
        weightedEffectiveness += channelWeight * effectiveness;
      });
    } else {
      weightedEffectiveness = 0.75; // Default baseline
    }

    // Sophisticated marketing effectiveness calculation
    const marketingWeight = balance?.market_formulas?.streaming_calculation?.marketing_weight;
    if (!marketingWeight) {
      throw new Error('marketing_weight not found in balance.json market_formulas.streaming_calculation');
    }
    const baseMarketingMultiplier = 1 + (Math.sqrt(totalMarketingBudget / 5000) * marketingWeight * 3 * weightedEffectiveness);

    // Channel diversity bonus calculation from balance.json
    const diversityConfig = releasePlanningConfig.diversity_bonus;
    const diversityBonus = Math.min(
      diversityConfig.maximum,
      diversityConfig.base + (activeChannels.length - 1) * diversityConfig.per_additional_channel
    );

    // Channel synergy bonuses from balance.json
    const synergyBonuses = releasePlanningConfig.channel_synergy_bonuses;
    let synergyBonus = 1.0;
    const channelTypes = activeChannels.map(([id, _]) => id);

    // Radio + Digital synergy
    if (channelTypes.includes('radio') && channelTypes.includes('digital')) {
      synergyBonus += synergyBonuses.radio_digital;
    }

    // PR + Influencer synergy
    if (channelTypes.includes('pr') && channelTypes.includes('influencer')) {
      synergyBonus += synergyBonuses.pr_influencer;
    }

    // Full spectrum bonus (all four channels)
    if (channelTypes.length === 4) {
      synergyBonus += synergyBonuses.full_spectrum;
    }

    const marketingMultiplier = baseMarketingMultiplier * diversityBonus * synergyBonus;

    // Calculate seasonal marketing cost adjustments from balance.json
    const seasonalCostMultipliers = releasePlanningConfig.seasonal_cost_multipliers;
    const seasonalCostMultiplier = seasonalCostMultipliers[mainReleaseSeason as keyof typeof seasonalCostMultipliers] || 1;

    // Apply seasonal cost adjustments to marketing budget
    const adjustedMarketingCost = totalMarketingBudget * seasonalCostMultiplier;

    // Lead single strategy calculation from balance.json
    let leadSingleBoost = 1;
    let leadSingleCost = 0;

    if (releaseConfig.leadSingleStrategy && releaseConfig.releaseType !== 'single') {
      const leadSong = songs.find(s => s.id === releaseConfig.leadSingleStrategy!.leadSingleId);
      if (leadSong) {
        const leadSingleConfig = releasePlanningConfig.lead_single_strategy;
        const timingGap = releaseConfig.scheduledReleaseWeek - releaseConfig.leadSingleStrategy.leadSingleReleaseWeek;

        // Calculate timing bonus based on balance.json configuration
        let timingBonus = leadSingleConfig.default_bonus;
        if (leadSingleConfig.optimal_timing_weeks_before.includes(timingGap)) {
          timingBonus = leadSingleConfig.optimal_timing_bonus;
        } else if (timingGap === 3) {
          timingBonus = leadSingleConfig.good_timing_bonus;
        }

        const leadSingleBudget = Object.values(releaseConfig.leadSingleStrategy.leadSingleBudget).reduce((sum, budget) => sum + budget, 0);
        const leadSingleMarketingBonus = 1 + Math.sqrt(leadSingleBudget / leadSingleConfig.budget_scaling_factor) * leadSingleConfig.marketing_effectiveness_factor;

        // Calculate lead single's own seasonal multiplier based on its release week
        const leadSingleSeason = getSeasonFromWeek(releaseConfig.leadSingleStrategy.leadSingleReleaseWeek);
        const leadSingleSeasonalMultiplier = seasonalCostMultipliers[leadSingleSeason as keyof typeof seasonalCostMultipliers] || 1;

        leadSingleBoost = timingBonus * leadSingleMarketingBonus;
        leadSingleCost = leadSingleBudget * leadSingleSeasonalMultiplier;
      }
    }

    // Calculate final metrics with all multipliers
    const finalStreams = Math.round(
      totalBaseStreams *
      releaseMultiplier *
      seasonalRevenueMultiplier *
      marketingMultiplier *
      leadSingleBoost
    );

    const finalRevenue = Math.round(
      totalBaseRevenue *
      releaseMultiplier *
      seasonalRevenueMultiplier *
      marketingMultiplier *
      leadSingleBoost
    );

    // Calculate channel effectiveness breakdown with detailed metrics from balance.json
    const channelEffectivenessBreakdown: Record<string, any> = {};
    activeChannels.forEach(([channelId, budget]) => {
      const adjustedBudget = budget * seasonalCostMultiplier;
      const contribution = adjustedMarketingCost > 0 ? (adjustedBudget / adjustedMarketingCost) * 100 : 0;
      const channelData = channelEffectiveness[channelId as keyof typeof channelEffectiveness];
      const effectiveness = channelData?.effectiveness || 0.75;

      channelEffectivenessBreakdown[channelId] = {
        adjustedBudget,
        contribution,
        effectiveness: Math.round(effectiveness * 100),
        synergies: this.getChannelSynergiesFromBalance(channelId, channelTypes, releasePlanningConfig)
      };
    });

    // Total cost calculation
    const totalMarketingCost = adjustedMarketingCost + leadSingleCost;

    // ROI calculation
    const projectedROI = totalMarketingCost > 0 ?
      Math.round(((finalRevenue - totalMarketingCost) / totalMarketingCost) * 100) : 0;

    return {
      // Basic release info
      releaseType: releaseConfig.releaseType,
      songCount: songs.length,
      averageQuality: Math.round(averageQuality),

      // Main metrics (flattened for frontend compatibility)
      estimatedStreams: finalStreams,
      estimatedRevenue: finalRevenue,

      // Bonus breakdown (flattened)
      releaseBonus,
      seasonalMultiplier: seasonalRevenueMultiplier,
      marketingMultiplier,
      leadSingleBoost,
      diversityBonus,

      // Marketing details
      totalMarketingCost,
      activeChannelCount: activeChannels.length,
      channelEffectiveness: channelEffectivenessBreakdown,
      synergyBonus,

      // Financial analysis
      projectedROI,

      // Additional metrics for detailed breakdown
      baseStreams: totalBaseStreams,
      baseRevenue: totalBaseRevenue,
      chartPotential: Math.min(100, averageQuality + ((artist.mood || 50) - 50) / 2),
      breakEvenPoint: Math.max(1, Math.ceil(totalMarketingCost / (finalRevenue / 12))),
      artistMoodBonus: ((artist.mood || 50) - 50) / 10,
      qualityBonus: Math.max(0, averageQuality - 70) / 2,
      marketingEffectiveness: Math.round(marketingMultiplier * 40),

      // Future enhancements
      risks: this.calculateReleaseRisks(ctx, releaseConfig, totalMarketingCost, finalRevenue),
      recommendations: this.generateReleaseRecommendations(releaseConfig, averageQuality, totalMarketingCost)
    };
  }

  /**
   * Adapter method that uses sophisticated preview calculations for actual releases
   * Converts release metadata into preview format and returns per-song breakdown
   */
  calculateSophisticatedReleaseOutcome(
    ctx: WeekContext,
    release: any,
    songs: any[],
    artist: any
  ): {
    totalStreams: number;
    totalRevenue: number;
    perSongBreakdown: Array<{songId: string; streams: number; revenue: number}>
  } {
    // Extract marketing budget - handle current data structure
    const metadata = release.metadata as any;
    const leadSingleStrategy = metadata?.leadSingleStrategy;

    // Reconstruct marketing budget from stored data structure
    let marketingBudget: Record<string, number> = {};
    if (metadata?.marketingBudgetBreakdown && typeof metadata.marketingBudgetBreakdown === 'object') {
      // CRITICAL FIX: Use stored per-channel budget breakdown instead of even distribution
      marketingBudget = metadata.marketingBudgetBreakdown;
    } else if (metadata?.marketingBudget && typeof metadata.marketingBudget === 'object') {
      // Legacy: detailed budget object (old field name)
      marketingBudget = metadata.marketingBudget;
    } else if (release.marketingBudget && release.marketingBudget > 0) {
      // Fallback: total amount + even distribution (legacy releases)
      const totalBudget = release.marketingBudget;
      const channels = metadata?.marketingChannels || ['digital'];
      const budgetPerChannel = totalBudget / channels.length;
      channels.forEach((channel: string) => {
        marketingBudget[channel] = budgetPerChannel;
      });
    }

    // Process lead single strategy to use stored budget breakdown
    let processedLeadSingleStrategy = null;
    if (leadSingleStrategy) {
      processedLeadSingleStrategy = {
        ...leadSingleStrategy,
        // CRITICAL FIX: Use stored per-channel budget breakdown for lead single
        leadSingleBudget: leadSingleStrategy.leadSingleBudgetBreakdown || leadSingleStrategy.leadSingleBudget || {}
      };
    }

    // Create release config for preview system
    const releaseConfig = {
      releaseType: release.type as 'single' | 'ep' | 'album',
      leadSingleId: leadSingleStrategy?.leadSingleId,
      seasonalTiming: getSeasonFromWeek(release.releaseWeek),
      scheduledReleaseWeek: release.releaseWeek,
      marketingBudget,
      leadSingleStrategy: processedLeadSingleStrategy
    };

    // Use existing sophisticated preview calculation
    const previewResults = this.calculateReleasePreview(ctx, songs, artist, releaseConfig);

    // Calculate per-song breakdown by distributing total streams proportionally
    const totalSongQuality = songs.reduce((sum, song) => sum + song.quality, 0);
    const perSongBreakdown = songs.map(song => {
      const qualityProportion = song.quality / totalSongQuality;
      const songStreams = Math.round(previewResults.estimatedStreams * qualityProportion);
      const songRevenue = Math.round(previewResults.estimatedRevenue * qualityProportion);

      return {
        songId: song.id,
        streams: songStreams,
        revenue: songRevenue
      };
    });

    return {
      totalStreams: previewResults.estimatedStreams,
      totalRevenue: previewResults.estimatedRevenue,
      perSongBreakdown
    };
  }

  /**
   * Calculate potential risks for a release strategy
   */
  private calculateReleaseRisks(ctx: WeekContext, releaseConfig: any, totalCost: number, expectedRevenue: number): string[] {
    const risks: string[] = [];

    // High budget risk
    const budget = Object.values(releaseConfig.marketingBudget).reduce((a: number, b: any) => a + b, 0);
    if (budget > (ctx.gameState?.money || 0) * 0.3) {
      risks.push("High budget risk - using significant portion of available funds");
    }

    // Seasonal competition risk
    const releaseSeason = getSeasonFromWeek(releaseConfig.scheduledReleaseWeek);
    if (releaseSeason === 'q4') {
      risks.push("High competition period - Q4 releases face maximum market saturation");
    }

    // Low ROI risk
    if (totalCost > 0 && expectedRevenue / totalCost < 1.5) {
      risks.push("Low ROI potential - marketing investment may not break even");
    }

    return risks;
  }

  /**
   * Get synergies for a specific marketing channel from balance.json data
   */
  private getChannelSynergiesFromBalance(channelId: string, activeChannels: string[], releasePlanningConfig: any): string[] {
    const synergies: string[] = [];
    const channelData = releasePlanningConfig.marketing_channels[channelId];

    if (channelData && channelData.synergies) {
      channelData.synergies.forEach((synergyChannel: string) => {
        if (activeChannels.includes(synergyChannel)) {
          synergies.push(`${synergyChannel} synergy (+${Math.round(releasePlanningConfig.channel_synergy_bonuses[`${channelId}_${synergyChannel}`] * 100 || releasePlanningConfig.channel_synergy_bonuses[`${synergyChannel}_${channelId}`] * 100 || 0)}%)`);
        }
      });
    }

    if (activeChannels.length === 4) {
      synergies.push(`Full spectrum (+${Math.round(releasePlanningConfig.channel_synergy_bonuses.full_spectrum * 100)}%)`);
    }

    return synergies;
  }

  /**
   * Generate strategic recommendations for release planning
   */
  private generateReleaseRecommendations(releaseConfig: any, averageQuality: number, totalCost: number): string[] {
    const recommendations: string[] = [];

    // Quality-based recommendations
    if (averageQuality >= 85) {
      recommendations.push("High quality songs - consider premium marketing strategy");
    } else if (averageQuality < 70) {
      recommendations.push("Consider investing in higher quality production before release");
    }

    // Channel diversity recommendations
    const activeChannels = Object.entries(releaseConfig.marketingBudget).filter(([_, budget]) => (budget as number) > 0);
    if (activeChannels.length === 1) {
      recommendations.push("Consider diversifying marketing channels for better reach");
    }

    // Seasonal recommendations
    const releaseSeason = getSeasonFromWeek(releaseConfig.scheduledReleaseWeek);
    if (releaseSeason === 'q1') {
      recommendations.push("Q1 release - lower competition but reduced market activity");
    }

    return recommendations;
  }

  // ---------------------------------------------------------------------------
  // COMMIT B (10b): the weekly release PIPELINE. VERBATIM moves - this. rebound
  // to ctx (gameState/gameData/storage/financialSystem); intra-domain calls take
  // ctx as their first arg (calculateSophisticatedReleaseOutcome/calculatePress-
  // Outcome/calculateStreamingOutcome/calculateOngoingSongRevenue/processSong-
  // Release). calculateStreamingPopularityBonus is pure and takes no ctx.
  // ---------------------------------------------------------------------------

  /**
   * Calculate streaming-based popularity bonus using optimized formula
   * Implements the formula from PopularityTester: dynamic threshold, log points, diminishing returns
   */
  private calculateStreamingPopularityBonus(
    weeklyStreams: number,
    currentPopularity: number,
    baseThreshold: number = 3000,
    useDynamicThreshold: boolean = true,
    saturationPoint: number = 35
  ): number {
    // Calculate dynamic threshold based on popularity (exponential scaling)
    const actualThreshold = useDynamicThreshold
      ? Math.round(baseThreshold * Math.pow(2, currentPopularity / 25))
      : baseThreshold;

    // Convert streams to popularity points using logarithmic scaling
    if (weeklyStreams < actualThreshold) {
      return 0; // No bonus below threshold
    }

    const streamPoints = Math.log10(weeklyStreams / actualThreshold);

    // Cap total bonus at reasonable level (per song)
    const cappedPoints = Math.min(streamPoints, 10);

    // Apply diminishing returns multiplier
    const baseMultiplier = 1 / (1 + Math.pow(currentPopularity / saturationPoint, 4));
    const multiplier = 0.2 + (baseMultiplier * 1.3); // Scales from 1.5x to 0.2x

    const finalBonus = Math.max(0.1, cappedPoints * multiplier);

    return finalBonus;
  }

  /**
   * Processes ongoing revenue from individual released songs (streaming decay)
   * This simulates realistic revenue patterns where each song generates declining revenue over time
   */
  async processReleasedProjects(ctx: WeekContext, summary: WeekSummary): Promise<void> {

    try {
      // Define current week for awareness calculations
      const currentWeek = ctx.gameState.currentWeek || 1;

      // Get all released songs for this game
      const releasedSongs = await ctx.gameData.getReleasedSongs(ctx.gameState.id) || [];

      if (releasedSongs.length === 0) {
        return;
      }

      // Cache artists to avoid repeated DB lookups in the loop
      let artistMap: Map<string, any> = new Map();
      if (ctx.storage?.getArtistsByGame) {
        try {
          const artists = await ctx.storage.getArtistsByGame(ctx.gameState.id);
          if (artists && artists.length > 0) {
            artists.forEach((artist: any) => artistMap.set(artist.id, artist));
          }
        } catch (error) {
          console.error('[STREAMING POPULARITY] Error caching artists, will fallback to individual lookups:', error);
        }
      }

      // Cache releases to avoid N+1 queries in the loop
      let releaseMap: Map<string, any> = new Map();
      if (ctx.storage?.getReleasesByGame) {
        try {
          const releases = await ctx.storage.getReleasesByGame(ctx.gameState.id);
          if (releases && releases.length > 0) {
            releases.forEach((release: any) => releaseMap.set(release.id, release));
          }
        } catch (error) {
          console.error('[AWARENESS] Error caching releases, will fallback to individual lookups:', error);
        }
      }

      let totalOngoingRevenue = 0;
      const songUpdates = [];
      
      for (const song of releasedSongs) {
        const ongoingRevenue = await this.calculateOngoingSongRevenue(ctx, song);

        // Process awareness system (building in weeks 1-4, decay in weeks 5+)
        let awarenessUpdate = null;
        try {
          const releaseWeek = song.releaseWeek || 1;
          const weeksSinceRelease = currentWeek - releaseWeek;
          const currentAwareness = song.awareness || 0;

          if (weeksSinceRelease >= 1 && weeksSinceRelease <= 4) {
            // Awareness Building Phase (Weeks 1-4)
            if (song.releaseId) {
              // Use cached release to avoid N+1 queries
              let release = releaseMap.get(song.releaseId);
              if (!release && ctx.storage?.getRelease) {
                // Fallback to individual lookup if not in cache
                release = await ctx.storage.getRelease(song.releaseId);
              }
              const marketingBreakdown = release?.metadata?.marketingBudgetBreakdown;

              if (marketingBreakdown) {
              const awarenessGain = ctx.financialSystem.calculateAwarenessGain(song, marketingBreakdown);
              let newAwareness = Math.round(Math.min(currentAwareness + awarenessGain, 100));

              // Check for breakthrough achievement during weeks 3-6
              if (!song.breakthrough_achieved && weeksSinceRelease >= 3 && weeksSinceRelease <= 6) {
                const balanceConfig = ctx.gameData.getBalanceConfigSync();
                const awarenessConfig = balanceConfig?.market_formulas?.awareness_system;

                if (awarenessConfig?.enabled) {
                  // Calculate breakthrough potential
                  let breakthroughPotential = 0;
                  if (song.quality >= 80) {
                    breakthroughPotential = Math.min(newAwareness / 40, 1) * 0.65;
                  } else if (song.quality >= 70) {
                    breakthroughPotential = Math.min(newAwareness / 60, 1) * 0.35;
                  } else if (song.quality >= 60) {
                    breakthroughPotential = Math.min(newAwareness / 80, 1) * 0.15;
                  }

                  // Roll for breakthrough (deterministic based on song properties)
                  if (breakthroughPotential > 0) {
                    const artistSuffix = parseInt((song.artistId?.slice(-2) || '00'), 16);
                    const seedVal = (song.quality || 50) + currentWeek + newAwareness + (isNaN(artistSuffix) ? 0 : artistSuffix);
                    const random = (Math.sin(seedVal) + 1) / 2;

                    if (random < breakthroughPotential) {
                      // BREAKTHROUGH ACHIEVED!
                      const breakthroughEffects = awarenessConfig.breakthrough_effects || {};
                      const awarenessMultiplier = breakthroughEffects.awareness_multiplier || 2.5;

                      newAwareness = Math.round(Math.min(newAwareness * awarenessMultiplier, 100));

                      summary.changes.push({
                        type: 'breakthrough',
                        description: `🔥 "${song.title}" BREAKTHROUGH ACHIEVED! Awareness exploded to ${newAwareness}/100`,
                        amount: 0
                      });

                      awarenessUpdate = {
                        awareness: newAwareness,
                        peak_awareness: Math.round(Math.max(song.peak_awareness || 0, newAwareness)),
                        awareness_decay_rate: breakthroughEffects.breakthrough_songs || 0.03,
                        breakthrough_achieved: true
                      };
                    }
                  }
                }
              }
              if (!awarenessUpdate) {
                const newPeakAwareness = Math.round(Math.max(song.peak_awareness || 0, newAwareness));

                awarenessUpdate = {
                  awareness: newAwareness,
                  peak_awareness: newPeakAwareness,
                  awareness_decay_rate: song.awareness_decay_rate || 0.05
                };

                if (awarenessGain > 0) {
                  summary.changes.push({
                    type: 'awareness_gain',
                    description: `🎯 "${song.title}" awareness gained +${awarenessGain.toFixed(1)} (${newAwareness}/100)`,
                    amount: 0
                  });
                }
              }
            }
            }
          } else if (weeksSinceRelease >= 5) {
            // Awareness Decay Phase (Weeks 5+)
            if (currentAwareness > 0) {
              const balanceConfig = ctx.gameData.getBalanceConfigSync();
              const awarenessConfig = balanceConfig?.market_formulas?.awareness_system;

              if (awarenessConfig?.enabled) {
                const decayRates = awarenessConfig.awareness_decay_rates || {};
                let decayRate = song.breakthrough_achieved
                  ? (decayRates.breakthrough_songs || 0.03)
                  : (decayRates.standard_songs || 0.05);

                // Apply quality bonus reduction for high-quality songs
                if ((song.quality || 0) >= (decayRates.quality_bonus_threshold || 85)) {
                  decayRate = Math.max(0, decayRate - (decayRates.quality_bonus_reduction || 0.01));
                }

                const newAwareness = Math.round(Math.max(0, currentAwareness * (1 - decayRate)));

                awarenessUpdate = {
                  awareness: newAwareness,
                  peak_awareness: Math.round(song.peak_awareness || currentAwareness),
                  awareness_decay_rate: decayRate
                };

                if (Math.abs(newAwareness - currentAwareness) > 0.1) {
                  summary.changes.push({
                    type: 'awareness_decay',
                    description: `📉 "${song.title}" awareness decay ${newAwareness}/100 (-${currentAwareness - newAwareness})`,
                    amount: 0
                  });
                }
              }
            }
          }
        } catch (error) {
          console.warn(`[AWARENESS] Error processing awareness for song ${song.id}:`, error);
        }

        if (ongoingRevenue > 0) {
          totalOngoingRevenue += ongoingRevenue;
          
          // Get revenue per stream from balance.json configuration
          const streamingConfig = ctx.gameData.getStreamingConfigSync();
          const revenuePerStream = streamingConfig.ongoing_streams.revenue_per_stream;

          // Guard against misconfigured revenue_per_stream being zero
          if (!revenuePerStream || revenuePerStream <= 0) {
            console.warn('Invalid revenue_per_stream; skipping streams/popularity calc.');
            continue;
          }

          const weeklyStreams = Math.round(ongoingRevenue / revenuePerStream);

          // Apply streaming-based popularity bonus using optimized formula
          if (song.artistId) {
            try {
              // Use cached artist if available, fallback to individual lookup
              let artist = artistMap.get(song.artistId);
              if (!artist && ctx.storage?.getArtist) {
                artist = await ctx.storage.getArtist(song.artistId);
              }

              if (artist) {
                const popularityBonus = this.calculateStreamingPopularityBonus(
                  weeklyStreams,
                  artist.popularity || 0,
                  3000, // baseThreshold
                  true, // useDynamicThreshold
                  35   // saturationPoint
                );

                if (popularityBonus > 0) {
                  // Accumulate popularity bonus in summary.artistChanges for processing by processWeeklyPopularityChanges
                  if (!summary.artistChanges) {
                    summary.artistChanges = {};
                  }
                  ArtistChangeHelpers.addPopularity(summary.artistChanges, song.artistId, popularityBonus);
                }
              }
            } catch (error) {
              console.error(`[STREAMING POPULARITY] Error getting artist ${song.artistId} for song "${song.title}":`, error);
            }
          }

          // Track song updates for batch processing
          type SongUpdatePatch = {
            songId: string;
            weeklyStreams?: number;
            lastWeekRevenue?: number;
            totalRevenue?: number;
            totalStreams?: number;
            awareness?: number;
            peak_awareness?: number;
            awareness_decay_rate?: number;
          };

          const songUpdate: SongUpdatePatch = {
            songId: song.id,
            weeklyStreams: weeklyStreams,
            lastWeekRevenue: Math.round(ongoingRevenue),
            totalRevenue: Math.round((song.totalRevenue || 0) + ongoingRevenue),
            totalStreams: (song.totalStreams || 0) + weeklyStreams
          };

          // Add awareness updates if processed
          if (awarenessUpdate) {
            songUpdate.awareness = awarenessUpdate.awareness;
            songUpdate.peak_awareness = awarenessUpdate.peak_awareness;
            songUpdate.awareness_decay_rate = awarenessUpdate.awareness_decay_rate;
          }

          songUpdates.push(songUpdate);
          
          // Add to summary changes for transparency
          summary.changes.push({
            type: 'ongoing_revenue',
            description: `🎵 "${song.title}" ongoing streams`,
            amount: ongoingRevenue
          });
        } else if (awarenessUpdate) {
          // Handle awareness updates for songs with no ongoing revenue
          const songUpdate: SongUpdatePatch = {
            songId: song.id,
            awareness: awarenessUpdate.awareness,
            peak_awareness: awarenessUpdate.peak_awareness,
            awareness_decay_rate: awarenessUpdate.awareness_decay_rate
          };
          songUpdates.push(songUpdate);
        }
      }
      
      // Update songs in batch if available
      if (songUpdates.length > 0 && ctx.gameData.updateSongs) {
        await ctx.gameData.updateSongs(songUpdates);
      }
      
      // Add total ongoing revenue and streams to summary
      if (totalOngoingRevenue > 0) {
        summary.revenue += totalOngoingRevenue;
        // Calculate total streams from revenue (reverse calculation)
        // Get revenue per stream from balance.json configuration
        const streamingConfig = ctx.gameData.getStreamingConfigSync();
        const revenuePerStream = streamingConfig.ongoing_streams.revenue_per_stream;
        const totalStreams = Math.round(totalOngoingRevenue / revenuePerStream);
        summary.streams = (summary.streams || 0) + totalStreams;
      }
      
    } catch (error) {
      console.error('[INDIVIDUAL SONG DECAY] Error processing released songs:', error);
    }
  }

  /**
   * Processes lead singles that are scheduled for release this week (before the main release)
   * Checks all planned releases for lead single strategies and releases them early
   */
  async processLeadSingles(ctx: WeekContext, summary: WeekSummary, dbTransaction?: any): Promise<void> {
    const currentWeek = ctx.gameState.currentWeek || 1;
    
    try {
      // Get all planned releases from gameData to check for lead single strategies
      const allReleases = await ctx.gameData.getReleasesByGame(ctx.gameState.id, dbTransaction) || [];
      const plannedReleases = allReleases.filter((r: any) => r.status === 'planned');
      
      // Process releases with lead single strategies
      const leadSinglesToRelease = plannedReleases.filter((r: any) => {
        const lss = r.metadata?.leadSingleStrategy;
        return lss && lss.leadSingleReleaseWeek === currentWeek;
      });
      
      for (const release of plannedReleases) {
        const metadata = release.metadata as any;
        const leadSingleStrategy = metadata?.leadSingleStrategy;
        
        // Check if lead single should be released this month
        
        if (leadSingleStrategy && leadSingleStrategy.leadSingleReleaseWeek === currentWeek) {
          
          // Get the lead single song
          const releaseSongs = await ctx.gameData.getSongsByRelease(release.id, dbTransaction) || [];
          
          const leadSong = releaseSongs.find(song => song.id === leadSingleStrategy.leadSingleId);
          
          if (leadSong) {
            
            // Calculate lead single performance
            const budgetBreakdown = leadSingleStrategy.leadSingleBudget || {};
            const leadSingleBudget = Object.values(budgetBreakdown).reduce((sum: number, budget) => sum + (budget as number), 0);
            
            // Get artist data for sophisticated calculation
            const artist = await ctx.storage?.getArtist(leadSong.artistId);

            if (!artist) {
              console.warn(`[LEAD SINGLE] Artist not found, skipping lead single`);
              continue;
            }

            // Create temporary single release configuration for sophisticated calculation
            const leadSingleReleaseConfig = {
              id: `temp-lead-${release.id}`,
              type: 'single',
              releaseWeek: currentWeek,
              metadata: {
                marketingBudget: budgetBreakdown
              }
            };

            const sophisticatedResults = this.calculateSophisticatedReleaseOutcome(
              ctx,
              leadSingleReleaseConfig,
              [leadSong],
              artist
            );

            const initialStreams = sophisticatedResults.perSongBreakdown[0].streams;
            const initialRevenue = sophisticatedResults.perSongBreakdown[0].revenue;
            
            // Update the lead song as released and allocate marketing
            if (ctx.financialSystem.investmentTracker && leadSingleBudget > 0) {
              try {
                await ctx.financialSystem.investmentTracker.allocateMarketingToSong(
                  release.id,
                  leadSong.id,
                  leadSingleBudget,
                  dbTransaction
                );
              } catch (allocError) {
                console.warn(`[LEAD SINGLE] Marketing allocation failed:`, allocError);
              }
            }

            const songUpdate = {
              songId: leadSong.id,
              isReleased: true,
              releaseWeek: currentWeek,
              initialStreams: initialStreams,
              weeklyStreams: initialStreams,
              totalStreams: (leadSong.totalStreams || 0) + initialStreams,
              totalRevenue: Math.round((leadSong.totalRevenue || 0) + initialRevenue),
              lastWeekRevenue: Math.round(initialRevenue)
            };

            try {
              await ctx.gameData.updateSongs([songUpdate], dbTransaction);
            } catch (updateError) {
              console.error(`[LEAD SINGLE] Failed to update song:`, updateError);
              throw updateError;
            }
            
            // Add to summary
            summary.revenue += initialRevenue;
            summary.streams = (summary.streams || 0) + initialStreams;
            
            summary.changes.push({
              type: 'release',
              description: `🎵 Lead Single: "${leadSong.title}" (from upcoming "${release.title}")`,
              amount: initialRevenue
            });
            
            // Lead single release completed successfully
          } else {
            console.warn(`[LEAD SINGLE] Lead song not found: ${leadSingleStrategy.leadSingleId}`);
          }
        }
      }
      
    } catch (error) {
      console.error('[LEAD SINGLE] Error processing lead singles:', error);
      throw error;
    }
  }

  /**
   * Processes planned releases that are scheduled for the current week
   * This executes the release, generates initial revenue, and updates song statuses
   */
  async processPlannedReleases(ctx: WeekContext, summary: WeekSummary, dbTransaction?: any): Promise<void> {
    
    try {
      // Get planned releases scheduled for this week
      const currentWeek = ctx.gameState.currentWeek || 1;
      const plannedReleases = await ctx.gameData.getPlannedReleases(
        ctx.gameState.id,
        currentWeek,
        dbTransaction
      ) || [];

      if (plannedReleases.length === 0) {
        return;
      }
      
      // Process planned releases
      
      for (const release of plannedReleases) {
        
        // Get songs associated with this release
        const releaseSongs = await ctx.gameData.getSongsByRelease(release.id, dbTransaction) || [];
        
        if (releaseSongs.length === 0) {
          console.warn(`[PLANNED RELEASE] No songs found for release "${release.title}", skipping`);
          continue;
        }
        
        // Calculate release performance using existing preview calculation logic
        const avgQuality = releaseSongs.reduce((sum, song) => sum + (song.quality || 50), 0) / releaseSongs.length;
        const marketingBudget = release.marketingBudget || 0;
        
        // Filter out already released songs (lead singles)
        const songsToRelease = releaseSongs.filter(s => !s.isReleased);
        const alreadyReleasedSongs = releaseSongs.filter(s => s.isReleased);

        if (songsToRelease.length === 0) {
          continue;
        }

        // Get artist data for sophisticated calculation
        const metadata = release.metadata as any;
        const [artist] = await ctx.storage?.getArtistsByGame(ctx.gameState.id) || [];
        const releaseArtist = artist || await ctx.storage?.getArtist(release.artistId);

        if (!releaseArtist) {
          console.warn(`[PLANNED RELEASE] Artist not found for release, skipping`);
          continue;
        }

        // Use sophisticated calculation for actual release
        const sophisticatedResults = this.calculateSophisticatedReleaseOutcome(
          ctx,
          release,
          songsToRelease,
          releaseArtist
        );

        // Prepare song updates using sophisticated breakdown
        const songUpdates = sophisticatedResults.perSongBreakdown.map(songResult => ({
          songId: songResult.songId,
          isReleased: true,
          releaseWeek: ctx.gameState.currentWeek,
          initialStreams: songResult.streams,
          weeklyStreams: songResult.streams,
          totalStreams: (songsToRelease.find(s => s.id === songResult.songId)?.totalStreams || 0) + songResult.streams,
          totalRevenue: Math.round((songsToRelease.find(s => s.id === songResult.songId)?.totalRevenue || 0) + songResult.revenue),
          lastWeekRevenue: Math.round(songResult.revenue)
        }));

        // Handle marketing investment allocation - use actual charged amount including seasonal adjustments
        const totalMarketingBudget = metadata?.totalInvestment ||
          Object.values(metadata?.marketingBudget || {}).reduce((sum: number, budget) => sum + (budget as number), 0);
        if (ctx.financialSystem.investmentTracker && totalMarketingBudget > 0) {
          try {
            await ctx.financialSystem.investmentTracker.allocateMarketingInvestment(
              release.id,
              totalMarketingBudget,
              dbTransaction
            );
          } catch (allocError) {
            console.warn(`[PLANNED RELEASE] Marketing allocation failed:`, allocError);
          }
        }

        const totalStreams = sophisticatedResults.totalStreams;
        const totalRevenue = sophisticatedResults.totalRevenue;
        
        // Update release status to 'released'
        await ctx.gameData.updateReleaseStatus(release.id, 'released', {
          releasedAt: currentWeek,
          initialStreams: totalStreams,
          totalRevenue: totalRevenue
        }, dbTransaction);
        
        // Update all songs
        if (songUpdates.length > 0 && ctx.gameData.updateSongs) {
          console.log(`[PLANNED RELEASE] Updating ${songUpdates.length} songs with release data`);
          await ctx.gameData.updateSongs(songUpdates, dbTransaction);
        }
        
        // Apply mood boost for successful release
        if (release.artistId) {
          const moodBoost = (release.type === 'album' || release.type === 'ep') ? 20 : 5;

          // Track mood change for later application in processWeeklyMoodChanges
          if (!summary.artistChanges) {
            summary.artistChanges = {};
          }
          ArtistChangeHelpers.addMood(summary.artistChanges, release.artistId, moodBoost);

          console.log(`[PLANNED RELEASE] Artist mood boost +${moodBoost} for releasing "${release.title}" (${release.type})`);
        }
        
        // Add to summary
        summary.revenue += totalRevenue;
        summary.streams = (summary.streams || 0) + totalStreams;
        
        summary.changes.push({
          type: 'release',
          description: `🎉 Released: "${release.title}" (${release.type})`,
          amount: totalRevenue
        });
        
        summary.changes.push({
          type: 'marketing',
          description: `📢 Marketing campaign for "${release.title}"`,
          amount: -totalMarketingBudget
        });

        summary.expenses += totalMarketingBudget;

        // Track marketing costs in breakdown
        if (!summary.expenseBreakdown) {
          summary.expenseBreakdown = {
            weeklyOperations: 0,
            artistSalaries: 0,
            executiveSalaries: 0,
            signingBonuses: 0,
            projectCosts: 0,
            marketingCosts: 0,
            roleMeetingCosts: 0
          };
        }
        summary.expenseBreakdown.marketingCosts += totalMarketingBudget;

        // Check for press coverage based on marketing spend
        if (totalMarketingBudget > 0) {
          const avgQuality = releaseSongs.reduce((sum, song) => sum + (song.quality || 50), 0) / releaseSongs.length;
          const pressOutcome = this.calculatePressOutcome(
            ctx,
            avgQuality,
            ctx.gameState.pressAccess || 'none',
            ctx.gameState.reputation || 0,
            totalMarketingBudget
          );
          
          if (pressOutcome.pickups > 0) {
            // C45: count pickups so weeklyStats.pressMentions reflects reality
            // (the dashboard displayed a hardcoded 0 before this).
            summary.pressMentions = (summary.pressMentions || 0) + pressOutcome.pickups;

            const reputationGain = pressOutcome.reputationGain;
            ctx.gameState.reputation = (ctx.gameState.reputation || 0) + reputationGain;

            // C34: Do NOT push a per-source `type: 'reputation'` change here.
            // Reputation is label-wide; a single aggregated ⭐ Achievement line is
            // emitted at the end of advanceWeek() from the net of summary.reputationChanges.
            // We still track this gain in reputationChanges so it feeds that aggregate.
            summary.reputationChanges[release.artistId] =
              (summary.reputationChanges[release.artistId] || 0) + reputationGain;
          }
        }
        
        // Release completed successfully
      }
      
    } catch (error) {
      console.error('[PLANNED RELEASE] Error processing planned releases:', error);

      summary.changes.push({
        type: 'error',
        description: `Planned release processing failed - ${error instanceof Error ? error.message : 'Unknown error'}`,
        amount: 0
      });

      // Re-throw the error to ensure transaction rollback on critical failures
      if (error instanceof Error && error.message.includes('No songs found')) {
        console.warn('[PLANNED RELEASE] Non-critical error, continuing processing');
      } else {
        throw error;
      }
    }
  }

  /**
   * Processes song release - calculates individual song streams and sets initial values
   * This is called when a project completes and songs are released
   */
  async processSongRelease(ctx: WeekContext, song: any, gameState?: any): Promise<{
    initialStreams: number;
    initialRevenue: number;
  }> {
    const currentGameState = gameState || ctx.gameState;
    const currentWeek = currentGameState.currentWeek || 1;
    
    
    // Get artist popularity
    const artist = await ctx.storage?.getArtist(song.artistId);
    const artistPopularity = artist?.popularity || 0;

    // Calculate initial streams using individual song quality (not project quality)
    const initialStreams = this.calculateStreamingOutcome(
      ctx,
      song.quality || 40,
      currentGameState.playlistAccess || 'none',
      currentGameState.reputation || 5,
      0, // For now, marketing spend is at project level; future enhancement for per-song marketing
      artistPopularity
    );
    
    // Calculate initial revenue from streams using balance.json configuration
    const streamingConfig = ctx.gameData.getStreamingConfigSync();
    const revenuePerStream = streamingConfig.ongoing_streams.revenue_per_stream;
    const initialRevenue = initialStreams * revenuePerStream;
    
    console.log(`[SONG RELEASE] Calculated for "${song.title}": ${initialStreams} streams, $${Math.round(initialRevenue)} revenue`);
    
    // Prepare song updates
    const songUpdates = {
      initialStreams: initialStreams,
      totalStreams: initialStreams,
      weeklyStreams: initialStreams,
      totalRevenue: Math.round(initialRevenue),
      lastWeekRevenue: Math.round(initialRevenue),
      releaseWeek: currentWeek,
      isReleased: true
    };
    
    // Update song in database if gameData method available
    console.log(`[SONG RELEASE] 💾 Preparing to update song in database`);
    console.log(`[SONG RELEASE] Song updates to apply:`, songUpdates);
    console.log(`[SONG RELEASE] updateSong method available:`, !!ctx.gameData.updateSong);
    
    if (ctx.gameData.updateSong) {
      try {
        console.log(`[SONG RELEASE] 🔄 Calling updateSong for song ID: ${song.id}`);
        const updateResult = await ctx.gameData.updateSong(song.id, songUpdates);
        console.log(`[SONG RELEASE] ✅ Successfully updated song "${song.title}" in database`);
        console.log(`[SONG RELEASE] Update result:`, updateResult);
      } catch (error) {
        console.error(`[SONG RELEASE] ❌ Failed to update song "${song.title}" in database:`, error);
        console.error(`[SONG RELEASE] Error stack:`, (error as Error).stack);
        throw error;
      }
    } else {
      console.warn(`[SONG RELEASE] ⚠️ updateSong method not available - song streams not persisted`);
    }
    
    return {
      initialStreams: initialStreams,
      initialRevenue: Math.round(initialRevenue)
    };
  }

  /**
   * Processes all songs from a completed project for release
   * Distributes streams individually to each song based on their quality
   */
  async processProjectSongsRelease(ctx: WeekContext, project: any, projectStreams: number): Promise<{
    totalSongsReleased: number;
    totalStreamsDistributed: number;
    totalRevenueGenerated: number;
    songDetails: Array<{songId: string, title: string, streams: number, revenue: number}>;
  }> {
    console.log(`[PROJECT SONG RELEASE] 🎯 ENTERING processProjectSongsRelease`);
    console.log(`[PROJECT SONG RELEASE] Project details:`, {
      id: project.id,
      title: project.title,
      artistId: project.artistId,
      stage: project.stage,
      projectStreams
    });
    
    // Get all songs for this project
    console.log(`[PROJECT SONG RELEASE] 🔍 Calling getSongsByProject with projectId: ${project.id}`);
    const projectSongs = await ctx.gameData.getSongsByProject(project.id) || [];
    console.log(`[PROJECT SONG RELEASE] 📊 Found ${projectSongs.length} songs for project:`, 
      projectSongs.map(s => ({ 
        id: s.id, 
        title: s.title, 
        isReleased: s.isReleased, 
        isRecorded: s.isRecorded,
        metadata: s.metadata 
      })));
    
    if (projectSongs.length === 0) {
      console.warn(`[PROJECT SONG RELEASE] No songs found for project ${project.id}`);
      return {
        totalSongsReleased: 0,
        totalStreamsDistributed: 0,
        totalRevenueGenerated: 0,
        songDetails: []
      };
    }
    
    let totalStreamsDistributed = 0;
    let totalRevenueGenerated = 0;
    const songDetails = [];
    
    // Process each song individually
    for (const song of projectSongs) {
      console.log(`[PROJECT SONG RELEASE] 🎵 Processing song "${song.title}":`, {
        id: song.id,
        isReleased: song.isReleased,
        isRecorded: song.isRecorded,
        quality: song.quality,
        initialStreams: song.initialStreams
      });
      
      if (song.isReleased) {
        console.log(`[PROJECT SONG RELEASE] ⏭️ Song "${song.title}" already released, skipping`);
        continue;
      }
      
      try {
        console.log(`[PROJECT SONG RELEASE] 🚀 Calling processSongRelease for "${song.title}"`);
        const releaseResult = await this.processSongRelease(ctx, song);
        
        console.log(`[PROJECT SONG RELEASE] ✅ Song "${song.title}" release result:`, releaseResult);
        
        totalStreamsDistributed += releaseResult.initialStreams;
        totalRevenueGenerated += releaseResult.initialRevenue;
        
        songDetails.push({
          songId: song.id,
          title: song.title,
          streams: releaseResult.initialStreams,
          revenue: releaseResult.initialRevenue
        });
        
        console.log(`[PROJECT SONG RELEASE] 📊 Updated totals - Streams: ${totalStreamsDistributed}, Revenue: $${totalRevenueGenerated}`);
      } catch (error) {
        console.error(`[PROJECT SONG RELEASE] ❌ Failed to release song "${song.title}":`, error);
        console.error(`[PROJECT SONG RELEASE] Error details:`, (error as Error).stack);
        // Continue with other songs rather than failing entire project
      }
    }
    
    console.log(`[PROJECT SONG RELEASE] Complete - Released ${songDetails.length} songs, ${totalStreamsDistributed} total streams`);
    
    return {
      totalSongsReleased: songDetails.length,
      totalStreamsDistributed: totalStreamsDistributed,
      totalRevenueGenerated: totalRevenueGenerated,
      songDetails: songDetails
    };
  }
}
