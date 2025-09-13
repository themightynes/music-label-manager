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
import { FinancialSystem } from './FinancialSystem';
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
 * Tour venue capacity and economics configuration
 */
// LEGACY CONSTANTS REMOVED - now using unified FinancialSystem
// Venue capacity, ticket prices, and venue cuts are now calculated by FinancialSystem
// using configuration from data/balance/markets.json

/**
 * Consolidated financial tracking for monthly calculations
 */
export interface MonthlyFinancials {
  startingBalance: number;
  operations: { base: number; artists: number; executives: number; total: number };
  projects: { costs: number; revenue: number };
  marketing: { costs: number };
  roleEffects: { costs: number; revenue: number };
  streamingRevenue: number;
  netChange: number;
  endingBalance: number;
  breakdown: string; // Human-readable calculation
}

// Using exported MonthSummary interface from end of file

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
  private storage: any; // Storage interface for database operations
  private financialSystem: FinancialSystem;
  
  constructor(
    private gameState: GameState,
    gameData: ServerGameData,
    storage?: any, // Optional storage parameter for database operations
    seed?: string
  ) {
    this.gameData = gameData;
    this.storage = storage;
    this.rng = seedrandom(seed || `${gameState.id}-${gameState.currentMonth}`);
    this.financialSystem = new FinancialSystem(gameData, () => this.rng(), this.storage);
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

    // Initialize runtime tracking for executive usage (not in interface)
    (summary as any).usedExecutives = new Set<string>();

    // Reset monthly values
    this.gameState.usedFocusSlots = 0;
    this.gameState.currentMonth = (this.gameState.currentMonth || 0) + 1;

    // PHASE 1: Process role_meeting actions first (executive meetings)
    const meetingActions = monthlyActions.filter(action => action.actionType === 'role_meeting');
    const otherActions = monthlyActions.filter(action => action.actionType !== 'role_meeting');
    
    console.log(`[MONTHLY ADVANCE] Processing ${meetingActions.length} meeting actions first, then ${otherActions.length} other actions`);
    
    for (const action of meetingActions) {
      await this.processAction(action, summary, dbTransaction);
    }
    
    // Apply any artist mood/loyalty changes from meetings immediately to database
    await this.applyArtistChangesToDatabase(summary, dbTransaction);
    
    // PHASE 2: Process all other actions
    for (const action of otherActions) {
      await this.processAction(action, summary, dbTransaction);
    }

    // Process ongoing revenue from released projects
    await this.processReleasedProjects(summary);
    
    // Process newly recorded projects (projects that became "recorded" this month)
    await this.processNewlyRecordedProjects(summary, dbTransaction);
    
    // Process song generation for recording projects
    await this.processRecordingProjects(summary, dbTransaction);

    // Process lead singles scheduled for this month  
    await this.processLeadSingles(summary, dbTransaction);

    // Process planned releases scheduled for this month
    await this.processPlannedReleases(summary, dbTransaction);

    // PHASE 1 MIGRATION: Handle project stage advancement within GameEngine
    await this.advanceProjectStages(summary, dbTransaction);

    // Apply delayed effects from previous months
    await this.processDelayedEffects(summary);

    // Process monthly mood changes
    await this.processMonthlyMoodChanges(summary);

    // Process executive mood/loyalty decay
    await this.processExecutiveMoodDecay(summary, dbTransaction);

    // Check for random events
    await this.checkForEvents(summary);

    // Apply monthly burn (operational costs) - handled by consolidated financial calculation
    const monthlyBurnResult = await this.calculateMonthlyBurnWithBreakdown();
    const monthlyBurn = monthlyBurnResult.total;
    // Note: Both money deduction and expense tracking handled by consolidated financial calculation
    
    // Initialize expense breakdown if not exists
    if (!summary.expenseBreakdown) {
      summary.expenseBreakdown = {
        monthlyOperations: 0,
        artistSalaries: 0,
        executiveSalaries: 0,
        projectCosts: 0,
        marketingCosts: 0,
        roleMeetingCosts: 0
      };
    }
    summary.expenseBreakdown.monthlyOperations = monthlyBurnResult.baseBurn;
    summary.expenseBreakdown.artistSalaries = monthlyBurnResult.artistCosts;
    
    // Calculate executive salaries
    console.log('\n[GAME-ENGINE] About to call calculateExecutiveSalaries');
    console.log('[GAME-ENGINE] gameStateId:', this.gameState.id);
    console.log('[GAME-ENGINE] storage available:', !!this.storage);
    console.log('[GAME-ENGINE] financialSystem available:', !!this.financialSystem);
    
    const executiveSalaryResult = await this.financialSystem.calculateExecutiveSalaries(
      this.gameState.id,
      this.storage
    );
    
    console.log('[GAME-ENGINE] executiveSalaryResult received:', executiveSalaryResult);
    console.log('[GAME-ENGINE] Total executive salaries:', executiveSalaryResult.total);
    summary.expenseBreakdown.executiveSalaries = executiveSalaryResult.total;
    
    // Add monthly burn to total expenses (including base operations and artist salaries)
    summary.expenses += monthlyBurn;
    
    // Add executive salaries to total expenses
    console.log('[GAME-ENGINE] Checking if executive salaries should be added to expenses');
    console.log('[GAME-ENGINE] executiveSalaryResult.total > 0?', executiveSalaryResult.total > 0);
    
    if (executiveSalaryResult.total > 0) {
      console.log('[GAME-ENGINE] Adding executive salaries to expenses');
      console.log('[GAME-ENGINE] Current summary.expenses BEFORE adding executive salaries:', summary.expenses);
      summary.expenses += executiveSalaryResult.total;
      console.log('[GAME-ENGINE] Summary.expenses AFTER adding executive salaries:', summary.expenses);
      
      // Add change entry for executive salaries
      console.log('[GAME-ENGINE] Adding change entry for executive salaries');
      summary.changes.push({
        type: 'expense',
        description: 'Executive team salaries',
        amount: -executiveSalaryResult.total
      });
      console.log('[GAME-ENGINE] Change entry added successfully');
    } else {
      console.log('[GAME-ENGINE] No executive salaries to add (total is 0)');
    }
    
    summary.changes.push({
      type: 'expense',
      description: 'Monthly operational costs',
      amount: -monthlyBurn
    });

    // Check progression gates
    await this.checkProgressionGates(summary);

    // Update access tiers based on reputation and collect notifications
    const tierChanges = this.updateAccessTiers();
    summary.changes.push(...tierChanges);

    // Check for producer tier unlocks
    this.checkProducerTierUnlocks(summary);

    // Calculate financial summary (but don't update money yet)
    const financials = await this.calculateMonthlyFinancials(summary);
    summary.financialBreakdown = financials.breakdown;
    
    // Summary totals are already correctly accumulated throughout the month processing
    // No need to overwrite them - they contain the complete picture
    
    console.log('[FINANCIAL BREAKDOWN]', financials.breakdown);
    
    // Generate economic insights for the month
    this.generateEconomicInsights(summary);
    
    // Check for campaign completion
    const campaignResults = await this.checkCampaignCompletion(summary);
    
    // Save monthly summary to gameState.monthlyStats for UI display
    const currentMonth = this.gameState.currentMonth || 1;
    const monthKey = `month${currentMonth - 1}`;  // UI expects month0, month1, etc.
    (this.gameState as any).monthlyStats = (this.gameState as any).monthlyStats || {};
    (this.gameState as any).monthlyStats[monthKey] = {
      revenue: summary.revenue,
      streams: summary.streams || 0,
      expenses: summary.expenses,
      expenseBreakdown: summary.expenseBreakdown || {
        monthlyOperations: 0,
        artistSalaries: 0,
        executiveSalaries: 0,
        projectCosts: 0,
        marketingCosts: 0,
        roleMeetingCosts: 0
      },
      pressMentions: 0, // TODO: Add press mentions tracking
      reputationChange: Object.values(summary.reputationChanges).reduce((sum, change) => sum + change, 0),
      changes: summary.changes,
      events: summary.events
    };
    
    console.log(`[MONTHLY STATS] Saved month ${currentMonth - 1} stats:`, {
      revenue: summary.revenue,
      streams: summary.streams || 0,
      expenses: summary.expenses,
      monthKey
    });
    
    // SINGLE POINT OF MONEY UPDATE - at the very end
    // All revenue and expenses have been accumulated in the summary
    console.log('\n[FINAL MONEY CALCULATION]');
    const monthStartMoney = this.gameState.money || 0;
    console.log('[FINAL MONEY] Month start money:', monthStartMoney);
    console.log('[FINAL MONEY] Total revenue this month:', summary.revenue);
    console.log('[FINAL MONEY] Total expenses this month:', summary.expenses);
    console.log('[FINAL MONEY] Expense breakdown:', summary.expenseBreakdown);
    
    const finalMoney = monthStartMoney + summary.revenue - summary.expenses;
    console.log('[FINAL MONEY] Calculated final money:', finalMoney);
    
    this.gameState.money = finalMoney;
    console.log('[FINAL MONEY] Game state money updated to:', this.gameState.money);
    
    console.log(`[MONEY UPDATE] Starting: $${monthStartMoney}, Revenue: $${summary.revenue}, Expenses: $${summary.expenses}, Final: $${finalMoney}`);
    
    // Check for focus slot unlock at 50+ reputation
    if (this.gameState.reputation && this.gameState.reputation >= 50) {
      const currentSlots = this.gameState.focusSlots || 3;
      if (currentSlots < 4) {
        this.gameState.focusSlots = 4;
        summary.changes.push({
          type: 'unlock',
          description: 'Fourth focus slot unlocked! You can now select 4 actions per month.'
        });
        console.log('[UNLOCK] Fourth focus slot unlocked at reputation', this.gameState.reputation);
      }
    }
    
    return {
      gameState: this.gameState,
      summary,
      campaignResults
    };
  }

  /**
   * Processes a single player action
   */
  private async processAction(action: GameEngineAction, summary: MonthSummary, dbTransaction?: any): Promise<void> {
    console.log('[GAME-ENGINE processAction] Processing action:', JSON.stringify(action, null, 2));
    console.log('[GAME-ENGINE processAction] Action type:', action.actionType);
    console.log('[GAME-ENGINE processAction] Action metadata:', action.metadata);
    console.log('[GAME-ENGINE processAction] ExecutiveId in metadata:', action.metadata?.executiveId);
    
    switch (action.actionType) {
      case 'role_meeting':
        console.log('[GAME-ENGINE processAction] ✅ MATCHED role_meeting - calling processRoleMeeting');
        await this.processRoleMeeting(action, summary, dbTransaction);
        break;
      case 'start_project':
        // REDUNDANT: Projects are now handled via database advancement in advanceProjectStages()
        console.warn('[DEPRECATED] start_project actions are no longer used - projects advance automatically from planning stage');
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
  private async processRoleMeeting(action: GameEngineAction, summary: MonthSummary, dbTransaction?: any): Promise<void> {
    if (!action.targetId) return;
    
    console.log(`[GAME-ENGINE] processRoleMeeting called with action:`, action);
    
    // Extract the clean IDs from metadata
    const { roleId, actionId, choiceId } = action.metadata || {};
    
    if (!roleId || !actionId || !choiceId) {
      console.log(`[GAME-ENGINE] Missing required IDs - roleId: ${roleId}, actionId: ${actionId}, choiceId: ${choiceId}`);
      return;
    }
    
    console.log(`[GAME-ENGINE] Processing meeting - Role: ${roleId}, Action: ${actionId}, Choice: ${choiceId}`);
    
    // Get the role data for the name
    const role = await this.gameData.getRoleById(roleId);
    const roleName = role?.name || roleId;
    
    // Load the actual action and choice from actions.json
    const choice = await this.gameData.getChoiceById(actionId, choiceId);
    
    if (!choice) {
      console.error(`[GAME-ENGINE] Choice not found for actionId: ${actionId}, choiceId: ${choiceId}`);
      // Fallback to minimal stub to prevent crashes
      const fallbackChoice = {
        effects_immediate: { money: -1000 },
        effects_delayed: {}
      };
      console.log(`[GAME-ENGINE] Using fallback choice data`);
      
      // Apply fallback effects and return
      if (fallbackChoice.effects_immediate) {
        const effects: Record<string, number> = {};
        for (const [key, value] of Object.entries(fallbackChoice.effects_immediate)) {
          if (typeof value === 'number') {
            effects[key] = value;
          }
        }
        this.applyEffects(effects, summary);
      }
      return;
    }
    
    console.log(`[GAME-ENGINE] Loaded real choice data:`, {
      actionId,
      choiceId,
      immediateEffects: choice.effects_immediate,
      delayedEffects: choice.effects_delayed
    });

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

    // Process executive-specific updates (mood, loyalty)
    // This happens after choice effects are applied
    // Pass choice data so we can extract mood effects
    const actionWithChoice = {
      ...action,
      metadata: {
        ...action.metadata,
        choiceEffects: choice
      }
    };
    await this.processExecutiveActions(actionWithChoice, summary, dbTransaction);

    summary.changes.push({
      type: 'meeting',
      description: `Met with ${roleName}`,
      roleId: roleId
    });
  }

  /**
   * Processes executive-specific effects from actions
   * Updates mood, loyalty, and lastActionMonth when executives are used
   */
  private async processExecutiveActions(
    action: GameEngineAction,
    summary: MonthSummary,
    dbTransaction?: any
  ): Promise<void> {
    // Skip CEO meetings - player IS the CEO, no executive to update
    const roleId = action.metadata?.roleId;
    if (roleId === 'ceo') {
      console.log('[GAME-ENGINE] CEO meeting - player is the CEO, no executive to update');
      return;
    }
    
    const executiveId = action.metadata?.executiveId;
    if (!executiveId) {
      console.log('[GAME-ENGINE] No executiveId in action metadata, skipping executive processing');
      return;
    }

    console.log('[GAME-ENGINE] Processing executive actions for executiveId:', executiveId);
    
    // Track that this executive was used this month
    (summary as any).usedExecutives.add(executiveId);
    
    // Get executive from database
    const executive = await this.storage.getExecutive(executiveId);
    if (!executive) {
      console.log('[GAME-ENGINE] Executive not found:', executiveId);
      return;
    }

    console.log('[GAME-ENGINE] Current executive state:', {
      role: executive.role,
      mood: executive.mood,
      loyalty: executive.loyalty
    });

    // Apply mood changes from the action choice
    // Look for executive_mood in choice effects (immediate or delayed)
    let moodChange = 0;
    const choiceEffects = action.metadata?.choiceEffects;
    if (choiceEffects) {
      // Check immediate effects for executive_mood
      if (choiceEffects.effects_immediate?.executive_mood) {
        moodChange = choiceEffects.effects_immediate.executive_mood;
      }
      // Check artist_mood as fallback (some choices use this)
      else if (choiceEffects.effects_immediate?.artist_mood) {
        moodChange = choiceEffects.effects_immediate.artist_mood;
      }
      // Default to small positive boost if no specific mood effect
      else {
        moodChange = 5; // Small boost for interaction
      }
    } else {
      // Fallback if no choice data (shouldn't happen)
      moodChange = 5;
      console.log('[GAME-ENGINE] Warning: No choice effects found, using default mood boost');
    }
    
    const newMood = Math.max(0, Math.min(100, executive.mood + moodChange));
    
    // Boost loyalty for being used (+5 for interaction)
    const newLoyalty = Math.min(100, executive.loyalty + 5);
    
    // Update last action month
    const currentMonth = this.gameState.currentMonth || 1;

    console.log('[GAME-ENGINE] Updating executive:', {
      moodChange,
      newMood,
      newLoyalty,
      lastActionMonth: currentMonth
    });

    // Save changes to database
    await this.storage.updateExecutive(
      executive.id,
      {
        mood: newMood,
        loyalty: newLoyalty,
        lastActionMonth: currentMonth
      },
      dbTransaction
    );

    // Add to summary for UI feedback
    summary.changes.push({
      type: 'executive_interaction',
      description: `Met with ${executive.role}`,
      moodChange,
      newMood,
      loyaltyBoost: 5,
      newLoyalty
    });

    console.log('[GAME-ENGINE] Executive updated successfully');
  }

  /**
   * Applies immediate effects to game state
   */
  private applyEffects(effects: Record<string, number>, summary: MonthSummary): void {
    for (const [key, value] of Object.entries(effects)) {
      switch (key) {
        case 'money':
          // Note: Money changes will be handled by consolidated financial calculation
          if (value > 0) {
            summary.revenue += value;
            // Add change record for positive money from role meetings so it shows in revenue breakdown
            summary.changes.push({
              type: 'revenue',
              description: 'Executive meeting benefit',
              amount: value
            });
          } else {
            summary.expenses += Math.abs(value);
            // Track role meeting costs in breakdown
            if (!summary.expenseBreakdown) {
              summary.expenseBreakdown = {
                monthlyOperations: 0,
                artistSalaries: 0,
                executiveSalaries: 0,
                projectCosts: 0,
                marketingCosts: 0,
                roleMeetingCosts: 0
              };
            }
            summary.expenseBreakdown.roleMeetingCosts += Math.abs(value);
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
          // Enhanced effect processing with validation and logging
          if (!summary.artistChanges) summary.artistChanges = {};
          const previousMoodChange = summary.artistChanges.mood || 0;
          summary.artistChanges.mood = previousMoodChange + value;
          
          // Add comprehensive logging
          console.log(`[EFFECT PROCESSING] Artist mood effect: ${value > 0 ? '+' : ''}${value} (accumulated: ${summary.artistChanges.mood})`);
          
          // Add to summary changes for UI display
          summary.changes.push({
            type: 'mood',
            description: `Artist morale ${value > 0 ? 'improved' : 'decreased'} from meeting decision (${value > 0 ? '+' : ''}${value})`,
            amount: value
          });
          
          // Validation: Warn if accumulated changes are extreme
          if (Math.abs(summary.artistChanges.mood) > 10) {
            console.warn(`[EFFECT VALIDATION] Large accumulated mood change: ${summary.artistChanges.mood}`);
          }
          break;
          
        case 'artist_loyalty':
          // Enhanced effect processing with validation and logging
          if (!summary.artistChanges) summary.artistChanges = {};
          const previousLoyaltyChange = summary.artistChanges.loyalty || 0;
          summary.artistChanges.loyalty = previousLoyaltyChange + value;
          
          // Add comprehensive logging
          console.log(`[EFFECT PROCESSING] Artist loyalty effect: ${value > 0 ? '+' : ''}${value} (accumulated: ${summary.artistChanges.loyalty})`);
          
          // Add to summary changes for UI display (using mood type with loyaltyBoost field)
          summary.changes.push({
            type: 'mood',
            description: `Artist loyalty ${value > 0 ? 'increased' : 'decreased'} from meeting decision (${value > 0 ? '+' : ''}${value})`,
            loyaltyBoost: value
          });
          
          // Validation: Warn if accumulated changes are extreme
          if (Math.abs(summary.artistChanges.loyalty) > 10) {
            console.warn(`[EFFECT VALIDATION] Large accumulated loyalty change: ${summary.artistChanges.loyalty}`);
          }
          break;
          
        case 'artist_popularity':
          // Enhanced effect processing with validation and logging
          if (!summary.artistChanges) summary.artistChanges = {};
          const previousPopularityChange = summary.artistChanges.popularity || 0;
          summary.artistChanges.popularity = previousPopularityChange + value;
          
          // Add comprehensive logging
          console.log(`[EFFECT PROCESSING] Artist popularity effect: ${value > 0 ? '+' : ''}${value} (accumulated: ${summary.artistChanges.popularity})`);
          
          // Add to summary changes for UI display
          summary.changes.push({
            type: 'popularity',
            description: `Artist popularity ${value > 0 ? 'increased' : 'decreased'} from meeting decision (${value > 0 ? '+' : ''}${value})`,
            amount: value
          });
          
          // Validation: Warn if accumulated changes are extreme
          if (Math.abs(summary.artistChanges.popularity) > 10) {
            console.warn(`[EFFECT VALIDATION] Large accumulated popularity change: ${summary.artistChanges.popularity}`);
          }
          break;
      }
    }
  }

  /**
   * Calculates streaming revenue for a release
   * Uses the formula from balance.json
   */
  // DELEGATED TO FinancialSystem (originally lines 360-410)
  calculateStreamingOutcome(
    quality: number,
    playlistAccess: string,
    reputation: number,
    adSpend: number
  ): number {
    return this.financialSystem.calculateStreamingOutcome(
      quality,
      playlistAccess,
      reputation,
      adSpend
    );
  }

  /**
   * Calculates press coverage for a release
   */
  // DELEGATED TO FinancialSystem
  calculatePressPickups(
    pressAccess: string,
    prSpend: number,
    reputation: number,
    hasStoryFlag: boolean
  ): number {
    return this.financialSystem.calculatePressPickups(
      pressAccess,
      prSpend,
      reputation,
      hasStoryFlag,
      () => this.getRandom(0, 1),
      this.getAccessChance.bind(this)
    );
  }

  /**
   * Calculates press coverage outcome including pickups and reputation gain
   */
  // DELEGATED TO FinancialSystem
  calculatePressOutcome(
    quality: number,
    pressAccess: string,
    reputation: number,
    marketingBudget: number
  ): { pickups: number; reputationGain: number } {
    return this.financialSystem.calculatePressOutcome(
      quality,
      pressAccess,
      reputation,
      marketingBudget,
      () => this.getRandom(0, 1),
      this.getAccessChance.bind(this)
    );
  }

  /**
   * Calculates tour revenue
   */

  /**
   * Gets random number using seeded RNG
   */
  private getRandom(min: number, max: number): number {
    return min + (this.rng() * (max - min));
  }

  /**
   * Helper to get access tier chances
   */
  // DELEGATED TO FinancialSystem
  private getAccessChance(type: string, tier: string): number {
    return this.financialSystem.getAccessChance(type, tier);
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
  private async calculateMonthlyBurn(): Promise<number> {
    const result = await this.calculateMonthlyBurnWithBreakdown();
    return result.total;
  }

  /**
   * Calculates monthly operational costs with detailed breakdown for transparency
   */
  // DELEGATED TO FinancialSystem (originally lines 572-617)
  private async calculateMonthlyBurnWithBreakdown(): Promise<{
    total: number;
    baseBurn: number;
    artistCosts: number;
    artistDetails: Array<{name: string, monthlyFee: number}>;
  }> {
    return this.financialSystem.calculateMonthlyBurnWithBreakdown(
      this.gameState.id || '',
      this.storage
    );
  }


  /**
   * Processes ongoing projects (recordings, tours, etc)
   * NOTE: This function is currently unused but kept for potential future use
   */
  // private async processOngoingProjects(summary: MonthSummary, dbTransaction?: any): Promise<void> {
  //   // Projects are now managed via flags since they're not part of database gameState
  //   const flags = this.gameState.flags || {};
  //   const projects = (flags as any)['active_projects'] || [];
  //   for (const project of projects) {
  //     if (project.status === 'in_progress') {
  //       project.monthsRemaining = (project.monthsRemaining || 0) - 1;
  //       
  //       if (project.monthsRemaining <= 0) {
  //         project.status = 'completed';
  //         
  //         // Calculate project outcomes based on type
  //         const outcomes = await this.calculateProjectOutcomes(project, summary);
  //         
  //         summary.changes.push({
  //           type: 'project_complete',
  //           description: `Completed ${project.type}: ${project.name} - ${outcomes.description}`,
  //           projectId: project.id,
  //           amount: outcomes.revenue
  //         });
  //       }
  //     }
  //   }
  //   
  //   // Process ongoing revenue from released projects
  //   await this.processReleasedProjects(summary);
  //   
  //   // Process song generation for recording projects
  //   await this.processRecordingProjects(summary, dbTransaction);
  // }

  /**
   * Processes ongoing revenue from individual released songs (streaming decay)
   * This simulates realistic revenue patterns where each song generates declining revenue over time
   */
  private async processReleasedProjects(summary: MonthSummary): Promise<void> {
    console.log('[INDIVIDUAL SONG DECAY] === Processing Released Songs ===');
    console.log(`[INDIVIDUAL SONG DECAY] Current month: ${this.gameState.currentMonth}`);
    
    try {
      // Get all released songs for this game
      const releasedSongs = await this.gameData.getReleasedSongs(this.gameState.id) || [];
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
          
          // Get revenue per stream from balance.json configuration
          const streamingConfig = this.gameData.getStreamingConfigSync();
          const revenuePerStream = streamingConfig.ongoing_streams.revenue_per_stream;
          
          // Track song updates for batch processing
          songUpdates.push({
            songId: song.id,
            monthlyStreams: Math.round(ongoingRevenue / revenuePerStream), // Reverse calculate streams
            lastMonthRevenue: Math.round(ongoingRevenue),
            totalRevenue: Math.round((song.totalRevenue || 0) + ongoingRevenue),
            totalStreams: (song.totalStreams || 0) + Math.round(ongoingRevenue / revenuePerStream)
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
      
      // Add total ongoing revenue and streams to summary
      if (totalOngoingRevenue > 0) {
        summary.revenue += totalOngoingRevenue;
        // Calculate total streams from revenue (reverse calculation)
        // Get revenue per stream from balance.json configuration
        const streamingConfig = this.gameData.getStreamingConfigSync();
        const revenuePerStream = streamingConfig.ongoing_streams.revenue_per_stream;
        const totalStreams = Math.round(totalOngoingRevenue / revenuePerStream);
        summary.streams = (summary.streams || 0) + totalStreams;
        console.log(`[INDIVIDUAL SONG DECAY] Total ongoing revenue: $${totalOngoingRevenue}, streams: ${totalStreams}`);
      }
      
    } catch (error) {
      console.error('[INDIVIDUAL SONG DECAY] Error processing released songs:', error);
      // No fallback - individual song processing is the only path
    }
    
    console.log('[INDIVIDUAL SONG DECAY] === End Processing ===');
  }

  /**
   * Processes lead singles that are scheduled for release this month (before the main release)
   * Checks all planned releases for lead single strategies and releases them early
   */
  private async processLeadSingles(summary: MonthSummary, dbTransaction?: any): Promise<void> {
    console.log('[LEAD SINGLE] 🎯🎯🎯 === STARTING LEAD SINGLE PROCESSING === 🎯🎯🎯');
    const currentMonth = this.gameState.currentMonth || 1;
    console.log(`[LEAD SINGLE] 📅 Current month: ${currentMonth}`);
    console.log(`[LEAD SINGLE] 🎮 Game ID: ${this.gameState.id}`);
    console.log(`[LEAD SINGLE] 💾 Transaction available: ${!!dbTransaction}`);
    
    try {
      // Get all planned releases from gameData to check for lead single strategies
      // We need ALL planned releases, not just those for the current month
      console.log('[LEAD SINGLE] 🔍 Fetching all releases from database...');
      const allReleases = await this.gameData.getReleasesByGame(this.gameState.id, dbTransaction) || [];
      console.log(`[LEAD SINGLE] 📦 Total releases found: ${allReleases.length}`);
      
      const plannedReleases = allReleases.filter((r: any) => r.status === 'planned');
      console.log(`[LEAD SINGLE] 📋 Planned releases: ${plannedReleases.length}`);
      
      // Enhanced debugging: Log ALL releases with their metadata
      console.log('[LEAD SINGLE] 🔬 === DETAILED RELEASE ANALYSIS ===');
      plannedReleases.forEach((release: any, index: number) => {
        console.log(`[LEAD SINGLE] Release #${index + 1}:`, {
          id: release.id,
          title: release.title,
          type: release.type,
          status: release.status,
          releaseMonth: release.releaseMonth,
          hasMetadata: !!release.metadata,
          metadataType: typeof release.metadata,
          metadataKeys: release.metadata ? Object.keys(release.metadata) : [],
          hasLeadSingleStrategy: !!(release.metadata?.leadSingleStrategy),
          leadSingleDetails: release.metadata?.leadSingleStrategy ? {
            leadSingleId: release.metadata.leadSingleStrategy.leadSingleId,
            leadSingleReleaseMonth: release.metadata.leadSingleStrategy.leadSingleReleaseMonth,
            leadSingleBudget: release.metadata.leadSingleStrategy.leadSingleBudget,
            monthComparison: {
              leadSingleMonth: release.metadata.leadSingleStrategy.leadSingleReleaseMonth,
              currentMonth: currentMonth,
              shouldRelease: release.metadata.leadSingleStrategy.leadSingleReleaseMonth === currentMonth
            }
          } : null
        });
      });
      
      // Count how many lead singles should release this month
      const leadSinglesToRelease = plannedReleases.filter((r: any) => {
        const lss = r.metadata?.leadSingleStrategy;
        return lss && lss.leadSingleReleaseMonth === currentMonth;
      });
      console.log(`[LEAD SINGLE] ⭐ ${leadSinglesToRelease.length} lead single(s) should release this month`);
      
      for (const release of plannedReleases) {
        const metadata = release.metadata as any;
        const leadSingleStrategy = metadata?.leadSingleStrategy;
        
        // Enhanced debugging for each release
        if (leadSingleStrategy) {
          console.log(`[LEAD SINGLE] 🎵 Checking release "${release.title}":`, {
            releaseId: release.id,
            leadSingleId: leadSingleStrategy.leadSingleId,
            leadSingleReleaseMonth: leadSingleStrategy.leadSingleReleaseMonth,
            mainReleaseMonth: release.releaseMonth,
            currentMonth: currentMonth,
            monthMatch: leadSingleStrategy.leadSingleReleaseMonth === currentMonth,
            willRelease: leadSingleStrategy.leadSingleReleaseMonth === currentMonth ? '✅ YES' : '❌ NO'
          });
        }
        
        if (leadSingleStrategy && leadSingleStrategy.leadSingleReleaseMonth === currentMonth) {
          console.log(`[LEAD SINGLE] 🚀🚀🚀 EXECUTING LEAD SINGLE RELEASE 🚀🚀🚀`);
          console.log(`[LEAD SINGLE] 📀 Release: "${release.title}" (ID: ${release.id})`);
          console.log(`[LEAD SINGLE] 📅 Main release scheduled for month ${release.releaseMonth}`);
          
          // Get the lead single song
          console.log(`[LEAD SINGLE] 🔍 Fetching songs for release ${release.id}...`);
          const releaseSongs = await this.gameData.getSongsByRelease(release.id, dbTransaction) || [];
          console.log(`[LEAD SINGLE] 📋 Found ${releaseSongs.length} songs in release`);
          console.log(`[LEAD SINGLE] 🎵 Songs:`, releaseSongs.map(s => ({
            id: s.id,
            title: s.title,
            quality: s.quality,
            isReleased: s.isReleased,
            isLeadSingle: s.id === leadSingleStrategy.leadSingleId
          })));
          
          const leadSong = releaseSongs.find(song => song.id === leadSingleStrategy.leadSingleId);
          
          if (leadSong) {
            console.log(`[LEAD SINGLE] ✅ Found lead single: "${leadSong.title}" (ID: ${leadSong.id})`);
            console.log(`[LEAD SINGLE] 📊 Lead single details:`, {
              id: leadSong.id,
              title: leadSong.title,
              quality: leadSong.quality,
              isAlreadyReleased: leadSong.isReleased,
              currentStreams: leadSong.totalStreams || 0,
              currentRevenue: leadSong.totalRevenue || 0
            });
            
            // Calculate lead single performance
            console.log(`[LEAD SINGLE] 💰 Calculating budget...`);
            const budgetBreakdown = leadSingleStrategy.leadSingleBudget || {};
            console.log(`[LEAD SINGLE] 💵 Budget breakdown:`, budgetBreakdown);
            const leadSingleBudget = Object.values(budgetBreakdown).reduce((sum: number, budget) => sum + (budget as number), 0);
            console.log(`[LEAD SINGLE] 💵 Total lead single budget: $${leadSingleBudget}`);
            
            console.log(`[LEAD SINGLE] 📈 Calculating streaming outcome...`);
            console.log(`[LEAD SINGLE] 📊 Input parameters:`, {
              songQuality: leadSong.quality || 50,
              playlistAccess: this.gameState.playlistAccess || 'none',
              reputation: this.gameState.reputation || 0,
              marketingBudget: leadSingleBudget
            });
            
            const initialStreams = this.calculateStreamingOutcome(
              leadSong.quality || 50,
              this.gameState.playlistAccess || 'none', 
              this.gameState.reputation || 0,
              leadSingleBudget
            );
            console.log(`[LEAD SINGLE] 🎯 Calculated initial streams: ${initialStreams}`);
            
            const streamingConfig = this.gameData.getStreamingConfigSync();
            const revenuePerStream = streamingConfig.ongoing_streams.revenue_per_stream;
            const initialRevenue = Math.round(initialStreams * revenuePerStream);
            
            // Update the lead song as released
            console.log(`[LEAD SINGLE] 💾 Updating song in database...`);
            // Allocate lead single marketing via InvestmentTracker before song update
            if (this.financialSystem.investmentTracker && leadSingleBudget > 0) {
              try {
                await this.financialSystem.investmentTracker.allocateMarketingToSong(
                  release.id,
                  leadSong.id,
                  leadSingleBudget,
                  dbTransaction
                );
              } catch (allocError) {
                console.warn(`[LEAD SINGLE] ⚠️ Marketing allocation skipped or failed:`, allocError);
              }
            }

            const songUpdate = {
              songId: leadSong.id,
              isReleased: true,
              releaseMonth: currentMonth,
              initialStreams: initialStreams,
              monthlyStreams: initialStreams,
              totalStreams: (leadSong.totalStreams || 0) + initialStreams,
              totalRevenue: Math.round((leadSong.totalRevenue || 0) + initialRevenue),
              lastMonthRevenue: Math.round(initialRevenue)
            };
            console.log(`[LEAD SINGLE] 📝 Song update payload (marketing handled by InvestmentTracker):`, songUpdate);
            
            try {
              await this.gameData.updateSongs([songUpdate], dbTransaction);
              console.log(`[LEAD SINGLE] ✅ Song successfully updated in database`);
            } catch (updateError) {
              console.error(`[LEAD SINGLE] ❌ Failed to update song:`, updateError);
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
            
            console.log(`[LEAD SINGLE] 🎉 === LEAD SINGLE RELEASE COMPLETE === 🎉`);
            console.log(`[LEAD SINGLE] 📊 Final results:`, {
              songTitle: leadSong.title,
              revenue: `$${initialRevenue}`,
              streams: initialStreams,
              addedToMonth: currentMonth,
              mainReleaseMonth: release.releaseMonth
            });
          } else {
            console.warn(`[LEAD SINGLE] ⚠️ Lead song not found!`);
            console.warn(`[LEAD SINGLE] 🔍 Looking for song ID: ${leadSingleStrategy.leadSingleId}`);
            console.warn(`[LEAD SINGLE] 📋 Available songs:`, releaseSongs.map(s => ({ id: s.id, title: s.title })));
          }
        }
      }
      
      console.log('[LEAD SINGLE] 🏁🏁🏁 === LEAD SINGLE PROCESSING COMPLETE === 🏁🏁🏁');
    } catch (error) {
      console.error('[LEAD SINGLE] 🚨🚨🚨 CRITICAL ERROR 🚨🚨🚨');
      console.error('[LEAD SINGLE] Error details:', error);
      console.error('[LEAD SINGLE] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  /**
   * Processes planned releases that are scheduled for the current month
   * This executes the release, generates initial revenue, and updates song statuses
   */
  private async processPlannedReleases(summary: MonthSummary, dbTransaction?: any): Promise<void> {
    console.log('[PLANNED RELEASE] 🎯🎯🎯 === STARTING PLANNED RELEASE PROCESSING === 🎯🎯🎯');
    console.log(`[PLANNED RELEASE] 📅 Current month: ${this.gameState.currentMonth}`);
    console.log(`[PLANNED RELEASE] 🎮 Game state ID: ${this.gameState.id}`);
    console.log(`[PLANNED RELEASE] 💾 Transaction context: ${!!dbTransaction ? 'AVAILABLE' : 'MISSING'}`);
    
    try {
      // Get planned releases scheduled for this month
      const currentMonth = this.gameState.currentMonth || 1;
      console.log(`[PLANNED RELEASE] 🔍 Querying planned releases for gameId=${this.gameState.id}, month=${currentMonth}`);
      const plannedReleases = await this.gameData.getPlannedReleases(
        this.gameState.id, 
        currentMonth,
        dbTransaction
      ) || [];
      
      console.log(`[PLANNED RELEASE] 📦 Found ${plannedReleases.length} releases scheduled for this month`);
      
      if (plannedReleases.length === 0) {
        console.log('[PLANNED RELEASE] 📆 No releases scheduled for this month');
        return;
      }
      
      // Log all releases that will be processed
      console.log('[PLANNED RELEASE] 📋 Releases to process:');
      plannedReleases.forEach((release: any, index: number) => {
        console.log(`[PLANNED RELEASE] Release #${index + 1}:`, {
          id: release.id,
          title: release.title,
          type: release.type,
          releaseMonth: release.releaseMonth,
          marketingBudget: release.marketingBudget,
          hasLeadSingleStrategy: !!(release.metadata?.leadSingleStrategy)
        });
      })
      
      for (const release of plannedReleases) {
        console.log(`[PLANNED RELEASE] 🚀🚀🚀 EXECUTING RELEASE 🚀🚀🚀`);
        console.log(`[PLANNED RELEASE] 📀 Release: "${release.title}" (Type: ${release.type}, ID: ${release.id})`)
        
        // Get songs associated with this release
        console.log(`[PLANNED RELEASE] 🎵 Fetching songs for release...`);
        const releaseSongs = await this.gameData.getSongsByRelease(release.id, dbTransaction) || [];
        console.log(`[PLANNED RELEASE] 📋 Found ${releaseSongs.length} songs`);
        console.log(`[PLANNED RELEASE] 🎶 Songs in release:`, releaseSongs.map(s => ({
          id: s.id,
          title: s.title,
          quality: s.quality,
          isReleased: s.isReleased,
          isRecorded: s.isRecorded,
          totalStreams: s.totalStreams || 0,
          totalRevenue: s.totalRevenue || 0
        })));
        
        if (releaseSongs.length === 0) {
          console.warn(`[PLANNED RELEASE] ⚠️ No songs found for release "${release.title}", skipping`);
          continue;
        }
        
        // Calculate release performance using existing preview calculation logic
        const avgQuality = releaseSongs.reduce((sum, song) => sum + (song.quality || 50), 0) / releaseSongs.length;
        const marketingBudget = release.marketingBudget || 0;
        
        // Calculate initial streams for each song
        let totalRevenue = 0;
        let totalStreams = 0;
        const songUpdates = [];
        
        // Check if this release has a lead single strategy and filter out already released songs
        const metadata = release.metadata as any;
        const leadSingleStrategy = metadata?.leadSingleStrategy;
        
        console.log(`[PLANNED RELEASE] 🎯 Lead single strategy:`, leadSingleStrategy ? {
          hasLeadSingle: true,
          leadSingleId: leadSingleStrategy.leadSingleId,
          leadSingleReleaseMonth: leadSingleStrategy.leadSingleReleaseMonth,
          mainReleaseMonth: currentMonth
        } : { hasLeadSingle: false });
        
        // Count how many songs will be processed
        const alreadyReleasedSongs = releaseSongs.filter(s => s.isReleased);
        const songsToRelease = releaseSongs.filter(s => !s.isReleased);
        console.log(`[PLANNED RELEASE] 📊 Song statistics:`, {
          totalSongs: releaseSongs.length,
          alreadyReleased: alreadyReleasedSongs.length,
          toRelease: songsToRelease.length,
          leadSingleAlreadyReleased: leadSingleStrategy ? 
            alreadyReleasedSongs.some(s => s.id === leadSingleStrategy.leadSingleId) : false
        });
        
        for (const song of releaseSongs) {
          // CRITICAL FIX: Skip songs that are already released (lead singles)
          if (song.isReleased) {
            console.log(`[PLANNED RELEASE] ⏭️ SKIPPING "${song.title}" (ID: ${song.id})`);
            console.log(`[PLANNED RELEASE] 📊 Reason: Already released`);
            console.log(`[PLANNED RELEASE] 📋 Existing stats:`, {
              totalStreams: song.totalStreams || 0,
              totalRevenue: song.totalRevenue || 0,
              releaseMonth: song.releaseMonth,
              isLeadSingle: leadSingleStrategy?.leadSingleId === song.id
            });
            continue;
          }
          
          console.log(`[PLANNED RELEASE] 🎯 Processing song: "${song.title}" (ID: ${song.id})`)
          
          // Calculate initial streams using existing streaming calculation
          const initialStreams = this.calculateStreamingOutcome(
            song.quality || 50,
            this.gameState.playlistAccess || 'none',
            this.gameState.reputation || 0,
            marketingBudget / releaseSongs.length // Distribute marketing budget across songs
          );
          
          // Lead single boost: if this release had a successful lead single, boost remaining songs
          let leadSingleBoost = 1.0;
          if (leadSingleStrategy) {
            console.log(`[PLANNED RELEASE] 🔍 Checking for lead single boost...`);
            const leadSong = releaseSongs.find(s => s.id === leadSingleStrategy.leadSingleId);
            if (leadSong) {
              console.log(`[PLANNED RELEASE] 🎵 Lead single found: "${leadSong.title}"`);
              console.log(`[PLANNED RELEASE] 📊 Lead single stats:`, {
                isReleased: leadSong.isReleased,
                totalStreams: leadSong.totalStreams || 0,
                totalRevenue: leadSong.totalRevenue || 0
              });
              
              if (leadSong.isReleased && leadSong.totalStreams && leadSong.totalStreams > 0) {
                // Boost based on lead single performance (10-30% boost)
                leadSingleBoost = 1.0 + Math.min(0.3, (leadSong.totalStreams || 0) / 100000);
                console.log(`[PLANNED RELEASE] ✨ Lead single boost calculated: ${((leadSingleBoost - 1) * 100).toFixed(1)}%`);
                console.log(`[PLANNED RELEASE] 📈 Boost formula: min(30%, streams/100k) = min(30%, ${leadSong.totalStreams}/100000)`);
              } else {
                console.log(`[PLANNED RELEASE] ❌ No boost - lead single not properly released or no streams`);
              }
            } else {
              console.log(`[PLANNED RELEASE] ⚠️ Lead single song not found in release songs`);
            }
          }
          
          const boostedStreams = Math.round(initialStreams * leadSingleBoost);
          
          // Get revenue per stream from config
          const streamingConfig = this.gameData.getStreamingConfigSync();
          const revenuePerStream = streamingConfig.ongoing_streams.revenue_per_stream;
          const initialRevenue = Math.round(boostedStreams * revenuePerStream);
          
          totalStreams += boostedStreams;
          totalRevenue += initialRevenue;
          
          // Calculate per-song marketing allocation
          if (this.financialSystem.investmentTracker && marketingBudget > 0) {
            try {
              await this.financialSystem.investmentTracker.allocateMarketingInvestment(
                release.id,
                marketingBudget,
                dbTransaction
              );
            } catch (allocError) {
              console.warn(`[PLANNED RELEASE] ⚠️ Base marketing allocation skipped or failed:`, allocError);
            }
          }
          
          // Prepare song update (marketing handled by InvestmentTracker)
          songUpdates.push({
            songId: song.id,
            isReleased: true,
            releaseMonth: this.gameState.currentMonth,
            initialStreams: boostedStreams,
            monthlyStreams: boostedStreams,
            totalStreams: (song.totalStreams || 0) + boostedStreams,
            totalRevenue: Math.round((song.totalRevenue || 0) + initialRevenue),
            lastMonthRevenue: Math.round(initialRevenue)
          });
          
          console.log(`[PLANNED RELEASE] Song "${song.title}" - Initial streams: ${boostedStreams}, Revenue: $${initialRevenue}`);
        }
        
        // Apply release type and seasonal multipliers
        const releaseTypeMultiplier = this.getReleaseTypeMultiplier(release.type);
        const seasonalMultiplier = this.getSeasonalMultiplier(currentMonth);
        
        totalRevenue = Math.round(totalRevenue * releaseTypeMultiplier * seasonalMultiplier);
        totalStreams = Math.round(totalStreams * releaseTypeMultiplier * seasonalMultiplier);
        
        // Update release status to 'released'
        await this.gameData.updateReleaseStatus(release.id, 'released', {
          releasedAt: currentMonth,
          initialStreams: totalStreams,
          totalRevenue: totalRevenue
        }, dbTransaction);
        
        // Update all songs
        if (songUpdates.length > 0 && this.gameData.updateSongs) {
          console.log(`[PLANNED RELEASE] Updating ${songUpdates.length} songs with release data`);
          await this.gameData.updateSongs(songUpdates, dbTransaction);
        }
        
        // Apply mood boost for successful release
        if (release.artistId) {
          const moodBoost = (release.type === 'album' || release.type === 'ep') ? 20 : 5;
          
          // Track mood change for later application in processMonthlyMoodChanges
          if (!summary.artistChanges) {
            summary.artistChanges = {};
          }
          summary.artistChanges[release.artistId] = 
            (summary.artistChanges[release.artistId] || 0) + moodBoost;
          
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
          amount: -marketingBudget
        });
        
        summary.expenses += marketingBudget;
        
        // Track marketing costs in breakdown
        if (!summary.expenseBreakdown) {
          summary.expenseBreakdown = {
            monthlyOperations: 0,
            artistSalaries: 0,
            executiveSalaries: 0,
            projectCosts: 0,
            marketingCosts: 0,
            roleMeetingCosts: 0
          };
        }
        summary.expenseBreakdown.marketingCosts += marketingBudget;
        
        // Check for press coverage based on marketing spend
        if (marketingBudget > 0) {
          const pressOutcome = this.calculatePressOutcome(
            avgQuality,
            this.gameState.pressAccess || 'none',
            this.gameState.reputation || 0,
            marketingBudget
          );
          
          if (pressOutcome.pickups > 0) {
            const reputationGain = pressOutcome.reputationGain;
            this.gameState.reputation = (this.gameState.reputation || 0) + reputationGain;
            
            summary.changes.push({
              type: 'reputation',
              description: `📰 Press coverage for "${release.title}"`,
              amount: reputationGain
            });
            
            summary.reputationChanges[release.artistId] = 
              (summary.reputationChanges[release.artistId] || 0) + reputationGain;
          }
        }
        
        console.log(`[PLANNED RELEASE] 🎉 === RELEASE COMPLETE === 🎉`);
        console.log(`[PLANNED RELEASE] 📊 Final statistics for "${release.title}":`, {
          songsReleased: songUpdates.length,
          totalRevenue: `$${totalRevenue}`,
          totalStreams: totalStreams,
          marketingSpent: `$${marketingBudget}`,
          netRevenue: `$${totalRevenue - marketingBudget}`,
          hadLeadSingle: !!leadSingleStrategy,
          leadSingleBoostApplied: leadSingleStrategy ? 'Check individual songs above' : 'N/A'
        });
      }
      
    } catch (error) {
      console.error('[PLANNED RELEASE] CRITICAL ERROR processing planned releases:', error);
      console.error('[PLANNED RELEASE] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Add detailed error information to summary
      summary.changes.push({
        type: 'error',
        description: `CRITICAL: Planned release processing failed - ${error instanceof Error ? error.message : 'Unknown error'}`,
        amount: 0
      });
      
      // Re-throw the error to ensure transaction rollback on critical failures
      // Only swallow errors for non-critical issues like missing songs
      if (error instanceof Error && error.message.includes('No songs found')) {
        console.warn('[PLANNED RELEASE] Non-critical error, continuing processing');
      } else {
        console.error('[PLANNED RELEASE] Critical error, will cause transaction rollback');
        throw error;
      }
    }
    
    console.log('[PLANNED RELEASE] === End Processing ===');
  }
  
  /**
   * Gets the release type multiplier from balance.json
   */
  private getReleaseTypeMultiplier(releaseType: string): number {
    const balance = this.gameData.getBalanceConfigSync();
    const releaseTypeBonuses = balance?.market_formulas?.release_planning?.release_type_bonuses;
    
    if (!releaseTypeBonuses) {
      console.warn('[PLANNED RELEASE] No release type bonuses found in balance.json');
      return 1.0;
    }
    
    const typeData = releaseTypeBonuses[releaseType.toLowerCase()];
    return typeData?.revenue_multiplier || 1.0;
  }
  
  /**
   * Gets the seasonal multiplier for the current month
   */
  private getSeasonalMultiplier(month: number): number {
    const balance = this.gameData.getBalanceConfigSync();
    const seasonalModifiers = balance?.time_progression?.seasonal_modifiers;
    
    if (!seasonalModifiers) {
      console.warn('[PLANNED RELEASE] No seasonal modifiers found in balance.json');
      return 1.0;
    }
    
    // Determine quarter based on month within year (handles months 1-36)
    // Convert to 1-12 range: month 13 -> 1, month 25 -> 1, etc.
    const yearMonth = ((month - 1) % 12) + 1;
    const quarter = Math.ceil(yearMonth / 3);
    const quarterKey = `q${quarter}`;
    
    return seasonalModifiers[quarterKey] || 1.0;
  }

  /**
   * Processes newly recorded projects - projects that became "recorded" this month
   * This marks songs as recorded but does not release them (no revenue yet)
   */
  private async processNewlyRecordedProjects(summary: MonthSummary, dbTransaction?: any): Promise<void> {
    console.log('[NEWLY RECORDED] === Processing Newly Recorded Projects ===');
    console.log(`[NEWLY RECORDED] Current month: ${this.gameState.currentMonth}`);
    
    try {
      // Check if we have a method to get newly released projects
      if (!this.gameData.getNewlyReleasedProjects && !this.gameData.getProjectsByStage) {
        console.log('[NEWLY RELEASED] No method available to get newly released projects, checking gameState flags');
        
        // Check if there are released projects in gameState flags that need processing
        const releasedProjects = (this.gameState.flags as any)?.['released_projects'] || [];
        console.log(`[NEWLY RELEASED] Found ${releasedProjects.length} released projects in flags`);
        
        for (const project of releasedProjects) {
          await this.processProjectSongRecording(project, summary, dbTransaction);
        }
        return;
      }
      
      // Get all projects in "recorded" stage  
      let recordedProjects: any[] = [];
      if (this.gameData.getProjectsByStage) {
        recordedProjects = await this.gameData.getProjectsByStage(this.gameState.id || '', 'recorded', dbTransaction);
      } else if (this.gameData.getNewlyReleasedProjects) {
        // Note: This method name should be updated to getNewlyRecordedProjects in future
        recordedProjects = await this.gameData.getNewlyReleasedProjects(this.gameState.id || '', this.gameState.currentMonth || 1, dbTransaction);
      }
      
      console.log(`[NEWLY RECORDED] Found ${recordedProjects.length} recorded projects`);
      
      if (recordedProjects.length === 0) {
        console.log('[NEWLY RECORDED] No recorded projects found, skipping song recording processing');
        return;
      }
      
      // Process song recording completion for each project
      for (const project of recordedProjects) {
        await this.processProjectSongRecording(project, summary, dbTransaction);
      }
      
    } catch (error) {
      console.error('[NEWLY RECORDED] Error processing newly recorded projects:', error);
    }
    
    console.log('[NEWLY RECORDED] === End Processing ===');
  }

  /**
   * Process song recording completion for a specific project
   * This marks all songs from a completed recording project as recorded (but not released)
   */
  private async processProjectSongRecording(project: any, summary: MonthSummary, dbTransaction?: any): Promise<void> {
    console.log(`[PROJECT SONG RECORDING] Processing project "${project.title}" (ID: ${project.id})`);
    
    try {
      // Get songs for this project
      const projectSongs = await this.gameData.getSongsByProject(project.id) || [];
      console.log(`[PROJECT SONG RECORDING] Found ${projectSongs.length} songs for project`);
      
      // Filter to only unrecorded songs (songs that haven't completed recording)
      const unrecordedSongs = projectSongs.filter((song: any) => !song.isRecorded);
      console.log(`[PROJECT SONG RECORDING] ${unrecordedSongs.length} songs need recording completion`);
      
      if (unrecordedSongs.length === 0) {
        console.log(`[PROJECT SONG RECORDING] All songs already recorded for project "${project.title}"`);
        return;
      }
      
      // Process each unrecorded song - mark as recorded but NOT released
      for (const song of unrecordedSongs) {
        console.log(`[PROJECT SONG RECORDING] Completing recording for song "${song.title}" (quality: ${song.quality})`);
        
        // Update song in database - only mark as recorded
        if (this.gameData.updateSong) {
          const songUpdate = {
            isRecorded: true,
            isReleased: false, // Keep as false - will be set by Plan Release feature
            recordedAt: new Date(), // Track when recording completed
            updatedAt: new Date()
          };
          
          await this.gameData.updateSong(song.id, songUpdate, dbTransaction);
          console.log(`[PROJECT SONG RECORDING] ✅ Song "${song.title}" marked as recorded`);
        }
        
        // Add to summary - recording completion notification (no revenue yet)
        summary.changes.push({
          type: 'unlock',
          description: `🎵 "${song.title}" recording completed - ready for release`,
          amount: 0
        });
        
        console.log(`[PROJECT SONG RECORDING] Song "${song.title}" ready for release via Plan Release feature`);
      }
      
    } catch (error) {
      console.error(`[PROJECT SONG RECORDING] Error processing project "${project.title}":`, error);
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
      const recordingProjects = await this.gameData.getActiveRecordingProjects(this.gameState.id || '', dbTransaction);
      
      console.log(`[SONG GENERATION] Found ${recordingProjects?.length || 0} recording projects`);
      console.log('[SONG GENERATION] Projects:', recordingProjects?.map((p: any) => ({
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
          await this.generateMonthlyProjectSongs(project, summary, dbTransaction);
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
  private async generateMonthlyProjectSongs(project: any, summary: MonthSummary, dbTransaction?: any): Promise<void> {
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
            const savedSong = await this.gameData.createSong(song, dbTransaction);
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
        }, dbTransaction);
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
    
    // Get song names from data layer
    const songNamePools = this.gameData.getBalanceConfigSync()?.song_generation?.name_pools;
    const defaultSongNames = songNamePools?.default || [
      // Fallback if data not available
      'Midnight Dreams', 'City Lights', 'Hearts on Fire', 'Thunder Road'
    ];
    
    // Could use genre-specific names in future based on artist.genre
    const songNames = defaultSongNames;
    
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
    
    console.log('[GENERATE SONG] Budget calculation resolved:', {
      finalProjectBudget: projectBudget,
      calculationMethod: project.budgetPerSong ? 'budgetPerSong * songCount' : 
                          (project.totalCost ? 'totalCost' :
                          (project.budget ? 'budget' : 
                          (economicDecisions.finalBudget ? 'economicDecisions.finalBudget' : 'default 0')))
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
    
    console.log('[SONG GENERATION] Creating enhanced song with multiplicative quality:', { 
      gameId, 
      artistId, 
      projectId: project.id,
      projectTitle: project.title,
      artistName: artist?.name || 'Unknown',
      artistTalent: artist?.talent || 50,
      artistWorkEthic: artist?.workEthic || 50,
      artistPopularity: artist?.popularity || 0,
      artistMood: artist?.mood || 50,
      producerTier,
      timeInvestment,
      finalQuality,
      projectBudget,
      perSongBudget,
      songCount: project.songCount
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
      // Direct foreign key and investment tracking
      projectId: project.id,
      productionBudget: Math.round(perSongBudget),
      marketingAllocation: 0, // Will be set when release is planned
      // Simplified metadata - only quality calculation details
      metadata: {
        artistAttributes: {
          talent: artist.talent || 50,
          workEthic: artist.workEthic || 50,
          popularity: artist.popularity || 0,
          mood: artist.mood || 50
        },
        qualityCalculation: {
          formula: 'multiplicative_v2',
          baseQuality: Math.round((artist.talent || 50) * 0.65 + (producerTier === 'legendary' ? 95 : producerTier === 'national' ? 75 : producerTier === 'regional' ? 55 : 40) * 0.35),
          factors: {
            time: timeInvestment,
            producer: producerTier,
            songCount: project.songCount || 1,
            budgetPerSong: perSongBudget
          },
          final: finalQuality
        },
        generatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Calculates enhanced song quality using multiplicative formula with artist attributes
   * New formula incorporates talent, work ethic, and popularity
   */
  private calculateEnhancedSongQuality(
    artist: any, 
    project: any, 
    producerTier: string, 
    timeInvestment: string,
    budgetAmount?: number,
    songCount?: number
  ): number {
    // 1. BASE QUALITY (Talent + Producer Skill hybrid)
    const producerSkillMap: Record<string, number> = {
      'local': 40,
      'regional': 55,
      'national': 75,
      'legendary': 95
    };
    const producerSkill = producerSkillMap[producerTier] || 40;
    
    // Weighted average: talent matters more than producer
    const artistTalent = artist.talent || 50;
    const baseQuality = (artistTalent * 0.65 + producerSkill * 0.35);
    
    // 2. WORK ETHIC & TIME SYNERGY
    // Work ethic amplifies time investment effectiveness
    const timeMultipliers: Record<string, number> = {
      'rushed': 0.7,      // 70% efficiency
      'standard': 1.0,    // 100% efficiency (baseline)
      'extended': 1.1,    // 110% efficiency
      'perfectionist': 1.2 // 120% efficiency
    };
    
    const artistWorkEthic = artist.workEthic || 50;
    const workEthicBonus = (artistWorkEthic / 100) * 0.3; // up to 30% bonus
    const timeFactor = (timeMultipliers[timeInvestment] || 1.0) * (1 + workEthicBonus);
    
    // 3. POPULARITY IMPACT
    // Popularity attracts better session musicians, engineers, features
    const artistPopularity = artist.popularity || 0;
    const popularityFactor = 0.95 + 0.1 * Math.sqrt(artistPopularity / 100);
    // Results in 0.95x to 1.05x multiplier (10% total swing, more balanced)
    
    // 4. SESSION FATIGUE
    // Quality drops 3% per song after 3rd song
    const actualSongCount = songCount || project.songCount || 1;
    const focusFactor = Math.pow(0.97, Math.max(0, actualSongCount - 3));
    
    // 5. BUDGET IMPACT (using new multiplier method)
    const totalBudget = budgetAmount || project.totalCost || project.budgetPerSong || 0;
    const perSongBudget = totalBudget / actualSongCount;
    const budgetFactor = this.financialSystem.calculateBudgetQualityMultiplier(
      perSongBudget,
      project.type || 'single',
      producerTier,
      timeInvestment,
      actualSongCount
    );
    
    // 6. MOOD IMPACT (reduced influence)
    // Mood is temporary, shouldn't dominate permanent attributes
    const artistMood = artist.mood || 50;
    const moodFactor = 0.9 + 0.2 * (artistMood / 100); // 0.9x to 1.1x
    
    // 7. COMBINE WITH MULTIPLICATIVE APPROACH
    let quality = baseQuality;
    
    // Apply multiplicative factors
    quality *= timeFactor;        // 0.7x to 1.43x (with work ethic)
    quality *= popularityFactor;  // 0.8x to 1.1x  
    quality *= focusFactor;       // 0.85x to 1.0x (for typical 1-5 songs)
    quality *= budgetFactor;      // 0.7x to 1.3x
    quality *= moodFactor;        // 0.9x to 1.1x
    
    // 8. SKILL-BASED VARIANCE WITH OUTLIER SYSTEM
    // Higher skill = more consistent results, Lower skill = more random
    // Combine artist talent and producer skill to determine consistency
    const combinedSkill = (artistTalent + producerSkill) / 2; // 0-100 scale
    
    // Calculate base variance range based on skill level
    // Low skill (25): ±35% base variance (was 20%)
    // Medium skill (50): ±20% base variance (was 10%)
    // High skill (75): ±10% base variance (was 5%)
    // Max skill (100): ±5% base variance (was 2%)
    const baseVarianceRange = 35 - (30 * (combinedSkill / 100)); // 35% down to 5%
    
    // Check for outlier events (10% chance)
    const outlierRoll = Math.random();
    let variance: number;
    let outlierType = '';
    
    if (outlierRoll < 0.05) {
      // 5% chance of breakout hit (massive positive outlier)
      // Skill still matters: low skill gets bigger boost potential
      const outlierBoost = 1.5 + (0.5 * (1 - combinedSkill / 100)); // 1.5x to 2.0x for breakout
      variance = outlierBoost;
      outlierType = 'BREAKOUT HIT';
    } else if (outlierRoll < 0.10) {
      // 5% chance of critical failure (massive negative outlier)
      // Skill protects: high skill has less severe failures
      const outlierPenalty = 0.5 + (0.2 * (combinedSkill / 100)); // 0.5x to 0.7x for failure
      variance = outlierPenalty;
      outlierType = 'CRITICAL FAILURE';
    } else {
      // 90% normal variance within calculated range
      variance = 1 + (this.getRandom(-baseVarianceRange, baseVarianceRange) / 100);
    }
    
    quality *= variance;
    
    // Log the variance for debugging
    console.log(`[QUALITY VARIANCE] Skill-based variance:`, {
      artistTalent,
      producerSkill,
      combinedSkill: combinedSkill.toFixed(1),
      baseVarianceRange: `±${baseVarianceRange.toFixed(1)}%`,
      actualVariance: ((variance - 1) * 100).toFixed(1) + '%',
      outlierType: outlierType || 'NORMAL'
    });
    
    // 9. FLOOR AND CEILING
    // Ensure minimum quality even with bad inputs
    const QUALITY_FLOOR = 25;   // No song is completely worthless
    const QUALITY_CEILING = 98;  // Leave room for legendary moments
    
    const finalQuality = Math.round(Math.min(QUALITY_CEILING, Math.max(QUALITY_FLOOR, quality)));
    
    console.log(`[QUALITY CALC] New multiplicative song quality calculation:`, {
      baseQuality: baseQuality.toFixed(1),
      artistTalent,
      producerSkill,
      artistWorkEthic,
      timeFactor: timeFactor.toFixed(3),
      popularityFactor: popularityFactor.toFixed(3),
      focusFactor: focusFactor.toFixed(3),
      budgetFactor: budgetFactor.toFixed(3),
      moodFactor: moodFactor.toFixed(3),
      variance: variance.toFixed(3),
      rawQuality: quality.toFixed(1),
      finalQuality
    });
    
    return finalQuality;
  }

  /**
   * Calculates budget bonus for song quality using diminishing returns
   * Now works with per-song budget amounts for clearer understanding
   */
  // DELEGATED TO FinancialSystem (originally lines 1559-1619)
  calculateBudgetQualityBonus(
    budgetPerSong: number,
    projectType: string,
    producerTier: string,
    timeInvestment: string,
    songCount: number = 1
  ): number {
    return this.financialSystem.calculateBudgetQualityBonus(
      budgetPerSong,
      projectType,
      producerTier,
      timeInvestment,
      songCount
    );
  }

  /**
   * Calculates song count impact on individual song quality
   */
  // DELEGATED TO FinancialSystem (originally lines 1534-1560)
  calculateSongCountQualityImpact(songCount: number): number {
    return this.financialSystem.calculateSongCountQualityImpact(songCount);
  }

  /**
   * Generates a random mood for a song
   */
  private generateSongMood(): string {
    const moodTypes = this.gameData.getBalanceConfigSync()?.song_generation?.mood_types;
    const moods = moodTypes || ['upbeat', 'melancholic', 'aggressive', 'chill'];
    return moods[Math.floor(this.getRandom(0, moods.length))];
  }
  
  /**
   * Generates economic insight summary for song creation
   */
  // DELEGATED TO FinancialSystem
  private generateSongEconomicInsight(song: any, project: any): string {
    return FinancialSystem.generateSongEconomicInsight(song, project);
  }
  
  /**
   * Generates economic summary for project completion
   */
  // DELEGATED TO FinancialSystem
  private generateProjectCompletionSummary(project: any): string {
    return FinancialSystem.generateProjectCompletionSummary(project);
  }

  /**
   * Calculates ongoing revenue for an individual released song using streaming decay formula
   * Each song has its own decay pattern based on individual quality and release timing
   */
  // DELEGATED TO FinancialSystem (originally lines 1714-1782)
  private calculateOngoingSongRevenue(song: any): number {
    return this.financialSystem.calculateOngoingSongRevenue(
      song,
      this.gameState.currentMonth || 1,
      this.gameState.reputation || 0,
      this.gameState.playlistAccess || 'none'
    );
  }


  /**
   * Processes song release - calculates individual song streams and sets initial values
   * This is called when a project completes and songs are released
   */
  async processSongRelease(song: any, gameState?: any): Promise<{
    initialStreams: number;
    initialRevenue: number;
  }> {
    const currentGameState = gameState || this.gameState;
    const currentMonth = currentGameState.currentMonth || 1;
    
    console.log(`[SONG RELEASE] 🎯 ENTERING processSongRelease for song: "${song.title}"`);
    console.log(`[SONG RELEASE] Song details:`, {
      id: song.id,
      title: song.title,
      quality: song.quality,
      isReleased: song.isReleased,
      initialStreams: song.initialStreams
    });
    console.log(`[SONG RELEASE] Game state:`, {
      currentMonth,
      reputation: currentGameState.reputation,
      playlistAccess: currentGameState.playlistAccess
    });
    
    // Calculate initial streams using individual song quality (not project quality)
    const initialStreams = this.calculateStreamingOutcome(
      song.quality || 40,
      currentGameState.playlistAccess || 'none',
      currentGameState.reputation || 5,
      0 // For now, marketing spend is at project level; future enhancement for per-song marketing
    );
    
    // Calculate initial revenue from streams using balance.json configuration
    const streamingConfig = this.gameData.getStreamingConfigSync();
    const revenuePerStream = streamingConfig.ongoing_streams.revenue_per_stream;
    const initialRevenue = initialStreams * revenuePerStream;
    
    console.log(`[SONG RELEASE] Calculated for "${song.title}": ${initialStreams} streams, $${Math.round(initialRevenue)} revenue`);
    
    // Prepare song updates
    const songUpdates = {
      initialStreams: initialStreams,
      totalStreams: initialStreams,
      monthlyStreams: initialStreams,
      totalRevenue: Math.round(initialRevenue),
      lastMonthRevenue: Math.round(initialRevenue),
      releaseMonth: currentMonth,
      isReleased: true
    };
    
    // Update song in database if gameData method available
    console.log(`[SONG RELEASE] 💾 Preparing to update song in database`);
    console.log(`[SONG RELEASE] Song updates to apply:`, songUpdates);
    console.log(`[SONG RELEASE] updateSong method available:`, !!this.gameData.updateSong);
    
    if (this.gameData.updateSong) {
      try {
        console.log(`[SONG RELEASE] 🔄 Calling updateSong for song ID: ${song.id}`);
        const updateResult = await this.gameData.updateSong(song.id, songUpdates);
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
  async processProjectSongsRelease(project: any, projectStreams: number): Promise<{
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
    const projectSongs = await this.gameData.getSongsByProject(project.id) || [];
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
        const releaseResult = await this.processSongRelease(song);
        
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
   * Apply global artist mood/loyalty changes from executive meetings to database
   * This processes changes accumulated in summary.artistChanges.mood/loyalty
   * and applies them to ALL artists immediately
   */
  private async applyArtistChangesToDatabase(summary: MonthSummary, dbTransaction?: any): Promise<void> {
    // Check if there are any artist changes to apply
    if (!summary.artistChanges || (!summary.artistChanges.mood && !summary.artistChanges.loyalty && !summary.artistChanges.popularity)) {
      return;
    }

    // Get artists from storage
    if (!this.storage || !this.storage.getArtistsByGame) {
      console.warn('[ARTIST CHANGES] Storage not available for artist updates');
      return;
    }
    
    const artists = await this.storage.getArtistsByGame(this.gameState.id);
    if (!artists || artists.length === 0) {
      console.log('[ARTIST CHANGES] No artists found for mood/loyalty updates');
      return;
    }

    const moodChange = summary.artistChanges.mood || 0;
    const loyaltyChange = summary.artistChanges.loyalty || 0;
    const popularityChange = summary.artistChanges.popularity || 0;

    console.log(`[ARTIST CHANGES] Applying global changes: mood ${moodChange}, loyalty ${loyaltyChange}, popularity ${popularityChange} to ${artists.length} artists`);

    // Apply changes to all artists
    for (const artist of artists) {
      const updates: any = {};
      let hasUpdates = false;

      // Apply mood change
      if (moodChange !== 0) {
        const currentMood = artist.mood || 50;
        const newMood = Math.max(0, Math.min(100, currentMood + moodChange));
        updates.mood = newMood;
        hasUpdates = true;
        
        console.log(`[ARTIST CHANGES] ${artist.name}: mood ${currentMood} → ${newMood} (${moodChange > 0 ? '+' : ''}${moodChange})`);
      }

      // Apply loyalty change
      if (loyaltyChange !== 0) {
        const currentLoyalty = artist.loyalty || 50;
        const newLoyalty = Math.max(0, Math.min(100, currentLoyalty + loyaltyChange));
        updates.loyalty = newLoyalty;
        hasUpdates = true;
        
        console.log(`[ARTIST CHANGES] ${artist.name}: loyalty ${currentLoyalty} → ${newLoyalty} (${loyaltyChange > 0 ? '+' : ''}${loyaltyChange})`);
      }

      // Apply popularity change
      if (popularityChange !== 0) {
        const currentPopularity = artist.popularity || 0;
        const newPopularity = Math.max(0, Math.min(100, currentPopularity + popularityChange));
        updates.popularity = newPopularity;
        hasUpdates = true;
        
        console.log(`[ARTIST CHANGES] ${artist.name}: popularity ${currentPopularity} → ${newPopularity} (${popularityChange > 0 ? '+' : ''}${popularityChange})`);
      }

      // Update the artist in database
      if (hasUpdates && this.storage.updateArtist) {
        await this.storage.updateArtist(artist.id, updates);
      }
    }

    // Add summary entries for the changes
    if (moodChange !== 0) {
      summary.changes.push({
        type: 'mood',
        description: `Executive meeting ${moodChange > 0 ? 'boosted' : 'lowered'} all artists' mood (${moodChange > 0 ? '+' : ''}${moodChange})`,
        amount: moodChange
      });
    }

    if (loyaltyChange !== 0) {
      summary.changes.push({
        type: 'mood',
        description: `Executive meeting ${loyaltyChange > 0 ? 'boosted' : 'lowered'} all artists' loyalty (${loyaltyChange > 0 ? '+' : ''}${loyaltyChange})`,
        loyaltyBoost: loyaltyChange
      });
    }

    if (popularityChange !== 0) {
      summary.changes.push({
        type: 'popularity',
        description: `Executive meeting ${popularityChange > 0 ? 'boosted' : 'lowered'} all artists' popularity (${popularityChange > 0 ? '+' : ''}${popularityChange})`,
        amount: popularityChange
      });
    }

    // Clear the global changes since they've been applied
    summary.artistChanges.mood = 0;
    summary.artistChanges.loyalty = 0;
    summary.artistChanges.popularity = 0;
  }

  /**
   * Process monthly mood changes for all artists
   */
  private async processMonthlyMoodChanges(summary: MonthSummary): Promise<void> {
    // Get artists from storage if available
    if (!this.storage || !this.storage.getArtistsByGame) {
      return;
    }
    
    const artists = await this.storage.getArtistsByGame(this.gameState.id);
    if (!artists || artists.length === 0) return;
    
    // Get projects from storage if available
    const projects = this.storage.getProjectsByGame ? 
      await this.storage.getProjectsByGame(this.gameState.id) : [];
    
    for (const artist of artists) {
      let moodChange = 0;
      const currentMood = artist.mood || 50;
      
      // Apply any release-based mood changes (from processPlannedReleases)
      const releaseMoodBoost = summary.artistChanges?.[artist.id] || 0;
      if (releaseMoodBoost > 0) {
        moodChange += releaseMoodBoost;
        summary.changes.push({
          type: 'mood',
          description: `${artist.name}'s mood improved from successful release (+${releaseMoodBoost})`,
          amount: releaseMoodBoost
        });
      }
      
      // Count active projects for this artist
      const activeProjects = projects.filter(
        (p: any) => p.artistId === artist.id && 
        ['recording', 'mixing', 'mastering'].includes(p.stage)
      ).length;
      
      // Workload stress: -5 mood per project beyond 2
      if (activeProjects > 2) {
        moodChange -= (activeProjects - 2) * 5;
        summary.changes.push({
          type: 'mood',
          description: `${artist.name} is stressed from workload (${activeProjects} active projects)`,
          amount: moodChange
        });
      }
      
      // Natural drift toward 50 (by 3 points max)
      if (currentMood > 55) {
        moodChange -= 3;
      } else if (currentMood < 45) {
        moodChange += 3;
      }
      
      // Apply mood change
      if (moodChange !== 0) {
        const newMood = Math.max(0, Math.min(100, currentMood + moodChange));
        
        // Update artist mood in storage
        if (this.storage.updateArtist) {
          await this.storage.updateArtist(artist.id, { mood: newMood });
        }
        
        // Track change - always show the total mood change
        summary.changes.push({
          type: 'mood',
          description: `${artist.name}'s mood ${moodChange > 0 ? 'improved' : 'decreased'}`,
          amount: moodChange
        });
      }
    }
  }

  /**
   * Process monthly mood and loyalty decay for executives
   * - Loyalty decays when executives are ignored for 3+ months
   * - Mood naturally drifts toward neutral (50) over time
   */
  private async processExecutiveMoodDecay(summary: MonthSummary, dbTransaction?: any): Promise<void> {
    try {
      // Check if storage has executive methods
      if (!this.storage || !this.storage.getExecutivesByGame) {
        console.log('[GAME-ENGINE] No executive storage methods available, skipping decay');
        return;
      }
      
      const executives = await this.storage.getExecutivesByGame(this.gameState.id);
      if (!executives || executives.length === 0) {
        console.log('[GAME-ENGINE] No executives found for game, skipping decay');
        return;
      }
      
      const currentMonth = this.gameState.currentMonth || 1;
      console.log(`[GAME-ENGINE] Processing executive decay for month ${currentMonth}, ${executives.length} executives`);
      
      for (const exec of executives) {
      let moodChange = 0;
      let loyaltyChange = 0;
      const currentMood = exec.mood || 50;
      const currentLoyalty = exec.loyalty || 50;
      
      // Calculate loyalty decay for inactivity
      // If lastActionMonth is null/undefined, treat as never used (start from month 0)
      const lastAction = exec.lastActionMonth || 0;
      const monthsSinceAction = lastAction === 0 ? currentMonth : currentMonth - lastAction;
      
      // Check if executive was used this month using in-memory tracking
      // This avoids database transaction isolation issues
      const wasUsedThisMonth = (summary as any).usedExecutives.has(exec.id);
      
      console.log(`[DECAY] Executive ${exec.role}:`);
      console.log(`  - Current mood: ${currentMood}, loyalty: ${currentLoyalty}`);
      console.log(`  - Last used: Month ${lastAction === 0 ? 'Never' : lastAction}`);
      console.log(`  - Months since action: ${monthsSinceAction}`);
      console.log(`  - Used this month: ${wasUsedThisMonth}`);
      
      // Loyalty decay: -5 every month after being ignored for 3+ months
      if (monthsSinceAction >= 3 && !wasUsedThisMonth) {
        loyaltyChange = -5; // Consistent monthly penalty after 3 months of neglect
      }
      
      // Natural mood normalization toward 50 - but NOT for executives used this month
      // This prevents the +5/-5 conflict where used executives get cancelled out
      if (!wasUsedThisMonth) {
        if (currentMood > 55) {
          // Happy executives gradually calm down
          moodChange = -Math.min(5, currentMood - 50);
        } else if (currentMood < 45) {
          // Unhappy executives gradually recover
          moodChange = Math.min(5, 50 - currentMood);
        }
      }
      
      console.log(`  - Calculated mood change: ${moodChange}`);
      console.log(`  - Calculated loyalty change: ${loyaltyChange}`);
      
      // Apply changes if any
      if (moodChange !== 0 || loyaltyChange !== 0) {
        const newMood = Math.max(0, Math.min(100, currentMood + moodChange));
        const newLoyalty = Math.max(0, Math.min(100, currentLoyalty + loyaltyChange));
        
        console.log(`  - Final values: mood ${currentMood} → ${newMood}, loyalty ${currentLoyalty} → ${newLoyalty}`);
        
        // Update executive in storage with transaction context
        await this.storage.updateExecutive(exec.id, {
          mood: newMood,
          loyalty: newLoyalty
        }, dbTransaction);
        
        // Log loyalty decay to summary for user feedback
        if (loyaltyChange < 0) {
          summary.changes.push({
            type: 'executive_interaction',
            description: `${this.formatExecutiveRole(exec.role)}'s loyalty decreased (ignored for ${monthsSinceAction} months)`,
            amount: loyaltyChange
          });
        }
        
        // Log mood changes if significant
        if (Math.abs(moodChange) >= 3) {
          summary.changes.push({
            type: 'executive_interaction',
            description: `${this.formatExecutiveRole(exec.role)}'s mood ${moodChange > 0 ? 'improved' : 'declined'} naturally`,
            amount: moodChange
          });
        }
      } else {
        console.log(`  - No changes needed for ${exec.role}`);
      }
    }
    } catch (error) {
      console.error('[GAME-ENGINE] Error in processExecutiveMoodDecay:', error);
      // Don't throw - let the game continue even if executive decay fails
    }
  }

  /**
   * Helper to format executive role names for display
   */
  private formatExecutiveRole(role: string): string {
    const roleNames: Record<string, string> = {
      'head_ar': 'Head of A&R',
      'cmo': 'Chief Marketing Officer',
      'cco': 'Chief Creative Officer',
      'head_distribution': 'Head of Distribution'
    };
    return roleNames[role] || role;
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
    
    // Slot unlock functionality has been removed - these were non-functional placeholders
  }

  /**
   * Updates access tiers based on current reputation and returns tier upgrade notifications
   */
  private updateAccessTiers(): GameChange[] {
    const tiers = this.gameData.getAccessTiersSync();
    const reputation = this.gameState.reputation || 0;
    const tierChanges: GameChange[] = [];
    
    // Store previous values to detect changes
    const previousPlaylist = this.gameState.playlistAccess;
    const previousPress = this.gameState.pressAccess;
    const previousVenue = this.gameState.venueAccess;
    
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
    
    // Generate notifications for tier upgrades
    if (previousPlaylist !== this.gameState.playlistAccess && this.gameState.playlistAccess !== 'none') {
      const tierDisplay = this.gameState.playlistAccess === 'niche' ? 'Niche' :
                         this.gameState.playlistAccess === 'mid' ? 'Mid-Tier' :
                         this.gameState.playlistAccess === 'flagship' ? 'Flagship' : this.gameState.playlistAccess;
      tierChanges.push({
        type: 'unlock',
        description: `🎵 Playlist Access Upgraded: ${tierDisplay} playlists unlocked! Your releases can now reach wider audiences.`,
        amount: 0
      });
    }
    
    if (previousPress !== this.gameState.pressAccess && this.gameState.pressAccess !== 'none') {
      const tierDisplay = this.gameState.pressAccess === 'blogs' ? 'Music Blogs' :
                         this.gameState.pressAccess === 'mid_tier' ? 'Mid-Tier Press' :
                         this.gameState.pressAccess === 'national' ? 'National Media' : this.gameState.pressAccess;
      tierChanges.push({
        type: 'unlock',
        description: `📰 Press Access Upgraded: ${tierDisplay} coverage unlocked! Your projects will get better media attention.`,
        amount: 0
      });
    }
    
    if (previousVenue !== this.gameState.venueAccess && this.gameState.venueAccess !== 'none') {
      const tierDisplay = this.gameState.venueAccess === 'clubs' ? 'Club Venues' :
                         this.gameState.venueAccess === 'theaters' ? 'Theater Venues' :
                         this.gameState.venueAccess === 'arenas' ? 'Arena Venues' : this.gameState.venueAccess;
      tierChanges.push({
        type: 'unlock',
        description: `🎭 Venue Access Upgraded: ${tierDisplay} unlocked! Your artists can now perform at larger venues.`,
        amount: 0
      });
    }
    
    return tierChanges;
  }

  /**
   * Checks for producer tier unlocks and adds progression notifications
   */
  private checkProducerTierUnlocks(summary: MonthSummary): void {
    const reputation = this.gameState.reputation || 0;
    const producerSystem = this.gameData.getProducerTierSystemSync();
    
    // Track which tiers were previously unlocked - properly handle flags
    const flags = this.gameState.flags || {};
    let unlockedTiers = (flags as any)['unlocked_producer_tiers'];
    
    // Initialize unlockedTiers if it doesn't exist yet
    if (!unlockedTiers) {
      unlockedTiers = ['local']; // Start with local tier
      (flags as any)['unlocked_producer_tiers'] = unlockedTiers;
      this.gameState.flags = flags;
    }
    
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
    
    // Always update the flags to ensure persistence
    (flags as any)['unlocked_producer_tiers'] = unlockedTiers;
    this.gameState.flags = flags;
  }

  // REMOVED: processProjectStart method is redundant
  // Projects are now handled via database creation and automatic advancement in advanceProjectStages()

  // REMOVED: getDefaultSongCount method is redundant
  // Default song counts are now handled via database project_costs.song_count_default

  // LEGACY METHOD REMOVED - calculateCityRevenue()
  // Replaced with unified FinancialSystem calculations in processUnifiedTourRevenue()

  /**
   * Processes tour revenue using unified FinancialSystem calculations
   * Replaces legacy random-based city revenue system
   */
  private async processUnifiedTourRevenue(project: any, cityNumber: number, summary: MonthSummary, dbTransaction?: any): Promise<void> {
    console.log(`[UNIFIED TOUR] Processing city ${cityNumber} for tour "${project.title}"`);

    // Get artist data for popularity
    let artist;
    try {
      artist = await this.gameData.getArtistById(project.artistId);
      if (!artist) {
        console.error(`[UNIFIED TOUR] Artist not found for project: ${project.artistId}`);
        return;
      }
    } catch (error) {
      console.error(`[UNIFIED TOUR] Error getting artist:`, error);
      return;
    }

    const currentMetadata = project.metadata || {};
    let tourStats = currentMetadata.tourStats || { cities: [] };

    // Pre-calculate all tour cities using unified system on first call (city 1)
    if (cityNumber === 1 && !tourStats.preCalculatedCities) {
      console.log(`[UNIFIED TOUR] Pre-calculating all cities using FinancialSystem`);

      // Extract parameters for FinancialSystem
      const venueAccess = currentMetadata.venueAccess || 'none';
      const artistPopularity = artist.popularity || 50;
      const reputation = this.gameState.reputation || 0;
      const totalCities = currentMetadata.cities || 1;

      // Extract marketing budget - CRASH if totalCost is invalid
      if (!project.totalCost || project.totalCost < 0) {
        throw new Error(`Tour ${project.title} has invalid total cost: ${project.totalCost}`);
      }

      // Calculate costs to extract marketing budget - LET IT CRASH IF INVALID
      const costBreakdown = this.financialSystem.calculateTourCosts(venueAccess, totalCities, 0);
      const marketingBudget = Math.max(0, project.totalCost - costBreakdown.totalCosts);

      console.log(`[TOUR EXECUTION] Pre-calculated ${totalCities} cities for ${project.title}`);

      // SINGLE SOURCE OF TRUTH - GET ALL DATA FROM FINANCIALSYSTEM
      const detailedBreakdown = this.financialSystem.calculateDetailedTourBreakdown({
        venueTier: venueAccess,
        artistPopularity,
        localReputation: reputation,
        cities: totalCities,
        marketingBudget
      });

      // Store pre-calculated cities - NO MANUAL CALCULATIONS
      const preCalculatedCities = detailedBreakdown.cities.map((city: any, index: number) => ({
        cityNumber: index + 1,
        venue: this.getVenueNameFromAccess(venueAccess),
        capacity: city.venueCapacity,
        revenue: city.totalRevenue, // Use calculated revenue from FinancialSystem
        ticketsSold: Math.round(city.venueCapacity * city.sellThroughRate),
        attendanceRate: Math.round(city.sellThroughRate * 100),
        // Enhanced economic breakdown from FinancialSystem
        economics: {
          sellThrough: {
            rate: Math.round(city.sellThroughRate * 100),
            baseRate: Math.round(detailedBreakdown.sellThroughAnalysis.baseRate * 100),
            reputationBonus: Math.round(detailedBreakdown.sellThroughAnalysis.reputationBonus * 100),
            popularityBonus: Math.round(detailedBreakdown.sellThroughAnalysis.popularityBonus * 100),
            marketingBonus: Math.round(detailedBreakdown.sellThroughAnalysis.budgetQualityBonus * 100)
          },
          pricing: {
            ticketPrice: Math.round(city.ticketRevenue / Math.max(1, Math.round(city.venueCapacity * city.sellThroughRate))),
            basePrice: 0, // Will be calculated by FinancialSystem
            capacityBonus: 0 // Will be calculated by FinancialSystem
          },
          revenue: {
            tickets: city.ticketRevenue,
            merch: city.merchRevenue,
            total: city.totalRevenue,
            merchRate: 0 // Will be calculated by FinancialSystem
          },
          costs: {
            venue: city.venueFee,
            production: city.productionFee,
            marketing: city.marketingCost,
            total: city.totalCosts
          },
          profit: city.profit
        }
      }));

      // Store pre-calculated results
      tourStats.preCalculatedCities = preCalculatedCities;
      console.log(`[UNIFIED TOUR] Pre-calculated ${preCalculatedCities.length} cities`);
    }

    // Reveal one city per month from pre-calculated results
    if (tourStats.preCalculatedCities && tourStats.preCalculatedCities.length >= cityNumber) {
      const cityData = tourStats.preCalculatedCities[cityNumber - 1];

      // Add to revealed cities
      tourStats.cities = tourStats.cities || [];
      tourStats.cities.push(cityData);

      console.log(`[UNIFIED TOUR] Revealed city ${cityNumber}: $${cityData.revenue} revenue, ${cityData.attendanceRate}% attendance`);

      // Add revenue to monthly summary
      const revenue = cityData.revenue;
      summary.revenue += revenue;
      if (!summary.revenueBreakdown) {
        summary.revenueBreakdown = {
          streamingRevenue: 0,
          tourRevenue: 0,
          releaseRevenue: 0,
          marketingRevenue: 0
        };
      }
      summary.revenueBreakdown.tourRevenue += revenue;

      summary.changes.push({
        type: 'revenue',
        description: `${project.title} - City ${cityNumber} performance: $${revenue.toLocaleString()} (${cityData.attendanceRate}% attendance)`,
        amount: revenue,
        projectId: project.id,
        source: 'tour_performance'
      });
    }

    // Update project metadata
    const updatedMetadata = { ...currentMetadata, tourStats };
    try {
      await this.storage.updateProject(project.id, { metadata: updatedMetadata }, dbTransaction);
      console.log(`[UNIFIED TOUR] Updated project metadata for city ${cityNumber}`);
    } catch (error) {
      console.error(`[UNIFIED TOUR] Error updating project metadata:`, error);
    }
  }

  /**
   * Helper method to get venue name from access tier
   */
  private getVenueNameFromAccess(venueAccess: string): string {
    const venueNames = {
      'none': 'Small Venues',
      'clubs': 'Club Venues',
      'theaters': 'Theater Venues',
      'arenas': 'Arena Venues'
    };
    return venueNames[venueAccess as keyof typeof venueNames] || 'Small Venues';
  }

  // LEGACY METHOD REMOVED - processTourCityRevenue()
  // Replaced with processUnifiedTourRevenue() using FinancialSystem calculations

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
    
    // Track campaign cost for consolidated calculation
    summary.expenses += campaignCost;
    
    // Track marketing costs in expense breakdown
    if (!summary.expenseBreakdown) {
      summary.expenseBreakdown = {
        monthlyOperations: 0,
        artistSalaries: 0,
        executiveSalaries: 0,
        projectCosts: 0,
        marketingCosts: 0,
        roleMeetingCosts: 0
      };
    }
    summary.expenseBreakdown.marketingCosts += campaignCost;
    
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
    
    // Playlist access bonus (progressive tiers)
    if (this.gameState.playlistAccess === 'flagship') bonus += 30;
    else if (this.gameState.playlistAccess === 'mid') bonus += 20;
    else if (this.gameState.playlistAccess === 'niche') bonus += 10;
    
    // Press access bonus (progressive tiers)
    if (this.gameState.pressAccess === 'national') bonus += 30;
    else if (this.gameState.pressAccess === 'mid_tier') bonus += 20;
    else if (this.gameState.pressAccess === 'blogs') bonus += 10;
    
    // Venue access bonus (progressive tiers)
    if (this.gameState.venueAccess === 'arenas') bonus += 30;
    else if (this.gameState.venueAccess === 'theaters') bonus += 20;
    else if (this.gameState.venueAccess === 'clubs') bonus += 10;
    
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
    if (this.gameState.playlistAccess === 'mid' && this.gameState.pressAccess === 'mid_tier') {
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

  // REMOVED: validateProjectCreation method is redundant
  // Project validation is now handled at database creation time
  
  // REMOVED: validateSongCountForProjectType method is redundant
  // Song count validation is now handled at UI creation time
  
  // REMOVED: validateSongCountBudgetEfficiency - replaced by dynamic budget quality calculation
  // Budget efficiency is now handled by FinancialSystem.getBudgetEfficiencyRating()

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
        
        // Revenue = streams × revenue per stream using balance.json configuration
        const streamingConfig = this.gameData.getStreamingConfigSync();
        const revenuePerStream = streamingConfig.ongoing_streams.revenue_per_stream;
        revenue = streams * revenuePerStream;
        console.log(`[DEBUG] Revenue calculation: ${streams} * ${revenuePerStream} = ${revenue}`);
        
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
        // NO CALCULATIONS HERE - just check if tour generated revenue
        const tourStats = project.metadata?.tourStats;
        if (tourStats?.cities && tourStats.cities.length > 0) {
          // Sum revenue from completed cities - NO RECALCULATION
          revenue = tourStats.cities.reduce((sum: number, city: any) => sum + (city.revenue || 0), 0);
        } else {
          revenue = 0; // No cities completed yet
        }
        
        description = `$${Math.round(revenue).toLocaleString()} tour revenue`;
        break;
    }
    
    // Add revenue to summary
    summary.revenue += revenue;
    
    // Add streams to summary for music projects
    if (streams > 0) {
      summary.streams = (summary.streams || 0) + streams;
    }
    
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
          const cost = this.calculateEnhancedProjectCost('single', tier, time, 50);
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

  /**
   * PHASE 1 MIGRATION: Moved from routes.ts
   * Handles all project stage advancement logic within GameEngine
   */
  private async advanceProjectStages(summary: MonthSummary, dbTransaction?: any): Promise<void> {
    if (!dbTransaction) {
      console.warn('[PROJECT ADVANCEMENT] No database transaction provided - cannot advance project stages');
      return;
    }

    console.log('[PROJECT ADVANCEMENT] === GameEngine Project Stage Advancement ===');
    console.log(`[PROJECT ADVANCEMENT] Current month: ${this.gameState.currentMonth}`);
    
    try {
      // Import the required modules dynamically to avoid circular dependencies
      const { projects } = await import('../schema');
      const { eq } = await import('drizzle-orm');
      
      // Get all projects for this game
      const projectList = await dbTransaction
        .select()
        .from(projects)
        .where(eq(projects.gameId, this.gameState.id));

      console.log(`[PROJECT ADVANCEMENT] Found ${projectList.length} projects to evaluate`);

      for (const project of projectList) {
        const stages = ['planning', 'production', 'marketing', 'recorded'];
        const currentStageIndex = stages.indexOf(project.stage || 'planning');
        const monthsElapsed = (this.gameState.currentMonth || 1) - (project.startMonth || 1);
        const isRecordingProject = ['Single', 'EP'].includes(project.type || '');
        const songCount = project.songCount || 1;
        const songsCreated = project.songsCreated || 0;
        const allSongsCreated = songsCreated >= songCount;
        
        console.log(`[PROJECT ADVANCEMENT] Evaluating ${project.title}:`, {
          currentStage: project.stage,
          currentStageIndex,
          monthsElapsed,
          isRecordingProject,
          songCount,
          songsCreated,
          allSongsCreated
        });

        let newStageIndex = currentStageIndex;
        let advancementReason = '';

        // Stage advancement logic
        if (currentStageIndex === 0 && monthsElapsed >= 1) {
          // planning -> production (simple time-based)
          newStageIndex = 1;
          advancementReason = `Planning complete after ${monthsElapsed} month${monthsElapsed > 1 ? 's' : ''}`;
          
          // NOTE: Project costs are now deducted immediately upon creation (see routes.ts)
          // This prevents timing exploits where users cancel before month advance
          // We track the expense for monthly reporting but DON'T deduct money again
          if (project.totalCost) {
            // DO NOT add to summary.expenses - money already deducted at creation!
            // summary.expenses += project.totalCost; // <-- REMOVED to fix double-charging bug

            if (!summary.expenseBreakdown) {
              summary.expenseBreakdown = {
                monthlyOperations: 0,
                artistSalaries: 0,
                executiveSalaries: 0,
                projectCosts: 0,
                marketingCosts: 0,
                roleMeetingCosts: 0
              };
            }
            // Track for reporting but don't affect final money calculation
            summary.expenseBreakdown.projectCosts += project.totalCost;

            summary.changes.push({
              type: 'expense_tracking',
              description: `${project.title} production started (cost previously deducted at creation)`,
              amount: -project.totalCost,
              projectId: project.id,
              note: 'Cost deducted at project creation, tracked here for reporting only - no additional money deduction'
            });
          }
        } else if (currentStageIndex === 1) {
          // production -> marketing/completed
          if (!isRecordingProject && project.type === 'Mini-Tour') {
            // Enhanced tour logic: 1 month per city + planning month
            const citiesPlanned = project.metadata?.cities || 1;
            const monthsInProduction = monthsElapsed - 1; // Subtract planning month
            
            if (monthsInProduction > citiesPlanned) {
              // Tour complete - skip marketing, go directly to completed
              newStageIndex = 3; // Skip stage 2 (marketing), go to 'recorded' which acts as 'completed' for tours
              advancementReason = `Tour completed after ${citiesPlanned} cities (${monthsElapsed} total months)`;
              
              // Generate final tour completion summary
              const tourStats = project.metadata?.tourStats;
              if (tourStats && tourStats.cities) {
                const totalRevenue = tourStats.cities.reduce((sum: number, city: any) => sum + (city?.revenue || 0), 0);
                const avgAttendance = Math.round(tourStats.cities.reduce((sum: number, city: any) => sum + (city?.attendanceRate || 0), 0) / tourStats.cities.length);
                
                // Save total revenue for ROI calculation
                if (this.storage?.updateProject) {
                  await this.storage.updateProject(project.id, { 
                    totalRevenue,
                    completionStatus: 'completed'
                  }, dbTransaction);
                }
                
                summary.changes.push({
                  type: 'project_complete',
                  description: `${project.title} tour completed - ${tourStats.cities.length} cities, ${avgAttendance}% avg attendance, $${totalRevenue.toLocaleString()} total revenue`,
                  amount: 0, // Revenue already counted monthly
                  projectId: project.id
                });
              }
            } else if (monthsInProduction > 0) {
              // Process this month's city performance using unified system
              await this.processUnifiedTourRevenue(project, monthsInProduction, summary, dbTransaction);
            }
          } else if (!isRecordingProject) {
            // Other non-recording projects - simple time-based
            if (monthsElapsed >= 2) {
              newStageIndex = 2;
              advancementReason = `Production complete after ${monthsElapsed} months`;
            }
          } else {
            // Recording projects - need all songs OR max 4 months
            if (allSongsCreated && monthsElapsed >= 2) {
              newStageIndex = 2;
              advancementReason = `All ${songsCreated} songs completed after ${monthsElapsed} months`;
            } else if (monthsElapsed >= 4) {
              newStageIndex = 2;
              advancementReason = `Maximum production time reached (${monthsElapsed} months, ${songsCreated}/${songCount} songs)`;
            }
          }
        } else if (currentStageIndex === 2 && monthsElapsed >= 3) {
          // marketing -> released
          newStageIndex = 3;
          advancementReason = `Marketing complete after ${monthsElapsed} months`;
        }

        // Advance stage if needed
        if (newStageIndex > currentStageIndex) {
          const newStage = stages[newStageIndex];
          console.log(`[PROJECT ADVANCEMENT] Advancing ${project.title}: ${project.stage} -> ${newStage} (${advancementReason})`);
          
          // Prepare update data
          const updateData: any = { 
            stage: newStage,
            quality: Math.min(100, (project.quality || 0) + 25)
          };
          
          // If advancing to recorded stage, track recording completion metadata
          if (newStage === 'recorded') {
            const existingMetadata = project.metadata || {};
            updateData.metadata = {
              ...existingMetadata,
              recordingCompletedMonth: this.gameState.currentMonth,
              recordedAt: new Date().toISOString(),
              advancementReason
            };
            console.log(`[PROJECT ADVANCEMENT] Marking project "${project.title}" as recording completed in month ${this.gameState.currentMonth}`);
          }
          
          // Update project in database
          await dbTransaction
            .update(projects)
            .set(updateData)
            .where(eq(projects.id, project.id));
          
          // Add to summary
          summary.changes.push({
            type: 'unlock',
            description: `📈 ${project.title} advanced to ${newStage} stage: ${advancementReason}`,
            amount: 0
          });
          
          console.log(`[PROJECT ADVANCEMENT] Successfully advanced "${project.title}" to ${newStage}`);
        } else {
          console.log(`[PROJECT ADVANCEMENT] ${project.title} staying in ${project.stage} (${monthsElapsed} months elapsed)`);
        }
      }
      
      console.log('[PROJECT ADVANCEMENT] === GameEngine Project Stage Advancement Complete ===');
    } catch (error) {
      console.error('[PROJECT ADVANCEMENT] Error during project advancement:', error);
      throw new Error(`Project advancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * PHASE 1 MIGRATION: Moved from gameData.ts
   * Calculates enhanced project cost with producer tier, time investment, and song count
   */
  // DELEGATED TO FinancialSystem (originally lines 2967-3022)
  private calculateEnhancedProjectCost(
    projectType: string, 
    producerTier: string, 
    timeInvestment: string, 
    quality: number = 50,
    songCount?: number
  ): number {
    return this.financialSystem.calculateEnhancedProjectCost(
      projectType,
      producerTier,
      timeInvestment,
      quality,
      songCount
    );
  }


  /**
   * PHASE 1 MIGRATION: Moved from gameData.ts
   * Calculates enhanced project cost with per-song budget semantics
   * Returns the total project cost, taking per-song budgets and multipliers into account
   */
  // DELEGATED TO FinancialSystem (originally lines 3029-3061)
  private calculatePerSongProjectCost(
    budgetPerSong: number,
    songCount: number,
    producerTier: string,
    timeInvestment: string
  ): { baseCost: number; totalCost: number; breakdown: any } {
    return this.financialSystem.calculatePerSongProjectCost(
      budgetPerSong,
      songCount,
      producerTier,
      timeInvestment
    );
  }

  /**
   * Generates human-readable financial breakdown string
   */
  private generateFinancialBreakdown(f: MonthlyFinancials): string {
    const parts: string[] = [`$${f.startingBalance.toLocaleString()}`];
    
    if (f.operations.base > 0) {
      parts.push(`- $${f.operations.base.toLocaleString()} (operations)`);
    }
    if (f.operations.artists > 0) {
      parts.push(`- $${f.operations.artists.toLocaleString()} (artists)`);
    }
    if (f.projects.costs > 0) {
      parts.push(`- $${f.projects.costs.toLocaleString()} (projects)`);
    }
    if (f.projects.revenue > 0) {
      parts.push(`+ $${f.projects.revenue.toLocaleString()} (project revenue)`);
    }
    if (f.marketing.costs > 0) {
      parts.push(`- $${f.marketing.costs.toLocaleString()} (marketing)`);
    }
    if (f.roleEffects.costs > 0) {
      parts.push(`- $${f.roleEffects.costs.toLocaleString()} (role costs)`);
    }
    if (f.roleEffects.revenue > 0) {
      parts.push(`+ $${f.roleEffects.revenue.toLocaleString()} (role benefits)`);
    }
    if (f.streamingRevenue > 0) {
      parts.push(`+ $${f.streamingRevenue.toLocaleString()} (streaming)`);
    }
    
    parts.push(`= $${f.endingBalance.toLocaleString()}`);
    
    return parts.join(' ');
  }

  /**
   * Generates financial breakdown for display purposes only
   * Does NOT modify game state - that happens at the end of advanceMonth()
   */
  // DELEGATED TO FinancialSystem (originally lines 3126-3172)
  async calculateMonthlyFinancials(summary: MonthSummary): Promise<MonthlyFinancials> {
    return this.financialSystem.calculateMonthlyFinancials(
      summary,
      this.gameState.money || 0
    );
  }


  /**
   * Helper function to determine season from month
   */
  private getSeasonFromMonth(month: number): string {
    // Convert to 1-12 range for quarters (handles months 1-36)
    const yearMonth = ((month - 1) % 12) + 1;
    if (yearMonth <= 3) return 'q1';
    if (yearMonth <= 6) return 'q2';
    if (yearMonth <= 9) return 'q3';
    return 'q4';
  }

  /**
   * Calculates comprehensive release preview metrics using GameEngine formulas
   * This method provides accurate economic projections for release planning
   */
  calculateReleasePreview(
    songs: any[],
    artist: any,
    releaseConfig: {
      releaseType: 'single' | 'ep' | 'album';
      leadSingleId?: string;
      seasonalTiming: string;
      scheduledReleaseMonth: number;
      marketingBudget: Record<string, number>;
      leadSingleStrategy?: {
        leadSingleId: string;
        leadSingleReleaseMonth: number;
        leadSingleBudget: Record<string, number>;
      };
    }
  ) {
    const balance = this.gameData.getBalanceConfigSync();
    
    // Auto-detect season from release month
    const mainReleaseSeason = this.getSeasonFromMonth(releaseConfig.scheduledReleaseMonth);
    
    // Calculate base song metrics using existing GameEngine methods
    const averageQuality = songs.reduce((sum, song) => sum + song.quality, 0) / songs.length;
    
    // Calculate total base streams using sophisticated streaming calculation
    let totalBaseStreams = 0;
    let totalBaseRevenue = 0;
    
    for (const song of songs) {
      const songStreams = this.calculateStreamingOutcome(
        song.quality,
        this.gameState.playlistAccess || 'none',
        this.gameState.reputation || 0,
        0 // No marketing spend for base calculation
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
        single: { revenue_multiplier: 1.2, marketing_efficiency: 1.1 },
        ep: { revenue_multiplier: 1.15, marketing_efficiency: 1.05 },
        album: { revenue_multiplier: 1.25, marketing_efficiency: 0.95 }
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
    
    // Apply seasonal multipliers from balance.json with resilient fallbacks
    const seasonalMultipliers = balance?.time_progression?.seasonal_modifiers || {
      q1: 0.85,
      q2: 0.95,
      q3: 0.90,
      q4: 1.25
    };
    
    if (!balance?.time_progression?.seasonal_modifiers) {
      console.warn('[GameEngine] seasonal_modifiers not found in balance data, using defaults');
    }
    
    // Use the seasonal revenue multipliers from balance data with fallback
    const seasonalRevenueMultiplier = seasonalMultipliers[mainReleaseSeason as keyof typeof seasonalMultipliers] || 1;
    
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
        const timingGap = releaseConfig.scheduledReleaseMonth - releaseConfig.leadSingleStrategy.leadSingleReleaseMonth;
        
        // Calculate timing bonus based on balance.json configuration
        let timingBonus = leadSingleConfig.default_bonus;
        if (leadSingleConfig.optimal_timing_months_before.includes(timingGap)) {
          timingBonus = leadSingleConfig.optimal_timing_bonus;
        } else if (timingGap === 3) {
          timingBonus = leadSingleConfig.good_timing_bonus;
        }
        
        const leadSingleBudget = Object.values(releaseConfig.leadSingleStrategy.leadSingleBudget).reduce((sum, budget) => sum + budget, 0);
        const leadSingleMarketingBonus = 1 + Math.sqrt(leadSingleBudget / leadSingleConfig.budget_scaling_factor) * leadSingleConfig.marketing_effectiveness_factor;
        
        // Calculate lead single's own seasonal multiplier based on its release month
        const leadSingleSeason = this.getSeasonFromMonth(releaseConfig.leadSingleStrategy.leadSingleReleaseMonth);
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
      risks: this.calculateReleaseRisks(releaseConfig, totalMarketingCost, finalRevenue),
      recommendations: this.generateReleaseRecommendations(releaseConfig, averageQuality, totalMarketingCost)
    };
  }
  
  /**
   * Calculate potential risks for a release strategy
   */
  private calculateReleaseRisks(releaseConfig: any, totalCost: number, expectedRevenue: number): string[] {
    const risks: string[] = [];
    
    // High budget risk
    const budget = Object.values(releaseConfig.marketingBudget).reduce((a: number, b: any) => a + b, 0);
    if (budget > (this.gameState?.money || 0) * 0.3) {
      risks.push("High budget risk - using significant portion of available funds");
    }
    
    // Seasonal competition risk
    const releaseSeason = this.getSeasonFromMonth(releaseConfig.scheduledReleaseMonth);
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
    const releaseSeason = this.getSeasonFromMonth(releaseConfig.scheduledReleaseMonth);
    if (releaseSeason === 'q1') {
      recommendations.push("Q1 release - lower competition but reduced market activity");
    }
    
    return recommendations;
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
  streams?: number;
  reputationChanges: Record<string, number>;
  events: EventOccurrence[];
  artistChanges?: Record<string, number>;
  expenseBreakdown?: {
    monthlyOperations: number;
    artistSalaries: number;
    executiveSalaries: number;
    projectCosts: number;
    marketingCosts: number;
    roleMeetingCosts: number;
  };
  financialBreakdown?: string; // Human-readable financial calculation
}

export interface GameChange {
  type: 'expense' | 'revenue' | 'meeting' | 'project_complete' | 'delayed_effect' | 'unlock' | 'ongoing_revenue' | 'song_release' | 'release' | 'marketing' | 'reputation' | 'error' | 'mood' | 'popularity' | 'executive_interaction';
  description: string;
  amount?: number;
  roleId?: string;
  projectId?: string;
  moodChange?: number;
  newMood?: number;
  loyaltyBoost?: number;
  newLoyalty?: number;
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