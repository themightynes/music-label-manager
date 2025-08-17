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
  async advanceMonth(monthlyActions: MonthlyAction[]): Promise<{
    gameState: GameState;
    summary: MonthSummary;
  }> {
    const summary: MonthSummary = {
      month: this.gameState.currentMonth + 1,
      changes: [],
      revenue: 0,
      expenses: 0,
      reputationChanges: {},
      events: []
    };

    // Reset monthly values
    this.gameState.usedFocusSlots = 0;
    this.gameState.currentMonth = (this.gameState.currentMonth || 1) + 1;

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
    
    return {
      gameState: this.gameState,
      summary
    };
  }

  /**
   * Processes a single player action
   */
  private async processAction(action: MonthlyAction, summary: MonthSummary): Promise<void> {
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
    this.gameState.usedFocusSlots++;
  }

  /**
   * Processes a role meeting and applies effects
   */
  private async processRoleMeeting(action: MonthlyAction, summary: MonthSummary): Promise<void> {
    // Note: Roles are managed separately from gameState
    // TODO: Pass roles array to engine constructor or get from gameData
    const role = null; // this.gameState.roles.find(r => r.id === action.targetId);
    if (!role) return;

    const meeting = role.meetings?.find(m => m.id === action.details?.meetingId);
    if (!meeting) return;

    const choice = meeting.choices.find(c => c.id === action.details?.choiceId);
    if (!choice) return;

    // Apply immediate effects
    if (choice.effects_immediate) {
      this.applyEffects(choice.effects_immediate, summary);
    }

    // Queue delayed effects
    if (choice.effects_delayed) {
      this.gameState.flags.push({
        id: `${action.id}-delayed`,
        triggerMonth: this.gameState.currentMonth + 1,
        effects: choice.effects_delayed
      });
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
          this.gameState.money += value;
          if (value > 0) {
            summary.revenue += value;
          } else {
            summary.expenses += Math.abs(value);
          }
          break;
        case 'reputation':
          this.gameState.reputation = Math.max(0, Math.min(100, this.gameState.reputation + value));
          summary.reputationChanges.global = (summary.reputationChanges.global || 0) + value;
          break;
        case 'creative_capital':
          this.gameState.creativeCapital = Math.max(0, this.gameState.creativeCapital + value);
          break;
        case 'artist_mood':
          // Note: Artists are managed separately from gameState
          // TODO: Pass artists array to engine constructor or get from gameData
          // this.gameState.artists.forEach(artist => {
          //   artist.mood = Math.max(0, Math.min(100, artist.mood + value));
          // });
          break;
        case 'artist_loyalty':
          // TODO: Implement artist loyalty changes
          // this.gameState.artists.forEach(artist => {
          //   artist.loyalty = Math.max(0, Math.min(100, artist.loyalty + value));
          // });
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
    // TODO: Add getStreamingConfig method to ServerGameData
    // const config = await this.gameData.getStreamingConfig();
    const config = { quality_weight: 0.3, playlist_weight: 0.4, reputation_weight: 0.2, marketing_weight: 0.1, first_week_multiplier: 1.5 };
    
    // Get playlist multiplier
    const playlistMultiplier = this.getAccessMultiplier('playlist', playlistAccess);
    
    // Calculate base streams
    const baseStreams = 
      (quality * config.quality_weight) +
      (playlistMultiplier * config.playlist_weight * 100) +
      (reputation * config.reputation_weight) +
      (Math.sqrt(adSpend / 1000) * config.marketing_weight * 50);
    
    // Apply RNG variance
    const variance = this.getRandom(0.9, 1.1);
    
    // Apply first week multiplier if applicable
    const streams = baseStreams * variance * config.first_week_multiplier * 10000;
    
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
    // TODO: Add getPressConfig method to ServerGameData
    // const config = await this.gameData.getPressConfig();
    const config = { base_chance: 0.1, pr_spend_modifier: 0.0001, reputation_modifier: 0.002, story_flag_bonus: 0.15, max_pickups_per_release: 5 };
    
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
    // TODO: Add getTourConfig method to ServerGameData
    // const config = await this.gameData.getTourConfig();
    const config = { sell_through_base: 0.6, reputation_modifier: 0.003, local_popularity_weight: 0.5, merch_percentage: 0.15 };
    const venueCapacity = this.getVenueCapacity(venueTier);
    
    // Calculate sell-through rate
    let sellThrough = config.sell_through_base;
    sellThrough += (localReputation * config.reputation_modifier);
    sellThrough *= (1 + (artistPopularity / 100) * config.local_popularity_weight);
    sellThrough = Math.min(1, sellThrough);
    
    // Calculate revenue per show
    const ticketPrice = 30 + (venueCapacity / 100); // Dynamic pricing
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
    // TODO: Add getAccessTiers method to ServerGameData
    // const tiers = await this.gameData.getAccessTiers();
    // const tierConfig = tiers[type]?.[tier];
    // return tierConfig?.reach_multiplier || 0.1;
    return 0.1;
  }

  /**
   * Helper to get access tier chances
   */
  private getAccessChance(type: string, tier: string): number {
    // TODO: Add getAccessTiers method to ServerGameData
    // const tiers = await this.gameData.getAccessTiers();
    // const tierConfig = tiers[type]?.[tier];
    // return tierConfig?.pickup_chance || 0.05;
    return 0.05;
  }

  /**
   * Helper to get venue capacity
   */
  private getVenueCapacity(tier: string): number {
    const tiers = this.gameData.getAccessTiers();
    const venueConfig = tiers.venue_access?.[tier];
    if (venueConfig?.capacity_range) {
      const [min, max] = venueConfig.capacity_range;
      return Math.round(this.getRandom(min, max));
    }
    return 100;
  }

  /**
   * Calculates monthly operational costs
   */
  private calculateMonthlyBurn(): number {
    const [min, max] = this.gameData.getMonthlyBurnRangeSync();
    return Math.round(this.getRandom(min, max));
  }

  /**
   * Processes ongoing projects (recordings, tours, etc)
   */
  private async processOngoingProjects(summary: MonthSummary): Promise<void> {
    const projects = this.gameState.projects as any || [];
    for (const project of projects) {
      if (project.status === 'in_progress') {
        project.monthsRemaining = (project.monthsRemaining || 0) - 1;
        
        if (project.monthsRemaining <= 0) {
          project.status = 'completed';
          summary.changes.push({
            type: 'project_complete',
            description: `Completed ${project.type}: ${project.name}`,
            projectId: project.id
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
    if (this.gameState.reputation! >= thresholds.second_artist_reputation) {
      if ((this.gameState.artists || []).length < 2) {
        summary.changes.push({
          type: 'unlock',
          description: 'Second artist slot unlocked!'
        });
      }
    }
    
    // Check for fourth focus slot
    if (this.gameState.reputation! >= thresholds.fourth_focus_slot_reputation) {
      if (this.gameState.focusSlots! < 4) {
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
    
    // Check each access type
    for (const accessType of ['playlist_access', 'press_access', 'venue_access'] as const) {
      const accessKey = `${accessType}` as keyof typeof tiers;
      const tierConfig = tiers[accessKey];
      const currentAccess = this.gameState[accessType] || 'none';
      
      // Find highest tier we qualify for
      let bestTier = 'none';
      for (const [tierName, config] of Object.entries(tierConfig)) {
        if (this.gameState.reputation! >= config.threshold) {
          bestTier = tierName;
        }
      }
      
      if (bestTier !== currentAccess) {
        this.gameState[accessType] = bestTier;
      }
    }
  }

  // Stub methods for features not yet implemented
  private async processProjectStart(action: MonthlyAction, summary: MonthSummary): Promise<void> {
    // TODO: Implement project start logic
  }

  private async processMarketing(action: MonthlyAction, summary: MonthSummary): Promise<void> {
    // TODO: Implement marketing campaign logic
  }

  private async processArtistDialogue(action: MonthlyAction, summary: MonthSummary): Promise<void> {
    // TODO: Implement artist dialogue logic
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