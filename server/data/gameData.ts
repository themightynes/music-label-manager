import { gameDataLoader } from '../../shared/utils/dataLoader';
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
      
      await this.dataLoader.loadAllData();
      
      // Cache balance data for sync methods
      const fullData = await this.dataLoader.loadAllData();
      this.balanceData = fullData.balance;
      
      const loadTime = Date.now() - startTime;
      console.log(`Game data loaded successfully in ${loadTime}ms`);
      
      this.initialized = true;
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

  async getStartingMoney(): Promise<number> {
    const balance = await this.getBalanceConfig();
    return balance.economy.starting_money;
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

  // Game balance calculations
  async calculateProjectCost(projectType: string, quality: number = 50): Promise<number> {
    const costs = await this.getProjectCosts(projectType);
    const balance = await this.getBalanceConfig();
    
    const baseCost = costs.min + ((costs.max - costs.min) * (quality / 100));
    const qualityMultiplier = balance.economy.project_costs[projectType.toLowerCase()]?.quality_multiplier || 1;
    
    return Math.floor(baseCost * qualityMultiplier);
  }

  async calculateStreamingOutcome(
    quality: number, 
    playlistAccess: string, 
    reputation: number, 
    adSpend: number
  ): Promise<number> {
    const balance = await this.getBalanceConfig();
    const formulas = balance.market_formulas.streaming_calculation;
    
    let baseStreams = quality * 100;
    
    // Get playlist access multiplier
    const playlistTier = balance.access_tier_system.playlist_access[playlistAccess.toLowerCase()];
    const playlistMultiplier = playlistTier?.reach_multiplier || 0.1;
    
    // Calculate reputation and ad boost
    const reputationBoost = reputation / 100;
    const adBoost = Math.sqrt(adSpend) / 100;
    
    // Apply variance
    const variance = balance.economy.rng_variance;
    const rngFactor = variance[0] + (Math.random() * (variance[1] - variance[0]));
    
    return Math.floor(baseStreams * playlistMultiplier * (1 + reputationBoost + adBoost) * rngFactor);
  }

  async shouldTriggerSideEvent(month: number): Promise<boolean> {
    const balance = await this.getBalanceConfig();
    const chance = balance.side_events.monthly_chance;
    return Math.random() < chance;
  }

  // Missing methods required by GameEngine
  async getStreamingConfig() {
    const balance = await this.getBalanceConfig();
    const streaming = balance.market_formulas.streaming_calculation;
    return {
      quality_weight: streaming?.quality_weight || 0.35,
      playlist_weight: streaming?.playlist_weight || 0.25,
      reputation_weight: streaming?.reputation_weight || 0.20,
      marketing_weight: streaming?.marketing_weight || 0.20,
      first_week_multiplier: streaming?.first_week_multiplier || 2.5,
      base_streams_per_point: 1000
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
      sell_through_base: tour?.sell_through_base || 0.60,
      reputation_modifier: tour?.reputation_modifier || 0.003,
      local_popularity_weight: tour?.local_popularity_weight || 0.40,
      merch_percentage: tour?.merch_percentage || 0.15,
      ticket_price_base: 30,
      ticket_price_per_capacity: 0.01
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
        major: { 
          threshold: access.playlist_access.flagship.threshold, 
          reach_multiplier: access.playlist_access.flagship.reach_multiplier, 
          description: "Major playlist access" 
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
        major: { 
          threshold: access.press_access.national.threshold, 
          pickup_chance: access.press_access.national.pickup_chance, 
          description: "Major publication access" 
        }
      },
      venue_access: {
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
        },
        stadiums: { 
          threshold: 80, 
          capacity_range: [15000, 50000], 
          description: "Stadiums and festivals" 
        }
      }
    };
  }

  async getEventConfig() {
    const balance = await this.getBalanceConfig();
    const events = balance.side_events;
    return {
      monthly_chance: events?.monthly_chance || 0.20,
      cooldown_months: events?.event_cooldown || 2,
      max_per_year: events?.max_events_per_month * 12 || 12
    };
  }

  async getMonthlyBurnRange(): Promise<[number, number]> {
    const balance = await this.getBalanceConfig();
    const burnRange = balance.economy.monthly_burn_base;
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
        base_streams_per_point: 1000
      };
    }
    
    const streaming = this.balanceData.market_formulas.streaming_calculation;
    return {
      quality_weight: streaming.quality_weight,
      playlist_weight: streaming.playlist_weight,
      reputation_weight: streaming.reputation_weight,
      marketing_weight: streaming.marketing_weight,
      first_week_multiplier: streaming.first_week_multiplier,
      base_streams_per_point: 1000
    };
  }

  getPressConfigSync() {
    if (!this.balanceData) {
      return {
        base_chance: 0.15,
        pr_spend_modifier: 0.001,
        reputation_modifier: 0.008,
        story_flag_bonus: 0.30,
        max_pickups_per_release: 8
      };
    }
    
    const press = this.balanceData.market_formulas.press_coverage;
    return {
      base_chance: press.base_chance,
      pr_spend_modifier: press.pr_spend_modifier,
      reputation_modifier: press.reputation_modifier,
      story_flag_bonus: press.story_flag_bonus,
      max_pickups_per_release: press.max_pickups_per_release
    };
  }

  // Alias for GameEngine compatibility
  getPressCoverageConfigSync() {
    return this.getPressConfigSync();
  }

  getTourConfigSync() {
    if (!this.balanceData) {
      return {
        sell_through_base: 0.60,
        reputation_modifier: 0.003,
        local_popularity_weight: 0.40,
        merch_percentage: 0.15,
        ticket_price_base: 30,
        ticket_price_per_capacity: 0.01
      };
    }
    
    const tour = this.balanceData.market_formulas.tour_revenue;
    return {
      sell_through_base: tour.sell_through_base,
      reputation_modifier: tour.reputation_modifier,
      local_popularity_weight: tour.local_popularity_weight,
      merch_percentage: tour.merch_percentage,
      ticket_price_base: 30,
      ticket_price_per_capacity: 0.01
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
          major: { threshold: 60, reach_multiplier: 1.5, description: "Major playlist access" }
        },
        press_access: {
          none: { threshold: 0, pickup_chance: 0.05, description: "No press contacts" },
          blogs: { threshold: 8, pickup_chance: 0.25, description: "Music blog access" },
          mid_tier: { threshold: 25, pickup_chance: 0.60, description: "Mid-tier publication access" },
          major: { threshold: 50, pickup_chance: 0.85, description: "Major publication access" }
        },
        venue_access: {
          clubs: { threshold: 5, capacity_range: [50, 500], description: "Small clubs and bars" },
          theaters: { threshold: 20, capacity_range: [500, 2000], description: "Theaters and mid-size venues" },
          arenas: { threshold: 45, capacity_range: [2000, 20000], description: "Arenas and large venues" },
          stadiums: { threshold: 80, capacity_range: [15000, 50000], description: "Stadiums and festivals" }
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
        monthly_chance: 0.20,
        cooldown_months: 2,
        max_per_year: 12
      };
    }
    
    const events = this.balanceData.side_events;
    return {
      monthly_chance: events.monthly_chance,
      cooldown_months: events.event_cooldown,
      max_per_year: events.max_events_per_month * 12
    };
  }

  getMonthlyBurnRangeSync(): [number, number] {
    if (!this.balanceData) {
      return [3000, 6000];
    }
    
    const burnRange = this.balanceData.economy.monthly_burn_base;
    return [burnRange[0], burnRange[1]];
  }

  getProgressionThresholdsSync() {
    if (!this.balanceData) {
      return {
        second_artist_reputation: 10,
        fourth_focus_slot_reputation: 18,
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

  // Events access
  getEvents() {
    // This should return the loaded events
    return this.dataLoader.loadAllData().then(data => data.events.events);
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
  calculateProjectCost,
  calculateStreamingOutcome,
  shouldTriggerSideEvent,
  validateDataIntegrity
} = serverGameData;