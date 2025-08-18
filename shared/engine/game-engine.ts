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

import { GameState, Artist, Project, Role, MonthlyAction } from '../schema';
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
  async advanceMonth(monthlyActions: GameEngineAction[]): Promise<{
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

    // Process ongoing projects
    await this.processOngoingProjects(summary);

    // Apply delayed effects from previous months
    await this.processDelayedEffects(summary);

    // Check for random events
    await this.checkForEvents(summary);

    // Apply monthly burn (operational costs)
    const monthlyBurn = this.calculateMonthlyBurn();
    this.gameState.money = (this.gameState.money || 75000) - monthlyBurn;
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

    // Apply final calculations
    this.gameState.money = (this.gameState.money || 75000) + summary.revenue - summary.expenses;
    
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
    
    // Get playlist multiplier from real access tiers
    const playlistMultiplier = this.getAccessMultiplier('playlist', playlistAccess);
    
    // Calculate base streams using proper formula
    const baseStreams = 
      (quality * config.quality_weight) +
      (playlistMultiplier * config.playlist_weight * 100) +
      (reputation * config.reputation_weight) +
      (Math.sqrt(adSpend / 1000) * config.marketing_weight * 50);
    
    // Apply RNG variance from balance config
    const variance = this.getRandom(0.9, 1.1);
    
    // Apply first week multiplier
    const streams = baseStreams * variance * config.first_week_multiplier * config.base_streams_per_point;
    
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
   * Updates access tiers based on current reputation
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
   * Processes starting a new project (Single, EP, Mini-Tour)
   */
  private async processProjectStart(action: GameEngineAction, summary: MonthSummary): Promise<void> {
    if (!action.targetId || !action.details?.projectType) return;
    
    const projectType = action.details.projectType;
    const projectCosts = await this.gameData.getProjectCosts(projectType);
    const baseCost = projectCosts.min + ((projectCosts.max - projectCosts.min) * 0.5); // Average cost
    
    // Check if we have enough money
    if ((this.gameState.money || 0) < baseCost) {
      summary.changes.push({
        type: 'expense',
        description: `Cannot afford ${projectType} - insufficient funds`,
        amount: 0
      });
      return;
    }
    
    // Deduct project cost
    this.gameState.money = (this.gameState.money || 0) - baseCost;
    summary.expenses += baseCost;
    
    // Add project to game state (would normally be handled by database)
    const newProject = {
      id: `project-${Date.now()}`,
      title: action.details.title || `New ${projectType}`,
      type: projectType,
      artistId: action.targetId,
      stage: 'production',
      quality: 40 + Math.floor(this.getRandom(0, 20)), // Base quality
      budget: baseCost,
      budgetUsed: baseCost * 0.3, // Initial investment
      startMonth: this.gameState.currentMonth || 1,
      dueMonth: (this.gameState.currentMonth || 1) + this.getProjectDuration(projectType)
    };
    
    // TODO: Store project in database via ServerGameData
    // Projects are handled separately in the database, not stored in gameState
    
    summary.changes.push({
      type: 'project_complete',
      description: `Started ${projectType}: ${newProject.title}`,
      projectId: newProject.id,
      amount: -baseCost
    });
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
   * Calculates outcomes when a project completes
   */
  async calculateProjectOutcomes(project: any, summary: MonthSummary): Promise<{
    revenue: number;
    streams?: number;
    pressPickups?: number;
    description: string;
  }> {
    let revenue = 0;
    let streams = 0;
    let pressPickups = 0;
    let description = '';

    switch (project.type) {
      case 'single':
      case 'ep':
        // Calculate streaming outcome
        streams = this.calculateStreamingOutcome(
          project.quality || 40,
          this.gameState.playlistAccess || 'none',
          this.gameState.reputation || 5,
          project.marketingSpend || 0
        );
        
        // Revenue = streams × revenue per stream
        revenue = streams * 0.003;
        
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
  type: 'expense' | 'revenue' | 'meeting' | 'project_complete' | 'delayed_effect' | 'unlock';
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