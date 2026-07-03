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
}
