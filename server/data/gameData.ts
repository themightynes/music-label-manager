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
import { projects, songs } from '../../shared/schema';
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

  // Monthly actions data access
  async getMonthlyActions(): Promise<any[]> {
    await this.initialize();
    try {
      const actionsData = await this.dataLoader.loadActionsData();
      return actionsData.monthly_actions || [];
    } catch (error) {
      console.error('Failed to load actions data:', error);
      return [];
    }
  }

  // Get monthly actions with categories
  async getMonthlyActionsWithCategories(): Promise<{ actions: any[], categories: any[] }> {
    await this.initialize();
    try {
      const actionsData = await this.dataLoader.loadActionsData();
      return {
        actions: actionsData.monthly_actions || [],
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
      const actions = await this.getMonthlyActions();
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

  async getStartingMoney(): Promise<number> {
    const balance = await this.getBalanceConfig();
    return balance.economy.starting_money;
  }

  async getStartingReputation(): Promise<number> {
    const balance = await this.getBalanceConfig();
    return balance.reputation_system.starting_reputation;
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

  // PHASE 3 MIGRATION: Removed duplicate calculation methods
  // calculateProjectCost() - REMOVED (unused)
  // calculateStreamingOutcome() - REMOVED (GameEngine has correct implementation)

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
        base_streams_per_point: 1000,
        ongoing_streams: {
          monthly_decay_rate: 0.85,
          revenue_per_stream: 0.003,
          ongoing_factor: 0.1,
          reputation_bonus_factor: 0.002,
          access_tier_bonus_factor: 0.1,
          minimum_revenue_threshold: 1,
          max_decay_months: 24
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
      base_streams_per_point: 1000,
      star_power_amplification: streaming.star_power_amplification,
      ongoing_streams: streaming.ongoing_streams
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

  // Producer Tier System Access
  getProducerTierSystemSync() {
    if (!this.balanceData) {
      return {
        local: { multiplier: 1.0, unlock_rep: 0, quality_bonus: 0, description: "Local producers" },
        regional: { multiplier: 1.8, unlock_rep: 15, quality_bonus: 5, description: "Regional producers" },
        national: { multiplier: 3.2, unlock_rep: 35, quality_bonus: 12, description: "National producers" },
        legendary: { multiplier: 5.5, unlock_rep: 60, quality_bonus: 20, description: "Legendary producers" }
      };
    }
    
    return this.balanceData.producer_tier_system;
  }

  // Time Investment System Access
  getTimeInvestmentSystemSync() {
    if (!this.balanceData) {
      return {
        rushed: { multiplier: 0.7, duration_modifier: 0.8, quality_bonus: -10, description: "Rushed production" },
        standard: { multiplier: 1.0, duration_modifier: 1.0, quality_bonus: 0, description: "Standard production" },
        extended: { multiplier: 1.4, duration_modifier: 1.3, quality_bonus: 8, description: "Extended production" },
        perfectionist: { multiplier: 2.1, duration_modifier: 1.6, quality_bonus: 15, description: "Perfectionist production" }
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

  async getSongsByArtist(artistId: string, gameId: string) {
    console.log('[ServerGameData] getSongsByArtist called with:', { artistId, gameId });
    try {
      const songs = await storage.getSongsByArtist(artistId, gameId);
      console.log('[ServerGameData] getSongsByArtist returned:', songs?.length || 0, 'songs');
      return songs;
    } catch (error) {
      console.error('[ServerGameData] getSongsByArtist error:', error);
      throw error;
    }
  }

  async createRelease(release: any) {
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
            releaseMonth: r.releaseMonth,
            leadSingleMonth: r.metadata.leadSingleStrategy.leadSingleReleaseMonth,
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

  async getPlannedReleases(gameId: string, month: number, dbTransaction?: any) {
    console.log('[ServerGameData] getPlannedReleases called for gameId:', gameId, 'month:', month, 'transaction:', !!dbTransaction);
    try {
      const plannedReleases = await storage.getPlannedReleases(gameId, month, dbTransaction);
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
            releaseMonth: song.releaseMonth,
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
        releaseMonth: update.releaseMonth,
        initialStreams: update.initialStreams,
        totalStreams: update.totalStreams,
        totalRevenue: update.totalRevenue,
        isLeadSingleUpdate: update.releaseMonth && update.isReleased === true
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

  async createReleaseSong(releaseSong: any) {
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

  async getNewlyReleasedProjects(gameId: string, currentMonth: number, dbConnection: any = null): Promise<any[]> {
    console.log(`[ServerGameData] Getting newly released projects for game: ${gameId}, month: ${currentMonth}`);
    try {
      const dbContext = dbConnection || db;
      
      // Get all projects in "released" stage and check metadata for release month
      const releasedProjects = await dbContext.select()
        .from(projects)
        .where(and(eq(projects.gameId, gameId), eq(projects.stage, 'released')));
      
      // Filter to only projects that were released this month
      // Projects track their release month in metadata
      const newlyReleased = releasedProjects.filter((project: any) => {
        const metadata = project.metadata as any;
        const releaseMonth = metadata?.releaseMonth || metadata?.release_month;
        return releaseMonth === currentMonth;
      });
      
      console.log(`[ServerGameData] Found ${newlyReleased.length} newly released projects for month ${currentMonth}`);
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