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
import { popularitySaturationMultiplier } from '../../utils/popularitySaturation';
import { scaleReputationGain } from '../../utils/reputationScaling';

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

/**
 * Buzz-v2 slice 3 — stored pre-campaign metadata shape (mirrors what
 * releasePlanningService writes onto release.metadata.preCampaign). Present ONLY
 * when the player diverted a share (pct > 0) of the marketing budget to a
 * pre-release anticipation ramp.
 */
interface PreCampaignMetadata {
  pct: number;
  totalBudget: number;
  budgetPerChannel: Record<string, number>;
  weeklySpend: number;
  spentToDate: number;
}

/**
 * Buzz-v2 slice 3 — scale a release's LAUNCH-phase (weeks 1-4) marketing breakdown
 * DOWN by the pre-campaign's remaining (1-pct) share, at READ time. When no
 * pre-campaign exists (or pct is absent/0), the breakdown passes through unchanged
 * (golden-master path — byte-identical). Never mutates the stored breakdown; returns
 * a fresh per-channel object so the auditable plan-time data is preserved.
 */
export function scaleLaunchBreakdown(
  breakdown: Record<string, number> | undefined | null,
  preCampaign: PreCampaignMetadata | undefined | null,
): Record<string, number> | undefined | null {
  if (!breakdown) return breakdown;
  const pct = preCampaign && typeof preCampaign.pct === 'number' ? preCampaign.pct : 0;
  if (pct <= 0) return breakdown;
  const launchShare = 1 - pct / 100;
  const scaled: Record<string, number> = {};
  for (const [channel, value] of Object.entries(breakdown)) {
    scaled[channel] = (typeof value === 'number' ? value : 0) * launchShare;
  }
  return scaled;
}

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
  // Exec-meetings-revival PR-3 (C2) — threads flags.pressStoryFlag (one-shot,
  // cleared here after consumption) and flags.pressMomentum (decaying pool,
  // decayed weekly in ActionProcessor.processDelayedEffects — NOT cleared here)
  // through to FinancialSystem.calculatePressPickups. No RNG draw count change:
  // both only modify the CHANCE fed into the existing per-pickup draws.
  calculatePressOutcome(
    ctx: WeekContext,
    quality: number,
    pressAccess: string,
    reputation: number,
    marketingBudget: number
  ): { pickups: number; reputationGain: number } {
    const flags = (ctx.gameState.flags || {}) as Record<string, any>;
    const hasStoryFlag = flags.pressStoryFlag === true;
    const pressMomentum = typeof flags.pressMomentum === 'number' ? flags.pressMomentum : 0;

    const outcome = ctx.financialSystem.calculatePressOutcome(
      quality,
      pressAccess,
      reputation,
      marketingBudget,
      () => ctx.getRandom(0, 1),
      ctx.financialSystem.getAccessChance.bind(ctx.financialSystem),
      hasStoryFlag,
      pressMomentum
    );

    // One-shot: clear the story flag once it has fed a press roll, win or lose.
    if (hasStoryFlag) {
      flags.pressStoryFlag = false;
      delete flags.pressStoryFlagWeek; // Phase B fix-2: drop the expiry stamp with it
      ctx.gameState.flags = flags;
      console.log('[PRESS] pressStoryFlag consumed by this release\'s press roll — cleared');
    }

    return outcome;
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
    config?: {
      base_threshold?: number;
      dynamic_threshold_exponent_base?: number;
      dynamic_threshold_divisor?: number;
      max_stream_points?: number;
      saturation_point?: number;
      saturation_exponent?: number;
      diminishing_multiplier_base?: number;
      diminishing_multiplier_range?: number;
      min_bonus?: number;
    },
    useDynamicThreshold: boolean = true
  ): number {
    // Balance-integrity slice 1 (knob liberation): baseThreshold (3000),
    // saturationPoint (35) and the internal shape constants (2^, /25, cap 10,
    // 0.2 + 1.3, ^4, floor 0.1) were engine literals; now read from markets.json
    // market_formulas.popularity_saturation with the original literals as fallback
    // defaults (byte-identical). Slice 6 reuses this same config for tour saturation.
    const cfg = config || {};
    const baseThreshold = cfg.base_threshold ?? 3000;
    const expBase = cfg.dynamic_threshold_exponent_base ?? 2;
    const thresholdDivisor = cfg.dynamic_threshold_divisor ?? 25;
    const maxStreamPoints = cfg.max_stream_points ?? 10;
    const saturationPoint = cfg.saturation_point ?? 35;
    const saturationExponent = cfg.saturation_exponent ?? 4;
    const diminishingBase = cfg.diminishing_multiplier_base ?? 0.2;
    const diminishingRange = cfg.diminishing_multiplier_range ?? 1.3;
    const minBonus = cfg.min_bonus ?? 0.1;

    // Calculate dynamic threshold based on popularity (exponential scaling)
    const actualThreshold = useDynamicThreshold
      ? Math.round(baseThreshold * Math.pow(expBase, currentPopularity / thresholdDivisor))
      : baseThreshold;

    // Convert streams to popularity points using logarithmic scaling
    if (weeklyStreams < actualThreshold) {
      return 0; // No bonus below threshold
    }

    const streamPoints = Math.log10(weeklyStreams / actualThreshold);

    // Cap total bonus at reasonable level (per song)
    const cappedPoints = Math.min(streamPoints, maxStreamPoints);

    // Apply diminishing returns multiplier. Balance-integrity slice 6 extracted
    // this curve into a shared pure helper (shared/utils/popularitySaturation.ts)
    // so tour popularity gains reuse the SAME formula rather than duplicating it.
    // Byte-identical: satPoint/exponent/base/range are the same knobs read above.
    const multiplier = popularitySaturationMultiplier(currentPopularity, {
      saturation_point: saturationPoint,
      saturation_exponent: saturationExponent,
      diminishing_multiplier_base: diminishingBase,
      diminishing_multiplier_range: diminishingRange,
    }); // Scales from 1.5x to 0.2x

    const finalBonus = Math.max(minBonus, cappedPoints * multiplier);

    return finalBonus;
  }

  /**
   * Processes ongoing revenue from individual released songs (streaming decay)
   * This simulates realistic revenue patterns where each song generates declining revenue over time
   */
  async processReleasedProjects(ctx: WeekContext, summary: WeekSummary): Promise<void> {

    try {
      const dbTransaction = ctx.dbTransaction;
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
          const artists = await ctx.storage.getArtistsByGame(ctx.gameState.id, dbTransaction);
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
          const releases = await ctx.storage.getReleasesByGame(ctx.gameState.id, dbTransaction);
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
                release = await ctx.storage.getRelease(song.releaseId, dbTransaction);
              }
              // Buzz-v2 slice 3: when a pre-release campaign diverted a share (pct)
              // of the MARKETING budget to the anticipation ramp, the launch phase
              // (weeks 1-4) converts only the REMAINING (1-pct) share. Scale the
              // per-channel breakdown DOWN at READ time — the stored
              // marketingBudgetBreakdown is never mutated, so the data stays
              // auditable. Releases without a preCampaign read the full breakdown
              // (golden-master path, byte-identical).
              const rawBreakdown = release?.metadata?.marketingBudgetBreakdown;
              const marketingBreakdown = scaleLaunchBreakdown(rawBreakdown, release?.metadata?.preCampaign);

              if (marketingBreakdown) {
              const awarenessGain = await ctx.financialSystem.calculateAwarenessGain(song, marketingBreakdown);
              let newAwareness = Math.round(Math.min(currentAwareness + awarenessGain, 100));

              // Check for breakthrough achievement during weeks 3-6
              if (!song.breakthrough_achieved && weeksSinceRelease >= 3 && weeksSinceRelease <= 6) {
                const balanceConfig = ctx.gameData.getBalanceConfigSync();
                const awarenessConfig = balanceConfig?.market_formulas?.awareness_system;

                if (awarenessConfig?.enabled) {
                  // Balance-integrity slice 1 (knob liberation, C79): these tier
                  // thresholds previously SHADOWED markets.json
                  // awareness_system.breakthrough_thresholds — the config existed but
                  // was ignored. Now read from it, with the original literals as
                  // fallback defaults (values match the config exactly ⇒ byte-identical).
                  const bt = awarenessConfig.breakthrough_thresholds || {};
                  const hq = bt.high_quality || {};
                  const mq = bt.medium_quality || {};
                  const lq = bt.low_quality || {};

                  // Calculate breakthrough potential
                  let breakthroughPotential = 0;
                  if (song.quality >= (hq.min_quality ?? 80)) {
                    breakthroughPotential = Math.min(newAwareness / (hq.awareness_needed ?? 40), 1) * (hq.base_chance ?? 0.65);
                  } else if (song.quality >= (mq.min_quality ?? 70)) {
                    breakthroughPotential = Math.min(newAwareness / (mq.awareness_needed ?? 60), 1) * (mq.base_chance ?? 0.35);
                  } else if (song.quality >= (lq.min_quality ?? 60)) {
                    breakthroughPotential = Math.min(newAwareness / (lq.awareness_needed ?? 80), 1) * (lq.base_chance ?? 0.15);
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

                      // Volatility-economy slice 2: a breakthrough lifts the song
                      // artist's morale. Config knob markets.json awareness_system.
                      // breakthrough_effects.artist_mood_bonus (default 5), applied to
                      // summary.artistChanges[song.artistId].mood (accumulated like every
                      // other mood source; clamped 0-100 downstream). No new RNG — the
                      // breakthrough itself is the existing deterministic sin-seed roll.
                      const breakthroughMoodBonus = breakthroughEffects.artist_mood_bonus ?? 5;
                      if (song.artistId && breakthroughMoodBonus !== 0) {
                        if (!summary.artistChanges) summary.artistChanges = {};
                        ArtistChangeHelpers.addMood(summary.artistChanges, song.artistId, breakthroughMoodBonus);
                        summary.changes.push({
                          type: 'mood',
                          description: `"${song.title}" broke through — the artist is flying (+${breakthroughMoodBonus} mood)`,
                          amount: breakthroughMoodBonus,
                          moodChange: breakthroughMoodBonus,
                          artistId: song.artistId,
                        });
                      }

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
                artist = await ctx.storage.getArtist(song.artistId, dbTransaction);
              }

              if (artist) {
                const popularitySaturationConfig = ctx.gameData.getBalanceConfigSync?.()?.market_formulas?.popularity_saturation;
                const popularityBonus = this.calculateStreamingPopularityBonus(
                  weeklyStreams,
                  artist.popularity || 0,
                  popularitySaturationConfig, // knob liberation: markets.json popularity_saturation (fallbacks match old 3000/35 literals)
                  true // useDynamicThreshold
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
        await ctx.gameData.updateSongs(songUpdates, dbTransaction);
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
   * Buzz-v2 (Hype & Pre-Marketing) slice 3 — the pre-release anticipation build.
   *
   * A NEW weekly engine write path for PLANNED, not-yet-released releases carrying
   * a `metadata.preCampaign` block (only present when the player diverted a share
   * of the marketing budget to a pre-release campaign). Each such release, while it
   * still has budget to convert (spentToDate < totalBudget), builds awareness on its
   * songs during the lead-up weeks — turning "planning early" into a real strategy.
   *
   * DETERMINISTIC, ZERO RNG DRAWS (tour-foreshadow precedent): the awareness gain
   * reuses FinancialSystem.calculateAwarenessGain (the SAME channel-coefficient
   * formula as the launch path — never duplicated here) fed the per-week channel
   * amounts, then scaled by:
   *   - fork D diminishing factor: full strength when ≤ diminishing_after_weeks from
   *     launch, × diminishing_factor when further out (mega-early planning doesn't
   *     dominate). The existing +25/wk cap (inside calculateAwarenessGain) still applies.
   *   - fork F lead-single conduit factor: full strength only while the release's
   *     lead single is ALREADY out this week; × lead_single_conduit_factor otherwise
   *     (no lead single planned, or not yet released) — makes the lead single matter.
   *
   * The gain is applied to EACH of the release's songs' awareness (peak bumped like
   * the other paths), spentToDate advanced, and ONE structured 'pre_campaign' summary
   * change emitted per release per week. Composes automatically with the ship-time
   * attachedHype seed (slice 2): the seed is additive to whatever awareness the song
   * already built here.
   */
  async processPreCampaigns(ctx: WeekContext, summary: WeekSummary, dbTransaction?: any): Promise<void> {
    const currentWeek = ctx.gameState.currentWeek || 1;

    try {
      const allReleases = await ctx.gameData.getReleasesByGame(ctx.gameState.id, dbTransaction) || [];
      const plannedReleases = allReleases.filter((r: any) => {
        if (r.status !== 'planned') return false;
        const pc = r.metadata?.preCampaign;
        return pc && typeof pc.pct === 'number' && pc.pct > 0
          && typeof pc.totalBudget === 'number' && pc.totalBudget > 0;
      });

      if (plannedReleases.length === 0) return;

      const preCampaignConfig = ctx.gameData.getPreCampaignConfigSync();
      const diminishingAfterWeeks = preCampaignConfig.diminishing_after_weeks;
      const diminishingFactor = preCampaignConfig.diminishing_factor;
      const conduitFactor = preCampaignConfig.lead_single_conduit_factor;

      for (const release of plannedReleases) {
        const metadata = release.metadata as any;
        const preCampaign = metadata.preCampaign as PreCampaignMetadata;

        const totalBudget = preCampaign.totalBudget;
        const spentToDate = typeof preCampaign.spentToDate === 'number' ? preCampaign.spentToDate : 0;
        const remaining = totalBudget - spentToDate;
        if (remaining <= 0) continue; // fully converted already

        const weeksUntilRelease = (release.releaseWeek || 0) - currentWeek;
        // Only build BEFORE the release week (a release shipping this week or in the
        // past converts in the launch path, not here). Zero-lead-up plans are
        // rejected at plan time, so this is a safety guard.
        if (weeksUntilRelease < 1) continue;

        // This week's spend: the pinned weeklySpend, but never more than remains
        // (final lead-up week spends the remainder). weeklySpend was computed once
        // at plan time to avoid drift.
        const weeklySpend = Math.min(
          typeof preCampaign.weeklySpend === 'number' ? preCampaign.weeklySpend : remaining,
          remaining,
        );
        if (weeklySpend <= 0) continue;

        // Per-channel amounts for THIS week: scale the plan-time per-channel mix by
        // (weeklySpend / totalBudget) so the channel coefficients apply proportionally.
        const spendFraction = weeklySpend / totalBudget;
        const weeklyBreakdown: Record<string, number> = {};
        for (const [channel, value] of Object.entries(preCampaign.budgetPerChannel || {})) {
          weeklyBreakdown[channel] = (typeof value === 'number' ? value : 0) * spendFraction;
        }

        // fork D: diminishing returns when planning far ahead.
        const diminishing = weeksUntilRelease <= diminishingAfterWeeks ? 1.0 : diminishingFactor;

        // fork F: lead-single conduit. Full strength only while the lead single is
        // ALREADY out this week (its release week has arrived). Otherwise (no lead
        // single, or not yet released) the build is weaker.
        const leadSingleStrategy = metadata.leadSingleStrategy;
        const leadSingleOut = !!leadSingleStrategy
          && typeof leadSingleStrategy.leadSingleReleaseWeek === 'number'
          && currentWeek >= leadSingleStrategy.leadSingleReleaseWeek;
        const conduit = leadSingleOut ? 1.0 : conduitFactor;

        const rampFactor = diminishing * conduit;

        const releaseSongs = await ctx.gameData.getSongsByRelease(release.id, dbTransaction) || [];
        if (releaseSongs.length === 0) continue;

        const songUpdates: SongUpdatePatch[] = [];
        let appliedGainInt = 0;
        for (const song of releaseSongs) {
          // Reuse the launch-path awareness formula (channel coefficients ×
          // quality × popularity, +25/wk cap) — never duplicated here.
          const baseGain = await ctx.financialSystem.calculateAwarenessGain(song, weeklyBreakdown);
          const scaledGain = baseGain * rampFactor;
          if (scaledGain <= 0) continue;

          const currentAwareness = song.awareness || 0;
          const newAwareness = Math.round(Math.min(currentAwareness + scaledGain, 100));
          if (newAwareness === currentAwareness) continue;

          appliedGainInt += newAwareness - currentAwareness; // signed int, summed across the release's songs
          songUpdates.push({
            songId: song.id,
            awareness: newAwareness,
            peak_awareness: Math.round(Math.max(song.peak_awareness || 0, newAwareness)),
          });
        }

        // Advance spentToDate on the stored metadata regardless of whether awareness
        // moved (the budget converts; a fully-capped/zero-quality song just yields no
        // visible awareness). Persist via a release-metadata update.
        const newSpentToDate = spentToDate + weeklySpend;
        const updatedMetadata = {
          ...metadata,
          preCampaign: { ...preCampaign, spentToDate: newSpentToDate },
        };

        if (songUpdates.length > 0 && ctx.gameData.updateSongs) {
          await ctx.gameData.updateSongs(songUpdates, dbTransaction);
        }
        if (ctx.storage?.updateRelease) {
          await ctx.storage.updateRelease(release.id, { metadata: updatedMetadata }, dbTransaction);
        }

        // ONE structured summary change per release per week (routine).
        summary.changes.push({
          type: 'pre_campaign',
          description: `📣 Anticipation building for "${release.title}" — ${weeksUntilRelease} week${weeksUntilRelease === 1 ? '' : 's'} to launch`,
          amount: appliedGainInt,
          releaseId: release.id,
          releaseName: release.title,
          weeksToLaunch: weeksUntilRelease,
        });
      }
    } catch (error) {
      console.error('[PRE-CAMPAIGN] Error processing pre-release campaigns:', error);
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
            const artist = await ctx.storage?.getArtist(leadSong.artistId, dbTransaction);

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

      // Exec-meetings-revival PR-5 (C3) + Buzz-v2 slice 2 — awareness-boost seed at
      // ship time. As of slice 2, hype is ATTACHED at PLAN time
      // (releasePlanningService.planRelease drains the planning artist's pool + the
      // whole label pool onto release.metadata.attachedHype). At ship time we simply
      // read that stored number and seed each released song's initial awareness
      // (× awareness_boost_points_per_unit, ×8), clamped at 0 — a negative pool
      // suppresses discovery but never drives awareness below zero. The seed rides
      // the live awareness economy (weeks 1-4 build path + the up-to-2× stream
      // multiplier).
      //
      // LEGACY FALLBACK (releases planned BEFORE slice 2): those rows have no
      // `attachedHype` field. For them we keep the OLD behavior — consume the
      // label-wide flags.pendingAwarenessBoost pool, "first-planned takes all",
      // zeroing it after the first release seeds songs this week. This safety net
      // only fires for a release with no attachedHype field AND a nonzero legacy
      // label pool; new releases always carry attachedHype (even 0) so they never
      // touch the label pool here. Only touch flags when the legacy path actually
      // consumes, so games that never use the channel stay byte-stable.
      const awarenessFlagsSnapshot = (ctx.gameState.flags || {}) as Record<string, any>;
      const legacyLabelPool = typeof awarenessFlagsSnapshot.pendingAwarenessBoost === 'number'
        ? awarenessFlagsSnapshot.pendingAwarenessBoost
        : 0;
      const awarenessPointsPerUnit = ctx.gameData.getAwarenessBoostConfigSync().awareness_boost_points_per_unit;
      let legacyLabelPoolConsumed = false;

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

        // Get artist data for sophisticated calculation.
        // C44: fetch the RELEASE's artist. This previously grabbed the first
        // artist in the game (`getArtistsByGame(...)[0]`) and only fell back to
        // the correct artist on an empty roster — so on multi-artist rosters
        // the outcome was computed with the wrong artist's popularity, and the
        // preview (which uses the correct artist) diverged from execution.
        const metadata = release.metadata as any;
        const releaseArtist = await ctx.storage?.getArtist(release.artistId, dbTransaction);

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

        // Buzz-v2 slice 2 — determine THIS release's hype seed. Prefer the
        // plan-time attached hype (metadata.attachedHype, a signed number). If the
        // field is ABSENT (legacy release planned before slice 2), fall back to the
        // label-wide pool "first-planned takes all". A present attachedHype of 0
        // means "attached, nothing to seed" and MUST NOT trip the legacy path.
        const hasAttachedHype = metadata != null
          && Object.prototype.hasOwnProperty.call(metadata, 'attachedHype')
          && typeof metadata.attachedHype === 'number';
        let releaseHype = 0;
        let usedLegacyLabelPool = false;
        if (hasAttachedHype) {
          releaseHype = metadata.attachedHype as number;
        } else if (legacyLabelPool !== 0 && !legacyLabelPoolConsumed) {
          releaseHype = legacyLabelPool;
          usedLegacyLabelPool = true;
        }

        // Seed each released song's initial awareness from this release's hype
        // (× points-per-unit, clamped at 0). Additive to whatever awareness the song
        // already had (0 for a fresh song); the value the weeks-1-4 build path grows
        // from (ReleaseProcessor's awareness loop reads song.awareness).
        const awarenessSeed = (releaseHype !== 0)
          ? Math.max(0, (songsToRelease[0]?.awareness || 0) + releaseHype * awarenessPointsPerUnit)
          : null;

        // Prepare song updates using sophisticated breakdown
        const songUpdates = sophisticatedResults.perSongBreakdown.map(songResult => {
          const base: any = {
            songId: songResult.songId,
            isReleased: true,
            releaseWeek: ctx.gameState.currentWeek,
            initialStreams: songResult.streams,
            weeklyStreams: songResult.streams,
            totalStreams: (songsToRelease.find(s => s.id === songResult.songId)?.totalStreams || 0) + songResult.streams,
            totalRevenue: Math.round((songsToRelease.find(s => s.id === songResult.songId)?.totalRevenue || 0) + songResult.revenue),
            lastWeekRevenue: Math.round(songResult.revenue)
          };
          if (awarenessSeed !== null) {
            const song = songsToRelease.find(s => s.id === songResult.songId);
            base.awareness = Math.max(0, (song?.awareness || 0) + releaseHype * awarenessPointsPerUnit);
            base.peak_awareness = Math.round(Math.max(song?.peak_awareness || 0, base.awareness));
          }
          return base;
        });

        // Emit the payoff attribution + consume the legacy label pool if this
        // release used it (attached-hype releases have nothing to zero here — the
        // pools were drained at plan time).
        if (awarenessSeed !== null) {
          if (usedLegacyLabelPool) {
            legacyLabelPoolConsumed = true;
            const flags = (ctx.gameState.flags || {}) as Record<string, any>;
            flags.pendingAwarenessBoost = 0;
            delete flags.pendingAwarenessBoostWeek;
            ctx.gameState.flags = flags;
          }

          summary.changes.push({
            type: 'meeting',
            description: releaseHype > 0
              ? `Buzz paid off: +${releaseHype * awarenessPointsPerUnit} awareness seeded into "${release.title}"`
              : `Suppressed discovery: ${releaseHype * awarenessPointsPerUnit} awareness on "${release.title}"`,
            amount: releaseHype
          });
          // Buzz-v2 slice 1: STRUCTURED payoff attribution (notable). Additive to
          // the 'meeting' entry above; this one drives the notable-stage Hype line
          // so the player sees WHICH release the hype seeded. `amount` is the
          // seeded Buzz points (signed); hypeUnits is the raw pool consumed.
          summary.changes.push({
            type: 'hype_applied',
            description: releaseHype > 0
              ? `🚀 Banked Hype seeded "${release.title}" with +${releaseHype * awarenessPointsPerUnit} starting Buzz`
              : `🚀 Banked negative Hype suppressed "${release.title}" starting Buzz by ${releaseHype * awarenessPointsPerUnit}`,
            amount: releaseHype * awarenessPointsPerUnit,
            hypeUnits: releaseHype,
            releaseId: release.id,
            releaseName: release.title,
          });
          console.log(`[AWARENESS BOOST] ${usedLegacyLabelPool ? 'Legacy label pool' : 'Attached hype'} (${releaseHype}) -> seeded ${releaseHype * awarenessPointsPerUnit} awareness into "${release.title}"`);
        }

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

            // Volatility-economy slice 3: throttle the press-coverage reputation
            // gain through the shared global gain-scaling helper (positive-only).
            const repSystemCfg = (ctx.gameData.getBalanceConfigSync?.() as any)?.reputation_system;
            const reputationGain = scaleReputationGain(pressOutcome.reputationGain, repSystemCfg);
            // C65 FIX: this was the ONLY reputation write path that skipped the
            // 0-100 clamp every other path enforces (ActionProcessor, chart
            // milestones, flop). Clamp here too, honoring max_reputation.
            const maxReputation = repSystemCfg?.max_reputation ?? 100;
            ctx.gameState.reputation = Math.min(maxReputation, (ctx.gameState.reputation || 0) + reputationGain);

            // C34: Do NOT push a per-source `type: 'reputation'` change here.
            // Reputation is label-wide; a single aggregated ⭐ Achievement line is
            // emitted at the end of advanceWeek() from the net of summary.reputationChanges.
            // We still track this gain in reputationChanges so it feeds that aggregate.
            summary.reputationChanges[release.artistId] =
              (summary.reputationChanges[release.artistId] || 0) + reputationGain;
          }
        }

        // Balance-integrity slice 2 — FLOP PENALTY (reputation becomes two-way).
        // The game's first reputation SINK: a record that badly underperforms its
        // investment costs the label standing. Evaluated ONCE, here, on the
        // release week (never on catalog weeks). Consumes the previously-dead
        // progression.json reputation_system.flop_penalty (3), gated by two new
        // config keys. DETERMINISTIC — no RNG draw (audit: no getRandom added).
        //
        // totalInvestment aggregation (documented): the sum of every release song's
        // production_budget (song.productionBudget, default 0) PLUS the release's
        // marketing_budget (release.marketingBudget) — the two authored spend fields
        // that already exist on these rows. Both lead singles and same-week songs
        // count toward the record's production cost. releaseWeekRevenue is this
        // week's release revenue (sophisticatedResults.totalRevenue) — catalog
        // decay revenue is NOT included (that lands via processReleasedProjects in
        // later weeks).
        try {
          const flopFlagKey = `flop_penalty_applied_${release.id}`;
          const flopFlags = (ctx.gameState.flags || {}) as Record<string, any>;
          if (!flopFlags[flopFlagKey]) {
            const repSystem = (ctx.gameData.getBalanceConfigSync?.() as any)?.reputation_system || {};
            const flopPenalty = repSystem.flop_penalty ?? 3;
            const flopRevenueRatio = repSystem.flop_revenue_ratio ?? 0.10;
            const flopInvestmentFloor = repSystem.flop_investment_floor ?? 10000;

            const productionInvestment = releaseSongs.reduce(
              (sum: number, s: any) => sum + (s.productionBudget || 0),
              0,
            );
            const marketingInvestment = release.marketingBudget || 0;
            const totalInvestment = productionInvestment + marketingInvestment;
            const releaseWeekRevenue = totalRevenue;

            const isFlop =
              totalInvestment >= flopInvestmentFloor &&
              releaseWeekRevenue < flopRevenueRatio * totalInvestment;

            if (isFlop) {
              // Mark once-only FIRST (deterministic key, no Date.now/Math.random)
              // so a re-processing pass never double-penalizes.
              flopFlags[flopFlagKey] = true;
              ctx.gameState.flags = flopFlags;

              const repBefore = ctx.gameState.reputation || 0;
              const repAfter = Math.max(0, repBefore - flopPenalty);
              const repDelta = repAfter - repBefore; // ≤ 0 (0 only if already floored)
              ctx.gameState.reputation = repAfter;

              // C34: reputation is label-wide — accumulate the ACTUAL applied delta
              // into summary.reputationChanges so the single aggregated ⭐ weekly
              // line reflects it. Do NOT push a separate type:'reputation' change
              // (that would double the reputation line). The structured 'flop' entry
              // below shows the EVENT itself (categorizeChanges routes it to the
              // rendered Achievements bucket, never the swallowed `other` bucket).
              summary.reputationChanges[release.artistId] =
                (summary.reputationChanges[release.artistId] || 0) + repDelta;

              summary.changes.push({
                type: 'flop',
                description: `📉 "${release.title}" flopped — the industry noticed (${repDelta} reputation)`,
                amount: repDelta,
                releaseId: release.id,
                releaseName: release.title,
              });

              // Volatility-economy slice 2: a flop also wounds the release artist's
              // morale. Config knob progression.json reputation_system.flop_artist_mood_penalty
              // (signed, default -8), applied to summary.artistChanges[release.artistId].mood
              // (accumulated like every other mood source; clamped 0-100 downstream in
              // applyArtistChangesToDatabase). Fires ONCE, inside the same once-only flop
              // flag gate. No RNG.
              const flopMoodPenalty = repSystem.flop_artist_mood_penalty ?? -8;
              if (release.artistId && flopMoodPenalty !== 0) {
                if (!summary.artistChanges) summary.artistChanges = {};
                ArtistChangeHelpers.addMood(summary.artistChanges, release.artistId, flopMoodPenalty);
                summary.changes.push({
                  type: 'mood',
                  description: `${release.title} flopped — the artist took it hard (${flopMoodPenalty} mood)`,
                  amount: flopMoodPenalty,
                  moodChange: flopMoodPenalty,
                  artistId: release.artistId,
                });
              }

              console.log(`[FLOP] "${release.title}" flopped — revenue $${releaseWeekRevenue} < ${flopRevenueRatio}×$${totalInvestment}; reputation ${repBefore} -> ${repAfter}, mood ${flopMoodPenalty}`);
            }
          }
        } catch (flopError) {
          console.warn('[FLOP] Error evaluating flop penalty:', flopError);
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
    const artist = await ctx.storage?.getArtist(song.artistId, ctx.dbTransaction);
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
        const updateResult = await ctx.gameData.updateSong(song.id, songUpdates, ctx.dbTransaction);
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
