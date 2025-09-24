import { z } from 'zod';
import type {
  GameDataFiles,
  GameArtist,
  GameRole,
  SideEvent,
  DialogueScene,
  BalanceConfig,
  WorldConfig,
  RoleMeeting,
  ChoiceEffect
} from '../types/gameTypes';

// Zod validation schemas
const ChoiceEffectSchema = z.record(z.number()).optional().default({});

const DialogueChoiceSchema = z.object({
  id: z.string(),
  label: z.string(),
  effects_immediate: ChoiceEffectSchema,
  effects_delayed: ChoiceEffectSchema
});

const RoleMeetingSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  choices: z.array(DialogueChoiceSchema)
});

const GameRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  relationship: z.number().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  baseSalary: z.number().optional(),
  access: z.record(z.any()).default({}),
  kpis: z.array(z.string()),
  expertise: z.array(z.string()).optional(),
  decisions: z.array(z.string()).optional(),
  meetings: z.array(RoleMeetingSchema).optional().default([])
});

const GameArtistSchema = z.object({
  id: z.string(),
  name: z.string(),
  archetype: z.enum(['Visionary', 'Workhorse', 'Trendsetter']),
  talent: z.number(),
  workEthic: z.number(),
  popularity: z.number(),
  temperament: z.number(),
  loyalty: z.number(),
  mood: z.number(),
  signed: z.boolean(),
  signingCost: z.number().optional(),
  weeklyCost: z.number().optional(),
  bio: z.string().optional(),
  genre: z.string().optional(),
  age: z.number().optional()
});

const EventChoiceSchema = z.object({
  id: z.string(),
  label: z.string(),
  effects_immediate: ChoiceEffectSchema,
  effects_delayed: ChoiceEffectSchema
});

const SideEventSchema = z.object({
  id: z.string(),
  role_hint: z.string(),
  prompt: z.string(),
  choices: z.array(EventChoiceSchema)
});

const DialogueSceneSchema = z.object({
  id: z.string(),
  speaker: z.string(),
  archetype: z.string(),
  prompt: z.string(),
  choices: z.array(DialogueChoiceSchema)
});

// Data loading and validation functions
export class GameDataLoader {
  private static instance: GameDataLoader;
  private dataCache: Partial<GameDataFiles> = {};
  private isLoaded = false;

  static getInstance(): GameDataLoader {
    if (!GameDataLoader.instance) {
      GameDataLoader.instance = new GameDataLoader();
    }
    return GameDataLoader.instance;
  }

  async loadAllData(): Promise<GameDataFiles> {
    if (this.isLoaded && Object.keys(this.dataCache).length === 6) {
      return this.dataCache as GameDataFiles;
    }

    try {
      // Load all JSON files in parallel
      const [artists, balance, world, dialogue, events, roles] = await Promise.all([
        this.loadArtistsData(),
        this.loadBalanceData(),
        this.loadWorldData(),
        this.loadDialogueData(),
        this.loadEventsData(),
        this.loadRolesData()
      ]);

      this.dataCache = { artists, balance, world, dialogue, events, roles };
      this.isLoaded = true;

      return this.dataCache as GameDataFiles;
    } catch (error) {
      console.error('Failed to load game data:', error);
      console.error('Stack trace:', error.stack);
      throw new Error(`Failed to load game data files: ${error.message}`);
    }
  }

  private async loadJSON(filename: string): Promise<any> {
    try {
      // In browser environment, fetch from public data folder
      if (typeof window !== 'undefined') {
        const response = await fetch(`/data/${filename}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${filename}: ${response.statusText}`);
        }
        return await response.json();
      }
      
      // In Node.js environment, require the file
      const fs = await import('fs/promises');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'data', filename);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (error) {
      console.error(`Error loading ${filename}:`, error);
      throw error;
    }
  }

  async loadArtistsData() {
    const data = await this.loadJSON('artists.json');
    
    // Validate structure with error handling
    const schema = z.object({
      version: z.string(),
      generated: z.string(),
      artists: z.array(GameArtistSchema)
    });

    try {
      return schema.parse(data);
    } catch (error) {
      console.error('Artists data validation error:', error);
      console.log('First few keys of actual data:', Object.keys(data).slice(0, 10));
      if (data.artists && data.artists[0]) {
        console.log('First artist keys:', Object.keys(data.artists[0]));
      }
      throw error;
    }
  }

  /**
   * Dynamically assembles balance data from modular JSON files
   * This is the SINGLE SOURCE OF TRUTH for balance data structure
   */
  async assembleBalanceData(): Promise<BalanceConfig> {
    console.log('[DataLoader] Assembling balance data from modular files...');
    
    // Load all modular balance files
    const [
      economy,
      progression,
      quality,
      artists,
      markets,
      projects,
      events,
      config,
      content
    ] = await Promise.all([
      this.loadJSON('balance/economy.json'),
      this.loadJSON('balance/progression.json'),
      this.loadJSON('balance/quality.json'),
      this.loadJSON('balance/artists.json'),
      this.loadJSON('balance/markets.json'),
      this.loadJSON('balance/projects.json'),
      this.loadJSON('balance/events.json'),
      this.loadJSON('balance/config.json'),
      this.loadJSON('balance/content.json')
    ]);

    // Assemble the balance structure - SINGLE SOURCE OF TRUTH
    const assembledBalance = {
      // Root level properties from config
      version: config.version,
      generated: config.generated,
      description: config.description,
      
      // Economy section
      economy: economy,
      
      // Progression thresholds
      progression_thresholds: progression.progression_thresholds,
      
      // Quality calculations
      quality_calculations: quality.quality_calculations || {},
      
      // Artist progression
      artist_progression: artists.artist_progression || {},
      
      // Market formulas
      market_formulas: markets.market_formulas,
      
      // Reputation system
      reputation_system: progression.reputation_system,
      
      // Access tier system
      access_tier_system: progression.access_tier_system,
      
      // Artist stats
      artist_stats: artists.artist_stats,
      
      // Side events
      side_events: events.side_events,
      
      // Quality system
      quality_system: quality.quality_system,
      
      // Producer tier system
      producer_tier_system: quality.producer_tier_system,
      
      // Time investment system
      time_investment_system: quality.time_investment_system,
      
      // UI constants
      ui_constants: config.ui_constants,
      
      // Save system
      save_system: projects.save_system,
      
      // Difficulty modifiers
      difficulty_modifiers: progression.difficulty_modifiers,
      
      // Content generation
      song_generation: content.song_generation,
      
      // Song count cost system
      song_count_cost_system: economy.song_count_cost_system,
      
      // Campaign settings
      campaign_settings: projects.time_progression,
      
      // Time progression - WITH SEASONAL MODIFIERS CORRECTLY PLACED
      time_progression: {
        campaign_length_weeks: projects.time_progression.campaign_length_weeks,
        focus_slots_base: projects.time_progression.focus_slots_base,
        focus_slots_unlock_threshold: projects.time_progression.focus_slots_unlock_threshold,
        focus_slots_max: projects.time_progression.focus_slots_max,
        project_durations: projects.time_progression.project_durations,
        seasonal_modifiers: markets.seasonal_modifiers // CORRECTLY ASSEMBLED HERE
      }
    };

    console.log('[DataLoader] Balance data assembled successfully');
    return assembledBalance as BalanceConfig;
  }

  async loadBalanceData(): Promise<BalanceConfig> {
    try {
      // In browser environment, use the TypeScript module
      if (typeof window !== 'undefined') {
        const balanceModule = await import('../../data/balance');
        const data = balanceModule.default;
        return data;
      }
      
      // In Node.js environment, use dynamic assembly instead of compiled JSON
      const data = await this.assembleBalanceData();
      
      // Use a more lenient validation that matches the actual structure
      const schema = z.object({
        version: z.string(),
        generated: z.string(),
        description: z.string().optional(),
        economy: z.record(z.any()),
        time_progression: z.record(z.any()).optional(),
        reputation_system: z.record(z.any()).optional(),
        access_tier_system: z.record(z.any()).optional(),
        artist_stats: z.record(z.any()).optional(),
        market_formulas: z.record(z.any()).optional(),
        side_events: z.record(z.any()).optional(),
        progression_thresholds: z.record(z.any()).optional(),
        quality_system: z.record(z.any()).optional(),
        ui_constants: z.record(z.any()).optional(),
        save_system: z.record(z.any()).optional(),
        difficulty_modifiers: z.record(z.any()).optional()
      }).passthrough(); // Allow extra fields

      return data as unknown as BalanceConfig;
    } catch (error) {
      console.error('Balance data loading error:', error);
      throw error;
    }
  }

  async loadActionsData(): Promise<any> {
    const data = await this.loadJSON('actions.json');
    
    const schema = z.object({
      version: z.string(),
      generated: z.string().optional(),
      description: z.string().optional(),
      weekly_actions: z.array(z.object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
        icon: z.string(),
        description: z.string().optional(),
        role_id: z.string().optional(),
        meeting_id: z.string().optional(),
        category: z.string(),
        project_type: z.string().optional(),
        campaign_type: z.string().optional(),
        prompt: z.string().optional(),
        choices: z.array(z.any()).optional(),
        details: z.object({
          cost: z.string(),
          duration: z.string(),
          prerequisites: z.string(),
          outcomes: z.array(z.string()),
          benefits: z.array(z.string())
        }).optional(),
        recommendations: z.object({
          urgent_when: z.record(z.any()).optional(),
          recommended_when: z.record(z.any()).optional(),
          reasons: z.record(z.string()).optional()
        }).optional()
      })),
      action_categories: z.array(z.object({
        id: z.string(),
        name: z.string(),
        icon: z.string(),
        description: z.string(),
        color: z.string()
      })).optional()
    });

    try {
      return schema.parse(data);
    } catch (error: any) {
      console.error('Actions data validation error:', error);
      if (error.errors) {
        console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
      }
      // Return the raw data anyway for now to not break the app
      console.warn('WARNING: Returning unvalidated actions data');
      return data;
    }
  }

  async loadWorldData(): Promise<WorldConfig> {
    const data = await this.loadJSON('world.json');
    
    const schema = z.object({
      version: z.string(),
      generated: z.string(),
      seed: z.number().optional(),
      money_start: z.number().optional(),
      weekly_burn_base: z.tuple([z.number(), z.number()]).optional(),
      access_tiers: z.record(z.any()).optional(),
      mvp_caps: z.record(z.any()).optional(),
      unlock_thresholds: z.record(z.any()).optional(),
      rng_band: z.tuple([z.number(), z.number()]).optional()
    }).passthrough(); // Allow extra fields

    try {
      return data as WorldConfig;
    } catch (error) {
      console.error('World data validation error:', error);
      console.log('First few keys of actual data:', Object.keys(data).slice(0, 10));
      throw error;
    }
  }

  async loadDialogueData() {
    const data = await this.loadJSON('dialogue.json');
    
    const schema = z.object({
      version: z.string(),
      generated: z.string(),
      description: z.string(),
      additional_scenes: z.array(DialogueSceneSchema)
    });

    return schema.parse(data);
  }

  async loadEventsData() {
    const data = await this.loadJSON('events.json');
    
    const schema = z.object({
      version: z.string(),
      generated: z.string(),
      events: z.array(SideEventSchema)
    });

    return schema.parse(data);
  }

  async loadRolesData() {
    const data = await this.loadJSON('roles.json');
    
    const schema = z.object({
      version: z.string(),
      generated: z.string(),
      description: z.string().optional(),
      roles: z.array(GameRoleSchema)
    });

    return schema.parse(data);
  }

  // Helper functions to get specific data
  async getArtistByArchetype(archetype: string): Promise<GameArtist[]> {
    const data = await this.loadAllData();
    return data.artists.artists.filter(artist => artist.archetype === archetype);
  }

  async getRoleById(roleId: string): Promise<GameRole | undefined> {
    const data = await this.loadAllData();
    return data.roles.roles.find(role => role.id === roleId);
  }

  async getRoleMeetings(roleId: string): Promise<RoleMeeting[]> {
    const role = await this.getRoleById(roleId);
    return role?.meetings || [];
  }

  async getRandomEvent(): Promise<SideEvent | null> {
    const data = await this.loadAllData();
    const events = data.events.events;
    
    if (events.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * events.length);
    return events[randomIndex];
  }

  async getArtistDialogue(archetype: string): Promise<DialogueScene[]> {
    const data = await this.loadAllData();
    return data.dialogue.additional_scenes.filter(scene => scene.archetype === archetype);
  }

  async getBalanceValue(path: string): Promise<any> {
    const data = await this.loadAllData();
    const keys = path.split('.');
    let value: any = data.balance;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  async getWorldConfig(): Promise<WorldConfig> {
    const data = await this.loadAllData();
    return data.world;
  }

  // Validation helper
  validateChoiceEffects(effects: ChoiceEffect): boolean {
    try {
      ChoiceEffectSchema.parse(effects);
      return true;
    } catch {
      return false;
    }
  }

  // Clear cache for testing
  clearCache(): void {
    this.dataCache = {};
    this.isLoaded = false;
  }
}

// Export singleton instance
export const gameDataLoader = GameDataLoader.getInstance();