/**
 * Unified Game Engine
 * 
 * This is the SINGLE SOURCE OF TRUTH for all game calculations.
 * Both client and server use this engine.
 * 
 * Client: Uses for previews and UI updates (non-authoritative)
 * Server: Uses for actual game state changes (authoritative)
 * 
 * @module shared/engine/GameEngine
 */

import { GameState, Artist, Project, Role, MonthlyAction, Song, Release, ReleaseSong } from '../schema';
import { ServerGameData } from '../../server/data/gameData';
import seedrandom from 'seedrandom';

// Extended MonthlyAction interface for game engine
interface GameEngineAction {
  actionType: 'role_meeting' | 'start_project' | 'marketing' | 'artist_dialogue';
  targetId: string | null;
  metadata?: Record<string, any>;
  details?: {
    meetingId?: string;
    choiceId?: string;
    projectType?: string;
    title?: string;
    marketingType?: string;
    // Enhanced project creation fields
    producerTier?: string;
    timeInvestment?: string;
    budget?: number;
    songCount?: number;
  };
}

/**
 * Configuration for random number generation
 */
interface RNGConfig {
  seed: string;
  min: number;
  max: number;
}

/**
 * Main game engine class that handles all game logic
 * 
 * @example
 * ```typescript
 * const engine = new GameEngine(gameState, gameData);
 * const result = await engine.advanceMonth(selectedActions);
 * ```
 */
export class GameEngine {
  private rng: seedrandom.PRNG;
  private gameData: ServerGameData;
  
  constructor(
    private gameState: GameState,
    gameData: ServerGameData,
    seed?: string
  ) {
    this.gameData = gameData;
    this.rng = seedrandom(seed || `${gameState.id}-${gameState.currentMonth}`);
  }

  /**
   * Advances the game by one month, processing all actions
   * This is the main game loop function
   * 
   * @param monthlyActions - Actions selected by the player this month
   * @returns Updated game state and summary of changes
   */
  async advanceMonth(monthlyActions: GameEngineAction[], dbTransaction?: any): Promise<{
    gameState: GameState;
    summary: MonthSummary;
    campaignResults?: CampaignResults;
  }> {
    // Check if campaign is already completed
    if (this.gameState.campaignCompleted) {
      throw new Error('Campaign has already been completed. Start a new game to continue playing.');
    }

    const summary: MonthSummary = {
      month: (this.gameState.currentMonth || 0) + 1,
      changes: [],
      revenue: 0,
      expenses: 0,
      reputationChanges: {},
      events: []
    };

    // Reset monthly values
    this.gameState.usedFocusSlots = 0;
    this.gameState.currentMonth = (this.gameState.currentMonth || 0) + 1;

    // Process each action
    for (const action of monthlyActions) {
      await this.processAction(action, summary);
    }

    // Process ongoing revenue from released projects
    await this.processReleasedProjects(summary);
    
    // Process song generation for recording projects
    await this.processRecordingProjects(summary, dbTransaction);

    // Apply delayed effects from previous months
    await this.processDelayedEffects(summary);

    // Check for random events
    await this.checkForEvents(summary);

    // Apply monthly burn (operational costs)
    const monthlyBurn = this.calculateMonthlyBurn();
    const startingMoney = this.gameData.getBalanceConfigSync().economy.starting_money;
    this.gameState.money = (this.gameState.money || startingMoney) - monthlyBurn;
    summary.expenses += monthlyBurn;
    summary.changes.push({
      type: 'expense',
      description: 'Monthly operational costs',
      amount: -monthlyBurn
    });

    // Check progression gates
    await this.checkProgressionGates(summary);

    // Update access tiers based on reputation
    this.updateAccessTiers();

    // Check for producer tier unlocks
    this.checkProducerTierUnlocks(summary);

    // Apply final calculations  
    this.gameState.money = (this.gameState.money || startingMoney) + summary.revenue - summary.expenses;
    
    // Generate economic insights for the month
    this.generateEconomicInsights(summary);
    
    // Check for campaign completion
    const campaignResults = await this.checkCampaignCompletion(summary);
    
    return {
      gameState: this.gameState,
      summary,
      campaignResults
    };
  }

  /**
   * Processes a single player action
   */
  private async processAction(action: GameEngineAction, summary: MonthSummary): Promise<void> {
    switch (action.actionType) {
      case 'role_meeting':
        await this.processRoleMeeting(action, summary);
        break;
      case 'start_project':
        await this.processProjectStart(action, summary);
        break;
      case 'marketing':
        await this.processMarketing(action, summary);
        break;
      case 'artist_dialogue':
        await this.processArtistDialogue(action, summary);
        break;
    }
    
    // Consume focus slot
    this.gameState.usedFocusSlots = (this.gameState.usedFocusSlots || 0) + 1;
  }

  /**
   * Processes a role meeting and applies effects
   */
  private async processRoleMeeting(action: GameEngineAction, summary: MonthSummary): Promise<void> {
    if (!action.targetId) return;
    
    // Get role data from serverGameData
    const role = await this.gameData.getRoleById(action.targetId);
    if (!role) return;

    const meeting = role.meetings?.find(m => m.id === action.details?.meetingId);
    if (!meeting) return;

    const choice = meeting.choices.find(c => c.id === action.details?.choiceId);
    if (!choice) return;

    // Apply immediate effects
    if (choice.effects_immediate) {
      // Convert to Record<string, number> for applyEffects
      const effects: Record<string, number> = {};
      for (const [key, value] of Object.entries(choice.effects_immediate)) {
        if (typeof value === 'number') {
          effects[key] = value;
        }
      }
      this.applyEffects(effects, summary);
    }

    // Queue delayed effects  
    if (choice.effects_delayed) {
      const flags = this.gameState.flags || {};
      const delayedKey = `${action.targetId}-${action.details?.choiceId}-delayed`;
      (flags as any)[delayedKey] = {
        triggerMonth: (this.gameState.currentMonth || 0) + 1,
        effects: choice.effects_delayed
      };
      this.gameState.flags = flags;
    }

    summary.changes.push({
      type: 'meeting',
      description: `Met with ${role.name}`,
      roleId: role.id
    });
  }

  /**
   * Applies immediate effects to game state
   */
  private applyEffects(effects: Record<string, number>, summary: MonthSummary): void {
    for (const [key, value] of Object.entries(effects)) {
      switch (key) {
        case 'money':
          this.gameState.money = (this.gameState.money || 0) + value;
          if (value > 0) {
            summary.revenue += value;
          } else {
            summary.expenses += Math.abs(value);
          }
          break;
        case 'reputation':
          this.gameState.reputation = Math.max(0, Math.min(100, (this.gameState.reputation || 0) + value));
          summary.reputationChanges.global = (summary.reputationChanges.global || 0) + value;
          break;
        case 'creative_capital':
          this.gameState.creativeCapital = Math.max(0, (this.gameState.creativeCapital || 0) + value);
          break;
        case 'artist_mood':
          // Store artist mood changes in the summary for database update
          if (!summary.artistChanges) summary.artistChanges = {};
          summary.artistChanges.mood = (summary.artistChanges.mood || 0) + value;
          break;
        case 'artist_loyalty':
          // Store artist loyalty changes in the summary for database update
          if (!summary.artistChanges) summary.artistChanges = {};
          summary.artistChanges.loyalty = (summary.artistChanges.loyalty || 0) + value;
          break;
      }
    }
  }

  /**
   * Calculates streaming revenue for a release
   * Uses the formula from balance.json
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
   * Calculates press coverage for a release
   */
  calculatePressPickups(
    pressAccess: string,
    prSpend: number,
    reputation: number,
    hasStoryFlag: boolean
  ): number {
    const config = this.gameData.getPressConfigSync();
    
    // Get base chance from access tier
    const accessChance = this.getAccessChance('press', pressAccess);
    
    // Calculate pickup chance
    let chance = config.base_chance + accessChance;
    chance += (prSpend * config.pr_spend_modifier);
    chance += (reputation * config.reputation_modifier);
    
    if (hasStoryFlag) {
      chance += config.story_flag_bonus;
    }
    
    // Roll for each potential pickup
    let pickups = 0;
    for (let i = 0; i < config.max_pickups_per_release; i++) {
      if (this.getRandom(0, 1) < chance) {
        pickups++;
      }
    }
    
    return pickups;
  }

  /**
   * Calculates tour revenue
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
   * Gets random number using seeded RNG
   */
  private getRandom(min: number, max: number): number {
    return min + (this.rng() * (max - min));
  }

  /**
   * Helper to get access tier multipliers
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
   * Helper to get access tier chances
   */
  private getAccessChance(type: string, tier: string): number {
    const tiers = this.gameData.getAccessTiersSync();
    
    if (type === 'press') {
      const tierData = tiers.press_access as any;
      return tierData[tier]?.pickup_chance || 0.05;
    }
    
    // Default fallback
    return 0.05;
  }

  /**
   * Helper to get venue capacity
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
   * Helper to get project duration from balance config
   */
  private getProjectDuration(projectType: string): number {
    // Default durations based on project type
    const durations = {
      'single': 2,
      'ep': 4, 
      'mini-tour': 1,
      'mini_tour': 1
    };
    
    return durations[projectType.toLowerCase() as keyof typeof durations] || 2;
  }

  /**
   * Calculates monthly operational costs including artist payments
   */
  private calculateMonthlyBurn(): number {
    const [min, max] = this.gameData.getMonthlyBurnRangeSync();
    const baseBurn = Math.round(this.getRandom(min, max));
    
    // Add artist costs - estimate based on flags or assume 1-2 artists at 800-1500/month each
    // In full implementation, this would use actual artist data passed to GameEngine
    const flags = this.gameState.flags || {};
    const estimatedArtists = (flags as any)['signed_artists_count'] || 1; // Default to 1 if not tracked
    const artistCosts = estimatedArtists * Math.round(this.getRandom(800, 1500));
    
    return baseBurn + artistCosts;
  }

  /**
   * Processes ongoing projects (recordings, tours, etc)
   */
  private async processOngoingProjects(summary: MonthSummary): Promise<void> {
    // Projects are now managed via flags since they're not part of database gameState
    const flags = this.gameState.flags || {};
    const projects = (flags as any)['active_projects'] || [];
    for (const project of projects) {
      if (project.status === 'in_progress') {
        project.monthsRemaining = (project.monthsRemaining || 0) - 1;
        
        if (project.monthsRemaining <= 0) {
          project.status = 'completed';
          
          // Calculate project outcomes based on type
          const outcomes = await this.calculateProjectOutcomes(project, summary);
          
          summary.changes.push({
            type: 'project_complete',
            description: `Completed ${project.type}: ${project.name} - ${outcomes.description}`,
            projectId: project.id,
            amount: outcomes.revenue
          });
        }
      }
    }
    
    // Process ongoing revenue from released projects
    await this.processReleasedProjects(summary);
    
    // Process song generation for recording projects
    await this.processRecordingProjects(summary, dbTransaction);
  }

  /**
   * Processes ongoing revenue from individual released songs (streaming decay)
   * This simulates realistic revenue patterns where each song generates declining revenue over time
   */
  private async processReleasedProjects(summary: MonthSummary): Promise<void> {
    console.log('[INDIVIDUAL SONG DECAY] === Processing Released Songs ===');
    console.log(`[INDIVIDUAL SONG DECAY] Current month: ${this.gameState.currentMonth}`);
    
    try {
      // Get all released songs for this game
      const releasedSongs = await this.gameData.getReleasedSongs?.(this.gameState.id) || [];
      console.log(`[INDIVIDUAL SONG DECAY] Found ${releasedSongs.length} released songs`);
      
      if (releasedSongs.length === 0) {
        console.log('[INDIVIDUAL SONG DECAY] No released songs found, skipping ongoing revenue processing');
        return;
      }
      
      let totalOngoingRevenue = 0;
      const songUpdates = [];
      
      for (const song of releasedSongs) {
        console.log(`[INDIVIDUAL SONG DECAY] Processing song: "${song.title}" (Quality: ${song.quality})`);
        
        const ongoingRevenue = this.calculateOngoingSongRevenue(song);
        console.log(`[INDIVIDUAL SONG DECAY] Calculated ongoing revenue for "${song.title}": $${ongoingRevenue}`);
        
        if (ongoingRevenue > 0) {
          totalOngoingRevenue += ongoingRevenue;
          
          // Track song updates for batch processing
          songUpdates.push({
            songId: song.id,
            monthlyStreams: Math.round(ongoingRevenue / 0.05), // Reverse calculate streams
            lastMonthRevenue: ongoingRevenue,
            totalRevenue: (song.totalRevenue || 0) + ongoingRevenue,
            totalStreams: (song.totalStreams || 0) + Math.round(ongoingRevenue / 0.05)
          });
          
          // Add to summary changes for transparency
          summary.changes.push({
            type: 'ongoing_revenue',
            description: `🎵 "${song.title}" ongoing streams`,
            amount: ongoingRevenue
          });
        } else {
          console.log(`[INDIVIDUAL SONG DECAY] No ongoing revenue for "${song.title}" (too old or below threshold)`);
        }
      }
      
      // Update songs in batch if available
      if (songUpdates.length > 0 && this.gameData.updateSongs) {
        console.log(`[INDIVIDUAL SONG DECAY] Updating ${songUpdates.length} songs with new metrics`);
        await this.gameData.updateSongs(songUpdates);
      }
      
      // Add total ongoing revenue to summary
      if (totalOngoingRevenue > 0) {
        summary.revenue += totalOngoingRevenue;
        console.log(`[INDIVIDUAL SONG DECAY] Total ongoing revenue: $${totalOngoingRevenue}`);
      }
      
    } catch (error) {
      console.error('[INDIVIDUAL SONG DECAY] Error processing released songs:', error);
      // Fallback to legacy project-based processing if song-based fails
      await this.processReleasedProjectsLegacy(summary);
    }
    
    console.log('[INDIVIDUAL SONG DECAY] === End Processing ===');
  }
  
  /**
   * Legacy project-based ongoing revenue processing (fallback)
   */
  private async processReleasedProjectsLegacy(summary: MonthSummary): Promise<void> {
    console.log('[LEGACY DECAY] Falling back to project-based ongoing revenue');
    
    const releasedProjects = (this.gameState.flags as any)?.['released_projects'] || [];
    
    for (const project of releasedProjects) {
      const ongoingRevenue = this.calculateOngoingRevenue(project);
      
      if (ongoingRevenue > 0) {
        summary.revenue += ongoingRevenue;
        summary.changes.push({
          type: 'ongoing_revenue',
          description: `Ongoing streams: ${project.title}`,
          amount: ongoingRevenue
        });
      }
    }
  }

  /**
   * Processes song generation for recording projects
   * This is called during monthly processing to create songs for active recording projects
   */
  private async processRecordingProjects(summary: MonthSummary, dbTransaction?: any): Promise<void> {
    console.log('[SONG GENERATION] === Processing Recording Projects ===');
    console.log(`[SONG GENERATION] Game ID: ${this.gameState.id}`);
    
    try {
      // Get recording projects from database via ServerGameData
      // Note: This assumes the server will provide recording projects
      const recordingProjects = await this.gameData.getActiveRecordingProjects?.(this.gameState.id || '', dbTransaction);
      
      console.log(`[SONG GENERATION] Found ${recordingProjects?.length || 0} recording projects`);
      console.log('[SONG GENERATION] Projects:', recordingProjects?.map(p => ({
        id: p.id,
        title: p.title,
        type: p.type,
        stage: p.stage,
        songCount: p.songCount,
        songsCreated: p.songsCreated
      })));
      
      if (!recordingProjects || recordingProjects.length === 0) {
        console.log('[SONG GENERATION] No active recording projects found');
        return;
      }

      for (const project of recordingProjects) {
        console.log(`[SONG GENERATION] Checking project: ${project.title} (${project.type})`);
        if (this.shouldGenerateProjectSongs(project)) {
          console.log(`[SONG GENERATION] Project ${project.title} should generate songs`);
          await this.generateMonthlyProjectSongs(project, summary);
        } else {
          console.log(`[SONG GENERATION] Project ${project.title} should NOT generate songs - stage: ${project.stage}, songCount: ${project.songCount}, songsCreated: ${project.songsCreated}`);
        }
      }
    } catch (error) {
      console.error('[SONG GENERATION] Error processing recording projects:', error);
    }
    
    console.log('[SONG GENERATION] === End Processing ===');
  }

  /**
   * Determines if a project should generate songs this month
   */
  private shouldGenerateProjectSongs(project: any): boolean {
    // Only generate songs for recording projects (Singles, EPs) in production stage
    if (!['Single', 'EP'].includes(project.type) || project.stage !== 'production') {
      return false;
    }

    // Check if project still needs to create songs
    const songCount = project.songCount || 1;
    const songsCreated = project.songsCreated || 0;
    
    return songsCreated < songCount;
  }

  /**
   * Generates songs for a recording project during monthly processing
   */
  private async generateMonthlyProjectSongs(project: any, summary: MonthSummary): Promise<void> {
    console.log(`[SONG GENERATION] Generating songs for project: ${project.title}`);
    console.log(`[SONG GENERATION] Project details:`, {
      id: project.id,
      artistId: project.artistId,
      songCount: project.songCount,
      songsCreated: project.songsCreated,
      type: project.type,
      stage: project.stage
    });
    
    try {
      const artist = await this.gameData.getArtistById(project.artistId);
      if (!artist) {
        console.error(`[SONG GENERATION] Artist not found for project ${project.id}`);
        return;
      }
      console.log(`[SONG GENERATION] Found artist: ${artist.name}`);

      // Determine how many songs to generate this month
      const remainingSongs = (project.songCount || 1) - (project.songsCreated || 0);
      const songsPerMonth = this.getSongsPerMonth(project.type);
      const songsToGenerate = Math.min(remainingSongs, songsPerMonth);

      console.log(`[SONG GENERATION] Calculation:`, {
        remainingSongs,
        songsPerMonth,
        songsToGenerate
      });

      for (let i = 0; i < songsToGenerate; i++) {
        console.log(`[SONG GENERATION] Creating song ${i + 1}/${songsToGenerate} for project ${project.title}`);
        const song = this.generateSong(project, artist);
        console.log(`[SONG GENERATION] Generated song:`, {
          title: song.title,
          quality: song.quality,
          genre: song.genre,
          mood: song.mood
        });
        
        // Store song via ServerGameData (if available)
        if (this.gameData.createSong) {
          console.log(`[SONG GENERATION] Saving song to database via createSong...`);
          try {
            const savedSong = await this.gameData.createSong(song);
            console.log(`[SONG GENERATION] Song saved successfully:`, savedSong.id);
          } catch (songError) {
            console.error(`[SONG GENERATION] Failed to save song:`, songError);
            continue; // Skip updating project progress if song save failed
          }
        } else {
          console.warn(`[SONG GENERATION] createSong method not available on gameData`);
        }

        // Update project progress
        project.songsCreated = (project.songsCreated || 0) + 1;
        console.log(`[SONG GENERATION] Updated project songsCreated to: ${project.songsCreated}`);
        
        // Enhanced summary with economic insights
        const economicInsight = this.generateSongEconomicInsight(song, project);
        
        summary.changes.push({
          type: 'project_complete', // Using existing type for now
          description: `Created song: "${song.title}" for ${project.title} - ${economicInsight}`,
          projectId: project.id,
          amount: 0
        });
        console.log(`[SONG GENERATION] Added enhanced summary change for song creation`);
      }

      // Update project in database
      if (this.gameData.updateProject) {
        await this.gameData.updateProject(project.id, {
          songsCreated: project.songsCreated
        });
      }

      // Check if project completed all songs
      if (project.songsCreated >= project.songCount) {
        // Calculate project completion economic summary
        const completionSummary = this.generateProjectCompletionSummary(project);
        
        summary.changes.push({
          type: 'project_complete',
          description: `Recording completed for ${project.title} (${project.songsCreated}/${project.songCount} songs) - ${completionSummary}`,
          projectId: project.id,
          amount: 0
        });
      }

    } catch (error) {
      console.error(`[SONG GENERATION] Error generating songs for project ${project.id}:`, error);
    }
  }

  /**
   * Determines how many songs to generate per month based on project type
   */
  private getSongsPerMonth(projectType: string): number {
    switch (projectType) {
      case 'Single': return 2; // Singles can generate up to 2 songs per month
      case 'EP': return 3;     // EPs can generate up to 3 songs per month  
      default: return 2;
    }
  }

  /**
   * Generates a single song for a recording project with enhanced quality calculation
   */
  private generateSong(project: any, artist: any): any {
    const currentMonth = this.gameState.currentMonth || 1;
    
    // Generate song name from predefined pools (would come from balance.json in full implementation)
    const songNames = [
      'Midnight Dreams', 'City Lights', 'Hearts on Fire', 'Thunder Road', 
      'Broken Chains', 'Rebel Soul', 'Digital Love', 'Neon Nights',
      'System Override', 'Golden Hour', 'Starlight', 'Electric Pulse',
      'Velvet Sky', 'Crimson Dawn', 'Silver Lining', 'Ocean Waves'
    ];
    
    const randomName = songNames[Math.floor(this.getRandom(0, songNames.length))];
    
    // Get producer tier and time investment from project metadata (with defaults)
    const metadata = project.metadata || {};
    const producerTier = project.producerTier || metadata.producerTier || 'local';
    const timeInvestment = project.timeInvestment || metadata.timeInvestment || 'standard';
    
    console.log('[GENERATE SONG] Project budget data analysis:', {
      projectId: project.id,
      projectTitle: project.title,
      directBudgetPerSong: project.budgetPerSong,
      directTotalCost: project.totalCost,
      projectBudget: project.budget,
      projectSongCount: project.songCount,
      producerTier,
      timeInvestment,
      hasMetadata: !!metadata,
      metadataKeys: Object.keys(metadata)
    });
    
    // Extract economic decision data if available
    const economicDecisions = metadata.economicDecisions || {};
    const projectBudget = project.budgetPerSong ? (project.budgetPerSong * (project.songCount || 1)) : 
                          (project.totalCost || project.budget || economicDecisions.finalBudget || 0);
    const budgetQualityBonus = economicDecisions.budgetQualityBonus || 0;
    const songCountQualityImpact = economicDecisions.songCountQualityImpact || 1.0;
    
    console.log('[GENERATE SONG] Budget calculation resolved:', {
      finalProjectBudget: projectBudget,
      calculationMethod: project.budgetPerSong ? 'budgetPerSong * songCount' : 
                          (project.totalCost ? 'totalCost' :
                          (project.budget ? 'budget' : 
                          (economicDecisions.finalBudget ? 'economicDecisions.finalBudget' : 'default 0'))),
      budgetQualityBonus,
      songCountQualityImpact
    });
    
    // Calculate enhanced song quality using new stacking formula with budget and song count
    const finalQuality = this.calculateEnhancedSongQuality(
      artist, 
      project, 
      producerTier, 
      timeInvestment,
      projectBudget,
      project.songCount
    );

    // CRITICAL FIX: Ensure gameId and artistId are properly set
    // Use project.artistId consistently (this is the ID used in the UI)
    const gameId = project.gameId || this.gameState.id;
    const artistId = project.artistId; // Always use project's artistId, not the fetched artist.id
    
    // Calculate per-song budget allocation for tracking
    const perSongBudget = project.songCount > 1 ? Math.round(projectBudget / project.songCount) : projectBudget;
    
    console.log('[SONG GENERATION] Creating enhanced song with economic factors:', { 
      gameId, 
      artistId, 
      projectId: project.id,
      projectTitle: project.title,
      artistName: artist?.name || 'Unknown',
      artistMood: artist?.mood || 50,
      producerTier,
      timeInvestment,
      finalQuality,
      projectBudget,
      perSongBudget,
      songCount: project.songCount,
      budgetQualityBonus,
      songCountQualityImpact,
      hasMetadata: !!metadata,
      hasEconomicDecisions: !!economicDecisions.finalBudget
    });
    
    if (!gameId || !artistId) {
      console.error('[SONG GENERATION] MISSING REQUIRED FIELDS:', { gameId, artistId });
      throw new Error(`Cannot create song: missing gameId (${gameId}) or artistId (${artistId})`);
    }

    // Enhanced metadata with economic factors
    const baseQuality = 40 + Math.floor(this.getRandom(0, 20));
    const producerBonus = this.gameData.getProducerTierSystemSync()[producerTier]?.quality_bonus || 0;
    const timeBonus = this.gameData.getTimeInvestmentSystemSync()[timeInvestment]?.quality_bonus || 0;
    
    // Don't include 'id' field - let database generate it
    return {
      title: randomName,
      artistId: artistId,
      gameId: gameId,
      quality: Math.round(finalQuality),
      genre: artist.genre || 'pop', // Would come from artist data
      mood: this.generateSongMood(),
      createdMonth: currentMonth,
      producerTier: producerTier,
      timeInvestment: timeInvestment,
      isRecorded: true,
      isReleased: false,
      releaseId: null,
      metadata: {
        projectId: project.id,
        artistMood: artist.mood || 50,
        baseQuality: baseQuality,
        producerBonus: producerBonus,
        timeBonus: timeBonus,
        budgetQualityBonus: budgetQualityBonus,
        songCountQualityImpact: songCountQualityImpact,
        perSongBudget: perSongBudget,
        totalProjectBudget: projectBudget,
        economicEfficiency: perSongBudget > 0 ? (finalQuality / (perSongBudget / 1000)).toFixed(2) : 0,
        producerTier: producerTier,
        timeInvestment: timeInvestment,
        generatedAt: new Date().toISOString(),
        qualityCalculation: {
          base: baseQuality,
          artistMoodBonus: Math.floor(((artist.mood || 50) - 50) * 0.2),
          producerBonus: producerBonus,
          timeBonus: timeBonus,
          budgetBonus: budgetQualityBonus,
          songCountImpact: songCountQualityImpact,
          final: finalQuality
        }
      }
    };
  }

  /**
   * Calculates enhanced song quality using producer tier, time investment, and budget stacking formula
   */
  private calculateEnhancedSongQuality(
    artist: any, 
    project: any, 
    producerTier: string, 
    timeInvestment: string,
    budgetAmount?: number,
    songCount?: number
  ): number {
    // Base quality (40-60 range with RNG variance)
    const baseQuality = 40 + Math.floor(this.getRandom(0, 20));
    
    // Artist mood bonus (-10 to +10 based on mood)
    const artistMoodBonus = Math.floor(((artist.mood || 50) - 50) * 0.2);
    
    // Producer tier quality bonus
    const producerSystem = this.gameData.getProducerTierSystemSync();
    const producerBonus = producerSystem[producerTier]?.quality_bonus || 0;
    
    // Time investment quality bonus
    const timeSystem = this.gameData.getTimeInvestmentSystemSync();
    const timeBonus = timeSystem[timeInvestment]?.quality_bonus || 0;
    
    // NEW: Budget quality bonus with diminishing returns (per-song basis)
    const totalBudget = budgetAmount || project.totalCost || project.budgetPerSong || 0;
    const perSongBudget = totalBudget / (songCount || 1);
    const budgetBonus = this.calculateBudgetQualityBonus(
      perSongBudget,
      project.type || 'single',
      producerTier,
      timeInvestment,
      songCount
    );
    
    // NEW: Song count impact on individual song quality
    const songCountImpact = this.calculateSongCountQualityImpact(songCount || project.songCount || 1);
    
    // Quality stacking formula: finalQuality = (baseQuality + artistMoodBonus + producerBonus + timeBonus + budgetBonus) * songCountImpact
    const preCountQuality = baseQuality + artistMoodBonus + producerBonus + timeBonus + budgetBonus;
    const rawQuality = preCountQuality * songCountImpact;
    const finalQuality = Math.max(20, Math.min(100, rawQuality));
    
    console.log(`[QUALITY CALC] Enhanced song quality calculation:`, {
      baseQuality,
      artistMoodBonus,
      producerTier,
      producerBonus,
      timeInvestment,
      timeBonus,
      budgetBonus,
      songCountImpact,
      preCountQuality,
      rawQuality,
      finalQuality
    });
    
    return finalQuality;
  }

  /**
   * Calculates budget bonus for song quality using diminishing returns
   * Now works with per-song budget amounts for clearer understanding
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
    const minTotalCost = this.gameData.calculateEnhancedProjectCost(projectType, producerTier, timeInvestment, 30, songCount);
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
   * Generates a random mood for a song
   */
  private generateSongMood(): string {
    const moods = ['upbeat', 'melancholic', 'aggressive', 'chill'];
    return moods[Math.floor(this.getRandom(0, moods.length))];
  }
  
  /**
   * Generates economic insight summary for song creation
   */
  private generateSongEconomicInsight(song: any, project: any): string {
    const metadata = song.metadata || {};
    const qualityCalc = metadata.qualityCalculation || {};
    
    let insight = `Quality: ${song.quality}/100`;
    
    // Add producer tier insight
    if (song.producerTier && song.producerTier !== 'local') {
      insight += ` (${song.producerTier} producer`;
      if (qualityCalc.producerBonus > 0) {
        insight += ` +${qualityCalc.producerBonus}`;
      }
      insight += ')';
    }
    
    // Add budget efficiency insight
    if (metadata.perSongBudget > 0) {
      const efficiency = parseFloat(metadata.economicEfficiency) || 0;
      insight += `, $${metadata.perSongBudget.toLocaleString()}/song`;
      if (efficiency > 0) {
        insight += ` (${efficiency} quality/$1k)`;
      }
    }
    
    // Add multi-song impact insight
    if (metadata.songCountQualityImpact && metadata.songCountQualityImpact !== 1.0) {
      const impactPercent = (metadata.songCountQualityImpact - 1.0) * 100;
      insight += `, Multi-song: ${impactPercent > 0 ? '+' : ''}${impactPercent.toFixed(1)}%`;
    }
    
    return insight;
  }
  
  /**
   * Generates economic summary for project completion
   */
  private generateProjectCompletionSummary(project: any): string {
    const metadata = project.metadata || {};
    const economicDecisions = metadata.economicDecisions || {};
    
    let summary = `Total investment: $${(project.budget || 0).toLocaleString()}`;
    
    if (project.songCount > 1) {
      const perSongCost = Math.round((project.budget || 0) / project.songCount);
      summary += ` ($${perSongCost.toLocaleString()}/song)`;
    }
    
    // Add producer tier insight
    if (project.producerTier && project.producerTier !== 'local') {
      summary += `, ${project.producerTier} producer`;
    }
    
    // Add time investment insight
    if (project.timeInvestment && project.timeInvestment !== 'standard') {
      summary += `, ${project.timeInvestment} timeline`;
    }
    
    // Add expected quality range if available
    if (economicDecisions.expectedQuality) {
      summary += `, Target quality: ${economicDecisions.expectedQuality.toFixed(1)}/100`;
    }
    
    // Add budget efficiency insight
    if (economicDecisions.budgetRatio) {
      const ratio = economicDecisions.budgetRatio;
      if (ratio > 1.5) {
        summary += `, Premium budget (${ratio.toFixed(1)}x minimum)`;
      } else if (ratio < 1.0) {
        summary += `, Tight budget (${ratio.toFixed(1)}x minimum)`;
      }
    }
    
    return summary;
  }

  /**
   * Calculates ongoing revenue for a released project using streaming decay formula
   * Revenue naturally decreases over time, simulating real music industry patterns
   */
  private calculateOngoingRevenue(project: any): number {
    const metadata = project.metadata || {};
    const initialStreams = metadata.streams || 0;
    const releaseMonth = metadata.releaseMonth || 1;
    const currentMonth = this.gameState.currentMonth || 1;
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
    const reputation = this.gameState.reputation || 0;
    const reputationBonus = 1 + (reputation - 50) * reputationBonusFactor;
    const playlistMultiplier = this.getAccessMultiplier('playlist', this.gameState.playlistAccess || 'none');
    const accessBonus = 1 + (playlistMultiplier - 1) * accessTierBonusFactor;
    console.log(`[REVENUE CALC] Reputation: ${reputation}, Reputation bonus: ${reputationBonus.toFixed(4)}`);
    console.log(`[REVENUE CALC] Playlist access: ${this.gameState.playlistAccess}, Multiplier: ${playlistMultiplier}, Access bonus: ${accessBonus.toFixed(4)}`);
    
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
   * Calculates ongoing revenue for an individual released song using streaming decay formula
   * Each song has its own decay pattern based on individual quality and release timing
   */
  private calculateOngoingSongRevenue(song: any): number {
    const currentMonth = this.gameState.currentMonth || 1;
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
    const reputation = this.gameState.reputation || 0;
    const reputationBonus = 1 + (reputation - 50) * reputationBonusFactor;
    const playlistMultiplier = this.getAccessMultiplier('playlist', this.gameState.playlistAccess || 'none');
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
   * Processes delayed effects from previous months
   */
  private async processDelayedEffects(summary: MonthSummary): Promise<void> {
    // Initialize flags as array if it's not already
    if (!Array.isArray(this.gameState.flags)) {
      this.gameState.flags = [] as any;
    }
    
    const flags = this.gameState.flags as any[];
    const triggeredFlags = flags.filter(
      (f: any) => f.triggerMonth === this.gameState.currentMonth
    );
    
    for (const flag of triggeredFlags) {
      this.applyEffects(flag.effects, summary);
      summary.changes.push({
        type: 'delayed_effect',
        description: 'Delayed effect triggered'
      });
    }
    
    // Remove triggered flags
    this.gameState.flags = flags.filter(
      (f: any) => f.triggerMonth !== this.gameState.currentMonth
    ) as any;
  }

  /**
   * Checks for random events based on probability
   */
  private async checkForEvents(summary: MonthSummary): Promise<void> {
    const eventConfig = this.gameData.getEventConfigSync();
    
    if (this.getRandom(0, 1) < eventConfig.monthly_chance) {
      // Trigger an event
      const event = await this.gameData.getRandomEvent();
      if (event) {
        summary.events.push({
          id: event.id,
          title: event.prompt.substring(0, 50),
          occurred: true
        });
      }
    }
  }

  /**
   * Checks and applies progression gates
   */
  private async checkProgressionGates(summary: MonthSummary): Promise<void> {
    const thresholds = this.gameData.getProgressionThresholdsSync();
    
    // Check for second artist unlock
    const reputation = this.gameState.reputation || 0;
    if (reputation >= thresholds.second_artist_reputation) {
      const flags = this.gameState.flags || {};
      if (!(flags as any)['second_artist_unlocked']) {
        (flags as any)['second_artist_unlocked'] = true;
        this.gameState.flags = flags;
        summary.changes.push({
          type: 'unlock',
          description: 'Second artist slot unlocked!'
        });
      }
    }
    
    // Check for fourth focus slot
    if (reputation >= thresholds.fourth_focus_slot_reputation) {
      const currentSlots = this.gameState.focusSlots || 3;
      if (currentSlots < 4) {
        this.gameState.focusSlots = 4;
        summary.changes.push({
          type: 'unlock',
          description: 'Fourth focus slot unlocked!'
        });
      }
    }
  }

  /**
   * Updates access tiers based on current reputation and checks for producer tier unlocks
   */
  private updateAccessTiers(): void {
    const tiers = this.gameData.getAccessTiersSync();
    const reputation = this.gameState.reputation || 0;
    
    // Update playlist access
    const playlistTiers = Object.entries(tiers.playlist_access)
      .sort(([,a], [,b]) => b.threshold - a.threshold); // Sort by threshold descending
    
    for (const [tierName, config] of playlistTiers) {
      if (reputation >= config.threshold) {
        if (this.gameState.playlistAccess !== tierName) {
          this.gameState.playlistAccess = tierName;
        }
        break;
      }
    }
    
    // Update press access
    const pressTiers = Object.entries(tiers.press_access)
      .sort(([,a], [,b]) => b.threshold - a.threshold);
    
    for (const [tierName, config] of pressTiers) {
      if (reputation >= config.threshold) {
        if (this.gameState.pressAccess !== tierName) {
          this.gameState.pressAccess = tierName;
        }
        break;
      }
    }
    
    // Update venue access
    const venueTiers = Object.entries(tiers.venue_access)
      .sort(([,a], [,b]) => b.threshold - a.threshold);
    
    for (const [tierName, config] of venueTiers) {
      if (reputation >= config.threshold) {
        if (this.gameState.venueAccess !== tierName) {
          this.gameState.venueAccess = tierName;
        }
        break;
      }
    }
  }

  /**
   * Checks for producer tier unlocks and adds progression notifications
   */
  private checkProducerTierUnlocks(summary: MonthSummary): void {
    const reputation = this.gameState.reputation || 0;
    const producerSystem = this.gameData.getProducerTierSystemSync();
    
    // Track which tiers were previously unlocked
    const flags = this.gameState.flags || {};
    const unlockedTiers = (flags as any)['unlocked_producer_tiers'] || ['local'];
    
    let newUnlocks = false;
    const availableTiers = this.gameData.getAvailableProducerTiers(reputation);
    
    for (const tierName of availableTiers) {
      if (!unlockedTiers.includes(tierName)) {
        unlockedTiers.push(tierName);
        newUnlocks = true;
        
        const tierData = producerSystem[tierName];
        summary.changes.push({
          type: 'unlock',
          description: `🎛️ Producer Tier Unlocked: ${tierName.charAt(0).toUpperCase() + tierName.slice(1)} - ${tierData.description}`,
          amount: 0
        });
        
        console.log(`[PROGRESSION] Producer tier unlocked: ${tierName} (reputation: ${reputation})`);
      }
    }
    
    if (newUnlocks) {
      (flags as any)['unlocked_producer_tiers'] = unlockedTiers;
      this.gameState.flags = flags;
    }
  }

  /**
   * Processes starting a new project (Single, EP, Mini-Tour) with enhanced producer tier and time investment support
   */
  private async processProjectStart(action: GameEngineAction, summary: MonthSummary): Promise<void> {
    if (!action.targetId || !action.details?.projectType) return;
    
    // Validate project creation parameters first
    const validation = this.validateProjectCreation(action, this.gameState);
    if (!validation.valid) {
      for (const error of validation.errors) {
        summary.changes.push({
          type: 'expense',
          description: `Project creation failed: ${error}`,
          amount: 0
        });
      }
      return;
    }
    
    const projectType = action.details.projectType;
    const producerTier = action.details.producerTier || 'local';
    const timeInvestment = action.details.timeInvestment || 'standard';
    const currentReputation = this.gameState.reputation || 0;
    
    // Validate producer tier availability
    const availableTiers = this.gameData.getAvailableProducerTiers(currentReputation);
    if (!availableTiers.includes(producerTier)) {
      summary.changes.push({
        type: 'expense',
        description: `Producer tier '${producerTier}' not available (requires ${this.gameData.getProducerTierSystemSync()[producerTier]?.unlock_rep || 0} reputation)`,
        amount: 0
      });
      return;
    }
    
    // Calculate enhanced project cost with producer tier, time investment, and song count
    const projectSongCount = action.details.songCount || this.getDefaultSongCount(projectType);
    let projectCost: number;
    let minBudgetForQuality: number;
    
    try {
      projectCost = this.gameData.calculateEnhancedProjectCost(
        projectType, 
        producerTier, 
        timeInvestment, 
        50, // Average quality for cost calculation
        projectSongCount
      );
      
      // Calculate minimum budget for meaningful quality bonus
      minBudgetForQuality = this.gameData.calculateEnhancedProjectCost(
        projectType, 
        producerTier, 
        timeInvestment, 
        30, // Minimum quality for budget calculation
        projectSongCount
      );
    } catch (error) {
      console.error('[PROJECT START] Cost calculation failed:', error);
      summary.changes.push({
        type: 'expense',
        description: `Failed to start ${projectType}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        amount: 0
      });
      return;
    }
    
    // Enhanced budget validation and quality impact calculation
    const customBudget = action.details.budget;
    let finalBudget: number;
    let budgetQualityBonus: number = 0;
    
    if (customBudget && customBudget >= projectCost) {
      finalBudget = customBudget;
      // Calculate budget quality bonus for custom budget (per-song)
      const perSongBudget = customBudget / projectSongCount;
      budgetQualityBonus = this.calculateBudgetQualityBonus(
        perSongBudget,
        projectType,
        producerTier,
        timeInvestment,
        projectSongCount
      );
    } else {
      finalBudget = projectCost;
      // Calculate budget quality bonus for minimum cost (per-song)
      const perSongBudget = projectCost / projectSongCount;
      budgetQualityBonus = this.calculateBudgetQualityBonus(
        perSongBudget,
        projectType,
        producerTier,
        timeInvestment,
        projectSongCount
      );
    }
    
    // Validate budget vs. song count efficiency
    const songCountCostEfficiency = this.validateSongCountBudgetEfficiency(
      finalBudget,
      projectSongCount,
      projectType,
      producerTier,
      timeInvestment
    );
    
    if (!songCountCostEfficiency.valid) {
      summary.changes.push({
        type: 'expense',
        description: `Budget allocation inefficient: ${songCountCostEfficiency.warning}`,
        amount: 0
      });
      // Continue with warning but don't block creation
    }
    
    if ((this.gameState.money || 0) < finalBudget) {
      const missingAmount = finalBudget - (this.gameState.money || 0);
      summary.changes.push({
        type: 'expense',
        description: `Cannot afford ${projectType} with ${producerTier} producer - need $${missingAmount.toLocaleString()} more`,
        amount: 0
      });
      return;
    }
    
    // Calculate song count quality impact for project planning
    const songCountQualityImpact = this.calculateSongCountQualityImpact(projectSongCount);
    
    // Deduct project cost
    this.gameState.money = (this.gameState.money || 0) - finalBudget;
    summary.expenses += finalBudget;
    
    // Calculate project duration with time investment modifier
    const baseDuration = this.getProjectDuration(projectType);
    const timeSystem = this.gameData.getTimeInvestmentSystemSync();
    const durationModifier = timeSystem[timeInvestment]?.duration_modifier || 1.0;
    const adjustedDuration = Math.ceil(baseDuration * durationModifier);
    
    // Calculate expected quality range for feedback
    const baseQuality = 40 + Math.floor(this.getRandom(0, 20));
    const producerBonus = this.gameData.getProducerTierSystemSync()[producerTier]?.quality_bonus || 0;
    const timeBonus = timeSystem[timeInvestment]?.quality_bonus || 0;
    const expectedQuality = Math.min(100, Math.max(20, 
      (baseQuality + producerBonus + timeBonus + budgetQualityBonus) * songCountQualityImpact
    ));
    
    // Add enhanced project to game state (would normally be handled by database)
    const newProject = {
      id: `project-${Date.now()}`,
      title: action.details.title || `New ${projectType}`,
      type: projectType,
      artistId: action.targetId,
      gameId: this.gameState.id,
      stage: 'production',
      quality: expectedQuality, // Enhanced quality calculation
      budgetPerSong: Math.floor(finalBudget / projectSongCount),
      totalCost: finalBudget,
      costUsed: Math.floor(finalBudget * 0.3), // Initial investment
      startMonth: this.gameState.currentMonth || 1,
      dueMonth: (this.gameState.currentMonth || 1) + adjustedDuration,
      songCount: projectSongCount,
      songsCreated: 0,
      // Enhanced project metadata with economic tracking
      producerTier: producerTier,
      timeInvestment: timeInvestment,
      metadata: {
        enhancedProject: true,
        economicDecisions: {
          originalCost: projectCost,
          finalBudget: finalBudget,
          budgetRatio: finalBudget / minBudgetForQuality,
          budgetQualityBonus: budgetQualityBonus,
          songCountQualityImpact: songCountQualityImpact,
          expectedQuality: expectedQuality,
          costEfficiency: songCountCostEfficiency
        },
        producerCostMultiplier: this.gameData.getProducerTierSystemSync()[producerTier]?.multiplier || 1.0,
        timeCostMultiplier: timeSystem[timeInvestment]?.multiplier || 1.0,
        qualityBonuses: {
          producer: producerBonus,
          time: timeBonus,
          budget: budgetQualityBonus
        }
      }
    };
    
    // TODO: Store enhanced project in database via ServerGameData
    // Projects are handled separately in the database, not stored in gameState
    
    console.log('[PROJECT START] Enhanced project created:', {
      title: newProject.title,
      type: newProject.type,
      producerTier,
      timeInvestment,
      finalBudget,
      songCount: projectSongCount,
      adjustedDuration,
      expectedQuality,
      budgetQualityBonus,
      songCountQualityImpact,
      qualityBonuses: newProject.metadata.qualityBonuses
    });
    
    // Enhanced summary with economic insights
    const costBreakdown = `${producerTier} producer (${producerBonus > 0 ? '+' + producerBonus + ' quality' : 'standard'}), ${timeInvestment} timeline (${timeBonus > 0 ? '+' + timeBonus + ' quality' : timeBonus < 0 ? timeBonus + ' quality' : 'standard'})`;
    const budgetInsight = budgetQualityBonus > 0 ? ` +${budgetQualityBonus.toFixed(1)} quality from budget` : '';
    const songCountInsight = projectSongCount > 1 ? ` (${projectSongCount} songs, ${(songCountQualityImpact * 100 - 100).toFixed(1)}% individual quality)` : '';
    
    summary.changes.push({
      type: 'project_complete',
      description: `Started ${projectType}: ${newProject.title} - $${finalBudget.toLocaleString()} (${costBreakdown}${budgetInsight})${songCountInsight}`,
      projectId: newProject.id,
      amount: -finalBudget
    });
  }

  /**
   * Gets default song count for project types
   */
  private getDefaultSongCount(projectType: string): number {
    switch (projectType.toLowerCase()) {
      case 'single': return 1;
      case 'ep': return 5;
      case 'album': return 12;
      default: return 1;
    }
  }

  /**
   * Processes marketing campaigns (PR, Digital Ads, etc.)
   */
  private async processMarketing(action: GameEngineAction, summary: MonthSummary): Promise<void> {
    if (!action.details?.marketingType) return;
    
    const marketingType = action.details.marketingType;
    const marketingCosts = await this.gameData.getMarketingCosts(marketingType);
    const campaignCost = marketingCosts.min + ((marketingCosts.max - marketingCosts.min) * 0.6); // Above-average spend
    
    // Check if we have enough money
    if ((this.gameState.money || 0) < campaignCost) {
      summary.changes.push({
        type: 'expense',
        description: `Cannot afford ${marketingType} campaign - insufficient funds`,
        amount: 0
      });
      return;
    }
    
    // Deduct campaign cost
    this.gameState.money = (this.gameState.money || 0) - campaignCost;
    summary.expenses += campaignCost;
    
    // Apply marketing effects based on type
    let effectDescription = '';
    
    switch (marketingType) {
      case 'pr_push':
        // PR campaigns improve press pickup chances
        const pressPickups = this.calculatePressPickups(
          this.gameState.pressAccess || 'none',
          campaignCost,
          this.gameState.reputation || 0,
          false
        );
        if (pressPickups > 0) {
          this.gameState.reputation = Math.min(100, (this.gameState.reputation || 0) + pressPickups);
          effectDescription = `PR campaign generated ${pressPickups} press mentions`;
        } else {
          effectDescription = 'PR campaign completed - limited media pickup';
        }
        break;
        
      case 'digital_ads':
        // Digital ads improve streaming potential
        const streamingBoost = Math.floor(campaignCost / 1000); // $1k = 1 reputation point
        this.gameState.reputation = Math.min(100, (this.gameState.reputation || 0) + streamingBoost);
        effectDescription = `Digital campaign boosted online presence (+${streamingBoost} reputation)`;
        break;
        
      default:
        effectDescription = `${marketingType} campaign completed`;
    }
    
    summary.changes.push({
      type: 'expense',
      description: effectDescription,
      amount: -campaignCost
    });
  }

  /**
   * Processes artist dialogue interactions
   */
  private async processArtistDialogue(action: GameEngineAction, summary: MonthSummary): Promise<void> {
    if (!action.targetId || !action.details?.choiceId) return;
    
    // Get artist archetype for dialogue content
    const artistId = action.targetId;
    
    // For now, simulate artist dialogue effects
    // In full implementation, this would load from dialogue.json additional_scenes
    const dialogueEffects = {
      mood: this.getRandom(-2, 3),
      loyalty: this.getRandom(-1, 2),
      creativity: this.getRandom(0, 2)
    };
    
    // Apply artist-specific effects
    if (!summary.artistChanges) summary.artistChanges = {};
    summary.artistChanges.mood = (summary.artistChanges.mood || 0) + dialogueEffects.mood;
    summary.artistChanges.loyalty = (summary.artistChanges.loyalty || 0) + dialogueEffects.loyalty;
    
    // Some dialogue choices might affect creative capital
    if (dialogueEffects.creativity > 0) {
      this.gameState.creativeCapital = Math.min(100, (this.gameState.creativeCapital || 0) + dialogueEffects.creativity);
    }
    
    summary.changes.push({
      type: 'meeting',
      description: `Artist conversation completed`,
      roleId: artistId
    });
  }

  /**
   * Check if the 12-month campaign has been completed and calculate final results
   */
  private async checkCampaignCompletion(summary: MonthSummary): Promise<CampaignResults | undefined> {
    const currentMonth = this.gameState.currentMonth || 0;
    const balanceConfig = await this.gameData.getBalanceConfig();
    const campaignLength = balanceConfig.time_progression.campaign_length_months;
    
    // Only complete campaign if we've reached the final month
    if (currentMonth < campaignLength) {
      return undefined;
    }

    // Mark campaign as completed
    this.gameState.campaignCompleted = true;

    // Calculate final score based on multiple factors
    const scoreBreakdown = {
      money: Math.max(0, Math.floor((this.gameState.money || 0) / 1000)), // 1 point per $1k
      reputation: Math.max(0, Math.floor((this.gameState.reputation || 0) / 5)), // 1 point per 5 reputation
      artistsSuccessful: 0, // TODO: Calculate based on artist success metrics
      projectsCompleted: 0, // TODO: Calculate based on completed projects
      accessTierBonus: this.calculateAccessTierBonus()
    };

    const finalScore = Object.values(scoreBreakdown).reduce((total, score) => total + score, 0);
    
    // Determine victory type based on game state
    const victoryType = this.determineVictoryType(finalScore, scoreBreakdown);
    
    // Generate achievements
    const achievements = this.calculateAchievements(scoreBreakdown);
    
    // Create summary based on victory type
    const campaignSummary = this.generateCampaignSummary(victoryType, finalScore, scoreBreakdown);

    const campaignResults: CampaignResults = {
      campaignCompleted: true,
      finalScore,
      scoreBreakdown,
      victoryType,
      summary: campaignSummary,
      achievements
    };

    // Add campaign completion to summary
    summary.changes.push({
      type: 'unlock',
      description: `🎉 Campaign Completed! Final Score: ${finalScore}`,
      amount: finalScore
    });

    return campaignResults;
  }

  /**
   * Calculate bonus points for access tier progression
   */
  private calculateAccessTierBonus(): number {
    let bonus = 0;
    
    // Playlist access bonus
    if (this.gameState.playlistAccess === 'Mid') bonus += 20;
    else if (this.gameState.playlistAccess === 'Niche') bonus += 10;
    
    // Press access bonus  
    if (this.gameState.pressAccess === 'Mid-Tier') bonus += 20;
    else if (this.gameState.pressAccess === 'Blogs') bonus += 10;
    
    // Venue access bonus
    if (this.gameState.venueAccess === 'Clubs') bonus += 15;
    
    return bonus;
  }

  /**
   * Determine victory type based on final performance
   */
  private determineVictoryType(
    finalScore: number, 
    scoreBreakdown: CampaignResults['scoreBreakdown']
  ): CampaignResults['victoryType'] {
    // Check for failure conditions
    if ((this.gameState.money || 0) < 0 || finalScore < 50) {
      return 'Failure';
    }
    
    // Survival if barely making it
    if (finalScore < 100) {
      return 'Survival';
    }
    
    // Determine primary victory type based on strongest area
    const moneyScore = scoreBreakdown.money;
    const reputationScore = scoreBreakdown.reputation;
    const balanceThreshold = 0.7;
    
    if (moneyScore > reputationScore * 1.5) {
      return 'Commercial Success';
    } else if (reputationScore > moneyScore * 1.5) {
      return 'Critical Acclaim';
    } else if (Math.min(moneyScore, reputationScore) / Math.max(moneyScore, reputationScore) >= balanceThreshold) {
      return 'Balanced Growth';
    } else {
      return 'Commercial Success'; // Default to commercial
    }
  }

  /**
   * Calculate achievements based on performance
   */
  private calculateAchievements(scoreBreakdown: CampaignResults['scoreBreakdown']): string[] {
    const achievements: string[] = [];
    
    // Money achievements
    if (scoreBreakdown.money >= 100) achievements.push('💰 Big Money - Ended with $100k+');
    else if (scoreBreakdown.money >= 50) achievements.push('💵 Profitable - Ended with $50k+');
    
    // Reputation achievements
    if (scoreBreakdown.reputation >= 40) achievements.push('⭐ Industry Legend - 200+ Reputation');
    else if (scoreBreakdown.reputation >= 20) achievements.push('🌟 Well Known - 100+ Reputation');
    
    // Access tier achievements
    if (this.gameState.playlistAccess === 'Mid' && this.gameState.pressAccess === 'Mid-Tier') {
      achievements.push('🎵 Media Mogul - Maximum playlist and press access');
    }
    
    // Survival achievements
    if ((this.gameState.money || 0) >= 0 && achievements.length === 0) {
      achievements.push('🛡️ Survivor - Made it through 12 months');
    }
    
    return achievements;
  }

  /**
   * Generate a narrative summary of the campaign
   */
  private generateCampaignSummary(
    victoryType: CampaignResults['victoryType'],
    finalScore: number,
    scoreBreakdown: CampaignResults['scoreBreakdown']
  ): string {
    const money = this.gameState.money || 0;
    const reputation = this.gameState.reputation || 0;
    
    switch (victoryType) {
      case 'Commercial Success':
        return `Your label became a commercial powerhouse! With $${(money/1000).toFixed(0)}k in the bank and ${reputation} reputation, you've proven that great music and smart business can go hand in hand.`;
      
      case 'Critical Acclaim':
        return `Your label earned critical acclaim throughout the industry! With ${reputation} reputation points, you've built a respected brand that artists dream of joining, even if the bank account shows $${(money/1000).toFixed(0)}k.`;
      
      case 'Balanced Growth':
        return `Your label achieved remarkable balanced growth! With $${(money/1000).toFixed(0)}k and ${reputation} reputation, you've built a sustainable business that excels in both artistic integrity and commercial success.`;
      
      case 'Survival':
        return `Against all odds, your label survived the challenging first year! With $${(money/1000).toFixed(0)}k remaining and ${reputation} reputation, you've laid the foundation for future growth.`;
      
      case 'Failure':
        return `The music industry proved challenging, and your label struggled to find its footing. With financial difficulties and limited industry recognition, this campaign serves as a learning experience for your next venture.`;
      
      default:
        return `Your 12-month journey in the music industry has concluded with a final score of ${finalScore} points.`;
    }
  }

  /**
   * Validates producer tier and time investment combinations for state consistency
   */
  validateProducerTierAndTimeInvestment(
    producerTier: string, 
    timeInvestment: string, 
    reputation: number
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate producer tier exists and is unlocked
    const producerSystem = this.gameData.getProducerTierSystemSync();
    if (!producerSystem[producerTier]) {
      errors.push(`Unknown producer tier: ${producerTier}`);
    } else {
      const requiredRep = producerSystem[producerTier].unlock_rep;
      if (reputation < requiredRep) {
        errors.push(`Producer tier '${producerTier}' requires ${requiredRep} reputation (current: ${reputation})`);
      }
    }
    
    // Validate time investment exists
    const timeSystem = this.gameData.getTimeInvestmentSystemSync();
    if (!timeSystem[timeInvestment]) {
      errors.push(`Unknown time investment: ${timeInvestment}`);
    }
    
    // Check for incompatible combinations (business rules)
    if (producerTier === 'legendary' && timeInvestment === 'rushed') {
      errors.push('Legendary producers refuse rushed timeline projects');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates project creation parameters before processing
   */
  validateProjectCreation(action: GameEngineAction, currentGameState: GameState): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!action.details?.projectType) {
      errors.push('Project type is required');
      return { valid: false, errors };
    }
    
    const producerTier = action.details.producerTier || 'local';
    const timeInvestment = action.details.timeInvestment || 'standard';
    const reputation = currentGameState.reputation || 0;
    const projectType = action.details.projectType;
    const songCount = action.details.songCount || this.getDefaultSongCount(projectType);
    
    // Validate song count for project type
    const songCountValidation = this.validateSongCountForProjectType(projectType, songCount);
    if (!songCountValidation.valid) {
      errors.push(...songCountValidation.errors);
    }
    
    // Validate producer tier and time investment
    const tierValidation = this.validateProducerTierAndTimeInvestment(
      producerTier, 
      timeInvestment, 
      reputation
    );
    
    if (!tierValidation.valid) {
      errors.push(...tierValidation.errors);
    }
    
    // Enhanced budget validation with economic efficiency checks
    if (action.details.budget) {
      try {
        const minCost = this.gameData.calculateEnhancedProjectCost(
          projectType,
          producerTier,
          timeInvestment,
          30, // Minimum quality for cost calculation
          songCount
        );
        
        if (action.details.budget < minCost) {
          errors.push(`Budget too low: minimum $${minCost.toLocaleString()} required for ${producerTier} producer with ${timeInvestment} timeline and ${songCount} song${songCount > 1 ? 's' : ''}`);
        }
        
        if (action.details.budget > (currentGameState.money || 0)) {
          errors.push(`Insufficient funds: budget $${action.details.budget.toLocaleString()} exceeds available money $${(currentGameState.money || 0).toLocaleString()}`);
        }
        
        // Check for budget exploitation attempts
        const maxReasonableBudget = minCost * 5; // 5x minimum is reasonable upper bound
        if (action.details.budget > maxReasonableBudget) {
          errors.push(`Budget excessive: $${action.details.budget.toLocaleString()} is beyond reasonable spending for this project type (max recommended: $${maxReasonableBudget.toLocaleString()})`);
        }
        
      } catch (error) {
        errors.push(`Cost calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validates song count is appropriate for project type
   */
  private validateSongCountForProjectType(projectType: string, songCount: number): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    switch (projectType.toLowerCase()) {
      case 'single':
        if (songCount < 1 || songCount > 3) {
          errors.push('Singles must have 1-3 songs');
        }
        break;
      case 'ep':
        if (songCount < 3 || songCount > 8) {
          errors.push('EPs must have 3-8 songs');
        }
        break;
      case 'album':
        if (songCount < 8 || songCount > 20) {
          errors.push('Albums must have 8-20 songs');
        }
        break;
      default:
        // For non-recording projects like tours, song count is not relevant
        break;
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validates budget efficiency relative to song count to prevent exploits
   */
  private validateSongCountBudgetEfficiency(
    budget: number,
    songCount: number,
    projectType: string,
    producerTier: string,
    timeInvestment: string
  ): { valid: boolean; warning?: string; efficiency?: number } {
    try {
      const minBudget = this.gameData.calculateEnhancedProjectCost(
        projectType,
        producerTier,
        timeInvestment,
        30,
        songCount
      );
      
      const efficiency = budget / minBudget;
      
      // Flag potentially exploitative budget allocations
      if (efficiency > 4.0) {
        return {
          valid: false,
          warning: `Budget ${efficiency.toFixed(1)}x minimum cost may be inefficient for ${songCount} song${songCount > 1 ? 's' : ''}`,
          efficiency
        };
      }
      
      if (efficiency < 0.8) {
        return {
          valid: false,
          warning: `Budget too low for quality production (${efficiency.toFixed(1)}x minimum)`,
          efficiency
        };
      }
      
      return { valid: true, efficiency };
      
    } catch (error) {
      return {
        valid: false,
        warning: `Budget efficiency calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Calculates outcomes when a project completes
   */
  async calculateProjectOutcomes(project: any, summary: MonthSummary): Promise<{
    revenue: number;
    streams?: number;
    pressPickups?: number;
    description: string;
  }> {
    console.log(`[DEBUG] calculateProjectOutcomes called with project:`, {
      type: project.type,
      name: project.name,
      quality: project.quality
    });
    
    let revenue = 0;
    let streams = 0;
    let pressPickups = 0;
    let description = '';

    switch (project.type) {
      case 'Single':
      case 'single':
      case 'EP':
      case 'ep':
        // Calculate streaming outcome
        console.log(`[DEBUG] Calculating streams for ${project.type} project:`, {
          quality: project.quality || 40,
          playlistAccess: this.gameState.playlistAccess || 'none',
          reputation: this.gameState.reputation || 5,
          marketingSpend: project.marketingSpend || 0
        });
        
        streams = this.calculateStreamingOutcome(
          project.quality || 40,
          this.gameState.playlistAccess || 'none',
          this.gameState.reputation || 5,
          project.marketingSpend || 0
        );
        
        console.log(`[DEBUG] Calculated ${streams} streams for project ${project.name}`);
        
        // Revenue = streams × revenue per stream
        revenue = streams * 0.003;
        console.log(`[DEBUG] Revenue calculation: ${streams} * 0.003 = ${revenue}`);
        
        // Calculate press coverage
        pressPickups = this.calculatePressPickups(
          this.gameState.pressAccess || 'none',
          project.marketingSpend || 0,
          this.gameState.reputation || 5,
          false // No story flag for basic project completion
        );
        
        // Update reputation based on success
        const reputationGain = Math.floor(streams / 10000); // 1 rep per 10k streams
        this.gameState.reputation = Math.min(100, (this.gameState.reputation || 0) + reputationGain);
        
        description = `${streams.toLocaleString()} streams, $${Math.round(revenue).toLocaleString()} revenue`;
        break;
        
      case 'Mini-Tour':
      case 'mini_tour':
        // Calculate tour revenue
        revenue = this.calculateTourRevenue(
          this.gameState.venueAccess || 'none',
          project.artistPopularity || 50,
          this.gameState.reputation || 5,
          project.cities || 3
        );
        
        description = `$${Math.round(revenue).toLocaleString()} tour revenue`;
        break;
    }
    
    // Add revenue to summary
    summary.revenue += revenue;
    
    // Add detailed changes
    if (streams > 0) {
      summary.changes.push({
        type: 'revenue',
        description: `Streaming: ${streams.toLocaleString()} streams`,
        amount: Math.round(revenue)
      });
    }
    
    if (pressPickups > 0) {
      summary.changes.push({
        type: 'unlock',
        description: `Press coverage: ${pressPickups} pickup${pressPickups > 1 ? 's' : ''}`
      });
    }
    
    return { revenue, streams, pressPickups, description };
  }

  /**
   * Tests the producer tier and time investment integration systems
   * Used for debugging and validation of the complete integration
   */
  testProducerTierIntegration(): {
    systemsLoaded: boolean;
    availableTiers: string[];
    availableTimeInvestments: string[];
    costCalculations: Record<string, any>;
    qualityCalculations: Record<string, any>;
    validationTests: Record<string, any>;
  } {
    const reputation = this.gameState.reputation || 0;
    
    // Test system loading
    const producerSystem = this.gameData.getProducerTierSystemSync();
    const timeSystem = this.gameData.getTimeInvestmentSystemSync();
    
    // Test tier availability
    const availableTiers = this.gameData.getAvailableProducerTiers(reputation);
    const availableTimeInvestments = Object.keys(timeSystem);
    
    // Test cost calculations
    const costCalculations: Record<string, any> = {};
    for (const tier of availableTiers) {
      for (const time of availableTimeInvestments) {
        try {
          const cost = this.gameData.calculateEnhancedProjectCost('single', tier, time, 50);
          costCalculations[`${tier}_${time}`] = { cost, success: true };
        } catch (error) {
          costCalculations[`${tier}_${time}`] = { error: error instanceof Error ? error.message : 'Unknown error', success: false };
        }
      }
    }
    
    // Test quality calculations
    const qualityCalculations: Record<string, any> = {};
    const mockArtist = { mood: 70, archetype: 'workhorse' };
    const mockProject = { quality: 50, producerTier: 'regional', timeInvestment: 'extended' };
    
    try {
      const quality = this.calculateEnhancedSongQuality(mockArtist, mockProject, 'regional', 'extended');
      qualityCalculations.enhanced = { quality, success: true };
    } catch (error) {
      qualityCalculations.enhanced = { error: error instanceof Error ? error.message : 'Unknown error', success: false };
    }
    
    // Test validation systems
    const validationTests: Record<string, any> = {};
    
    // Test valid combination
    const validTest = this.validateProducerTierAndTimeInvestment('local', 'standard', reputation);
    validationTests.valid_combination = validTest;
    
    // Test invalid reputation
    const invalidRepTest = this.validateProducerTierAndTimeInvestment('legendary', 'standard', 5);
    validationTests.invalid_reputation = invalidRepTest;
    
    // Test business rule violation
    const businessRuleTest = this.validateProducerTierAndTimeInvestment('legendary', 'rushed', 100);
    validationTests.business_rule_violation = businessRuleTest;
    
    return {
      systemsLoaded: Object.keys(producerSystem).length > 0 && Object.keys(timeSystem).length > 0,
      availableTiers,
      availableTimeInvestments,
      costCalculations,
      qualityCalculations,
      validationTests
    };
  }
  
  /**
   * Enhanced monthly summary generation with economic insights
   */
  private generateEconomicInsights(summary: MonthSummary): void {
    // Track budget efficiency and strategic decisions for the month
    const projectStartChanges = summary.changes.filter(change => 
      change.type === 'project_complete' && change.description.includes('Started')
    );
    
    if (projectStartChanges.length > 0) {
      const totalProjectSpend = projectStartChanges.reduce((total, change) => 
        total + Math.abs(change.amount || 0), 0
      );
      
      summary.changes.push({
        type: 'unlock',
        description: `💰 Monthly project investment: $${totalProjectSpend.toLocaleString()} across ${projectStartChanges.length} project${projectStartChanges.length > 1 ? 's' : ''}`,
        amount: 0
      });
    }
    
    // Add economic efficiency reporting for ongoing projects
    const ongoingRevenue = summary.changes.filter(change => 
      change.type === 'ongoing_revenue'
    ).reduce((total, change) => total + (change.amount || 0), 0);
    
    if (ongoingRevenue > 0) {
      summary.changes.push({
        type: 'unlock',
        description: `📈 Catalog revenue efficiency: $${ongoingRevenue.toLocaleString()} from released content`,
        amount: 0
      });
    }
    
    // Track reputation-to-money efficiency this month
    const reputationGain = Object.values(summary.reputationChanges).reduce((total, change) => total + change, 0);
    const netCashFlow = summary.revenue - summary.expenses;
    
    if (reputationGain > 0 && netCashFlow !== 0) {
      const efficiency = Math.abs(netCashFlow) / reputationGain;
      summary.changes.push({
        type: 'unlock',
        description: `🎯 Strategic efficiency: $${efficiency.toFixed(0)} per reputation point this month`,
        amount: 0
      });
    }
  }

}

/**
 * Summary of changes that occurred during a month
 */
export interface MonthSummary {
  month: number;
  changes: GameChange[];
  revenue: number;
  expenses: number;
  reputationChanges: Record<string, number>;
  events: EventOccurrence[];
  artistChanges?: Record<string, number>;
}

export interface GameChange {
  type: 'expense' | 'revenue' | 'meeting' | 'project_complete' | 'delayed_effect' | 'unlock' | 'ongoing_revenue' | 'song_release';
  description: string;
  amount?: number;
  roleId?: string;
  projectId?: string;
}

export interface EventOccurrence {
  id: string;
  title: string;
  occurred: boolean;
}

/**
 * Campaign completion results and scoring
 */
export interface CampaignResults {
  campaignCompleted: boolean;
  finalScore: number;
  scoreBreakdown: {
    money: number;
    reputation: number;
    artistsSuccessful: number;
    projectsCompleted: number;
    accessTierBonus: number;
  };
  victoryType: 'Commercial Success' | 'Critical Acclaim' | 'Balanced Growth' | 'Survival' | 'Failure';
  summary: string;
  achievements: string[];
}