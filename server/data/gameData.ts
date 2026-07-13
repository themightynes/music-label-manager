import { gameDataLoader } from '../../shared/utils/dataLoader';
import { applyStartingMoneyMultiplier, type DifficultyLevel } from '../../shared/utils/startingValues';
import { DEFAULT_EXEC_DELEGATION_CONFIG, type ExecDelegationConfig } from '../../shared/utils/executiveDelegation';
import type { 
  GameDataFiles, 
  GameArtist, 
  GameRole, 
  SideEvent, 
  BalanceConfig,
  WorldConfig,
  RoleMeeting,
  ChoiceEffect
} from '../../shared/types/gameTypes';
import { projects, songs, releases, releaseSongs } from '../../shared/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db';
import { storage } from '../storage';

/**
 * Server-side game data management
 * Provides typed access to all JSON game data files
 */
export class ServerGameData {
  private static instance: ServerGameData;
  private dataLoader = gameDataLoader;
  private initialized = false;
  private balanceData: BalanceConfig | null = null;

  static getInstance(): ServerGameData {
    if (!ServerGameData.instance) {
      ServerGameData.instance = new ServerGameData();
    }
    return ServerGameData.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('Loading game data files...');
      const startTime = Date.now();

      // Clear any cached data to ensure fresh load
      this.dataLoader.clearCache();
      const fullData = await this.dataLoader.loadAllData();

      // Cache balance data for sync methods
      this.balanceData = fullData.balance;
      
      const loadTime = Date.now() - startTime;
      console.log(`Game data loaded successfully in ${loadTime}ms`);

      // Mark as initialized BEFORE validation to prevent infinite loop
      this.initialized = true;

      // Validate action data for mood targeting (Task 3.4)
      await this.validateActionData();
    } catch (error) {
      console.error('Failed to initialize game data:', error);
      throw new Error('Game data initialization failed');
    }
  }

  async getFullGameData(): Promise<GameDataFiles> {
    await this.initialize();
    return this.dataLoader.loadAllData();
  }

  // Artist data access
  async getAllArtists(): Promise<GameArtist[]> {
    await this.initialize();
    const data = await this.dataLoader.loadAllData();
    return data.artists.artists;
  }

  async getArtistsByArchetype(archetype: string): Promise<GameArtist[]> {
    await this.initialize();
    return this.dataLoader.getArtistByArchetype(archetype);
  }

  async getAvailableArtists(): Promise<GameArtist[]> {
    const artists = await this.getAllArtists();
    return artists.filter(artist => !artist.signed);
  }

  // Role data access
  async getAllRoles(): Promise<GameRole[]> {
    await this.initialize();
    const data = await this.dataLoader.loadAllData();
    return data.roles.roles;
  }

  async getRoleById(roleId: string): Promise<GameRole | undefined> {
    await this.initialize();
    return this.dataLoader.getRoleById(roleId);
  }

  async getRoleMeetings(roleId: string): Promise<RoleMeeting[]> {
    await this.initialize();
    return this.dataLoader.getRoleMeetings(roleId);
  }

  async getRoleMeetingById(roleId: string, meetingId: string): Promise<RoleMeeting | undefined> {
    const meetings = await this.getRoleMeetings(roleId);
    return meetings.find(meeting => meeting.id === meetingId);
  }

  // Weekly actions data access
  async getWeeklyActions(): Promise<any[]> {
    await this.initialize();
    try {
      const actionsData = await this.dataLoader.loadActionsData();
      return actionsData.weekly_actions || [];
    } catch (error) {
      console.error('Failed to load actions data:', error);
      return [];
    }
  }

  // Get weekly actions with categories
  async getWeeklyActionsWithCategories(): Promise<{ actions: any[], categories: any[] }> {
    await this.initialize();
    try {
      const actionsData = await this.dataLoader.loadActionsData();
      return {
        actions: actionsData.weekly_actions || [],
        categories: actionsData.action_categories || []
      };
    } catch (error) {
      console.error('Failed to load actions data:', error);
      return { actions: [], categories: [] };
    }
  }

  // Get specific action by ID
  async getActionById(actionId: string): Promise<any | undefined> {
    await this.initialize();
    try {
      const actions = await this.getWeeklyActions();
      return actions.find(action => action.id === actionId);
    } catch (error) {
      console.error('Failed to get action by ID:', actionId, error);
      return undefined;
    }
  }

  // Get specific choice from action
  async getChoiceById(actionId: string, choiceId: string): Promise<any | undefined> {
    await this.initialize();
    try {
      const action = await this.getActionById(actionId);
      if (!action || !action.choices) {
        console.error('Action not found or has no choices:', actionId);
        return undefined;
      }
      
      const choice = action.choices.find((choice: any) => choice.id === choiceId);
      if (!choice) {
        console.error('Choice not found:', choiceId, 'in action:', actionId);
        return undefined;
      }
      
      return choice;
    } catch (error) {
      console.error('Failed to get choice by ID:', { actionId, choiceId }, error);
      return undefined;
    }
  }

  // Project types data access  
  async getProjectTypes(): Promise<any> {
    await this.initialize();
    const data = await this.dataLoader.loadAllData();
    return data.balance.economy.project_costs || {};
  }

  // Event data access
  async getAllEvents(): Promise<SideEvent[]> {
    await this.initialize();
    const data = await this.dataLoader.loadAllData();
    return data.events.events;
  }

  async getRandomEvent(): Promise<SideEvent | null> {
    const events = await this.getAllEvents();
    const availableEvents = events.filter(event => {
      // TODO: Check against game state for cooldown
      return true; // For now, all events are available
    });
    
    if (availableEvents.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * availableEvents.length);
    return availableEvents[randomIndex];
  }

  async getEventById(eventId: string): Promise<SideEvent | undefined> {
    const events = await this.getAllEvents();
    return events.find(event => event.id === eventId);
  }

  // Balance and configuration access
  async getBalanceConfig(): Promise<BalanceConfig> {
    await this.initialize();
    const data = await this.dataLoader.loadAllData();
    return data.balance;
  }

  async getWorldConfig(): Promise<WorldConfig> {
    await this.initialize();
    return this.dataLoader.getWorldConfig();
  }

  async getStartingValues(difficulty: DifficultyLevel = 'normal'): Promise<{ money: number; reputation: number; creativeCapital: number }> {
    const balance = await this.getBalanceConfig();
    return {
      money: applyStartingMoneyMultiplier(
        balance.economy.starting_money,
        balance.difficulty_modifiers,
        difficulty
      ),
      reputation: balance.reputation_system.starting_reputation,
      creativeCapital: balance.reputation_system.starting_creative_capital ?? 0
    };
  }


  async getProjectCosts(projectType: string): Promise<{ min: number; max: number }> {
    const balance = await this.getBalanceConfig();
    const costs = balance.economy.project_costs[projectType.toLowerCase()];
    return { min: costs?.min || 0, max: costs?.max || 0 };
  }

  async getMarketingCosts(type: string): Promise<{ min: number; max: number }> {
    const balance = await this.getBalanceConfig();
    const costs = balance.economy.marketing_costs[type];
    return { min: costs?.min || 0, max: costs?.max || 0 };
  }

  async getAccessTierThreshold(tierType: string, tierLevel: string): Promise<number> {
    const balance = await this.getBalanceConfig();
    const tierSystem = balance.access_tier_system[tierType];
    return tierSystem?.[tierLevel]?.threshold || 0;
  }

  async getProgressionThresholds() {
    const balance = await this.getBalanceConfig();
    const thresholds = balance.progression_thresholds;
    return {
      second_artist_reputation: thresholds.second_artist_reputation,
      fourth_focus_slot_reputation: thresholds.fourth_focus_slot_reputation,
      label_size_thresholds: {
        local: 0,
        regional: 25,
        national: 50,
        global: thresholds.global_label_reputation
      }
    };
  }

  // Dialogue data access
  async getArtistDialogue(archetype: string): Promise<any[]> {
    await this.initialize();
    return this.dataLoader.getArtistDialogue(archetype);
  }

  // Get specific choice from a dialogue scene
  async getDialogueChoiceById(sceneId: string, choiceId: string): Promise<any | undefined> {
    await this.initialize();
    try {
      const data = await this.dataLoader.loadAllData();
      const scene = data.dialogue.additional_scenes.find((scene: any) => scene.id === sceneId);

      if (!scene || !scene.choices) {
        console.error('Dialogue scene not found or has no choices:', sceneId);
        return undefined;
      }

      const choice = scene.choices.find((choice: any) => choice.id === choiceId);
      if (!choice) {
        console.error('Dialogue choice not found:', choiceId, 'in scene:', sceneId);
        return undefined;
      }

      return choice;
    } catch (error) {
      console.error('Failed to get dialogue choice by ID:', { sceneId, choiceId }, error);
      return undefined;
    }
  }

  // PHASE 3 MIGRATION: Removed duplicate calculation methods
  // calculateProjectCost() - REMOVED (unused)
  // calculateStreamingOutcome() - REMOVED (GameEngine has correct implementation)

  async shouldTriggerSideEvent(week: number): Promise<boolean> {
    const balance = await this.getBalanceConfig();
    const chance = balance.side_events.weekly_chance;
    return Math.random() < chance;
  }

  // Missing methods required by GameEngine
  async getStreamingConfig() {
    const balance = await this.getBalanceConfig();
    const streaming = balance.market_formulas.streaming_calculation;
    return {
      quality_weight: streaming?.quality_weight || 0.25,
      playlist_weight: streaming?.playlist_weight || 0.20,
      reputation_weight: streaming?.reputation_weight || 0.10,
      marketing_weight: streaming?.marketing_weight || 0.25,
      popularity_weight: streaming?.popularity_weight || 0.20,
      first_week_multiplier: streaming?.first_week_multiplier || 2.5,
      base_streams_per_point: 1000,
      star_power_amplification: streaming?.star_power_amplification || { enabled: true, max_multiplier: 0.3 }
    };
  }

  async getPressConfig() {
    const balance = await this.getBalanceConfig();
    const press = balance.market_formulas.press_coverage;
    return {
      base_chance: press?.base_chance || 0.15,
      pr_spend_modifier: press?.pr_spend_modifier || 0.001,
      reputation_modifier: press?.reputation_modifier || 0.008,
      story_flag_bonus: press?.story_flag_bonus || 0.30,
      max_pickups_per_release: press?.max_pickups_per_release || 8
    };
  }

  async getTourConfig() {
    const balance = await this.getBalanceConfig();
    const tour = balance.market_formulas.tour_revenue;
    return {
      sell_through_base: tour.sell_through_base,
      reputation_modifier: tour.reputation_modifier,
      local_popularity_weight: tour.local_popularity_weight,
      merch_percentage: tour.merch_percentage,
      ticket_price_base: tour.ticket_price_base,
      ticket_price_per_capacity: tour.ticket_price_per_capacity
    };
  }

  async getAccessTiers() {
    const balance = await this.getBalanceConfig();
    const access = balance.access_tier_system;
    return {
      playlist_access: {
        none: { 
          threshold: access.playlist_access.none.threshold, 
          reach_multiplier: access.playlist_access.none.reach_multiplier, 
          description: "No playlist access" 
        },
        niche: { 
          threshold: access.playlist_access.niche.threshold, 
          reach_multiplier: access.playlist_access.niche.reach_multiplier, 
          description: "Niche playlist access" 
        },
        mid: { 
          threshold: access.playlist_access.mid.threshold, 
          reach_multiplier: access.playlist_access.mid.reach_multiplier, 
          description: "Mid-tier playlist access" 
        },
        flagship: { 
          threshold: access.playlist_access.flagship.threshold, 
          reach_multiplier: access.playlist_access.flagship.reach_multiplier, 
          description: "Flagship playlist access" 
        }
      },
      press_access: {
        none: { 
          threshold: access.press_access.none.threshold, 
          pickup_chance: access.press_access.none.pickup_chance, 
          description: "No press contacts" 
        },
        blogs: { 
          threshold: access.press_access.blogs.threshold, 
          pickup_chance: access.press_access.blogs.pickup_chance, 
          description: "Music blog access" 
        },
        mid_tier: { 
          threshold: access.press_access.mid_tier.threshold, 
          pickup_chance: access.press_access.mid_tier.pickup_chance, 
          description: "Mid-tier publication access" 
        },
        national: { 
          threshold: access.press_access.national.threshold, 
          pickup_chance: access.press_access.national.pickup_chance, 
          description: "National media access" 
        }
      },
      venue_access: {
        none: {
          threshold: access.venue_access.none.threshold,
          capacity_range: access.venue_access.none.capacity_range,
          description: "No venue access"
        },
        clubs: { 
          threshold: access.venue_access.clubs.threshold, 
          capacity_range: access.venue_access.clubs.capacity_range, 
          description: "Small clubs and bars" 
        },
        theaters: { 
          threshold: access.venue_access.theaters.threshold, 
          capacity_range: access.venue_access.theaters.capacity_range, 
          description: "Theaters and mid-size venues" 
        },
        arenas: { 
          threshold: access.venue_access.arenas.threshold, 
          capacity_range: access.venue_access.arenas.capacity_range, 
          description: "Arenas and large venues" 
        }
      }
    };
  }

  async getEventConfig() {
    const balance = await this.getBalanceConfig();
    const events = balance.side_events;
    return {
      weekly_chance: events?.weekly_chance || 0.20,
      cooldown_weeks: events?.event_cooldown || 2,
      max_per_year: events?.max_events_per_week * 12 || 12
    };
  }

  async getWeeklyBurnRange(): Promise<[number, number]> {
    const balance = await this.getBalanceConfig();
    const burnRange = balance.economy.weekly_burn_base;
    return [burnRange[0], burnRange[1]];
  }

  // Synchronous versions for GameEngine compatibility
  getStreamingConfigSync() {
    if (!this.balanceData) {
      // Fallback values if balance not loaded yet
      return {
        quality_weight: 0.35,
        playlist_weight: 0.25,
        reputation_weight: 0.20,
        marketing_weight: 0.20,
        first_week_multiplier: 2.5,
        base_streams_per_point: 1000,
        playlist_component_scale: 100,
        marketing_scale_divisor: 1000,
        marketing_scale_multiplier: 50,
        variance_range: [0.9, 1.1],
        ongoing_streams: {
          weekly_decay_rate: 0.85,
          revenue_per_stream: 0.003,
          ongoing_factor: 0.1,
          reputation_bonus_factor: 0.002,
          reputation_baseline: 50,
          access_tier_bonus_factor: 0.1,
          minimum_revenue_threshold: 1,
          max_decay_weeks: 24
        }
      };
    }

    const streaming = this.balanceData.market_formulas.streaming_calculation;
    return {
      quality_weight: streaming.quality_weight,
      playlist_weight: streaming.playlist_weight,
      reputation_weight: streaming.reputation_weight,
      marketing_weight: streaming.marketing_weight,
      popularity_weight: streaming.popularity_weight,
      first_week_multiplier: streaming.first_week_multiplier,
      // Balance-integrity slice 1 (knob liberation): these were engine literals
      // (base_streams_per_point at gameData.ts, PLAYLIST_COMPONENT_SCALE /
      // MARKETING_SCALE / VARIANCE_RANGE in FinancialSystem.CONSTANTS). Now config,
      // with the original literal as the code-side fallback default.
      base_streams_per_point: streaming.base_streams_per_point ?? 1000,
      playlist_component_scale: streaming.playlist_component_scale ?? 100,
      marketing_scale_divisor: streaming.marketing_scale_divisor ?? 1000,
      marketing_scale_multiplier: streaming.marketing_scale_multiplier ?? 50,
      variance_range: streaming.variance_range ?? [0.9, 1.1],
      star_power_amplification: streaming.star_power_amplification,
      ongoing_streams: streaming.ongoing_streams
    };
  }

  // Balance-integrity slice 1 (knob liberation): the song-quality formula
  // constants that were HARDCODED inside SongGenerationProcessor.calculate-
  // EnhancedSongQuality. Lives in data/balance/quality.json under
  // song_quality_formula. DISTINCT from producer_tier_system.multiplier /
  // time_investment_system.multiplier (those feed cost/duration, not quality).
  // Every field falls back to the original engine literal so behavior is
  // byte-identical whether or not the JSON block is present.
  getSongQualityFormulaConfigSync() {
    const defaults = {
      talent_weight: 0.65,
      producer_weight: 0.35,
      producer_skill_map: { local: 40, regional: 55, national: 75, legendary: 95 } as Record<string, number>,
      default_producer_skill: 40,
      time_multipliers: { rushed: 0.7, standard: 1.0, extended: 1.1, perfectionist: 1.2 } as Record<string, number>,
      default_time_multiplier: 1.0,
      work_ethic_max_bonus: 0.3,
      popularity_factor_base: 0.95,
      popularity_factor_range: 0.1,
      fatigue_base: 0.97,
      fatigue_free_songs: 3,
      mood_factor_base: 0.9,
      mood_factor_range: 0.2,
      // Balance-integrity slice 4 (mood → variance widening): low mood WIDENS the
      // variance band (volatile, not uniformly worse). Distinct from the mood_factor_*
      // above, which is the unchanged 0.9–1.1 quality multiplier.
      mood_baseline: 50,
      mood_variance_widening_max: 0.4,
      base_variance_max: 35,
      base_variance_skill_reduction: 30,
      breakout_base_chance: 0.05,
      failure_base_chance: 0.1
    };
    const cfg = ((this.balanceData as any)?.song_quality_formula || {}) as Record<string, any>;
    return {
      talent_weight: cfg.talent_weight ?? defaults.talent_weight,
      producer_weight: cfg.producer_weight ?? defaults.producer_weight,
      producer_skill_map: cfg.producer_skill_map ?? defaults.producer_skill_map,
      default_producer_skill: cfg.default_producer_skill ?? defaults.default_producer_skill,
      time_multipliers: cfg.time_multipliers ?? defaults.time_multipliers,
      default_time_multiplier: cfg.default_time_multiplier ?? defaults.default_time_multiplier,
      work_ethic_max_bonus: cfg.work_ethic_max_bonus ?? defaults.work_ethic_max_bonus,
      popularity_factor_base: cfg.popularity_factor_base ?? defaults.popularity_factor_base,
      popularity_factor_range: cfg.popularity_factor_range ?? defaults.popularity_factor_range,
      fatigue_base: cfg.fatigue_base ?? defaults.fatigue_base,
      fatigue_free_songs: cfg.fatigue_free_songs ?? defaults.fatigue_free_songs,
      mood_factor_base: cfg.mood_factor_base ?? defaults.mood_factor_base,
      mood_factor_range: cfg.mood_factor_range ?? defaults.mood_factor_range,
      mood_baseline: cfg.mood_baseline ?? defaults.mood_baseline,
      mood_variance_widening_max: cfg.mood_variance_widening_max ?? defaults.mood_variance_widening_max,
      base_variance_max: cfg.base_variance_max ?? defaults.base_variance_max,
      base_variance_skill_reduction: cfg.base_variance_skill_reduction ?? defaults.base_variance_skill_reduction,
      breakout_base_chance: cfg.breakout_base_chance ?? defaults.breakout_base_chance,
      failure_base_chance: cfg.failure_base_chance ?? defaults.failure_base_chance
    };
  }

  getPressConfigSync() {
    if (!this.balanceData) {
      return {
        base_chance: 0.15,
        pr_spend_modifier: 0.001,
        reputation_modifier: 0.008,
        story_flag_bonus: 0.30,
        max_pickups_per_release: 8,
        // Exec-meetings-revival PR-3 (C2): press_momentum chance-per-point knob.
        press_momentum_chance_per_point: 0.02,
        // Phase B fix-2: unconsumed story flags expire like the quality/awareness banks.
        press_story_flag_expiry_weeks: 8,
        // Engine-verbs slice 13 (M15): next-release press-scrutiny liability knobs.
        press_scrutiny_penalty_factor: 0.5,
        press_scrutiny_flag_expiry_weeks: 8
      };
    }

    const press = this.balanceData.market_formulas.press_coverage;
    return {
      base_chance: press.base_chance,
      pr_spend_modifier: press.pr_spend_modifier,
      reputation_modifier: press.reputation_modifier,
      story_flag_bonus: press.story_flag_bonus,
      max_pickups_per_release: press.max_pickups_per_release,
      press_momentum_chance_per_point: press.press_momentum_chance_per_point ?? 0.02,
      press_story_flag_expiry_weeks: press.press_story_flag_expiry_weeks ?? 8,
      press_scrutiny_penalty_factor: press.press_scrutiny_penalty_factor ?? 0.5,
      press_scrutiny_flag_expiry_weeks: press.press_scrutiny_flag_expiry_weeks ?? 8
    };
  }

  // Engine-verbs slice 12 (M10 distribution_efficiency): persistent label
  // distribution modifier knobs. Lives in data/balance/markets.json under
  // market_formulas.distribution. The cap clamps the APPLIED amount at read time
  // (ReleaseProcessor.calculateOngoingSongRevenue) — banking is uncapped, the
  // economy read is not.
  getDistributionConfigSync() {
    if (!this.balanceData) {
      return {
        efficiency_amount_cap: 0.25
      };
    }

    const distribution = (this.balanceData.market_formulas?.distribution || {}) as Record<string, any>;
    return {
      efficiency_amount_cap: distribution.efficiency_amount_cap ?? 0.25
    };
  }

  // Engine-verbs slice 2 (M2 spawn_prospect): default hint ranges for spawned
  // prospect targeting. Lives in data/balance/artists.json under
  // artist_stats.prospect_spawn. When an authored spawn_prospect descriptor
  // omits quality_hint/popularity_hint, the engine rolls a target inside these
  // ranges with an ISOLATED seed (never ctx.getRandom).
  getProspectSpawnConfigSync() {
    if (!this.balanceData) {
      return {
        default_talent_range: [40, 85] as [number, number],
        default_popularity_range: [5, 40] as [number, number]
      };
    }

    const prospectSpawn = ((this.balanceData as any).artist_stats?.prospect_spawn || {}) as Record<string, any>;
    return {
      default_talent_range: (prospectSpawn.default_talent_range ?? [40, 85]) as [number, number],
      default_popularity_range: (prospectSpawn.default_popularity_range ?? [5, 40]) as [number, number]
    };
  }

  // Exec-meetings-revival PR-4 (C1): pending-quality-bonus expiry knob.
  getQualityBonusConfigSync() {
    if (!this.balanceData) {
      return {
        pending_quality_bonus_expiry_weeks: 8
      };
    }

    const qualitySystem = (this.balanceData.quality_system || {}) as Record<string, any>;
    return {
      pending_quality_bonus_expiry_weeks: qualitySystem.pending_quality_bonus_expiry_weeks ?? 8
    };
  }

  // Exec-meetings-revival PR-5 (C3): awareness-boost consumption + expiry knobs.
  // Lives in data/balance/markets.json under market_formulas.awareness_system.
  getAwarenessBoostConfigSync() {
    if (!this.balanceData) {
      return {
        awareness_boost_points_per_unit: 8,
        pending_awareness_boost_expiry_weeks: 8
      };
    }

    const awareness = (this.balanceData.market_formulas?.awareness_system || {}) as Record<string, any>;
    return {
      awareness_boost_points_per_unit: awareness.awareness_boost_points_per_unit ?? 8,
      pending_awareness_boost_expiry_weeks: awareness.pending_awareness_boost_expiry_weeks ?? 8
    };
  }

  // Buzz-v2 (Hype & Pre-Marketing) slice 3 — pre-release marketing knobs.
  // Lives in data/balance/markets.json under market_formulas.pre_campaign.
  //   - max_pct: hard cap on the share of the marketing budget the player may
  //     allocate to the pre-release campaign (fork D safety rail; UI + server
  //     validation both clamp to this).
  //   - diminishing_after_weeks / diminishing_factor: fork D — anticipation ramp
  //     builds at full strength within this many weeks of launch, then at the
  //     diminishing factor when further out (mega-early planning doesn't dominate).
  //   - lead_single_conduit_factor: fork F — the pre-campaign converts at full
  //     strength only while a lead single is already out; without one, awareness
  //     builds at this factor. Same hardcoded-fallback pattern as the C1/C3 knobs.
  getPreCampaignConfigSync() {
    if (!this.balanceData) {
      return {
        max_pct: 50,
        diminishing_after_weeks: 4,
        diminishing_factor: 0.5,
        lead_single_conduit_factor: 0.5
      };
    }

    const preCampaign = (this.balanceData.market_formulas?.pre_campaign || {}) as Record<string, any>;
    return {
      max_pct: preCampaign.max_pct ?? 50,
      diminishing_after_weeks: preCampaign.diminishing_after_weeks ?? 4,
      diminishing_factor: preCampaign.diminishing_factor ?? 0.5,
      lead_single_conduit_factor: preCampaign.lead_single_conduit_factor ?? 0.5
    };
  }

  // Exec-meetings-revival PR-6 (C4): variance-channel knobs — how much a banked
  // pendingVariance point widens the next song's variance band and raises the
  // outlier-roll chance, plus its unconsumed-bank expiry (same pattern as C1).
  getVarianceConfigSync() {
    if (!this.balanceData) {
      return {
        variance_widen_per_point: 0.5,
        outlier_chance_bonus_per_point: 0.02,
        pending_variance_expiry_weeks: 8
      };
    }

    const qualitySystem = (this.balanceData.quality_system || {}) as Record<string, any>;
    return {
      variance_widen_per_point: qualitySystem.variance_widen_per_point ?? 0.5,
      outlier_chance_bonus_per_point: qualitySystem.outlier_chance_bonus_per_point ?? 0.02,
      pending_variance_expiry_weeks: qualitySystem.pending_variance_expiry_weeks ?? 8
    };
  }

  // Exec-meetings-revival PR-7 (C5): award-track knobs — how a banked
  // flags.awardChances pool converts into a campaign-end award-roll chance
  // (capped) and the score bonus a win adds to AchievementsEngine's total.
  // Lives in data/balance/progression.json under reputation_system.
  getAwardConfigSync() {
    if (!this.balanceData) {
      return {
        award_chance_per_point: 0.08,
        award_chance_cap: 0.8,
        award_score_bonus: 2000,
        award_nominee_pool_threshold: 5
      };
    }

    const reputationSystem = (this.balanceData.reputation_system || {}) as Record<string, any>;
    return {
      award_chance_per_point: reputationSystem.award_chance_per_point ?? 0.08,
      award_chance_cap: reputationSystem.award_chance_cap ?? 0.8,
      award_score_bonus: reputationSystem.award_score_bonus ?? 2000,
      award_nominee_pool_threshold: reputationSystem.award_nominee_pool_threshold ?? 5
    };
  }

  // Exec-meetings-revival PR-9 (C6/D) — executive-mood meeting-outcome modifiers.
  // Band boundaries + cost/effect multipliers. Lives in data/balance/progression.json
  // under reputation_system.exec_mood_modifiers. The SHARED util
  // (shared/utils/executiveMoodModifier.ts) is the single source of the math; this
  // accessor just feeds it the balance-tuned knobs (both engine and client preview
  // route through the same util so they can never drift).
  getExecMoodModifierConfigSync() {
    const defaults = {
      disgruntled_below: 30,
      content_above: 80,
      inspired_above: 90,
      cost_multiplier_disgruntled: 1.25,
      cost_multiplier_content: 0.9,
      effect_multiplier_inspired: 1.2
    };
    if (!this.balanceData) {
      return defaults;
    }
    const cfg = ((this.balanceData.reputation_system || {}) as Record<string, any>).exec_mood_modifiers || {};
    return {
      disgruntled_below: cfg.disgruntled_below ?? defaults.disgruntled_below,
      content_above: cfg.content_above ?? defaults.content_above,
      inspired_above: cfg.inspired_above ?? defaults.inspired_above,
      cost_multiplier_disgruntled: cfg.cost_multiplier_disgruntled ?? defaults.cost_multiplier_disgruntled,
      cost_multiplier_content: cfg.cost_multiplier_content ?? defaults.cost_multiplier_content,
      effect_multiplier_inspired: cfg.effect_multiplier_inspired ?? defaults.effect_multiplier_inspired
    };
  }

  // Executive Delegation arc (Tier 1) — autonomous-resolution + config extraction.
  // Lives in data/balance/progression.json under
  // reputation_system.executive_delegation. Mirrors the shared default
  // (DEFAULT_EXEC_DELEGATION_CONFIG, shared/utils/executiveDelegation.ts); a
  // parity tripwire test keeps the two in lockstep. Same HARDCODED-fallback
  // pattern as getExecMoodModifierConfigSync so behavior is identical whether or
  // not the JSON block is present.
  getExecDelegationConfigSync(): ExecDelegationConfig {
    if (!this.balanceData) {
      return DEFAULT_EXEC_DELEGATION_CONFIG;
    }
    const cfg = ((this.balanceData.reputation_system || {}) as Record<string, any>).executive_delegation || {};
    const d = DEFAULT_EXEC_DELEGATION_CONFIG;
    return {
      loyalty_on_use: cfg.loyalty_on_use ?? d.loyalty_on_use,
      loyalty_decay_per_week: cfg.loyalty_decay_per_week ?? d.loyalty_decay_per_week,
      idle_weeks_before_decay: cfg.idle_weeks_before_decay ?? d.idle_weeks_before_decay,
      mood_drift_per_week: cfg.mood_drift_per_week ?? d.mood_drift_per_week,
      mood_default_delta: cfg.mood_default_delta ?? d.mood_default_delta,
      loyalty_bands: {
        loyal_above: cfg.loyalty_bands?.loyal_above ?? d.loyalty_bands.loyal_above,
        disloyal_below: cfg.loyalty_bands?.disloyal_below ?? d.loyalty_bands.disloyal_below,
      },
      autonomous_risk_appetite: {
        inspired_bias: cfg.autonomous_risk_appetite?.inspired_bias ?? d.autonomous_risk_appetite.inspired_bias,
        disgruntled_bias: cfg.autonomous_risk_appetite?.disgruntled_bias ?? d.autonomous_risk_appetite.disgruntled_bias,
        neutral_bias: cfg.autonomous_risk_appetite?.neutral_bias ?? d.autonomous_risk_appetite.neutral_bias,
      },
      auto_endorse_loyalty_gain: cfg.auto_endorse_loyalty_gain ?? d.auto_endorse_loyalty_gain,
      neglect_loyalty_gain: cfg.neglect_loyalty_gain ?? d.neglect_loyalty_gain,
      neglect_mood_gain: cfg.neglect_mood_gain ?? d.neglect_mood_gain,
      escalation: {
        loyalty_ceiling: cfg.escalation?.loyalty_ceiling ?? d.escalation.loyalty_ceiling,
        enabled: cfg.escalation?.enabled ?? d.escalation.enabled,
      },
      auto_safe_scoring: {
        gamble_base_penalty: cfg.auto_safe_scoring?.gamble_base_penalty ?? d.auto_safe_scoring.gamble_base_penalty,
        gamble_per_point_penalty: cfg.auto_safe_scoring?.gamble_per_point_penalty ?? d.auto_safe_scoring.gamble_per_point_penalty,
        value_gain_cap: cfg.auto_safe_scoring?.value_gain_cap ?? d.auto_safe_scoring.value_gain_cap,
        value_loss_cap: cfg.auto_safe_scoring?.value_loss_cap ?? d.auto_safe_scoring.value_loss_cap,
        value_loss_dampener: cfg.auto_safe_scoring?.value_loss_dampener ?? d.auto_safe_scoring.value_loss_dampener,
        money_per_thousand: cfg.auto_safe_scoring?.money_per_thousand ?? d.auto_safe_scoring.money_per_thousand,
        money_gain_cap: cfg.auto_safe_scoring?.money_gain_cap ?? d.auto_safe_scoring.money_gain_cap,
        money_spend_cap: cfg.auto_safe_scoring?.money_spend_cap ?? d.auto_safe_scoring.money_spend_cap,
        money_spend_dampener: cfg.auto_safe_scoring?.money_spend_dampener ?? d.auto_safe_scoring.money_spend_dampener,
        soft_stat_weights: {
          quality_bonus: cfg.auto_safe_scoring?.soft_stat_weights?.quality_bonus ?? d.auto_safe_scoring.soft_stat_weights.quality_bonus,
          artist_mood: cfg.auto_safe_scoring?.soft_stat_weights?.artist_mood ?? d.auto_safe_scoring.soft_stat_weights.artist_mood,
          awareness_boost: cfg.auto_safe_scoring?.soft_stat_weights?.awareness_boost ?? d.auto_safe_scoring.soft_stat_weights.awareness_boost,
          press_momentum: cfg.auto_safe_scoring?.soft_stat_weights?.press_momentum ?? d.auto_safe_scoring.soft_stat_weights.press_momentum,
        },
      },
    };
  }

  // Meeting-relevance Tier 1 (PR-2) — weekly meeting selection tunables.
  // Lives in data/balance/progression.json under weekly_meeting_selection.
  // Threaded into shared/engine/meetingSelection.ts's weighMeetings/
  // selectWeeklyMeeting via server/routes/executives.ts's MeetingSelectionTuning.
  getWeeklyMeetingSelectionConfigSync() {
    // HARDCODED: fallback tuning if data/balance/progression.json's
    // weekly_meeting_selection block is absent (matches the balance file's
    // authored defaults so behavior is identical either way).
    const defaults = {
      relevance_weight: 2.0,
      recency_window_weeks: 4
    };
    if (!this.balanceData) {
      return defaults;
    }
    const cfg = (this.balanceData.weekly_meeting_selection || {}) as Record<string, any>;
    return {
      relevance_weight: cfg.relevance_weight ?? defaults.relevance_weight,
      recency_window_weeks: cfg.recency_window_weeks ?? defaults.recency_window_weeks
    };
  }

  getBalanceConfigSync(): BalanceConfig {
    if (!this.balanceData) {
      throw new Error('Balance data not loaded. Call initialize() first.');
    }
    return this.balanceData;
  }

  // Alias for GameEngine compatibility
  getPressCoverageConfigSync() {
    return this.getPressConfigSync();
  }

  getTourConfigSync() {
    if (!this.balanceData) {
      throw new Error('Balance data not loaded. Cannot get tour configuration.');
    }

    const tour = this.balanceData.market_formulas.tour_revenue;
    return {
      sell_through_base: tour.sell_through_base,
      reputation_modifier: tour.reputation_modifier,
      local_popularity_weight: tour.local_popularity_weight,
      merch_percentage: tour.merch_percentage,
      ticket_price_base: tour.ticket_price_base,
      ticket_price_per_capacity: tour.ticket_price_per_capacity
    };
  }

  getAccessTiersSync() {
    if (!this.balanceData) {
      // Fallback data if balance not loaded yet
      return {
        playlist_access: {
          none: { threshold: 0, reach_multiplier: 0.1, description: "No playlist access" },
          niche: { threshold: 10, reach_multiplier: 0.4, description: "Niche playlist access" },
          mid: { threshold: 30, reach_multiplier: 0.8, description: "Mid-tier playlist access" },
          flagship: { threshold: 60, reach_multiplier: 1.5, description: "Flagship playlist access" }
        },
        press_access: {
          none: { threshold: 0, pickup_chance: 0.05, description: "No press contacts" },
          blogs: { threshold: 8, pickup_chance: 0.25, description: "Music blog access" },
          mid_tier: { threshold: 25, pickup_chance: 0.60, description: "Mid-tier publication access" },
          national: { threshold: 50, pickup_chance: 0.85, description: "National media access" }
        },
        venue_access: {
          none: { threshold: 0, capacity_range: [0, 50], description: "No venue access" },
          clubs: { threshold: 5, capacity_range: [50, 500], description: "Small clubs and bars" },
          theaters: { threshold: 20, capacity_range: [500, 2000], description: "Theaters and mid-size venues" },
          arenas: { threshold: 45, capacity_range: [2000, 20000], description: "Arenas and large venues" }
        }
      };
    }
    
    // Use real balance data
    const access = this.balanceData.access_tier_system;
    return {
      playlist_access: {
        none: { 
          threshold: access.playlist_access.none.threshold, 
          reach_multiplier: access.playlist_access.none.reach_multiplier, 
          description: "No playlist access" 
        },
        niche: { 
          threshold: access.playlist_access.niche.threshold, 
          reach_multiplier: access.playlist_access.niche.reach_multiplier, 
          description: "Niche playlist access" 
        },
        mid: { 
          threshold: access.playlist_access.mid.threshold, 
          reach_multiplier: access.playlist_access.mid.reach_multiplier, 
          description: "Mid-tier playlist access" 
        },
        flagship: { 
          threshold: access.playlist_access.flagship.threshold, 
          reach_multiplier: access.playlist_access.flagship.reach_multiplier, 
          description: "Flagship playlist access" 
        }
      },
      press_access: {
        none: { 
          threshold: access.press_access.none.threshold, 
          pickup_chance: access.press_access.none.pickup_chance, 
          description: "No press contacts" 
        },
        blogs: { 
          threshold: access.press_access.blogs.threshold, 
          pickup_chance: access.press_access.blogs.pickup_chance, 
          description: "Music blog access" 
        },
        mid_tier: { 
          threshold: access.press_access.mid_tier.threshold, 
          pickup_chance: access.press_access.mid_tier.pickup_chance, 
          description: "Mid-tier publication access" 
        },
        national: { 
          threshold: access.press_access.national.threshold, 
          pickup_chance: access.press_access.national.pickup_chance, 
          description: "National publication access" 
        }
      },
      venue_access: {
        none: {
          threshold: access.venue_access.none.threshold,
          capacity_range: access.venue_access.none.capacity_range,
          description: "No venue access"
        },
        clubs: { 
          threshold: access.venue_access.clubs.threshold, 
          capacity_range: access.venue_access.clubs.capacity_range, 
          description: "Small clubs and bars" 
        },
        theaters: { 
          threshold: access.venue_access.theaters.threshold, 
          capacity_range: access.venue_access.theaters.capacity_range, 
          description: "Theaters and mid-size venues" 
        },
        arenas: { 
          threshold: access.venue_access.arenas.threshold, 
          capacity_range: access.venue_access.arenas.capacity_range, 
          description: "Arenas and large venues" 
        }
      }
    };
  }

  getEventConfigSync() {
    if (!this.balanceData) {
      return {
        weekly_chance: 0.20,
        cooldown_weeks: 2,
        max_per_year: 12
      };
    }

    const events = this.balanceData.side_events;
    return {
      weekly_chance: events.weekly_chance,
      cooldown_weeks: events.event_cooldown,
      max_per_year: events.max_events_per_week * 12
    };
  }

  /**
   * Tier 2 (PR-3): the weighted-selection config for on-hit side-event picks —
   * category weights + cooldown from data/balance/events.json side_events.
   * Consumed by selectSideEvent (shared/engine/sideEventSelection.ts). Falls
   * back to the authored defaults when balance data has not loaded (the on-hit
   * path is dark in the golden master, so the fallback never affects it).
   */
  getSideEventsConfigSync(): { event_weights: Record<string, number>; event_cooldown: number } {
    const events = this.balanceData?.side_events;
    return {
      event_weights: (events?.event_weights as Record<string, number>) ?? {},
      event_cooldown: (events?.event_cooldown as number) ?? 2,
    };
  }

  /**
   * Mandatory Side Events ("Crisis on the Desk") kill-switch. When enabled
   * (the default), a rolled side event is DEFERRED to the following week as a
   * mandatory crisis card that consumes a focus slot and gates the advance.
   * When disabled, the legacy in-results interactive beat path is restored.
   * Falls back to enabled:true (the shipped default) when balance data has not
   * loaded — the GM harness overrides this stub explicitly.
   */
  getMandatorySideEventsConfigSync(): { enabled: boolean } {
    const cfg = (this.balanceData as any)?.mandatory_side_events;
    return { enabled: cfg?.enabled !== false };
  }

  getWeeklyBurnRangeSync(): [number, number] {
    if (!this.balanceData) {
      return [3000, 6000];
    }
    
    const burnRange = this.balanceData.economy.weekly_burn_base;
    return [burnRange[0], burnRange[1]];
  }

  getProgressionThresholdsSync() {
    if (!this.balanceData) {
      return {
        second_artist_reputation: 10,
        fourth_focus_slot_reputation: 50,
        label_size_thresholds: {
          local: 0,
          regional: 25,
          national: 50,
          global: 75
        }
      };
    }
    
    const thresholds = this.balanceData.progression_thresholds;
    return {
      second_artist_reputation: thresholds.second_artist_reputation,
      fourth_focus_slot_reputation: thresholds.fourth_focus_slot_reputation,
      label_size_thresholds: {
        local: 0,
        regional: 25,
        national: 50,
        global: thresholds.global_label_reputation
      }
    };
  }

  // Producer Tier System Access
  getProducerTierSystemSync() {
    if (!this.balanceData) {
      return {
        local: { multiplier: 1.0, unlock_rep: 0, description: "Local producers" },
        regional: { multiplier: 1.8, unlock_rep: 15, description: "Regional producers" },
        national: { multiplier: 3.2, unlock_rep: 35, description: "National producers" },
        legendary: { multiplier: 5.5, unlock_rep: 60, description: "Legendary producers" }
      };
    }
    
    return this.balanceData.producer_tier_system;
  }

  // Time Investment System Access
  getTimeInvestmentSystemSync() {
    if (!this.balanceData) {
      return {
        rushed: { multiplier: 0.7, duration_modifier: 0.8, description: "Rushed production" },
        standard: { multiplier: 1.0, duration_modifier: 1.0, description: "Standard production" },
        extended: { multiplier: 1.4, duration_modifier: 1.3, description: "Extended production" },
        perfectionist: { multiplier: 2.1, duration_modifier: 1.6, description: "Perfectionist production" }
      };
    }
    
    return this.balanceData.time_investment_system;
  }

  // Producer Tier Validation
  getAvailableProducerTiers(reputation: number): string[] {
    const producerSystem = this.getProducerTierSystemSync();
    const availableTiers: string[] = [];
    
    for (const [tierName, tierData] of Object.entries(producerSystem)) {
      if (reputation >= tierData.unlock_rep) {
        availableTiers.push(tierName);
      }
    }
    
    return availableTiers;
  }

  // Project Cost Calculation with Producer, Time Investment, and Song Count
  // PHASE 3 MIGRATION: Moved business logic methods to GameEngine
  // calculateEnhancedProjectCost() - MOVED to GameEngine
  // calculatePerSongProjectCost() - MOVED to GameEngine  
  // calculateEconomiesOfScale() - MOVED to GameEngine

  // Validate action data for mood targeting (Task 3.4)
  private async validateActionData(): Promise<void> {
    try {
      const actions = await this.getWeeklyActions();
      const validScopes = ['global', 'predetermined', 'user_selected'];

      for (const action of actions) {
        // Verify target_scope exists
        if (!action.target_scope) {
          throw new Error(`[DATA VALIDATION] Action "${action.id}" is missing required field: target_scope`);
        }

        // Verify target_scope is valid
        if (!validScopes.includes(action.target_scope)) {
          throw new Error(`[DATA VALIDATION] Action "${action.id}" has invalid target_scope: "${action.target_scope}". Must be one of: ${validScopes.join(', ')}`);
        }

        // For user_selected: validate prompt contains {artistName} placeholder
        if (action.target_scope === 'user_selected') {
          if (!action.prompt || !action.prompt.includes('{artistName}')) {
            console.warn(`[DATA VALIDATION] Action "${action.id}" is user_selected but prompt does not contain {artistName} placeholder. Player selection may not display correctly.`);
          }

          // Recommend prompt_before_selection for user-selected meetings
          if (!action.prompt_before_selection) {
            console.info(`[DATA VALIDATION] Action "${action.id}" is user_selected but missing prompt_before_selection field. Consider adding contextual text for better UX.`);
          }
        }
      }

      console.log(`[DATA VALIDATION] All ${actions.length} actions validated successfully`);
    } catch (error) {
      console.error('[DATA VALIDATION] Action validation failed:', error);
      throw error;
    }
  }

  // Events access
  getEvents() {
    // This should return the loaded events
    return this.dataLoader.loadAllData().then(data => data.events.events);
  }

  // Phase 1: Song and Release Management Bridge Methods
  async getActiveRecordingProjects(gameId: string, dbConnection: any = null) {
    console.log('[ServerGameData] getActiveRecordingProjects called with gameId:', gameId);
    try {
      // Use provided transaction context or fall back to fresh connection
      const dbToUse = dbConnection || db;
      
      if (dbConnection) {
        console.log('[ServerGameData] Using provided transaction context');
      } else {
        console.log('[ServerGameData] Using fresh database connection');
      }
      
      console.log('[ServerGameData] Direct query for active recording projects...');
      
      // First check all projects for debugging
      const allProjects = await dbToUse.select().from(projects).where(eq(projects.gameId, gameId));
      console.log('[ServerGameData] Found', allProjects.length, 'total projects for game');
      allProjects.forEach((p: any) => {
        console.log('[ServerGameData] Project details:', {
          title: p.title, 
          type: p.type, 
          stage: p.stage,
          songCount: p.songCount,
          songsCreated: p.songsCreated,
          producerTier: p.producerTier,
          timeInvestment: p.timeInvestment,
          budgetPerSong: p.budgetPerSong,
          isProduction: p.stage === 'production',
          isRecordingType: ['Single', 'EP'].includes(p.type)
        });
      });
      
      // Debug the exact query conditions
      console.log('[ServerGameData] Query conditions for active recording projects:');
      console.log('  - gameId:', gameId);
      console.log('  - stage should be: "production"');
      console.log('  - type should be in: ["Single", "EP"]');
      
      // Now the actual query for active recording projects
      const activeProjects = await dbToUse.select().from(projects)
        .where(and(
          eq(projects.gameId, gameId),
          eq(projects.stage, 'production'),
          inArray(projects.type, ['Single', 'EP'])
        ));
      
      console.log('[ServerGameData] Direct query found active recording projects:', activeProjects.length);
      activeProjects.forEach((p: any) => {
        console.log('[ServerGameData] Active project details:', {
          id: p.id,
          title: p.title,
          type: p.type,
          stage: p.stage,
          songCount: p.songCount,
          songsCreated: p.songsCreated,
          producerTier: p.producerTier,
          timeInvestment: p.timeInvestment,
          budgetPerSong: p.budgetPerSong
        });
      });
      
      return activeProjects;
    } catch (error) {
      console.error('[ServerGameData] getActiveRecordingProjects error:', error);
      throw error;
    }
  }

  async createSong(song: any, dbConnection: any = null) {
    console.log('[ServerGameData] createSong called with:', song);
    try {
      // If we have a transaction context, use it; otherwise use storage directly
      if (dbConnection) {
        console.log('[ServerGameData] Using transaction context for createSong');
        const [createdSong] = await dbConnection.insert(songs).values(song).returning();
        console.log('[ServerGameData] Song created successfully in transaction:', createdSong.id);
        return createdSong;
      } else {
        const createdSong = await storage.createSong(song);
        console.log('[ServerGameData] Song created successfully:', createdSong.id);
        return createdSong;
      }
    } catch (error) {
      console.error('[ServerGameData] createSong error:', error);
      throw error;
    }
  }

  async getSongsByGame(gameId: string) {
    return storage.getSongsByGame(gameId);
  }

  async getSongsByArtist(artistId: string, gameId: string, dbTransaction?: any) {
    console.log('[ServerGameData] getSongsByArtist called with:', { artistId, gameId, transaction: !!dbTransaction });
    try {
      // Engine-verbs M1b: optional tx pass-through so spawn_release's
      // 'latest_recorded' read sees songs created earlier in the same week
      // transaction (storage.getSongsByArtist was already tx-aware).
      const songs = await storage.getSongsByArtist(artistId, gameId, dbTransaction);
      console.log('[ServerGameData] getSongsByArtist returned:', songs?.length || 0, 'songs');
      return songs;
    } catch (error) {
      console.error('[ServerGameData] getSongsByArtist error:', error);
      throw error;
    }
  }

  async createRelease(release: any, dbConnection: any = null) {
    // Engine-verbs M1b: transaction-aware, mirroring createSong above — inside the
    // one-transaction week (D6) the insert MUST ride the week transaction (the
    // game row is locked FOR UPDATE; an out-of-tx insert with an FK to it would
    // block until commit).
    if (dbConnection) {
      const [createdRelease] = await dbConnection.insert(releases).values(release).returning();
      return createdRelease;
    }
    return storage.createRelease(release);
  }

  async getReleasesByGame(gameId: string, dbTransaction?: any) {
    console.log('[ServerGameData] 📦 getReleasesByGame called');
    console.log('[ServerGameData] 🎮 Game ID:', gameId);
    console.log('[ServerGameData] 💾 Transaction available:', !!dbTransaction);
    
    try {
      const releases = await storage.getReleasesByGame(gameId, dbTransaction);
      console.log('[ServerGameData] 📋 Total releases found:', releases?.length || 0);
      
      // Log releases with lead single strategies
      const releasesWithLeadSingles = releases?.filter((r: any) => r.metadata?.leadSingleStrategy) || [];
      console.log('[ServerGameData] 🎵 Releases with lead singles:', releasesWithLeadSingles.length);
      
      if (releasesWithLeadSingles.length > 0) {
        console.log('[ServerGameData] 🎯 Lead single details:');
        releasesWithLeadSingles.forEach((r: any) => {
          console.log(`  - "${r.title}":`, {
            releaseId: r.id,
            releaseWeek: r.releaseWeek,
            leadSingleWeek: r.metadata.leadSingleStrategy.leadSingleReleaseWeek,
            leadSingleId: r.metadata.leadSingleStrategy.leadSingleId
          });
        });
      }
      
      return releases;
    } catch (error) {
      console.error('[ServerGameData] ❌ getReleasesByGame error:', error);
      throw error;
    }
  }

  async getPlannedReleases(gameId: string, week: number, dbTransaction?: any) {
    console.log('[ServerGameData] getPlannedReleases called for gameId:', gameId, 'week:', week, 'transaction:', !!dbTransaction);
    try {
      const plannedReleases = await storage.getPlannedReleases(gameId, week, dbTransaction);
      console.log('[ServerGameData] getPlannedReleases returned:', plannedReleases?.length || 0, 'planned releases');
      return plannedReleases;
    } catch (error) {
      console.error('[ServerGameData] getPlannedReleases error:', error);
      throw error;
    }
  }

  async getSongsByRelease(releaseId: string, dbTransaction?: any) {
    console.log('[ServerGameData] 🎵 getSongsByRelease called');
    console.log('[ServerGameData] 📀 Release ID:', releaseId);
    console.log('[ServerGameData] 💾 Transaction available:', !!dbTransaction);
    
    try {
      const songs = await storage.getSongsByRelease(releaseId, dbTransaction);
      console.log('[ServerGameData] 📋 Songs found:', songs?.length || 0);
      
      if (songs && songs.length > 0) {
        console.log('[ServerGameData] 🎶 Song details:');
        songs.forEach((song: any, index: number) => {
          console.log(`  Song #${index + 1}:`, {
            id: song.id,
            title: song.title,
            quality: song.quality,
            isReleased: song.isReleased,
            releaseWeek: song.releaseWeek,
            totalStreams: song.totalStreams || 0,
            totalRevenue: song.totalRevenue || 0
          });
        });
      }
      
      return songs;
    } catch (error) {
      console.error('[ServerGameData] ❌ getSongsByRelease error:', error);
      throw error;
    }
  }

  async updateReleaseStatus(releaseId: string, status: string, metadata?: any, dbTransaction?: any) {
    console.log('[ServerGameData] updateReleaseStatus called for release:', releaseId, 'status:', status, 'transaction:', !!dbTransaction);
    try {
      const result = await storage.updateReleaseStatus(releaseId, status, metadata, dbTransaction);
      console.log('[ServerGameData] updateReleaseStatus completed');
      return result;
    } catch (error) {
      console.error('[ServerGameData] updateReleaseStatus error:', error);
      throw error;
    }
  }

  async getReleasedSongs(gameId: string) {
    console.log('[ServerGameData] getReleasedSongs called with gameId:', gameId);
    try {
      const releasedSongs = await storage.getReleasedSongs(gameId);
      console.log('[ServerGameData] getReleasedSongs returned:', releasedSongs?.length || 0, 'released songs');
      return releasedSongs;
    } catch (error) {
      console.error('[ServerGameData] getReleasedSongs error:', error);
      throw error;
    }
  }

  async updateSongs(songUpdates: any[], dbTransaction?: any) {
    console.log('[ServerGameData] 🎯🎯🎯 === UPDATESONGS CALLED === 🎯🎯🎯');
    console.log('[ServerGameData] 📦 Number of updates:', songUpdates.length);
    console.log('[ServerGameData] 💾 Transaction available:', !!dbTransaction);
    console.log('[ServerGameData] 🎵 Songs being updated:');
    
    songUpdates.forEach((update, index) => {
      console.log(`[ServerGameData] Song #${index + 1}:`, {
        songId: update.songId,
        isReleased: update.isReleased,
        releaseWeek: update.releaseWeek,
        initialStreams: update.initialStreams,
        totalStreams: update.totalStreams,
        totalRevenue: update.totalRevenue,
        isLeadSingleUpdate: update.releaseWeek && update.isReleased === true
      });
    });
    
    try {
      const result = await storage.updateSongs(songUpdates, dbTransaction);
      console.log('[ServerGameData] ✅ updateSongs completed successfully');
      return result;
    } catch (error) {
      console.error('[ServerGameData] ❌ updateSongs FAILED:', error);
      throw error;
    }
  }


  async getSongsByProject(projectId: string) {
    console.log('[ServerGameData] getSongsByProject called for project:', projectId);
    try {
      const songs = await storage.getSongsByProject(projectId);
      console.log('[ServerGameData] getSongsByProject returned:', songs?.length || 0, 'songs');
      return songs;
    } catch (error) {
      console.error('[ServerGameData] getSongsByProject error:', error);
      throw error;
    }
  }

  async createReleaseSong(releaseSong: any, dbConnection: any = null) {
    // Engine-verbs M1b: transaction-aware, mirroring createSong/createRelease.
    if (dbConnection) {
      const [createdReleaseSong] = await dbConnection.insert(releaseSongs).values(releaseSong).returning();
      return createdReleaseSong;
    }
    return storage.createReleaseSong(releaseSong);
  }

  async getArtistById(artistId: string) {
    return storage.getArtist(artistId);
  }

  async updateProject(projectId: string, updates: any, dbConnection: any = null) {
    console.log('[ServerGameData] updateProject called with:', { projectId, updates });
    try {
      // If we have a transaction context, use it; otherwise use storage directly
      if (dbConnection) {
        console.log('[ServerGameData] Using transaction context for updateProject');
        const [updatedProject] = await dbConnection.update(projects)
          .set(updates)
          .where(eq(projects.id, projectId))
          .returning();
        console.log('[ServerGameData] Project updated successfully in transaction');
        return updatedProject;
      } else {
        const updatedProject = await storage.updateProject(projectId, updates);
        console.log('[ServerGameData] Project updated successfully');
        return updatedProject;
      }
    } catch (error) {
      console.error('[ServerGameData] updateProject error:', error);
      throw error;
    }
  }

  async getProjectsByStage(gameId: string, stage: string, dbConnection: any = null): Promise<any[]> {
    console.log(`[ServerGameData] Getting projects by stage: ${stage} for game: ${gameId}`);
    try {
      const dbContext = dbConnection || db;
      const stageProjects = await dbContext.select()
        .from(projects)
        .where(and(eq(projects.gameId, gameId), eq(projects.stage, stage)));
      
      console.log(`[ServerGameData] Found ${stageProjects.length} projects in ${stage} stage`);
      return stageProjects;
    } catch (error) {
      console.error('[ServerGameData] getProjectsByStage error:', error);
      throw error;
    }
  }

  async getNewlyReleasedProjects(gameId: string, currentWeek: number, dbConnection: any = null): Promise<any[]> {
    console.log(`[ServerGameData] Getting newly released projects for game: ${gameId}, week: ${currentWeek}`);
    try {
      const dbContext = dbConnection || db;
      
      // Get all projects in "released" stage and check metadata for release week
      const releasedProjects = await dbContext.select()
        .from(projects)
        .where(and(eq(projects.gameId, gameId), eq(projects.stage, 'released')));
      
      // Filter to only projects that were released this week
      // Projects track their release week in metadata
      const newlyReleased = releasedProjects.filter((project: any) => {
        const metadata = project.metadata as any;
        const releaseWeek = metadata?.releaseWeek || metadata?.release_week;
        return releaseWeek === currentWeek;
      });
      
      console.log(`[ServerGameData] Found ${newlyReleased.length} newly released projects for week ${currentWeek}`);
      return newlyReleased;
    } catch (error) {
      console.error('[ServerGameData] getNewlyReleasedProjects error:', error);
      throw error;
    }
  }

  async updateSong(songId: string, updates: any, dbConnection: any = null) {
    console.log('[ServerGameData] updateSong called with:', { songId, updates });
    try {
      const dbContext = dbConnection || db;
      const [updatedSong] = await dbContext.update(songs)
        .set(updates)
        .where(eq(songs.id, songId))
        .returning();
      
      console.log('[ServerGameData] Song updated successfully');
      return updatedSong;
    } catch (error) {
      console.error('[ServerGameData] updateSong error:', error);
      throw error;
    }
  }

  // Validation helpers
  async validateChoiceEffects(effects: ChoiceEffect): Promise<boolean> {
    await this.initialize();
    return this.dataLoader.validateChoiceEffects(effects);
  }

  // Data integrity checks
  async validateDataIntegrity(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      await this.initialize();
      
      // Check all data files are loaded
      const data = await this.getFullGameData();
      
      if (!data.artists?.artists?.length) {
        errors.push('No artists data found');
      }
      
      if (!data.roles?.roles?.length) {
        errors.push('No roles data found');
      }
      
      if (!data.events?.events?.length) {
        errors.push('No events data found');
      }
      
      // Check for required roles
      const requiredRoles = ['manager', 'anr', 'producer', 'pr', 'digital', 'streaming', 'booking', 'ops'];
      const roleIds = data.roles.roles.map(role => role.id);
      
      for (const requiredRole of requiredRoles) {
        if (!roleIds.includes(requiredRole)) {
          errors.push(`Missing required role: ${requiredRole}`);
        }
      }
      
      // Check each role has meetings
      for (const role of data.roles.roles) {
        if (!role.meetings || role.meetings.length === 0) {
          errors.push(`Role ${role.id} has no meetings defined`);
        }
      }
      
      return { valid: errors.length === 0, errors };
    } catch (error) {
      errors.push(`Data validation failed: ${error}`);
      return { valid: false, errors };
    }
  }
}

// Export singleton instance
export const serverGameData = ServerGameData.getInstance();

// Export individual functions for convenient access
export const {
  initialize: initializeGameData,
  getAllArtists,
  getAllRoles,
  getAllEvents,
  getBalanceConfig,
  getWorldConfig,
  getRoleById,
  getEventById,
  // PHASE 3 MIGRATION: Removed exports for methods moved to GameEngine
  // calculateProjectCost - REMOVED (unused)
  // calculateStreamingOutcome - REMOVED (moved to GameEngine)
  shouldTriggerSideEvent,
  validateDataIntegrity
} = serverGameData;