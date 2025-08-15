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
  relationship: z.number(),
  access: z.record(z.any()).default({}),
  kpis: z.array(z.string()),
  meetings: z.array(RoleMeetingSchema)
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
  signed: z.boolean()
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
      throw new Error('Failed to load game data files');
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
    
    // Validate structure
    const schema = z.object({
      version: z.string(),
      generated: z.string(),
      artists: z.array(GameArtistSchema)
    });

    return schema.parse(data);
  }

  async loadBalanceData(): Promise<BalanceConfig> {
    const data = await this.loadJSON('balance.json');
    
    // Basic validation - full schema would be very large
    const schema = z.object({
      version: z.string(),
      generated: z.string(),
      description: z.string(),
      economy: z.object({
        starting_money: z.number(),
        monthly_burn_base: z.tuple([z.number(), z.number()]),
        bankruptcy_threshold: z.number(),
        rng_variance: z.tuple([z.number(), z.number()]),
        project_costs: z.record(z.any()),
        marketing_costs: z.record(z.any()),
        talent_costs: z.record(z.any())
      }),
      time_progression: z.record(z.any()),
      reputation_system: z.record(z.any()),
      access_tier_system: z.record(z.any()),
      artist_stats: z.record(z.any()),
      market_formulas: z.record(z.any()),
      side_events: z.record(z.any()),
      progression_thresholds: z.record(z.number()),
      quality_system: z.record(z.any()),
      ui_constants: z.record(z.number()),
      save_system: z.record(z.any()),
      difficulty_modifiers: z.record(z.any())
    });

    return schema.parse(data);
  }

  async loadWorldData(): Promise<WorldConfig> {
    const data = await this.loadJSON('world.json');
    
    const schema = z.object({
      version: z.string(),
      generated: z.string(),
      seed: z.number(),
      money_start: z.number(),
      monthly_burn_base: z.tuple([z.number(), z.number()]),
      access_tiers: z.object({
        playlist: z.array(z.string()),
        press: z.array(z.string()),
        venue: z.array(z.string())
      }),
      mvp_caps: z.object({
        playlist: z.string(),
        press: z.string(),
        venue: z.string()
      }),
      unlock_thresholds: z.record(z.number()),
      rng_band: z.tuple([z.number(), z.number()])
    });

    return schema.parse(data);
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