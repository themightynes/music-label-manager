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
    await this.initialize();
    return this.dataLoader.getRandomEvent();
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

  async getProgressionThresholds(): Promise<Record<string, number>> {
    const balance = await this.getBalanceConfig();
    return balance.progression_thresholds;
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