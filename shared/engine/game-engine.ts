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

import { GameState, Artist, Project, Role, WeeklyAction, Song, Release, ReleaseSong } from '../schema';
import { generateEmails } from "@shared/engine/EmailGenerator";
import { ServerGameData } from '../../server/data/gameData';
import { FinancialSystem } from './FinancialSystem';
import { ChartService } from './ChartService';
import { AchievementsEngine } from './AchievementsEngine';
import type { WeekSummary, ChartUpdate, GameChange, EventOccurrence, GameArtist } from '../types/gameTypes';
import { ArtistChangeHelpers } from '../types/gameTypes';
import { getSeasonFromWeek, getSeasonalMultiplier } from '../utils/seasonalCalculations';
import { scaleReputationGain } from '../utils/reputationScaling';
import { selectSideEvent } from './sideEventSelection';
import { classifyChange, classifyChartUpdate } from '../utils/changeImportance';
import { AROfficeProcessor } from './processors/AROfficeProcessor';
import { ProgressionProcessor } from './processors/ProgressionProcessor';
import { WeeklyFinancesProcessor } from './processors/WeeklyFinancesProcessor';
import { TourProcessor } from './processors/TourProcessor';
import { SongGenerationProcessor } from './processors/SongGenerationProcessor';
import { ProjectStageProcessor } from './processors/ProjectStageProcessor';
import { ReleaseProcessor } from './processors/ReleaseProcessor';
import { ArtistStateProcessor } from './processors/ArtistStateProcessor';
import { ActionProcessor } from './processors/ActionProcessor';
import type { WeekContext } from './processors/types';

// Re-export WeekSummary for backward compatibility
export type { WeekSummary } from '../types/gameTypes';
import seedrandom from 'seedrandom';

// Patch type for song updates applied during weekly processing
// Allows optional awareness fields when only awareness changes occur
export type SongUpdatePatch = {
  songId: string;
  weeklyStreams?: number;
  lastWeekRevenue?: number;
  totalRevenue?: number;
  totalStreams?: number;
  awareness?: number;
  peak_awareness?: number;
  awareness_decay_rate?: number;
};

// Extended WeeklyAction interface for game engine
// Exported for ActionProcessor (Phase 2 engine-seams PR-11), which processes these actions.
export interface GameEngineAction {
  actionType: 'role_meeting' | 'start_project' | 'marketing' | 'artist_dialogue';
  targetId: string | null;
  metadata?: Record<string, any>; // Includes selectedArtistId for user_selected meetings (Task 3.3)
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
 * Consolidated financial tracking for weekly calculations
 */
export interface WeeklyFinancials {
  startingBalance: number;
  operations: { base: number; artists: number; executives: number; signingBonuses: number; total: number };
  projects: { costs: number; revenue: number };
  marketing: { costs: number };
  roleEffects: { costs: number; revenue: number };
  streamingRevenue: number;
  netChange: number;
  endingBalance: number;
  breakdown: string; // Human-readable calculation
}

// Using exported WeekSummary interface from end of file

/**
 * Main game engine class that handles all game logic
 * 
 * @example
 * ```typescript
 * const engine = new GameEngine(gameState, gameData);
 * const result = await engine.advanceWeek(selectedActions);
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
    this.rng = seedrandom(seed || `${gameState.id}-${gameState.currentWeek}`);
    this.financialSystem = new FinancialSystem(gameData, () => this.rng(), this.storage);
  }

  /**
   * Advances the game by one week, processing all actions
   * This is the main game loop function
   * 
   * @param weeklyActions - Actions selected by the player this week
   * @returns Updated game state and summary of changes
   */
  async advanceWeek(weeklyActions: GameEngineAction[], dbTransaction?: any, options?: {
    // Mandatory Side Events ("Crisis on the Desk"): the player's resolution for
    // the pending crisis, carried WITH the advance request (mirrors the optional
    // expectedCurrentWeek guard). Applied during this advance, queued like a
    // weekly action's effects. Absent in the legacy in-results path.
    sideEventChoice?: { eventId: string; choiceId: string } | null;
  }): Promise<{
    gameState: GameState;
    summary: WeekSummary;
    campaignResults?: CampaignResults;
  }> {
    console.log('[DEBUG] GameEngine.advanceWeek ENTRY - starting execution');
    console.log('[DEBUG] GameEngine current week:', this.gameState.currentWeek);
    console.log('[DEBUG] GameEngine campaign completed:', this.gameState.campaignCompleted);
    console.log('[DEBUG] GameEngine storage available:', !!this.storage);
    console.log('[DEBUG] GameEngine storage.createEmails available:', !!this.storage?.createEmails);

    // Check if campaign is already completed
    if (this.gameState.campaignCompleted) {
      console.log('[DEBUG] Campaign already completed - throwing error');
      throw new Error('Campaign has already been completed. Start a new game to continue playing.');
    }

    const summary: WeekSummary = {
      week: (this.gameState.currentWeek || 0) + 1,
      changes: [],
      revenue: 0,
      expenses: 0,
      reputationChanges: {},
      events: [],
      arOffice: { completed: false }
    };

    this.processPendingSigningFees(summary);

    // Initialize runtime tracking for executive usage (not in interface)
    (summary as any).usedExecutives = new Set<string>();

    // Reset weekly values
    this.gameState.usedFocusSlots = 0;
    this.gameState.currentWeek = (this.gameState.currentWeek || 0) + 1;

    // Process A&R Office operation lifecycle (one-week sourcing completes on advance)
    console.log('[A&R DEBUG] About to process A&R with game state:', {
      arOfficeSlotUsed: (this.gameState as any).arOfficeSlotUsed,
      arOfficeSourcingType: (this.gameState as any).arOfficeSourcingType
    });
    await this.processAROfficeWeekly(summary, dbTransaction);

    // PHASE 1: Process role_meeting actions first (executive meetings)
    const meetingActions = weeklyActions.filter(action => action.actionType === 'role_meeting');
    const otherActions = weeklyActions.filter(action => action.actionType !== 'role_meeting');
    
    console.log(`[WEEKLY ADVANCE] Processing ${meetingActions.length} meeting actions first, then ${otherActions.length} other actions`);
    
    for (const action of meetingActions) {
      await this.processAction(action, summary, dbTransaction);
    }
    
    // Apply any artist mood/loyalty changes from meetings immediately to database
    await this.applyArtistChangesToDatabase(summary, dbTransaction);
    
    // PHASE 2: Process all other actions
    for (const action of otherActions) {
      await this.processAction(action, summary, dbTransaction);
    }

    // Mandatory Side Events ("Crisis on the Desk"): resolve the pending crisis
    // WITHIN this advance — its immediate effects apply now (queued like weekly
    // action effects), its delayed effects bank for next week, and the pending
    // flag clears. No-op in the legacy path (no sideEventChoice provided).
    await this.processPendingSideEventResolution(summary, options?.sideEventChoice ?? null, dbTransaction);

    // Process ongoing revenue from released projects
    await this.processReleasedProjects(summary, dbTransaction);

    // B6 (Phase 2 D3): the no-op processNewlyRecordedProjects pass was removed —
    // songs are born isRecorded:true, so its !isRecorded filter always matched
    // zero. The "recording completed — ready for release" notification it was
    // meant to fire now emits from SongGenerationProcessor.generateWeeklyProjectSongs
    // when a project's last song is generated (below).

    // Process song generation for recording projects
    await this.processRecordingProjects(summary, dbTransaction);

    // Buzz-v2 slice 3: pre-release anticipation build for planned releases that
    // diverted marketing to a pre-campaign (deterministic, zero RNG). Runs BEFORE
    // lead singles / planned releases so this week's pre-built awareness is in place
    // when a release ships (the ship-time attachedHype seed composes on top of it).
    await this.processPreCampaigns(summary, dbTransaction);

    // Process lead singles scheduled for this week
    await this.processLeadSingles(summary, dbTransaction);

    // Process planned releases scheduled for this week
    await this.processPlannedReleases(summary, dbTransaction);

    // Process weekly charts after releases
    await this.processWeeklyCharts(summary, dbTransaction);

    // Volatility-economy slice 1: passive artist-energy lifecycle (recording drain
    // + idle recovery). MUST run BEFORE advanceProjectStages so project stages are
    // read as they were DURING the week (a recording project that completes this
    // week still spent the week in the studio; a tour in 'production' is not idle).
    // Accumulates into summary.artistChanges.energy — flushed at the
    // applyArtistChangesToDatabase call below (line ~234), alongside tour drains.
    await this.processWeeklyEnergyLifecycle(summary, dbTransaction);

    // PHASE 1 MIGRATION: Handle project stage advancement within GameEngine
    await this.advanceProjectStages(summary, dbTransaction);

    // Apply delayed effects from previous weeks
    await this.processDelayedEffects(summary);

    // Apply delayed artist changes to database (delayed effects add to summary.artistChanges)
    await this.applyArtistChangesToDatabase(summary, dbTransaction);

    // Process weekly mood changes
    await this.processWeeklyMoodChanges(summary, dbTransaction);

    // Process weekly popularity changes
    await this.processWeeklyPopularityChanges(summary, dbTransaction);

    // Process executive mood/loyalty decay
    await this.processExecutiveMoodDecay(summary, dbTransaction);

    // Check for random events
    await this.checkForEvents(summary);

    // Apply weekly burn (operational costs) - handled by consolidated financial calculation
    const weeklyBurnResult = await this.calculateWeeklyBurnWithBreakdown();
    const weeklyBurn = weeklyBurnResult.total;
    // Note: Both money deduction and expense tracking handled by consolidated financial calculation
    
    // Initialize expense breakdown if not exists
    if (!summary.expenseBreakdown) {
      summary.expenseBreakdown = {
        weeklyOperations: 0,
        artistSalaries: 0,
        executiveSalaries: 0,
        signingBonuses: 0,
        projectCosts: 0,
        marketingCosts: 0,
        roleMeetingCosts: 0
      };
    }
    summary.expenseBreakdown.weeklyOperations = weeklyBurnResult.baseBurn;
    summary.expenseBreakdown.artistSalaries = weeklyBurnResult.artistCosts;
    
    // Calculate executive salaries
    const executiveSalaryResult = await this.financialSystem.calculateExecutiveSalaries(
      this.gameState.id,
      this.storage,
      this.gameState.currentWeek
    );
    summary.expenseBreakdown.executiveSalaries = executiveSalaryResult.total;
    
    // Add weekly burn to total expenses (including base operations and artist salaries)
    summary.expenses += weeklyBurn;
    
    // Add executive salaries to total expenses
    if (executiveSalaryResult.total > 0) {
      summary.expenses += executiveSalaryResult.total;

      summary.changes.push({
        type: 'expense',
        description: 'Executive team salaries',
        amount: -executiveSalaryResult.total
      });
    }
    
    summary.changes.push({
      type: 'expense',
      description: 'Weekly operational costs',
      amount: -weeklyBurn
    });

    // Check progression gates
    await this.checkProgressionGates(summary);

    // Update access tiers based on reputation and collect notifications
    const tierChanges = this.updateAccessTiers();
    summary.changes.push(...tierChanges);

    // Check for producer tier unlocks
    this.checkProducerTierUnlocks(summary);

    // Calculate financial summary (but don't update money yet)
    const financials = await this.calculateWeeklyFinancials(summary);
    summary.financialBreakdown = financials.breakdown;
    
    // Summary totals are already correctly accumulated throughout the week processing
    // No need to overwrite them - they contain the complete picture
    
    console.log('[FINANCIAL BREAKDOWN]', financials.breakdown);

    // Generate and persist weekly emails
    await this.generateAndPersistEmails(summary, dbTransaction);
    
    // Generate economic insights for the week
    this.generateEconomicInsights(summary);
    
    // Check for campaign completion
    const campaignResults = await this.checkCampaignCompletion(summary);
    
    // Save weekly summary to gameState.weeklyStats for UI display
    const currentWeek = this.gameState.currentWeek || 1;
    const weekKey = `week${currentWeek - 1}`;  // UI expects week0, week1, etc.
    (this.gameState as any).weeklyStats = (this.gameState as any).weeklyStats || {};
    (this.gameState as any).weeklyStats[weekKey] = {
      revenue: summary.revenue,
      streams: summary.streams || 0,
      expenses: summary.expenses,
      expenseBreakdown: summary.expenseBreakdown || {
        weeklyOperations: 0,
        artistSalaries: 0,
        executiveSalaries: 0,
        signingBonuses: 0,
        projectCosts: 0,
        marketingCosts: 0,
        roleMeetingCosts: 0
      },
      pressMentions: summary.pressMentions || 0, // C45: release press coverage + PR campaigns
      reputationChange: Object.values(summary.reputationChanges).reduce((sum, change) => sum + change, 0),
      changes: summary.changes,
      events: summary.events
    };
    
    console.log(`[WEEKLY STATS] Saved week ${currentWeek - 1} stats:`, {
      revenue: summary.revenue,
      streams: summary.streams || 0,
      expenses: summary.expenses,
      weekKey
    });

    // C34: Emit a SINGLE aggregated reputation Achievement (⭐) line for the week.
    // Reputation is label-wide (global), so instead of many noisy per-source ±1 lines
    // we surface one line reflecting the TOTAL net reputation change across ALL sources
    // (press coverage + role-meeting effects + any others). This is the single source of
    // truth for the reputation ⭐ line — no per-source `type: 'reputation'` change is pushed
    // elsewhere, so there is no double-counting. Net is summed from summary.reputationChanges,
    // which every source accumulates into (same reduce used for weeklyStats.reputationChange above).
    const netReputationChange = Object.values(summary.reputationChanges)
      .reduce((sum, change) => sum + change, 0);
    if (netReputationChange !== 0) {
      const sign = netReputationChange > 0 ? '+' : ''; // negatives already carry '-'
      summary.changes.push({
        type: 'reputation',
        description: `${sign}${netReputationChange} reputation points`,
        amount: netReputationChange
      });
    }

    // SINGLE POINT OF MONEY UPDATE - at the very end
    // All revenue and expenses have been accumulated in the summary
    console.log('\n[FINAL MONEY CALCULATION]');
    const weekStartMoney = this.gameState.money || 0;
    console.log('[FINAL MONEY] Week start money:', weekStartMoney);
    console.log('[FINAL MONEY] Total revenue this week:', summary.revenue);
    console.log('[FINAL MONEY] Total expenses this week:', summary.expenses);
    console.log('[FINAL MONEY] Expense breakdown:', summary.expenseBreakdown);
    
    const finalMoney = weekStartMoney + summary.revenue - summary.expenses;
    console.log('[FINAL MONEY] Calculated final money:', finalMoney);

    this.gameState.money = finalMoney;
    console.log('[FINAL MONEY] Game state money updated to:', this.gameState.money);
    
    console.log(`[MONEY UPDATE] Starting: $${weekStartMoney}, Revenue: $${summary.revenue}, Expenses: $${summary.expenses}, Final: $${finalMoney}`);
    
    // Check for focus slot unlock — config-driven (single source of truth):
    //   threshold: data/balance/progression.json -> progression_thresholds.fourth_focus_slot_reputation
    //   base/max:  data/balance/projects.json     -> time_progression.focus_slots_base / focus_slots_max
    const focusBalance = this.gameData.getBalanceConfigSync();
    const focusSlotUnlockReputation = focusBalance?.progression_thresholds?.fourth_focus_slot_reputation ?? 50;
    const focusSlotsBase = focusBalance?.time_progression?.focus_slots_base ?? 3;
    const focusSlotsMax = focusBalance?.time_progression?.focus_slots_max ?? 4;
    if (this.gameState.reputation && this.gameState.reputation >= focusSlotUnlockReputation) {
      const currentSlots = this.gameState.focusSlots || focusSlotsBase;
      if (currentSlots < focusSlotsMax) {
        this.gameState.focusSlots = focusSlotsMax;
        summary.changes.push({
          type: 'unlock',
          description: `Fourth focus slot unlocked! You can now select ${focusSlotsMax} actions per week.`
        });
        console.log('[UNLOCK] Fourth focus slot unlocked at reputation', this.gameState.reputation);
      }
    }
    
    // Phase 4 PR-2: classify change importance once, at WeekSummary assembly.
    // Pure/deterministic (no RNG, no Date) additive tagging — this must be the
    // SINGLE call site so hierarchy is derived consistently and processors stay
    // ignorant of presentation. Runs after every change/chartUpdate is finalized
    // and does not reorder or mutate any other field.
    const importanceContext = { campaignCompleted: !!campaignResults };
    for (const change of summary.changes) {
      change.importance = classifyChange(change, importanceContext);
    }
    if (summary.chartUpdates) {
      for (const update of summary.chartUpdates) {
        update.importance = classifyChartUpdate(update);
      }
    }

    const result = {
      gameState: this.gameState,
      summary,
      campaignResults
    };

    console.log('[DEBUG] GameEngine.advanceWeek returning:', {
      hasGameState: !!result.gameState,
      hasSummary: !!result.summary,
      hasCampaignResults: !!result.campaignResults,
      week: result.summary?.week,
      resultType: typeof result
    });

    return result;
  }

  private processPendingSigningFees(summary: WeekSummary): void {
    const flags = (this.gameState.flags || {}) as Record<string, any>;
    const pendingFees = Array.isArray(flags.pending_signing_fees) ? flags.pending_signing_fees : [];

    if (!pendingFees.length) {
      return;
    }

    if (!summary.expenseBreakdown) {
      summary.expenseBreakdown = {
        weeklyOperations: 0,
        artistSalaries: 0,
        executiveSalaries: 0,
        signingBonuses: 0,
        projectCosts: 0,
        marketingCosts: 0,
        roleMeetingCosts: 0,
      };
    } else if (typeof summary.expenseBreakdown.signingBonuses !== 'number') {
      summary.expenseBreakdown.signingBonuses = 0;
    }

    let processedCount = 0;

    for (const fee of pendingFees) {
      const amount = Number(fee?.amount ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) {
        continue;
      }

      summary.expenseBreakdown.signingBonuses += amount;
      summary.changes.push({
        type: 'expense_tracking',
        description: `Artist signing bonus paid${fee?.name ? ` – ${fee.name}` : ''}`,
        amount: -amount,
        artistId: typeof fee?.artistId === 'string' ? fee.artistId : undefined,
      });

      processedCount += 1;
    }

    if (processedCount > 0) {
      console.log(`[FINANCIAL] Processed ${processedCount} pending artist signing fee${processedCount === 1 ? '' : 's'}`);
    }

    flags.pending_signing_fees = [];
    this.gameState.flags = flags;
  }

  private async generateAndPersistEmails(summary: WeekSummary, dbTransaction?: any): Promise<void> {
    console.log('[EMAIL GENERATION] Starting email generation for week', summary.week);

    if (!this.storage || !this.storage.createEmails) {
      console.warn('[EMAIL GENERATION] Skipped - storage.createEmails not available');
      return;
    }

    try {
      console.log('[EMAIL GENERATION] Checking for discovered artist:', summary.arOffice?.discoveredArtistId);

      // BUGFIX: Artist IDs from JSON files are strings (e.g., "art_3"), not UUIDs
      // We already have the artist data cached in gameState.flags, so use that instead of database lookup.
      // Sourced from the canonical ar_office_discovered_artists array (the legacy
      // singular ar_office_discovered_artist_info flag was retired in Phase 2 PR-12).
      let discoveredArtist = null;
      if (summary.arOffice?.discoveredArtistId) {
        const discoveredArtists = (this.gameState.flags as any)?.ar_office_discovered_artists;
        const artistInfo = Array.isArray(discoveredArtists)
          ? discoveredArtists.find((a: any) => a?.id === summary.arOffice?.discoveredArtistId)
          : undefined;
        if (artistInfo) {
          // Use cached artist info from flags (already populated by processAROfficeWeekly)
          discoveredArtist = {
            id: summary.arOffice.discoveredArtistId,
            name: artistInfo.name,
            archetype: artistInfo.archetype,
            talent: artistInfo.talent,
            genre: artistInfo.genre,
            popularity: artistInfo.popularity,
            // Fetch additional details from game data files
            bio: null as string | null,
            signingCost: null as number | null,
            weeklyCost: null as number | null,
          };

          // Try to get full artist details from JSON data files (not database)
          try {
            const allArtists = await this.gameData.getAllArtists();
            const fullArtist = allArtists.find((a: any) => a.id === summary.arOffice?.discoveredArtistId);
            if (fullArtist) {
              discoveredArtist.bio = fullArtist.bio ?? null;
              discoveredArtist.signingCost = fullArtist.signingCost ?? null;
              discoveredArtist.weeklyCost = fullArtist.weeklyCost ?? null;
            }
          } catch (err) {
            console.warn('[EMAIL GENERATION] Could not fetch full artist details from game data:', err);
          }

          console.log('[EMAIL GENERATION] Found discovered artist (from flags):', discoveredArtist.name);
        } else {
          console.warn('[EMAIL GENERATION] Artist ID exists but no cached info in flags:', summary.arOffice.discoveredArtistId);
        }
      }

      // Thread executive moods (read-only) so email narratives reflect the
      // sending exec's current mood band. Additive-only; failure to load moods
      // simply falls back to the neutral band inside the generator.
      const executiveMoods: Record<string, number> = {};
      try {
        if (this.storage.getExecutivesByGame) {
          const execs = await this.storage.getExecutivesByGame(this.gameState.id, dbTransaction);
          for (const exec of execs ?? []) {
            if (exec?.role && typeof exec.mood === 'number') {
              executiveMoods[exec.role] = exec.mood;
            }
          }
        }
      } catch (moodErr) {
        console.warn('[EMAIL GENERATION] Could not load executive moods; using neutral band:', moodErr);
      }

      const emails = generateEmails({
        gameId: this.gameState.id,
        weekSummary: summary,
        chartUpdates: summary.chartUpdates ?? [],
        executiveMoods,
        discoveredArtist: discoveredArtist
          ? {
              id: discoveredArtist.id,
              name: discoveredArtist.name,
              archetype: discoveredArtist.archetype ?? 'Unknown',
              talent: discoveredArtist.talent ?? 0,
              genre: discoveredArtist.genre ?? null,
              bio: discoveredArtist.bio ?? null,
              signingCost: discoveredArtist.signingCost ?? null,
              weeklyCost: discoveredArtist.weeklyCost ?? null,
            }
          : null,
      });

      console.log('[EMAIL GENERATION] Generated', emails.length, 'emails');
      if (emails.length > 0) {
        console.log('[EMAIL GENERATION] Email categories:', emails.map(e => e.category).join(', '));
      }

      if (emails.length === 0) {
        console.warn('[EMAIL GENERATION] No emails generated - check summary data');
        return;
      }

      await this.storage.createEmails(emails, dbTransaction);
      (summary as any).generatedEmails = emails.length;
      console.log('[EMAIL GENERATION] Successfully persisted', emails.length, 'emails to database');
    } catch (error) {
      console.error('[EMAIL GENERATION] Failed to generate or persist emails:', error);
    }
  }

  /**
   * Completes in-progress A&R Office sourcing when the week advances.
   * Frees the A&R focus slot but preserves the sourcing type so the client
   * can fetch discovered artists from the new endpoint post-advance.
   *
   * IMPORTANT: The artist ID stored in flags and returned in the weekly summary
   * may differ from the artist actually returned by /ar-office/artists if the
   * original artist is no longer available (e.g., due to data file changes).
   * The GET endpoint implements fallback logic that may select a different artist
   * and update the flags accordingly. Client code should check the response
   * metadata to detect when fallback artists are used.
   */
  /**
   * Builds the shared WeekContext passed to every extracted engine processor
   * (Phase 2 engine seams). PRs 6-11 reuse this helper for their processors.
   *
   * `getRandom` is bound as an arrow over `this` so processors draw from the
   * engine's single seeded RNG stream — preserving draw ORDER, which is behavior
   * (see processors/types.ts). Do not hand processors a fresh RNG.
   */
  private weekContext(summary: WeekSummary, dbTransaction?: any): WeekContext {
    return {
      gameState: this.gameState,
      summary,
      gameData: this.gameData,
      storage: this.storage,
      financialSystem: this.financialSystem,
      getRandom: (min: number, max: number) => this.getRandom(min, max),
      dbTransaction
    };
  }

  private async processAROfficeWeekly(summary: WeekSummary, dbTransaction?: any): Promise<void> {
    return new AROfficeProcessor().processAROfficeWeekly(this.weekContext(summary, dbTransaction));
  }

  /**
   * Processes a single player action
   */
  private async processAction(action: GameEngineAction, summary: WeekSummary, dbTransaction?: any): Promise<void> {
    return new ActionProcessor().processAction(
      this.weekContext(summary, dbTransaction),
      action,
      dbTransaction
    );
  }

  /**
   * Applies immediate effects to game state
   * @param effects - Effects to apply
   * @param summary - Week summary to update
   * @param artistId - Optional artist ID for targeted effects
   * @param targetScope - Optional scope for validation ('global' | 'predetermined' | 'user_selected' | 'dialogue')
   * @param meetingName - Optional meeting name for logging
   * @param choiceId - Optional choice ID for logging
   */
  // KEPT (PR-12): no longer called by advanceWeek (moved into ActionProcessor),
  // but the mood test suite drives the engine's effect application directly via
  // `(engine as any).applyEffects(...)` (immediate-mood-effect, mood-application-
  // verification, etc.), so this delegate is part of the tested engine surface.
  private async applyEffects(effects: Record<string, number>, summary: WeekSummary, artistId?: string, targetScope?: string, meetingName?: string, choiceId?: string): Promise<void> {
    return new ActionProcessor().applyEffects(
      this.weekContext(summary),
      effects,
      artistId,
      targetScope,
      meetingName,
      choiceId
    );
  }

  /**
   * Calculates streaming revenue for a release
   * Uses the formula from balance.json
   */
  // DELEGATED TO ReleaseProcessor (Phase 2 engine-seams PR-10). Same-signature
  // wrapper; kept because this is part of the engine's public/diagnostic surface
  // and the release pipeline formerly called this.calculateStreamingOutcome.
  calculateStreamingOutcome(
    quality: number,
    playlistAccess: string,
    reputation: number,
    adSpend: number,
    artistPopularity: number
  ): number {
    return new ReleaseProcessor().calculateStreamingOutcome(
      this.weekContext({ changes: [] } as unknown as WeekSummary),
      quality,
      playlistAccess,
      reputation,
      adSpend,
      artistPopularity
    );
  }

  /**
   * Calculates press coverage outcome including pickups and reputation gain
   */
  // DELEGATED TO ReleaseProcessor (Phase 2 engine-seams PR-10). Same-signature
  // wrapper; kept because the release pipeline formerly called
  // this.calculatePressOutcome. RNG draw (press-pickup roll) flows through the
  // engine's single seeded stream via weekContext().
  calculatePressOutcome(
    quality: number,
    pressAccess: string,
    reputation: number,
    marketingBudget: number
  ): { pickups: number; reputationGain: number } {
    return new ReleaseProcessor().calculatePressOutcome(
      this.weekContext({ changes: [] } as unknown as WeekSummary),
      quality,
      pressAccess,
      reputation,
      marketingBudget
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
   * Calculates weekly operational costs with detailed breakdown for transparency
   */
  // DELEGATED TO FinancialSystem (originally lines 572-617)
  private async calculateWeeklyBurnWithBreakdown(): Promise<{
    total: number;
    baseBurn: number;
    artistCosts: number;
    artistDetails: Array<{name: string, weeklyCost: number}>;
  }> {
    return new WeeklyFinancesProcessor().calculateWeeklyBurnWithBreakdown(
      this.weekContext({ changes: [] } as unknown as WeekSummary)
    );
  }


  /**
   * Processes ongoing projects (recordings, tours, etc)
   * NOTE: This function is currently unused but kept for potential future use
   */
  // private async processOngoingProjects(summary: WeekSummary, dbTransaction?: any): Promise<void> {
  //   // Projects are now managed via flags since they're not part of database gameState
  //   const flags = this.gameState.flags || {};
  //   const projects = (flags as any)['active_projects'] || [];
  //   for (const project of projects) {
  //     if (project.status === 'in_progress') {
  //       project.weeksRemaining = (project.weeksRemaining || 0) - 1;
  //       
  //       if (project.weeksRemaining <= 0) {
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
  // DELEGATED TO ReleaseProcessor (Phase 2 engine-seams PR-10). Same-signature
  // wrapper; still called from advanceWeek.
  private async processReleasedProjects(summary: WeekSummary, dbTransaction?: any): Promise<void> {
    return new ReleaseProcessor().processReleasedProjects(
      this.weekContext(summary, dbTransaction),
      summary
    );
  }

  /**
   * Processes lead singles that are scheduled for release this week (before the main release)
   * Checks all planned releases for lead single strategies and releases them early
   */
  // DELEGATED TO ReleaseProcessor (Phase 2 engine-seams PR-10). Same-signature
  // wrapper; still called from advanceWeek.
  private async processLeadSingles(summary: WeekSummary, dbTransaction?: any): Promise<void> {
    return new ReleaseProcessor().processLeadSingles(
      this.weekContext(summary, dbTransaction),
      summary,
      dbTransaction
    );
  }

  // Buzz-v2 slice 3: DELEGATED TO ReleaseProcessor. Pre-release anticipation build
  // for planned releases carrying a metadata.preCampaign block.
  private async processPreCampaigns(summary: WeekSummary, dbTransaction?: any): Promise<void> {
    return new ReleaseProcessor().processPreCampaigns(
      this.weekContext(summary, dbTransaction),
      summary,
      dbTransaction
    );
  }

  /**
   * Processes planned releases that are scheduled for the current week
   * This executes the release, generates initial revenue, and updates song statuses
   */
  // DELEGATED TO ReleaseProcessor (Phase 2 engine-seams PR-10). Same-signature
  // wrapper; still called from advanceWeek.
  private async processPlannedReleases(summary: WeekSummary, dbTransaction?: any): Promise<void> {
    return new ReleaseProcessor().processPlannedReleases(
      this.weekContext(summary, dbTransaction),
      summary,
      dbTransaction
    );
  }
  
  // REMOVED: getSeasonalMultiplier() - now using shared utility

  // B6 (Phase 2 engine-seams PR-9, decision D3): DELETED the no-op
  // processNewlyRecordedProjects / processProjectSongRecording pass (~95 lines).
  // Songs are born isRecorded:true in SongGenerationProcessor.generateSong, so the
  // pass's `!song.isRecorded` filter always matched zero songs and its
  // "recording completed — ready for release" notification never fired. That
  // notification is now emitted from SongGenerationProcessor.generateWeeklyProjectSongs
  // at the moment a project's last song is generated (matching the dead pass's
  // { type: 'unlock', description: '🎵 "<title>" recording completed - ready for
  // release', amount: 0 } shape).

  /**
   * Processes song generation for recording projects
   * This is called during weekly processing to create songs for active recording projects
   */
  // DELEGATED TO SongGenerationProcessor (Phase 2 engine-seams PR-8). Same-signature
  // wrapper; still called from advanceWeek (stays in engine until later PRs).
  private async processRecordingProjects(summary: WeekSummary, dbTransaction?: any): Promise<void> {
    return new SongGenerationProcessor().processRecordingProjects(
      this.weekContext(summary, dbTransaction),
      dbTransaction
    );
  }

  // DELEGATED TO SongGenerationProcessor (Phase 2 engine-seams PR-8). Same-signature
  // wrapper preserved because the engine's diagnostics path (getSystemStatus, ~:3667)
  // and scripts/verification/test-song-quality-scenarios.ts still call it on the
  // engine instance. Draws from the engine's single seeded RNG via weekContext().
  private calculateEnhancedSongQuality(
    artist: any,
    project: any,
    producerTier: string,
    timeInvestment: string,
    budgetAmount?: number,
    songCount?: number
  ): number {
    return new SongGenerationProcessor().calculateEnhancedSongQuality(
      this.weekContext({ changes: [] } as unknown as WeekSummary),
      artist,
      project,
      producerTier,
      timeInvestment,
      budgetAmount,
      songCount
    );
  }

  // MOVED TO SongGenerationProcessor (Phase 2 engine-seams PR-8):
  //   generateSong, generateWeeklyProjectSongs, shouldGenerateProjectSongs,
  //   getSongsPerWeek, generateSongMood, generateSongEconomicInsight,
  //   generateProjectCompletionSummary. These had no callers outside the moved
  //   song-generation set, so no engine delegates are kept for them.

  /**
   * Processes song release - calculates individual song streams and sets initial values
   * This is called when a project completes and songs are released
   */
  // DELEGATED TO ReleaseProcessor (Phase 2 engine-seams PR-10). Same-signature
  // public wrapper preserved for the engine's external surface.
  async processSongRelease(song: any, gameState?: any): Promise<{
    initialStreams: number;
    initialRevenue: number;
  }> {
    return new ReleaseProcessor().processSongRelease(
      this.weekContext({ changes: [] } as unknown as WeekSummary),
      song,
      gameState
    );
  }

  /**
   * Processes all songs from a completed project for release
   * Distributes streams individually to each song based on their quality
   */
  // DELEGATED TO ReleaseProcessor (Phase 2 engine-seams PR-10). Same-signature
  // public wrapper preserved for the engine's external surface.
  async processProjectSongsRelease(project: any, projectStreams: number): Promise<{
    totalSongsReleased: number;
    totalStreamsDistributed: number;
    totalRevenueGenerated: number;
    songDetails: Array<{songId: string, title: string, streams: number, revenue: number}>;
  }> {
    return new ReleaseProcessor().processProjectSongsRelease(
      this.weekContext({ changes: [] } as unknown as WeekSummary),
      project,
      projectStreams
    );
  }

  /**
   * Processes delayed effects from previous weeks
   */
  private async processDelayedEffects(summary: WeekSummary): Promise<void> {
    return new ActionProcessor().processDelayedEffects(this.weekContext(summary));
  }

  /**
   * Apply per-artist mood/energy changes from meetings to database
   * Task 6.2: Updated to support per-artist mood targeting with database logging
   * Processes changes accumulated in summary.artistChanges[artistId].mood/energy
   * Note: Artist loyalty was refactored to energy
   */
  private async applyArtistChangesToDatabase(summary: WeekSummary, dbTransaction?: any): Promise<void> {
    return new ArtistStateProcessor().applyArtistChangesToDatabase(
      this.weekContext(summary, dbTransaction),
      dbTransaction
    );
  }

  /**
   * Process weekly mood changes for all artists
   * Orchestrates mood calculations from multiple sources:
   * 1. Release-based changes (success/failure)
   * 2. Workload stress (too many projects)
   * 3. Natural drift toward neutral (50)
   */
  private async processWeeklyMoodChanges(summary: WeekSummary, dbTransaction?: any): Promise<void> {
    return new ArtistStateProcessor().processWeeklyMoodChanges(this.weekContext(summary, dbTransaction));
  }

  /**
   * Volatility-economy slice 1: passive artist-energy lifecycle
   * (recording drain + idle recovery). Delegates to ArtistStateProcessor.
   */
  private async processWeeklyEnergyLifecycle(summary: WeekSummary, dbTransaction?: any): Promise<void> {
    return new ArtistStateProcessor().processWeeklyEnergyLifecycle(this.weekContext(summary, dbTransaction));
  }

  /**
   * Process weekly popularity changes for all artists
   * UNIFIED FORMAT: Now reads from per-artist objects (artistChanges[artistId].popularity)
   * Mirrors processWeeklyMoodChanges pattern for consistency
   */
  private async processWeeklyPopularityChanges(summary: WeekSummary, dbTransaction?: any): Promise<void> {
    return new ArtistStateProcessor().processWeeklyPopularityChanges(this.weekContext(summary, dbTransaction));
  }

  /**
   * Process weekly mood and loyalty decay for executives
   * - Loyalty decays when executives are ignored for 3+ weeks
   * - Mood naturally drifts toward neutral (50) over time
   */
  private async processExecutiveMoodDecay(summary: WeekSummary, dbTransaction?: any): Promise<void> {
    return new ArtistStateProcessor().processExecutiveMoodDecay(
      this.weekContext(summary, dbTransaction),
      dbTransaction
    );
  }

  /**
   * Checks for random side events based on probability (Tier 2, PR-3).
   *
   * LAPSE first (spec §3): a pending_side_event left unresolved from a PRIOR
   * week is cleared here with NO effects — "the moment passed." This runs BEFORE
   * the weekly roll so lapsing never consumes the new week's roll.
   *
   * ROLL unchanged (fork D1, spec §0 constraint 2): the in-stream getRandom(0,1)
   * draw stays at the SAME position in the RNG stream — removing/moving it would
   * shift every downstream engine roll and break the golden master.
   *
   * ON HIT: event SELECTION moves to an ISOLATED seed (closing ledger C64) via
   * selectSideEvent — weighted by category, excluding events within their
   * cooldown. On a selection, we (a) set flags.pending_side_event, (b) stamp
   * flags.side_event_history[eventId], and (c) push the FULL event payload into
   * summary.events so PR-4's UI can render the beat from the weekly outcome. If
   * the cooldown filter empties the pool, no event fires this week.
   *
   * WEEK SEMANTICS: this.gameState.currentWeek here is the post-increment
   * ARRIVAL week; the pending event belongs to (and is consumed during) that
   * same week.
   */
  private async checkForEvents(summary: WeekSummary): Promise<void> {
    const currentWeek = this.gameState.currentWeek || 0;
    const flags = (this.gameState.flags || {}) as Record<string, any>;
    this.gameState.flags = flags;

    // Defensive optional-chain: production ServerGameData always implements this,
    // but some duck-typed test gameData mocks predate it. Missing → production
    // default (mandatory ON). The legacy-path characterization test sets it false
    // explicitly.
    const mandatory = this.gameData.getMandatorySideEventsConfigSync?.()?.enabled ?? true;

    // --- LAPSE: clear a stale pending event from a prior week (no effects). ---
    // In MANDATORY mode a pending crisis never lapses — it is resolved during the
    // week's advance (processPendingSideEventResolution, before this runs) and the
    // advance is gated until it is. Skipping the lapse keeps a crisis from being
    // silently dropped if resolution somehow did not clear it (defensive).
    const pending = flags.pending_side_event as { eventId: string; week: number } | undefined;
    if (!mandatory && pending && typeof pending.week === 'number' && pending.week < currentWeek) {
      console.log(`[SIDE EVENT] Lapsing unresolved event "${pending.eventId}" from week ${pending.week} (now week ${currentWeek})`);
      delete flags.pending_side_event;
    }

    const eventConfig = this.gameData.getEventConfigSync();

    if (this.getRandom(0, 1) < eventConfig.weekly_chance) {
      // --- HIT: select WHICH event on an isolated seed (weighted + cooldown). ---
      // The draws ALWAYS run (stream discipline / C64) even when the result will
      // be discarded, so the seeded RNG stream is byte-identical regardless of
      // pending state.
      const events = await this.gameData.getAllEvents();
      const selectionConfig = this.gameData.getSideEventsConfigSync();
      const history = (flags.side_event_history || {}) as Record<string, number>;

      const event = selectSideEvent(events, selectionConfig, history, currentWeek, this.gameState.id);

      // ONE CRISIS AT A TIME: if a crisis is already pending (mandatory mode), the
      // draw above still happened, but the newly-rolled event is DISCARDED — no
      // overwrite of the pending event, no summary push, no cooldown stamp for the
      // discarded pick. Existing cooldown behavior for the pending event is
      // unchanged.
      const alreadyPending = mandatory && !!flags.pending_side_event;

      if (event && !alreadyPending) {
        // Persist pending event + cooldown stamp (additive flags keys only).
        flags.side_event_history = { ...history, [event.id]: currentWeek };

        if (mandatory) {
          // Deferred landing: store the RICHER payload so next week's crisis card
          // renders fully after a reload (no second fetch). eventId/week keep their
          // legacy positions; the extra fields are inert for the legacy readers.
          flags.pending_side_event = {
            eventId: event.id,
            week: currentWeek,
            prompt: event.prompt,
            category: event.category,
            choices: event.choices,
          };
          // In mandatory mode the event is NOT surfaced as an interactive beat this
          // week — it lands as a mandatory crisis card in NEXT week's action
          // selection. We still record its arrival for the outcome log/tests.
          summary.events.push({
            id: event.id,
            title: event.prompt.substring(0, 50),
            occurred: true,
            category: event.category,
            prompt: event.prompt,
            // No `choices` → the client's legacy interactive beat renders nothing;
            // the crisis card reads the pending flag instead.
          });
        } else {
          // Legacy path: pending flag is the lean {eventId, week}; the full payload
          // rides summary.events so PR-4's in-results interactive beat can render.
          flags.pending_side_event = { eventId: event.id, week: currentWeek };
          summary.events.push({
            id: event.id,
            title: event.prompt.substring(0, 50),
            occurred: true,
            category: event.category,
            prompt: event.prompt,
            choices: event.choices,
          });
        }
      }
      // Empty pool (all events on cooldown) or a crisis already pending → nothing
      // new fires this week.
    }
  }

  /**
   * Mandatory Side Events ("Crisis on the Desk"): resolve the pending crisis
   * carried with the advance request. Applies the chosen effects DURING this
   * advance — immediate effects through ActionProcessor.applyEffects (global
   * scope → all signed artists, mood_events logged via applyArtistChangesToDatabase),
   * delayed effects banked on flags with triggerWeek = currentWeek + 1 (drained
   * next advance, exactly like meeting/dialogue delayed effects). Clears the
   * pending flag and emits a RESOLVED beat into summary.events.
   *
   * No-op when no choice is supplied (legacy in-results path) or no crisis is
   * pending. If the supplied choice does not match the pending event, it is
   * ignored and the pending flag is left intact (the server gate should have
   * already validated the match; this is defensive).
   */
  private async processPendingSideEventResolution(
    summary: WeekSummary,
    sideEventChoice: { eventId: string; choiceId: string } | null,
    dbTransaction?: any
  ): Promise<void> {
    if (!sideEventChoice) return;

    const flags = (this.gameState.flags || {}) as Record<string, any>;
    this.gameState.flags = flags;
    const pending = flags.pending_side_event as { eventId: string; week: number } | undefined;
    if (!pending) return;
    if (pending.eventId !== sideEventChoice.eventId) {
      console.warn(`[SIDE EVENT] Resolution eventId "${sideEventChoice.eventId}" does not match pending "${pending.eventId}"; ignoring.`);
      return;
    }

    const currentWeek = this.gameState.currentWeek || 0;

    // Authoritative event/choice from data (the pending flag also carries a copy,
    // but the on-disk content is the source of truth).
    const event = await this.gameData.getEventById(sideEventChoice.eventId);
    if (!event) {
      console.warn(`[SIDE EVENT] Unknown pending event "${sideEventChoice.eventId}"; clearing without effects.`);
      delete flags.pending_side_event;
      return;
    }
    const choice = event.choices.find((c) => c.id === sideEventChoice.choiceId);
    if (!choice) {
      console.warn(`[SIDE EVENT] Invalid choice "${sideEventChoice.choiceId}" for event "${event.id}"; leaving pending.`);
      return;
    }

    // Apply immediate effects, queued like a weekly action (global scope — side
    // events are label-level, so artist-scoped keys hit every signed artist).
    const effectsImmediate: Record<string, number> = {};
    for (const [k, v] of Object.entries(choice.effects_immediate || {})) {
      if (typeof v === 'number') effectsImmediate[k] = v;
    }
    if (Object.keys(effectsImmediate).length > 0) {
      await new ActionProcessor().applyEffects(
        this.weekContext(summary, dbTransaction),
        effectsImmediate,
        undefined,
        'global',
        `side_event:${event.id}`,
        choice.id
      );
    }

    // Bank delayed effects (deterministic week-based key — never Date.now()).
    const effectsDelayed: Record<string, number> = {};
    for (const [k, v] of Object.entries(choice.effects_delayed || {})) {
      if (typeof v === 'number') effectsDelayed[k] = v;
    }
    if (Object.keys(effectsDelayed).length > 0) {
      const delayedKey = `side-event-${event.id}-${choice.id}-week${currentWeek}`;
      flags[delayedKey] = {
        triggerWeek: currentWeek + 1,
        effects: effectsDelayed,
        meetingName: `side_event:${event.id}`,
        choiceId: choice.id,
      };
    }

    // Clear the resolved crisis.
    delete flags.pending_side_event;

    // Emit the resolved beat ("You spent the week handling: …").
    summary.events.push({
      id: event.id,
      title: event.prompt.substring(0, 50),
      occurred: true,
      resolved: true,
      category: event.category,
      prompt: event.prompt,
      choiceId: choice.id,
      choiceLabel: choice.label,
      effects: effectsImmediate,
      delayedEffects: effectsDelayed,
    });
  }

  /**
   * Checks and applies progression gates
   */
  private async checkProgressionGates(summary: WeekSummary): Promise<void> {
    return new ProgressionProcessor().checkProgressionGates(this.weekContext(summary));
  }

  /**
   * Updates access tiers based on current reputation and returns tier upgrade notifications
   */
  private updateAccessTiers(): GameChange[] {
    // updateAccessTiers returns its notifications (it does not read ctx.summary),
    // so a throwaway summary is passed only to satisfy the WeekContext shape.
    return new ProgressionProcessor().updateAccessTiers(
      this.weekContext({ changes: [] } as unknown as WeekSummary)
    );
  }

  /**
   * Checks for producer tier unlocks and adds progression notifications
   */
  private checkProducerTierUnlocks(summary: WeekSummary): void {
    return new ProgressionProcessor().checkProducerTierUnlocks(this.weekContext(summary));
  }

  // REMOVED: processProjectStart method is redundant
  // Projects are now handled via database creation and automatic advancement in advanceProjectStages()

  // REMOVED: getDefaultSongCount method is redundant
  // Default song counts are now handled via database project_costs.song_count_default

  // LEGACY METHOD REMOVED - calculateCityRevenue()
  // Replaced with unified FinancialSystem calculations in processUnifiedTourRevenue()

  // LEGACY METHOD REMOVED - processTourCityRevenue()
  // Replaced with TourProcessor.processUnifiedTourRevenue() using FinancialSystem calculations

  /**
   * Process weekly charts after releases have been processed
   */
  private async processWeeklyCharts(summary: WeekSummary, dbTransaction?: any): Promise<void> {
    try {
      // Generate chart week from current week
      const chartWeek = ChartService.generateChartWeekFromGameWeek(this.gameState.currentWeek || 1);

      // Create ChartService instance
      const chartService = new ChartService(
        this.gameData,
        this.rng,
        this.storage,
        this.gameState.id
      );

      // Generate weekly chart
      await chartService.generateWeeklyChart(chartWeek, dbTransaction);

      // Fetch current week entries and map to ChartUpdate objects
      const currentWeekEntries = await chartService.getCurrentWeekChartEntries(chartWeek, dbTransaction);

      summary.chartUpdates = currentWeekEntries.map(entry => ({
        songTitle: entry.songTitle,
        artistName: entry.artistName,
        position: entry.position,
        movement: entry.movement ?? 0,
        isDebut: !!entry.isDebut,
        weeksOnChart: entry.weeksOnChart,
        peakPosition: entry.peakPosition ?? (entry.position ?? null),
        isCompetitorSong: entry.isCompetitorSong ?? false
      }));

      const chartUpdateCount = summary.chartUpdates?.length ?? 0;
      console.log(`[CHART PROCESSING] Generated chart for week ${chartWeek} with ${chartUpdateCount} player entries`);

      // Exec-meetings-revival PR-7 (C5): wire the dead hit_single_bonus/
      // number_one_bonus config (data/balance/progression.json reputation_system)
      // — a #1 (or top-10) finally pays reputation. currentWeekEntries (pre-map,
      // still carrying songId) is the milestone source.
      this.applyChartMilestoneBonuses(currentWeekEntries, summary);
    } catch (error) {
      console.error('[CHART PROCESSING] Error generating weekly chart:', error);
      // Don't throw - chart generation should not break weekly processing
    }
  }

  /**
   * Exec-meetings-revival PR-7 (C5) — chart reputation milestones.
   *
   * `hit_single_bonus`/`number_one_bonus` (data/balance/progression.json
   * reputation_system) were authored but never consumed anywhere (gap-analysis
   * finding 7's S-slice). Semantics are ONCE per song per milestone, not weekly:
   * hit_single_bonus fires the week a song FIRST enters the top 10;
   * number_one_bonus fires the week a song FIRST reaches No. 1. A song hitting
   * both in the same week gets both.
   *
   * "First" is tracked via `gameState.flags.chartMilestones[songId]` (documented
   * choice, not `peakPosition`/`isDebut` off the chart-entry shape): ChartService's
   * `peakPosition` only reflects PRIOR charting weeks captured in `chart_entries`,
   * and a song that debuts directly at position <=10 (or at #1) needs the SAME
   * week's bonus to fire — inferring "first" from movement/peak alone at this
   * call site would require re-deriving history ChartService already computed
   * differently for isDebut vs peakPosition. An explicit once-fired flag is
   * simpler to reason about and immune to any future ChartService peak-tracking
   * change. Competitor rows (no songId) are skipped — no reputation payout for
   * NPC chart performance.
   */
  private applyChartMilestoneBonuses(
    entries: Array<{ songId?: string | null; songTitle: string; position: number | null; isCompetitorSong?: boolean | null }>,
    summary: WeekSummary
  ): void {
    const reputationSystem = (this.gameData.getBalanceConfigSync() as any)?.reputation_system || {};
    const hitSingleBonus = typeof reputationSystem.hit_single_bonus === 'number' ? reputationSystem.hit_single_bonus : 5;
    const numberOneBonus = typeof reputationSystem.number_one_bonus === 'number' ? reputationSystem.number_one_bonus : 10;

    const flags = (this.gameState.flags || {}) as Record<string, any>;
    const milestones = { ...(flags.chartMilestones || {}) } as Record<string, { hitTop10?: boolean; hitNumberOne?: boolean }>;
    let milestonesChanged = false;

    for (const entry of entries) {
      if (entry.isCompetitorSong || !entry.songId || entry.position === null) continue;

      const songId = entry.songId;
      const record = milestones[songId] || {};
      let bonus = 0;
      const labels: string[] = [];

      if (entry.position <= 10 && !record.hitTop10) {
        bonus += hitSingleBonus;
        labels.push(`Top 10 debut (+${hitSingleBonus} reputation)`);
        record.hitTop10 = true;
      }
      if (entry.position === 1 && !record.hitNumberOne) {
        bonus += numberOneBonus;
        labels.push(`No. 1 (+${numberOneBonus} reputation)`);
        record.hitNumberOne = true;
      }

      if (bonus > 0) {
        milestones[songId] = record;
        milestonesChanged = true;

        // Volatility-economy slice 3: throttle chart-milestone reputation (a
        // "release success" gain) through the shared global gain-scaling helper.
        const scaledBonus = scaleReputationGain(bonus, reputationSystem);
        this.gameState.reputation = Math.max(0, Math.min(100, (this.gameState.reputation || 0) + scaledBonus));
        if (!summary.reputationChanges) summary.reputationChanges = {};
        summary.reputationChanges['global'] = (summary.reputationChanges['global'] || 0) + scaledBonus;

        summary.changes.push({
          type: 'reputation',
          description: `Chart smash: ${entry.songTitle} hit the ${labels.join(' and ')}`,
          amount: scaledBonus
        });
        console.log(`[CHART MILESTONE] ${entry.songTitle} (${songId}): +${scaledBonus} reputation (raw ${bonus}) (${labels.join(', ')})`);
      }
    }

    if (milestonesChanged) {
      flags.chartMilestones = milestones;
      this.gameState.flags = flags;
    }
  }

  /**
   * Check if the 52-week campaign has been completed and calculate final results
   */
  private async checkCampaignCompletion(summary: WeekSummary): Promise<CampaignResults | undefined> {
    return new ProgressionProcessor().checkCampaignCompletion(this.weekContext(summary));
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
   * Enhanced weekly summary generation with economic insights
   */
  private generateEconomicInsights(summary: WeekSummary): void {
    return new WeeklyFinancesProcessor().generateEconomicInsights(this.weekContext(summary));
  }

  /**
   * PHASE 1 MIGRATION: Moved from routes.ts
   * Handles all project stage advancement logic within GameEngine
   */
  // DELEGATED TO ProjectStageProcessor (Phase 2 engine-seams PR-9). Same-signature
  // wrapper; still called from advanceWeek. The processor calls TourProcessor
  // directly for mid-tour city revenue (same behavior as the old inline
  // this.processUnifiedTourRevenue delegate call).
  private async advanceProjectStages(summary: WeekSummary, dbTransaction?: any): Promise<void> {
    return new ProjectStageProcessor().advanceProjectStages(
      this.weekContext(summary, dbTransaction),
      summary,
      dbTransaction
    );
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
   * Generates financial breakdown for display purposes only
   * Does NOT modify game state - that happens at the end of advanceWeek()
   */
  // DELEGATED TO FinancialSystem (originally lines 3126-3172)
  async calculateWeeklyFinancials(summary: WeekSummary): Promise<WeeklyFinancials> {
    return new WeeklyFinancesProcessor().calculateWeeklyFinancials(
      this.weekContext(summary),
      summary
    );
  }


  // REMOVED: getSeasonFromWeek() - now using shared utility

  /**
   * Calculates comprehensive release preview metrics using GameEngine formulas
   * This method provides accurate economic projections for release planning
   */
  // DELEGATED TO ReleaseProcessor (Phase 2 engine-seams PR-10). Same-signature
  // wrapper: server/routes/releases.ts builds a GameEngine for the preview endpoint
  // and calls this on the instance, so the delegate keeps the server path
  // byte-identical (guarded by tests/endpoints/releases.characterization.test.ts).
  calculateReleasePreview(
    songs: any[],
    artist: any,
    releaseConfig: {
      releaseType: 'single' | 'ep' | 'album';
      leadSingleId?: string;
      seasonalTiming: string;
      scheduledReleaseWeek: number;
      marketingBudget: Record<string, number>;
      leadSingleStrategy?: {
        leadSingleId: string;
        leadSingleReleaseWeek: number;
        leadSingleBudget: Record<string, number>;
      };
    }
  ) {
    return new ReleaseProcessor().calculateReleasePreview(
      this.weekContext({ changes: [] } as unknown as WeekSummary),
      songs,
      artist,
      releaseConfig
    );
  }

  /**
   * Adapter method that uses sophisticated preview calculations for actual releases
   * Converts release metadata into preview format and returns per-song breakdown
   */
  // DELEGATED TO ReleaseProcessor (Phase 2 engine-seams PR-10). Same-signature
  // wrapper; kept because the release pipeline formerly called
  // this.calculateSophisticatedReleaseOutcome.
  calculateSophisticatedReleaseOutcome(
    release: any,
    songs: any[],
    artist: any
  ): {
    totalStreams: number;
    totalRevenue: number;
    perSongBreakdown: Array<{songId: string; streams: number; revenue: number}>
  } {
    return new ReleaseProcessor().calculateSophisticatedReleaseOutcome(
      this.weekContext({ changes: [] } as unknown as WeekSummary),
      release,
      songs,
      artist
    );
  }

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
    // Exec-meetings-revival PR-7 (C5) — campaign-end award-roll bonus (0 if none).
    awardBonus: number;
  };
  victoryType: 'Commercial Success' | 'Critical Acclaim' | 'Balanced Growth' | 'Survival' | 'Failure';
  summary: string;
  achievements: string[];
  // Exec-meetings-revival PR-7 (C5) — true when the campaign-end award roll hit.
  industryAward?: boolean;
}