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
import { getSeasonFromWeek, getSeasonalMultiplier } from '../utils/seasonalCalculations';

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
interface GameEngineAction {
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
  async advanceWeek(weeklyActions: GameEngineAction[], dbTransaction?: any): Promise<{
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

    // Process ongoing revenue from released projects
    await this.processReleasedProjects(summary);
    
    // Process newly recorded projects (projects that became "recorded" this week)
    await this.processNewlyRecordedProjects(summary, dbTransaction);
    
    // Process song generation for recording projects
    await this.processRecordingProjects(summary, dbTransaction);

    // Process lead singles scheduled for this week  
    await this.processLeadSingles(summary, dbTransaction);

    // Process planned releases scheduled for this week
    await this.processPlannedReleases(summary, dbTransaction);

    // Process weekly charts after releases
    await this.processWeeklyCharts(summary, dbTransaction);

    // PHASE 1 MIGRATION: Handle project stage advancement within GameEngine
    await this.advanceProjectStages(summary, dbTransaction);

    // Apply delayed effects from previous weeks
    await this.processDelayedEffects(summary);

    // Apply delayed artist changes to database (delayed effects add to summary.artistChanges)
    await this.applyArtistChangesToDatabase(summary, dbTransaction);

    // Process weekly mood changes
    await this.processWeeklyMoodChanges(summary);

    // Process weekly popularity changes
    await this.processWeeklyPopularityChanges(summary);

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
      pressMentions: 0, // TODO: Add press mentions tracking
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
    
    // Check for focus slot unlock at 50+ reputation
    if (this.gameState.reputation && this.gameState.reputation >= 50) {
      const currentSlots = this.gameState.focusSlots || 3;
      if (currentSlots < 4) {
        this.gameState.focusSlots = 4;
        summary.changes.push({
          type: 'unlock',
          description: 'Fourth focus slot unlocked! You can now select 4 actions per week.'
        });
        console.log('[UNLOCK] Fourth focus slot unlocked at reputation', this.gameState.reputation);
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
      // We already have the artist data cached in gameState.flags, so use that instead of database lookup
      let discoveredArtist = null;
      if (summary.arOffice?.discoveredArtistId) {
        const artistInfo = (this.gameState.flags as any)?.ar_office_discovered_artist_info;
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

      const emails = generateEmails({
        gameId: this.gameState.id,
        weekSummary: summary,
        chartUpdates: summary.chartUpdates ?? [],
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
  private async processAROfficeWeekly(summary: WeekSummary, dbTransaction?: any): Promise<void> {
    try {
      const slotUsed = (this.gameState as any).arOfficeSlotUsed;
      const sourcingType = (this.gameState as any).arOfficeSourcingType;
      const primaryGenre = (this.gameState as any).arOfficePrimaryGenre;
      const secondaryGenre = (this.gameState as any).arOfficeSecondaryGenre;
      console.log('[A&R DEBUG] Processing A&R operation:', {
        slotUsed,
        sourcingType,
        primaryGenre,
        secondaryGenre,
        gameId: this.gameState.id,
        currentWeek: this.gameState.currentWeek
      });

      if (slotUsed) {
        // Complete the one-week operation: free the slot, clear start time and genre parameters
        (this.gameState as any).arOfficeSlotUsed = false;
        (this.gameState as any).arOfficeOperationStart = null;
        (this.gameState as any).arOfficePrimaryGenre = null;
        (this.gameState as any).arOfficeSecondaryGenre = null;

        // Enhanced flags initialization and management
        let flags = (this.gameState.flags || {}) as any;
        if (!flags || typeof flags !== 'object') {
          console.log('[A&R DEBUG] Initializing flags object');
          flags = {};
          this.gameState.flags = flags;
        }

        // Clear start-week flag used by server validation
        if ('ar_office_start_week' in flags) {
          delete flags.ar_office_start_week;
        }

        // Add discovery timestamp for tracking
        flags.ar_office_discovery_time = new Date().toISOString();
        flags.ar_office_sourcing_type = sourcingType;

        // Enhanced artist selection with better validation and error handling
        try {
          const allArtists = await this.gameData.getAllArtists();
          console.log('[A&R DEBUG] All artists loaded:', allArtists?.length, 'artists');

          if (!allArtists || allArtists.length === 0) {
            console.error('[A&R DEBUG] No artists available in game data');
            flags.ar_office_discovered_artist_id = null;
            flags.ar_office_error = 'No artists available in game data';
          } else {
            let unsigned = [...allArtists];

            // Enhanced signed and discovered artist filtering
            try {
              if (this.storage?.getArtistsByGame) {
                const signed = await this.storage.getArtistsByGame(this.gameState.id);
                console.log('[A&R DEBUG] Signed artists:', signed?.length, 'signed');

                // BUGFIX: Match by name (case-insensitive) instead of ID
                // JSON artist IDs (e.g., "art_4") don't match database UUIDs
                const signedNames = new Set(
                  (signed || []).map((a: any) => String(a.name || '').toLowerCase())
                );

                // Also exclude already discovered artists from selection
                const discoveredNames = new Set();
                if (flags.ar_office_discovered_artists && Array.isArray(flags.ar_office_discovered_artists)) {
                  flags.ar_office_discovered_artists.forEach((discovered: any) => {
                    if (discovered.name) {
                      discoveredNames.add(String(discovered.name).toLowerCase());
                    }
                  });
                }
                console.log('[A&R DEBUG] Already discovered artists:', discoveredNames.size, 'discovered');

                // Filter out both signed and already discovered artists by name
                unsigned = allArtists.filter((a: any) => {
                  const artistName = String(a.name || '').toLowerCase();
                  return !signedNames.has(artistName) && !discoveredNames.has(artistName);
                });
                console.log('[A&R DEBUG] Available artists (unsigned + undiscovered):', unsigned?.length, 'available');
              }
            } catch (storageErr) {
              console.warn('[A&R DEBUG] Failed to filter signed/discovered artists, using all artists:', storageErr);
              // Continue with all artists if filtering fails
            }

            let picked: any | null = null;
            let genreUsed: string | null = null;
            if (unsigned.length > 0) {
              // SPECIALIZED mode: Apply genre filtering with fallback logic
              if (sourcingType === 'specialized') {
                let pool = [...unsigned];

                // Try primary genre first
                if (primaryGenre) {
                  const primaryMatches = pool.filter(a => a.genre === primaryGenre);
                  if (primaryMatches.length > 0) {
                    pool = primaryMatches;
                    genreUsed = primaryGenre;
                    console.log(`[A&R DEBUG] Found ${primaryMatches.length} artists matching primary genre: ${primaryGenre}`);
                  } else {
                    console.log(`[A&R DEBUG] No artists found for primary genre: ${primaryGenre}, trying secondary...`);
                    // Try secondary genre
                    if (secondaryGenre) {
                      const secondaryMatches = pool.filter(a => a.genre === secondaryGenre);
                      if (secondaryMatches.length > 0) {
                        pool = secondaryMatches;
                        genreUsed = secondaryGenre;
                        console.log(`[A&R DEBUG] Found ${secondaryMatches.length} artists matching secondary genre: ${secondaryGenre}`);
                      } else {
                        console.log(`[A&R DEBUG] No artists found for secondary genre: ${secondaryGenre}, using all available`);
                        genreUsed = 'any';
                      }
                    } else {
                      console.log(`[A&R DEBUG] No secondary genre specified, using all available`);
                      genreUsed = 'any';
                    }
                  }
                }

                // Pick best artist from filtered pool
                const sorted = [...pool].sort((a, b) => {
                  const scoreA = (a.talent || 0) + (a.popularity || 0);
                  const scoreB = (b.talent || 0) + (b.popularity || 0);
                  return scoreB - scoreA;
                });
                picked = sorted[0];

              } else if (sourcingType === 'active') {
                // ACTIVE mode: Pick best artist overall (no genre filtering)
                const sorted = [...unsigned].sort((a, b) => {
                  const scoreA = (a.talent || 0) + (a.popularity || 0);
                  const scoreB = (b.talent || 0) + (b.popularity || 0);
                  return scoreB - scoreA;
                });
                picked = sorted[0];
              } else {
                // PASSIVE mode: Random selection
                const idx = Math.floor(this.getRandom(0, unsigned.length));
                picked = unsigned[idx];
              }

              // Validate the picked artist has required fields
              if (picked) {
                const requiredFields = ['id', 'name', 'archetype'];
                const missingFields = requiredFields.filter(field => !picked[field]);

                if (missingFields.length > 0) {
                  console.warn('[A&R DEBUG] Selected artist missing required fields:', missingFields, 'Artist:', picked);
                  // Add fallback values
                  picked = {
                    ...picked,
                    name: picked.name || `Artist ${picked.id}`,
                    archetype: picked.archetype || 'Unknown',
                    talent: picked.talent || 50,
                    popularity: picked.popularity || 0
                  };
                }
              }
            }

            if (picked) {
              console.log('[A&R DEBUG] Selected artist:', picked.name, 'ID:', picked.id, 'Talent:', picked.talent, 'Popularity:', picked.popularity);

              // Initialize discovered artists array if it doesn't exist
              if (!flags.ar_office_discovered_artists) {
                flags.ar_office_discovered_artists = [];
              }

              // Add new discovered artist to the collection (no duplicate check needed since we pre-filtered)
              flags.ar_office_discovered_artists.push({
                id: picked.id,
                name: picked.name,
                archetype: picked.archetype,
                talent: picked.talent || 0,
                popularity: picked.popularity || 0,
                genre: picked.genre || null,
                discoveryTime: new Date().toISOString(),
                sourcingType: sourcingType,
                genreUsed: genreUsed || null // Track which genre filter was used
              });
              console.log('[A&R DEBUG] Added artist to discovered collection. Total discovered:', flags.ar_office_discovered_artists.length);
              if (genreUsed) {
                console.log('[A&R DEBUG] Genre filter result:', genreUsed);
              }

              // Keep legacy fields for backwards compatibility
              flags.ar_office_discovered_artist_id = picked.id;
              flags.ar_office_discovered_artist_info = {
                name: picked.name,
                archetype: picked.archetype,
                talent: picked.talent || 0,
                popularity: picked.popularity || 0,
                genre: picked.genre || null
              };

              // Populate week summary A&R section with discovered artist id
              // NOTE: This ID may differ from what /ar-office/artists returns if fallback logic is triggered
              summary.arOffice = {
                completed: true,
                sourcingType: sourcingType ?? null,
                discoveredArtistId: picked.id
              };
            } else {
              console.log('[A&R DEBUG] No artist selected - no unsigned artists available');
              flags.ar_office_discovered_artist_id = null;
              flags.ar_office_error = 'No unsigned artists available';

              // Create synthetic "no artists available" flag for better client handling
              if (unsigned.length === 0) {
                flags.ar_office_no_artists_reason = 'all_signed';
              } else {
                flags.ar_office_no_artists_reason = 'unknown';
              }

              summary.arOffice = {
                completed: true,
                sourcingType: sourcingType ?? null,
                discoveredArtistId: null
              };
            }
          }

          // Ensure flags are properly set on gameState
          this.gameState.flags = flags;
          console.log('[A&R DEBUG] Final flags state:', JSON.stringify(flags, null, 2));

        } catch (selectErr) {
          console.error('[A&R] Failed to select/persist discovered artist:', selectErr);
          flags.ar_office_discovered_artist_id = null;
          flags.ar_office_error = selectErr instanceof Error ? selectErr.message : 'Artist selection failed';
          this.gameState.flags = flags;
        }

        // Ensure WeekSummary A&R section is always properly populated
        if (!summary.arOffice) {
          summary.arOffice = {
            completed: true,
            sourcingType: sourcingType ?? null,
            discoveredArtistId: flags.ar_office_discovered_artist_id || null
          } as any;
        }

        // Add comprehensive change description
        const discoveredArtistName = flags.ar_office_discovered_artist_info?.name;
        let description;
        if (discoveredArtistName) {
          description = `A&R sourcing (${sourcingType || 'active'}) completed. Discovered ${discoveredArtistName}.`;
        } else if (flags.ar_office_error) {
          description = `A&R sourcing (${sourcingType || 'active'}) completed. ${flags.ar_office_error}`;
        } else {
          description = `A&R sourcing (${sourcingType || 'active'}) completed. Check discovered artists.`;
        }

        summary.changes.push({
          type: 'unlock',
          description,
          amount: 0
        });
      }
    } catch (e) {
      console.warn('[A&R] Failed to process weekly A&R completion:', e);
    }
  }

  /**
   * Processes a single player action
   */
  private async processAction(action: GameEngineAction, summary: WeekSummary, dbTransaction?: any): Promise<void> {
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

    // NOTE: Focus slots are consumed when actions are selected (via API endpoints),
    // not when they're processed. Removing duplicate consumption here.
    // this.gameState.usedFocusSlots = (this.gameState.usedFocusSlots || 0) + 1;
  }

  /**
   * Processes a role meeting and applies effects
   */
  private async processRoleMeeting(action: GameEngineAction, summary: WeekSummary, dbTransaction?: any): Promise<void> {
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

    // Load the full action data to get target_scope (FR-18)
    const actionData = await this.gameData.getActionById(actionId);
    const targetScope = actionData?.target_scope || 'global'; // Default to global if missing
    const meetingName = actionData?.id || actionId; // Use meeting ID as name for logging

    // Load the actual choice from actions.json
    const choice = await this.gameData.getChoiceById(actionId, choiceId);
    
    if (!choice) {
      console.error(`[GAME-ENGINE] Choice not found for actionId: ${actionId}, choiceId: ${choiceId}`);
      // Fallback to minimal stub to prevent crashes
      const fallbackChoice = {
        effects_immediate: { money: -1000 },
        effects_delayed: {}
      };
      console.log(`[GAME-ENGINE] Using fallback choice data`);
      
      // Apply fallback effects and return (use global targeting as safe default)
      if (fallbackChoice.effects_immediate) {
        const effects: Record<string, number> = {};
        for (const [key, value] of Object.entries(fallbackChoice.effects_immediate)) {
          if (typeof value === 'number') {
            effects[key] = value;
          }
        }
        await this.applyEffects(effects, summary, undefined, 'global'); // Global targeting (safe fallback default)
      }
      return;
    }
    
    console.log(`[GAME-ENGINE] Loaded real choice data:`, {
      actionId,
      choiceId,
      immediateEffects: choice.effects_immediate,
      delayedEffects: choice.effects_delayed
    });

    // Determine artistId based on target_scope (FR-18)
    let targetArtistId: string | undefined = undefined;

    if (targetScope === 'predetermined') {
      // Predetermined: Select artist with highest popularity
      const selectedArtist = await this.selectHighestPopularityArtist();
      if (selectedArtist) {
        targetArtistId = selectedArtist.id;
        console.log(`[GAME-ENGINE] Predetermined targeting: Selected ${selectedArtist.name} (popularity: ${selectedArtist.popularity})`);
      } else {
        console.warn(`[GAME-ENGINE] Predetermined targeting failed: No signed artists available`);
      }
    } else if (targetScope === 'user_selected') {
      // User-selected: Extract from action metadata
      targetArtistId = action.metadata?.selectedArtistId
        ?? (action.details as Record<string, any> | undefined)?.selectedArtistId
        ?? (action.metadata as Record<string, any> | undefined)?.metadata?.selectedArtistId;
      if (targetArtistId) {
        // BUGFIX: Removed gameState.artists lookup (property doesn't exist)
        // Artist name will be logged in applyArtistChangesToDatabase()
        console.log(`[GAME-ENGINE] User-selected targeting: Player selected artist ${targetArtistId}`);
      } else {
        console.warn(`[GAME-ENGINE] User-selected targeting failed: No selectedArtistId in metadata`);
      }
    } else {
      // Global: No artistId (applies to all artists)
      console.log(`[GAME-ENGINE] Global targeting: Effects will apply to all signed artists`);
    }

    // Apply immediate effects
    if (choice.effects_immediate) {
      // Convert to Record<string, number> for applyEffects
      const effects: Record<string, number> = {};
      for (const [key, value] of Object.entries(choice.effects_immediate)) {
        if (typeof value === 'number') {
          effects[key] = value;
        }
      }
      await this.applyEffects(effects, summary, targetArtistId, targetScope, meetingName, choiceId); // Pass all context for logging
    }

    // Queue delayed effects with artist targeting support (Task 2.5, FR-19)
    if (choice.effects_delayed) {
      const flags = this.gameState.flags || {};
      const delayedKey = `${action.targetId}-${action.details?.choiceId}-delayed`;
      (flags as any)[delayedKey] = {
        triggerWeek: (this.gameState.currentWeek || 0) + 1,
        effects: choice.effects_delayed,
        artistId: targetArtistId, // Preserve artist targeting for delayed effects
        targetScope: targetScope, // Preserve scope for validation
        meetingName: meetingName, // Preserve context for logging
        choiceId: choiceId
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
   * Updates mood, loyalty, and lastActionWeek when executives are used
   */
  private async processExecutiveActions(
    action: GameEngineAction,
    summary: WeekSummary,
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
    
    // Track that this executive was used this week
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

    // Apply mood changes from executive-specific choice effects
    let moodChange = 0;
    const choiceEffects = action.metadata?.choiceEffects;
    if (choiceEffects?.effects_immediate?.executive_mood) {
      // Use executive-specific mood effect if available
      moodChange = choiceEffects.effects_immediate.executive_mood;
      console.log('[GAME-ENGINE] Applied executive_mood effect:', moodChange);
    } else {
      // Default positive boost for interaction (removed artist_mood fallback)
      moodChange = 5;
      console.log('[GAME-ENGINE] Applied default executive interaction boost: +5');
    }
    
    const newMood = Math.max(0, Math.min(100, executive.mood + moodChange));
    
    // Boost loyalty for being used (+5 for interaction)
    const newLoyalty = Math.min(100, executive.loyalty + 5);
    
    // Update last action week
    const currentWeek = this.gameState.currentWeek || 1;

    console.log('[GAME-ENGINE] Updating executive:', {
      moodChange,
      newMood,
      newLoyalty,
      lastActionWeek: currentWeek
    });

    // Save changes to database
    await this.storage.updateExecutive(
      executive.id,
      {
        mood: newMood,
        loyalty: newLoyalty,
        lastActionWeek: currentWeek
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
   * Select artist with highest popularity for predetermined meetings
   * Handles edge cases: 0 artists (null), 1 artist (auto-select), ties (random)
   * Per FR-10 (Predetermined meeting logic)
   */
  private async selectHighestPopularityArtist(): Promise<Artist | null> {
    // Load signed artists from storage (BUGFIX: was using non-existent gameState.artists)
    if (!this.storage?.getArtistsByGame) {
      console.warn('[ARTIST SELECTION] Storage not available for artist selection');
      return null;
    }

    const allArtists = await this.storage.getArtistsByGame(this.gameState.id);
    const signedArtists = allArtists.filter((a: Artist) => a.signed);

    // Edge case: No signed artists
    if (signedArtists.length === 0) {
      console.log('[ARTIST SELECTION] No signed artists available for predetermined meeting');
      return null;
    }

    // Edge case: Only 1 artist signed (auto-select)
    if (signedArtists.length === 1) {
      console.log(`[ARTIST SELECTION] Auto-selected only artist: ${signedArtists[0].name}`);
      return signedArtists[0];
    }

    // Find highest popularity
    const maxPopularity = Math.max(...signedArtists.map((a: Artist) => a.popularity || 0));
    const topArtists = signedArtists.filter((a: Artist) => (a.popularity || 0) === maxPopularity);

    // Handle tie-breaking with random selection
    if (topArtists.length > 1) {
      const selectedIndex = Math.floor(this.rng() * topArtists.length);
      const selectedArtist = topArtists[selectedIndex];
      console.log(`[ARTIST SELECTION] Predetermined selection: ${topArtists.length} artists tied at popularity ${maxPopularity}, selected ${selectedArtist.name} randomly`);
      return selectedArtist;
    }

    // Single artist with highest popularity
    const selectedArtist = topArtists[0];
    console.log(`[ARTIST SELECTION] Predetermined selection: ${selectedArtist.name} (highest popularity: ${maxPopularity})`);
    return selectedArtist;
  }

  /**
   * Load signed artists from storage (helper method)
   */
  private async loadSignedArtists(): Promise<Artist[]> {
    if (!this.storage?.getArtistsByGame) {
      return [];
    }
    const allArtists = await this.storage.getArtistsByGame(this.gameState.id);
    return allArtists.filter((a: Artist) => a.signed);
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
  private async applyEffects(effects: Record<string, number>, summary: WeekSummary, artistId?: string, targetScope?: string, meetingName?: string, choiceId?: string): Promise<void> {
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
                weeklyOperations: 0,
                artistSalaries: 0,
                executiveSalaries: 0,
                signingBonuses: 0,
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
          break;
        case 'creative_capital':
          this.gameState.creativeCapital = Math.max(0, (this.gameState.creativeCapital || 0) + value);
          break;
        case 'artist_mood':
          // Per-artist mood targeting (FR-14, FR-15) with strict validation (Task 2.1)
          if (!summary.artistChanges) summary.artistChanges = {};

          // Strict validation based on target_scope
          if (targetScope === 'global' && artistId) {
            console.warn(`[EFFECT VALIDATION] Global scope meeting provided artistId (${artistId}). Ignoring artistId and applying globally.`);
            // Force global application by clearing artistId
            artistId = undefined;
          } else if ((targetScope === 'predetermined' || targetScope === 'user_selected') && !artistId) {
            throw new Error(`[EFFECT ERROR] ${targetScope} meeting requires artistId but none provided. Scope: ${targetScope}`);
          }

          if (artistId) {
            // Per-artist targeting: Apply mood change to specific artist
            // Initialize artist-specific changes if missing
            if (!summary.artistChanges[artistId]) {
              summary.artistChanges[artistId] = {};
            }

            // Apply mood change to specific artist
            const previousMoodChange = (summary.artistChanges[artistId] as any).mood || 0;
            (summary.artistChanges[artistId] as any).mood = previousMoodChange + value;

            // BUGFIX: Removed gameState.artists validation (property doesn't exist)
            // Artist existence will be validated in applyArtistChangesToDatabase()

            // Add comprehensive logging with all debugging context (Task 2.2 & 2.3)
            const logParts = [`target: ${artistId}`];
            if (targetScope) logParts.push(`scope: ${targetScope}`);
            if (meetingName) logParts.push(`meeting: ${meetingName}`);
            if (choiceId) logParts.push(`choice: ${choiceId}`);
            const accumulated = (summary.artistChanges[artistId] as any).mood;
            logParts.push(`accumulated: ${accumulated > 0 ? '+' : ''}${accumulated}`);
            console.log(`[EFFECT PROCESSING] Artist mood effect: ${value > 0 ? '+' : ''}${value} (${logParts.join(', ')})`);

            // Add to summary changes for UI display (will be enriched with artist name in applyArtistChangesToDatabase)
            summary.changes.push({
              type: 'mood',
              description: `Artist morale ${value > 0 ? 'improved' : 'decreased'} from meeting decision (${value > 0 ? '+' : ''}${value})`,
              amount: value,
              moodChange: value,
              artistId: artistId,
              source: targetScope || 'predetermined' // Include scope for UI formatting
            });

            // Validation: Warn if accumulated changes are extreme
            if (Math.abs((summary.artistChanges[artistId] as any).mood) > 10) {
              console.warn(`[EFFECT VALIDATION] Large accumulated mood change for artist ${artistId}: ${(summary.artistChanges[artistId] as any).mood}`);
            }
          } else {
            // Global targeting: Apply mood change to all signed artists (FR-15)
            // BUGFIX: Load from storage instead of non-existent gameState.artists
            const signedArtists = await this.loadSignedArtists();

            if (signedArtists.length === 0) {
              console.log(`[EFFECT PROCESSING] Artist mood effect: ${value > 0 ? '+' : ''}${value} (no signed artists, effect skipped)`);
              break;
            }

            // Iterate through all signed artists and apply mood change to each
            signedArtists.forEach(artist => {
              // Initialize artistChanges if missing
              if (!summary.artistChanges) summary.artistChanges = {};

              // Initialize artist-specific changes if missing
              if (!summary.artistChanges[artist.id]) {
                summary.artistChanges[artist.id] = {};
              }

              // Apply mood change to each artist
              const previousMoodChange = (summary.artistChanges[artist.id] as any).mood || 0;
              (summary.artistChanges[artist.id] as any).mood = previousMoodChange + value;
            });

            // Add comprehensive logging for global effect (Task 2.2 & 2.3)
            const logParts = ['target: all artists', 'scope: global'];
            if (meetingName) logParts.push(`meeting: ${meetingName}`);
            if (choiceId) logParts.push(`choice: ${choiceId}`);
            logParts.push(`count: ${signedArtists.length}`);
            console.log(`[EFFECT PROCESSING] Artist mood effect: ${value > 0 ? '+' : ''}${value} (${logParts.join(', ')})`);

            // Add to summary changes for UI display (roster-wide)
            summary.changes.push({
              type: 'mood',
              description: `Artist morale ${value > 0 ? 'improved' : 'decreased'} from meeting decision (all artists, ${value > 0 ? '+' : ''}${value})`,
              amount: value,
              moodChange: value,
              source: 'global' // Include scope for UI formatting
            });

            // Validation: Warn if accumulated changes are extreme for any artist
            signedArtists.forEach(artist => {
              if (!summary.artistChanges) return;
              const artistMoodChange = (summary.artistChanges[artist.id] as any).mood || 0;
              if (Math.abs(artistMoodChange) > 10) {
                console.warn(`[EFFECT VALIDATION] Large accumulated mood change for ${artist.name}: ${artistMoodChange}`);
              }
            });
          }
          break;
          
        case 'artist_energy':
          // Enhanced effect processing with validation and logging
          if (!summary.artistChanges) summary.artistChanges = {};
          const previousEnergyChange = (summary.artistChanges.energy as number) || 0;
          (summary.artistChanges as any).energy = previousEnergyChange + value;

          // Add comprehensive logging
          console.log(`[EFFECT PROCESSING] Artist energy effect: ${value > 0 ? '+' : ''}${value} (accumulated: ${(summary.artistChanges as any).energy})`);

          // Add to summary changes for UI display (using mood type with energyBoost field)
          summary.changes.push({
            type: 'mood',
            description: `Artist energy ${value > 0 ? 'increased' : 'decreased'} from meeting decision (${value > 0 ? '+' : ''}${value})`,
            energyBoost: value,
            amount: value
          });

          // Validation: Warn if accumulated changes are extreme
          if (Math.abs((summary.artistChanges as any).energy) > 10) {
            console.warn(`[EFFECT VALIDATION] Large accumulated energy change: ${(summary.artistChanges as any).energy}`);
          }
          break;

        case 'artist_popularity':
          // Enhanced effect processing with validation and logging
          if (!summary.artistChanges) summary.artistChanges = {};
          const previousPopularityChange = (summary.artistChanges.popularity as number) || 0;
          (summary.artistChanges as any).popularity = previousPopularityChange + value;

          // Add comprehensive logging
          console.log(`[EFFECT PROCESSING] Artist popularity effect: ${value > 0 ? '+' : ''}${value} (accumulated: ${(summary.artistChanges as any).popularity})`);

          // Add to summary changes for UI display
          summary.changes.push({
            type: 'popularity',
            description: `Artist popularity ${value > 0 ? 'increased' : 'decreased'} from meeting decision (${value > 0 ? '+' : ''}${value})`,
            amount: value
          });

          // Validation: Warn if accumulated changes are extreme
          if (Math.abs((summary.artistChanges as any).popularity) > 10) {
            console.warn(`[EFFECT VALIDATION] Large accumulated popularity change: ${(summary.artistChanges as any).popularity}`);
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
    adSpend: number,
    artistPopularity: number
  ): number {
    return this.financialSystem.calculateStreamingOutcome(
      quality,
      playlistAccess,
      reputation,
      adSpend,
      artistPopularity
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
   * Calculates weekly operational costs including artist payments
   */
  private async calculateWeeklyBurn(): Promise<number> {
    const result = await this.calculateWeeklyBurnWithBreakdown();
    return result.total;
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
    return this.financialSystem.calculateWeeklyBurnWithBreakdown(
      this.gameState.id || '',
      this.storage
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
   * Calculate streaming-based popularity bonus using optimized formula
   * Implements the formula from PopularityTester: dynamic threshold, log points, diminishing returns
   */
  private calculateStreamingPopularityBonus(
    weeklyStreams: number,
    currentPopularity: number,
    baseThreshold: number = 3000,
    useDynamicThreshold: boolean = true,
    saturationPoint: number = 35
  ): number {
    // Calculate dynamic threshold based on popularity (exponential scaling)
    const actualThreshold = useDynamicThreshold
      ? Math.round(baseThreshold * Math.pow(2, currentPopularity / 25))
      : baseThreshold;

    // Convert streams to popularity points using logarithmic scaling
    if (weeklyStreams < actualThreshold) {
      return 0; // No bonus below threshold
    }

    const streamPoints = Math.log10(weeklyStreams / actualThreshold);

    // Cap total bonus at reasonable level (per song)
    const cappedPoints = Math.min(streamPoints, 10);

    // Apply diminishing returns multiplier
    const baseMultiplier = 1 / (1 + Math.pow(currentPopularity / saturationPoint, 4));
    const multiplier = 0.2 + (baseMultiplier * 1.3); // Scales from 1.5x to 0.2x

    const finalBonus = Math.max(0.1, cappedPoints * multiplier);

    return finalBonus;
  }

  /**
   * Processes ongoing revenue from individual released songs (streaming decay)
   * This simulates realistic revenue patterns where each song generates declining revenue over time
   */
  private async processReleasedProjects(summary: WeekSummary): Promise<void> {

    try {
      // Define current week for awareness calculations
      const currentWeek = this.gameState.currentWeek || 1;

      // Get all released songs for this game
      const releasedSongs = await this.gameData.getReleasedSongs(this.gameState.id) || [];

      if (releasedSongs.length === 0) {
        return;
      }

      // Cache artists to avoid repeated DB lookups in the loop
      let artistMap: Map<string, any> = new Map();
      if (this.storage?.getArtistsByGame) {
        try {
          const artists = await this.storage.getArtistsByGame(this.gameState.id);
          if (artists && artists.length > 0) {
            artists.forEach((artist: any) => artistMap.set(artist.id, artist));
          }
        } catch (error) {
          console.error('[STREAMING POPULARITY] Error caching artists, will fallback to individual lookups:', error);
        }
      }

      // Cache releases to avoid N+1 queries in the loop
      let releaseMap: Map<string, any> = new Map();
      if (this.storage?.getReleasesByGame) {
        try {
          const releases = await this.storage.getReleasesByGame(this.gameState.id);
          if (releases && releases.length > 0) {
            releases.forEach((release: any) => releaseMap.set(release.id, release));
          }
        } catch (error) {
          console.error('[AWARENESS] Error caching releases, will fallback to individual lookups:', error);
        }
      }

      let totalOngoingRevenue = 0;
      const songUpdates = [];
      
      for (const song of releasedSongs) {
        const ongoingRevenue = await this.calculateOngoingSongRevenue(song);

        // Process awareness system (building in weeks 1-4, decay in weeks 5+)
        let awarenessUpdate = null;
        try {
          const releaseWeek = song.releaseWeek || 1;
          const weeksSinceRelease = currentWeek - releaseWeek;
          const currentAwareness = song.awareness || 0;

          if (weeksSinceRelease >= 1 && weeksSinceRelease <= 4) {
            // Awareness Building Phase (Weeks 1-4)
            if (song.releaseId) {
              // Use cached release to avoid N+1 queries
              let release = releaseMap.get(song.releaseId);
              if (!release && this.storage?.getRelease) {
                // Fallback to individual lookup if not in cache
                release = await this.storage.getRelease(song.releaseId);
              }
              const marketingBreakdown = release?.metadata?.marketingBudgetBreakdown;

              if (marketingBreakdown) {
              const awarenessGain = this.financialSystem.calculateAwarenessGain(song, marketingBreakdown);
              let newAwareness = Math.round(Math.min(currentAwareness + awarenessGain, 100));

              // Check for breakthrough achievement during weeks 3-6
              if (!song.breakthrough_achieved && weeksSinceRelease >= 3 && weeksSinceRelease <= 6) {
                const balanceConfig = this.gameData.getBalanceConfigSync();
                const awarenessConfig = balanceConfig?.market_formulas?.awareness_system;

                if (awarenessConfig?.enabled) {
                  // Calculate breakthrough potential
                  let breakthroughPotential = 0;
                  if (song.quality >= 80) {
                    breakthroughPotential = Math.min(newAwareness / 40, 1) * 0.65;
                  } else if (song.quality >= 70) {
                    breakthroughPotential = Math.min(newAwareness / 60, 1) * 0.35;
                  } else if (song.quality >= 60) {
                    breakthroughPotential = Math.min(newAwareness / 80, 1) * 0.15;
                  }

                  // Roll for breakthrough (deterministic based on song properties)
                  if (breakthroughPotential > 0) {
                    const artistSuffix = parseInt((song.artistId?.slice(-2) || '00'), 16);
                    const seedVal = (song.quality || 50) + currentWeek + newAwareness + (isNaN(artistSuffix) ? 0 : artistSuffix);
                    const random = (Math.sin(seedVal) + 1) / 2;

                    if (random < breakthroughPotential) {
                      // BREAKTHROUGH ACHIEVED!
                      const breakthroughEffects = awarenessConfig.breakthrough_effects || {};
                      const awarenessMultiplier = breakthroughEffects.awareness_multiplier || 2.5;

                      newAwareness = Math.round(Math.min(newAwareness * awarenessMultiplier, 100));

                      summary.changes.push({
                        type: 'breakthrough',
                        description: `🔥 "${song.title}" BREAKTHROUGH ACHIEVED! Awareness exploded to ${newAwareness}/100`,
                        amount: 0
                      });

                      awarenessUpdate = {
                        awareness: newAwareness,
                        peak_awareness: Math.round(Math.max(song.peak_awareness || 0, newAwareness)),
                        awareness_decay_rate: breakthroughEffects.breakthrough_songs || 0.03,
                        breakthrough_achieved: true
                      };
                    }
                  }
                }
              }
              if (!awarenessUpdate) {
                const newPeakAwareness = Math.round(Math.max(song.peak_awareness || 0, newAwareness));

                awarenessUpdate = {
                  awareness: newAwareness,
                  peak_awareness: newPeakAwareness,
                  awareness_decay_rate: song.awareness_decay_rate || 0.05
                };

                if (awarenessGain > 0) {
                  summary.changes.push({
                    type: 'awareness_gain',
                    description: `🎯 "${song.title}" awareness gained +${awarenessGain.toFixed(1)} (${newAwareness}/100)`,
                    amount: 0
                  });
                }
              }
            }
            }
          } else if (weeksSinceRelease >= 5) {
            // Awareness Decay Phase (Weeks 5+)
            if (currentAwareness > 0) {
              const balanceConfig = this.gameData.getBalanceConfigSync();
              const awarenessConfig = balanceConfig?.market_formulas?.awareness_system;

              if (awarenessConfig?.enabled) {
                const decayRates = awarenessConfig.awareness_decay_rates || {};
                let decayRate = song.breakthrough_achieved
                  ? (decayRates.breakthrough_songs || 0.03)
                  : (decayRates.standard_songs || 0.05);

                // Apply quality bonus reduction for high-quality songs
                if ((song.quality || 0) >= (decayRates.quality_bonus_threshold || 85)) {
                  decayRate = Math.max(0, decayRate - (decayRates.quality_bonus_reduction || 0.01));
                }

                const newAwareness = Math.round(Math.max(0, currentAwareness * (1 - decayRate)));

                awarenessUpdate = {
                  awareness: newAwareness,
                  peak_awareness: Math.round(song.peak_awareness || currentAwareness),
                  awareness_decay_rate: decayRate
                };

                if (Math.abs(newAwareness - currentAwareness) > 0.1) {
                  summary.changes.push({
                    type: 'awareness_decay',
                    description: `📉 "${song.title}" awareness decay ${newAwareness}/100 (-${currentAwareness - newAwareness})`,
                    amount: 0
                  });
                }
              }
            }
          }
        } catch (error) {
          console.warn(`[AWARENESS] Error processing awareness for song ${song.id}:`, error);
        }

        if (ongoingRevenue > 0) {
          totalOngoingRevenue += ongoingRevenue;
          
          // Get revenue per stream from balance.json configuration
          const streamingConfig = this.gameData.getStreamingConfigSync();
          const revenuePerStream = streamingConfig.ongoing_streams.revenue_per_stream;

          // Guard against misconfigured revenue_per_stream being zero
          if (!revenuePerStream || revenuePerStream <= 0) {
            console.warn('Invalid revenue_per_stream; skipping streams/popularity calc.');
            continue;
          }

          const weeklyStreams = Math.round(ongoingRevenue / revenuePerStream);

          // Apply streaming-based popularity bonus using optimized formula
          if (song.artistId) {
            try {
              // Use cached artist if available, fallback to individual lookup
              let artist = artistMap.get(song.artistId);
              if (!artist && this.storage?.getArtist) {
                artist = await this.storage.getArtist(song.artistId);
              }

              if (artist) {
                const popularityBonus = this.calculateStreamingPopularityBonus(
                  weeklyStreams,
                  artist.popularity || 0,
                  3000, // baseThreshold
                  true, // useDynamicThreshold
                  35   // saturationPoint
                );

                if (popularityBonus > 0) {
                  // Accumulate popularity bonus in summary.artistChanges for processing by processWeeklyPopularityChanges
                  const popularityKey = `${song.artistId}_popularity`;
                  if (!summary.artistChanges) {
                    summary.artistChanges = {};
                  }
                  (summary.artistChanges as any)[popularityKey] = ((summary.artistChanges as any)[popularityKey] || 0) + popularityBonus;

                }
              }
            } catch (error) {
              console.error(`[STREAMING POPULARITY] Error getting artist ${song.artistId} for song "${song.title}":`, error);
            }
          }

          // Track song updates for batch processing
          type SongUpdatePatch = {
            songId: string;
            weeklyStreams?: number;
            lastWeekRevenue?: number;
            totalRevenue?: number;
            totalStreams?: number;
            awareness?: number;
            peak_awareness?: number;
            awareness_decay_rate?: number;
          };

          const songUpdate: SongUpdatePatch = {
            songId: song.id,
            weeklyStreams: weeklyStreams,
            lastWeekRevenue: Math.round(ongoingRevenue),
            totalRevenue: Math.round((song.totalRevenue || 0) + ongoingRevenue),
            totalStreams: (song.totalStreams || 0) + weeklyStreams
          };

          // Add awareness updates if processed
          if (awarenessUpdate) {
            songUpdate.awareness = awarenessUpdate.awareness;
            songUpdate.peak_awareness = awarenessUpdate.peak_awareness;
            songUpdate.awareness_decay_rate = awarenessUpdate.awareness_decay_rate;
          }

          songUpdates.push(songUpdate);
          
          // Add to summary changes for transparency
          summary.changes.push({
            type: 'ongoing_revenue',
            description: `🎵 "${song.title}" ongoing streams`,
            amount: ongoingRevenue
          });
        } else if (awarenessUpdate) {
          // Handle awareness updates for songs with no ongoing revenue
          const songUpdate: SongUpdatePatch = {
            songId: song.id,
            awareness: awarenessUpdate.awareness,
            peak_awareness: awarenessUpdate.peak_awareness,
            awareness_decay_rate: awarenessUpdate.awareness_decay_rate
          };
          songUpdates.push(songUpdate);
        }
      }
      
      // Update songs in batch if available
      if (songUpdates.length > 0 && this.gameData.updateSongs) {
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
      }
      
    } catch (error) {
      console.error('[INDIVIDUAL SONG DECAY] Error processing released songs:', error);
    }
  }

  /**
   * Processes lead singles that are scheduled for release this week (before the main release)
   * Checks all planned releases for lead single strategies and releases them early
   */
  private async processLeadSingles(summary: WeekSummary, dbTransaction?: any): Promise<void> {
    const currentWeek = this.gameState.currentWeek || 1;
    
    try {
      // Get all planned releases from gameData to check for lead single strategies
      const allReleases = await this.gameData.getReleasesByGame(this.gameState.id, dbTransaction) || [];
      const plannedReleases = allReleases.filter((r: any) => r.status === 'planned');
      
      // Process releases with lead single strategies
      const leadSinglesToRelease = plannedReleases.filter((r: any) => {
        const lss = r.metadata?.leadSingleStrategy;
        return lss && lss.leadSingleReleaseWeek === currentWeek;
      });
      
      for (const release of plannedReleases) {
        const metadata = release.metadata as any;
        const leadSingleStrategy = metadata?.leadSingleStrategy;
        
        // Check if lead single should be released this month
        
        if (leadSingleStrategy && leadSingleStrategy.leadSingleReleaseWeek === currentWeek) {
          
          // Get the lead single song
          const releaseSongs = await this.gameData.getSongsByRelease(release.id, dbTransaction) || [];
          
          const leadSong = releaseSongs.find(song => song.id === leadSingleStrategy.leadSingleId);
          
          if (leadSong) {
            
            // Calculate lead single performance
            const budgetBreakdown = leadSingleStrategy.leadSingleBudget || {};
            const leadSingleBudget = Object.values(budgetBreakdown).reduce((sum: number, budget) => sum + (budget as number), 0);
            
            // Get artist data for sophisticated calculation
            const artist = await this.storage?.getArtist(leadSong.artistId);

            if (!artist) {
              console.warn(`[LEAD SINGLE] Artist not found, skipping lead single`);
              continue;
            }

            // Create temporary single release configuration for sophisticated calculation
            const leadSingleReleaseConfig = {
              id: `temp-lead-${release.id}`,
              type: 'single',
              releaseWeek: currentWeek,
              metadata: {
                marketingBudget: budgetBreakdown
              }
            };

            const sophisticatedResults = this.calculateSophisticatedReleaseOutcome(
              leadSingleReleaseConfig,
              [leadSong],
              artist
            );

            const initialStreams = sophisticatedResults.perSongBreakdown[0].streams;
            const initialRevenue = sophisticatedResults.perSongBreakdown[0].revenue;
            
            // Update the lead song as released and allocate marketing
            if (this.financialSystem.investmentTracker && leadSingleBudget > 0) {
              try {
                await this.financialSystem.investmentTracker.allocateMarketingToSong(
                  release.id,
                  leadSong.id,
                  leadSingleBudget,
                  dbTransaction
                );
              } catch (allocError) {
                console.warn(`[LEAD SINGLE] Marketing allocation failed:`, allocError);
              }
            }

            const songUpdate = {
              songId: leadSong.id,
              isReleased: true,
              releaseWeek: currentWeek,
              initialStreams: initialStreams,
              weeklyStreams: initialStreams,
              totalStreams: (leadSong.totalStreams || 0) + initialStreams,
              totalRevenue: Math.round((leadSong.totalRevenue || 0) + initialRevenue),
              lastWeekRevenue: Math.round(initialRevenue)
            };

            try {
              await this.gameData.updateSongs([songUpdate], dbTransaction);
            } catch (updateError) {
              console.error(`[LEAD SINGLE] Failed to update song:`, updateError);
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
            
            // Lead single release completed successfully
          } else {
            console.warn(`[LEAD SINGLE] Lead song not found: ${leadSingleStrategy.leadSingleId}`);
          }
        }
      }
      
    } catch (error) {
      console.error('[LEAD SINGLE] Error processing lead singles:', error);
      throw error;
    }
  }

  /**
   * Processes planned releases that are scheduled for the current week
   * This executes the release, generates initial revenue, and updates song statuses
   */
  private async processPlannedReleases(summary: WeekSummary, dbTransaction?: any): Promise<void> {
    
    try {
      // Get planned releases scheduled for this week
      const currentWeek = this.gameState.currentWeek || 1;
      const plannedReleases = await this.gameData.getPlannedReleases(
        this.gameState.id,
        currentWeek,
        dbTransaction
      ) || [];

      if (plannedReleases.length === 0) {
        return;
      }
      
      // Process planned releases
      
      for (const release of plannedReleases) {
        
        // Get songs associated with this release
        const releaseSongs = await this.gameData.getSongsByRelease(release.id, dbTransaction) || [];
        
        if (releaseSongs.length === 0) {
          console.warn(`[PLANNED RELEASE] No songs found for release "${release.title}", skipping`);
          continue;
        }
        
        // Calculate release performance using existing preview calculation logic
        const avgQuality = releaseSongs.reduce((sum, song) => sum + (song.quality || 50), 0) / releaseSongs.length;
        const marketingBudget = release.marketingBudget || 0;
        
        // Filter out already released songs (lead singles)
        const songsToRelease = releaseSongs.filter(s => !s.isReleased);
        const alreadyReleasedSongs = releaseSongs.filter(s => s.isReleased);

        if (songsToRelease.length === 0) {
          continue;
        }

        // Get artist data for sophisticated calculation
        const metadata = release.metadata as any;
        const [artist] = await this.storage?.getArtistsByGame(this.gameState.id) || [];
        const releaseArtist = artist || await this.storage?.getArtist(release.artistId);

        if (!releaseArtist) {
          console.warn(`[PLANNED RELEASE] Artist not found for release, skipping`);
          continue;
        }

        // Use sophisticated calculation for actual release
        const sophisticatedResults = this.calculateSophisticatedReleaseOutcome(
          release,
          songsToRelease,
          releaseArtist
        );

        // Prepare song updates using sophisticated breakdown
        const songUpdates = sophisticatedResults.perSongBreakdown.map(songResult => ({
          songId: songResult.songId,
          isReleased: true,
          releaseWeek: this.gameState.currentWeek,
          initialStreams: songResult.streams,
          weeklyStreams: songResult.streams,
          totalStreams: (songsToRelease.find(s => s.id === songResult.songId)?.totalStreams || 0) + songResult.streams,
          totalRevenue: Math.round((songsToRelease.find(s => s.id === songResult.songId)?.totalRevenue || 0) + songResult.revenue),
          lastWeekRevenue: Math.round(songResult.revenue)
        }));

        // Handle marketing investment allocation - use actual charged amount including seasonal adjustments
        const totalMarketingBudget = metadata?.totalInvestment ||
          Object.values(metadata?.marketingBudget || {}).reduce((sum: number, budget) => sum + (budget as number), 0);
        if (this.financialSystem.investmentTracker && totalMarketingBudget > 0) {
          try {
            await this.financialSystem.investmentTracker.allocateMarketingInvestment(
              release.id,
              totalMarketingBudget,
              dbTransaction
            );
          } catch (allocError) {
            console.warn(`[PLANNED RELEASE] Marketing allocation failed:`, allocError);
          }
        }

        const totalStreams = sophisticatedResults.totalStreams;
        const totalRevenue = sophisticatedResults.totalRevenue;
        
        // Update release status to 'released'
        await this.gameData.updateReleaseStatus(release.id, 'released', {
          releasedAt: currentWeek,
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
          
          // Track mood change for later application in processWeeklyMoodChanges
          if (!summary.artistChanges) {
            summary.artistChanges = {};
          }
          (summary.artistChanges as any)[release.artistId] =
            ((summary.artistChanges as any)[release.artistId] || 0) + moodBoost;
          
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
          amount: -totalMarketingBudget
        });

        summary.expenses += totalMarketingBudget;

        // Track marketing costs in breakdown
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
        summary.expenseBreakdown.marketingCosts += totalMarketingBudget;

        // Check for press coverage based on marketing spend
        if (totalMarketingBudget > 0) {
          const avgQuality = releaseSongs.reduce((sum, song) => sum + (song.quality || 50), 0) / releaseSongs.length;
          const pressOutcome = this.calculatePressOutcome(
            avgQuality,
            this.gameState.pressAccess || 'none',
            this.gameState.reputation || 0,
            totalMarketingBudget
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
        
        // Release completed successfully
      }
      
    } catch (error) {
      console.error('[PLANNED RELEASE] Error processing planned releases:', error);

      summary.changes.push({
        type: 'error',
        description: `Planned release processing failed - ${error instanceof Error ? error.message : 'Unknown error'}`,
        amount: 0
      });

      // Re-throw the error to ensure transaction rollback on critical failures
      if (error instanceof Error && error.message.includes('No songs found')) {
        console.warn('[PLANNED RELEASE] Non-critical error, continuing processing');
      } else {
        throw error;
      }
    }
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
  
  // REMOVED: getSeasonalMultiplier() - now using shared utility

  /**
   * Processes newly recorded projects - projects that became "recorded" this week
   * This marks songs as recorded but does not release them (no revenue yet)
   */
  private async processNewlyRecordedProjects(summary: WeekSummary, dbTransaction?: any): Promise<void> {
    
    try {
      // Check if we have a method to get newly released projects
      if (!this.gameData.getNewlyReleasedProjects && !this.gameData.getProjectsByStage) {
        // Check if there are released projects in gameState flags that need processing
        const releasedProjects = (this.gameState.flags as any)?.['released_projects'] || [];
        
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
        recordedProjects = await this.gameData.getNewlyReleasedProjects(this.gameState.id || '', this.gameState.currentWeek || 1, dbTransaction);
      }
      
      if (recordedProjects.length === 0) {
        return;
      }
      
      // Process song recording completion for each project
      for (const project of recordedProjects) {
        await this.processProjectSongRecording(project, summary, dbTransaction);
      }
      
    } catch (error) {
      console.error('[NEWLY RECORDED] Error processing newly recorded projects:', error);
    }
    
  }

  /**
   * Process song recording completion for a specific project
   * This marks all songs from a completed recording project as recorded (but not released)
   */
  private async processProjectSongRecording(project: any, summary: WeekSummary, dbTransaction?: any): Promise<void> {
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
   * This is called during weekly processing to create songs for active recording projects
   */
  private async processRecordingProjects(summary: WeekSummary, dbTransaction?: any): Promise<void> {
    
    try {
      // Get recording projects from database via ServerGameData
      const recordingProjects = await this.gameData.getActiveRecordingProjects(this.gameState.id || '', dbTransaction);

      if (!recordingProjects || recordingProjects.length === 0) {
        return;
      }

      for (const project of recordingProjects) {
        if (this.shouldGenerateProjectSongs(project)) {
          await this.generateWeeklyProjectSongs(project, summary, dbTransaction);
        }
      }
    } catch (error) {
      console.error('[SONG GENERATION] Error processing recording projects:', error);
    }
  }

  /**
   * Determines if a project should generate songs this week
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
   * Generates songs for a recording project during weekly processing
   */
  private async generateWeeklyProjectSongs(project: any, summary: WeekSummary, dbTransaction?: any): Promise<void> {
    
    try {
      const artist = await this.gameData.getArtistById(project.artistId);
      if (!artist) {
        console.error(`[SONG GENERATION] Artist not found for project ${project.id}`);
        return;
      }

      // Determine how many songs to generate this week
      const remainingSongs = (project.songCount || 1) - (project.songsCreated || 0);
      const songsPerWeek = this.getSongsPerWeek(project.type);
      const songsToGenerate = Math.min(remainingSongs, songsPerWeek);


      for (let i = 0; i < songsToGenerate; i++) {
        const song = this.generateSong(project, artist);
        
        // Store song via ServerGameData (if available)
        if (this.gameData.createSong) {
          try {
            const savedSong = await this.gameData.createSong(song, dbTransaction);
          } catch (songError) {
            console.error(`[SONG GENERATION] Failed to save song:`, songError);
            continue;
          }
        } else {
          console.warn(`[SONG GENERATION] createSong method not available on gameData`);
        }

        // Update project progress
        project.songsCreated = (project.songsCreated || 0) + 1;
        
        // Enhanced summary with economic insights
        const economicInsight = this.generateSongEconomicInsight(song, project);
        
        summary.changes.push({
          type: 'project_complete', // Using existing type for now
          description: `Created song: "${song.title}" for ${project.title} - ${economicInsight}`,
          projectId: project.id,
          amount: 0
        });
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
   * Determines how many songs to generate per week based on project type
   */
  private getSongsPerWeek(projectType: string): number {
    switch (projectType) {
      case 'Single': return 2; // Singles can generate up to 2 songs per week
      case 'EP': return 3;     // EPs can generate up to 3 songs per week  
      default: return 2;
    }
  }

  /**
   * Generates a single song for a recording project with enhanced quality calculation
   */
  private generateSong(project: any, artist: any): any {
    const currentWeek = this.gameState.currentWeek || 1;
    
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
      createdWeek: currentWeek,
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
  private async calculateOngoingSongRevenue(song: any): Promise<number> {
    return await this.financialSystem.calculateOngoingSongRevenue(
      song,
      this.gameState.currentWeek || 1,
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
    const currentWeek = currentGameState.currentWeek || 1;
    
    
    // Get artist popularity
    const artist = await this.storage?.getArtist(song.artistId);
    const artistPopularity = artist?.popularity || 0;

    // Calculate initial streams using individual song quality (not project quality)
    const initialStreams = this.calculateStreamingOutcome(
      song.quality || 40,
      currentGameState.playlistAccess || 'none',
      currentGameState.reputation || 5,
      0, // For now, marketing spend is at project level; future enhancement for per-song marketing
      artistPopularity
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
      weeklyStreams: initialStreams,
      totalRevenue: Math.round(initialRevenue),
      lastWeekRevenue: Math.round(initialRevenue),
      releaseWeek: currentWeek,
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
   * Processes delayed effects from previous weeks
   */
  private async processDelayedEffects(summary: WeekSummary): Promise<void> {
    // Delayed effects are stored as keyed entries on flags (object map), not as an array
    try {
      const flags = (this.gameState.flags || {}) as Record<string, any>;
      const triggeredKeys: string[] = [];

      // Helper function to clamp values
      const clamp = (value: number, min: number, max: number): number => {
        return Math.max(min, Math.min(max, value));
      };

      for (const [key, value] of Object.entries(flags)) {
        if (
          value &&
          typeof value === 'object' &&
          'triggerWeek' in value &&
          typeof (value as any).triggerWeek === 'number' &&
          (value as any).triggerWeek === (this.gameState.currentWeek || 0)
        ) {
          try {
            // Check if this delayed effect has artist targeting (Task 2.5, FR-19)
            if ((value as any).artistId) {
              const artistId = (value as any).artistId;
              const effects = (value as any).effects || {};
              const targetScope = (value as any).targetScope;
              const meetingName = (value as any).meetingName;
              const choiceId = (value as any).choiceId;

              // BUGFIX: Removed gameState.artists validation (property doesn't exist)
              // Artist existence will be validated in applyArtistChangesToDatabase()
              console.log(`[DELAYED EFFECTS] Processing artist-targeted delayed effects for artist ${artistId}:`, effects);

              // Use applyEffects() with artist targeting for delayed effects (Task 2.5)
              const delayedEffectsRecord: Record<string, number> = {};
              for (const [effectKey, effectValue] of Object.entries(effects)) {
                if (typeof effectValue === 'number') {
                  delayedEffectsRecord[effectKey] = effectValue;
                }
              }

              // Apply delayed effects with artist targeting and context
              await this.applyEffects(delayedEffectsRecord, summary, artistId, targetScope, meetingName, choiceId);

              summary.changes.push({
                type: 'delayed_effect',
                description: `Delayed effect triggered for artist ${artistId}`
              });
            } else {
              // Old-style delayed effect (global, no scope validation)
              await this.applyEffects((value as any).effects || {}, summary, undefined, undefined);
              summary.changes.push({
                type: 'delayed_effect',
                description: 'Delayed effect triggered'
              });
            }
          } finally {
            triggeredKeys.push(key);
          }
        }
      }

      // Remove triggered delayed-effect entries while preserving other flags (like A&R discovery)
      for (const key of triggeredKeys) {
        delete flags[key];
      }

      this.gameState.flags = flags;
    } catch (err) {
      console.warn('[DELAYED EFFECTS] Failed to process delayed effects:', err);
    }
  }

  /**
   * Apply per-artist mood/energy changes from meetings to database
   * Task 6.2: Updated to support per-artist mood targeting with database logging
   * Processes changes accumulated in summary.artistChanges[artistId].mood/energy
   * Note: Artist loyalty was refactored to energy
   */
  private async applyArtistChangesToDatabase(summary: WeekSummary, dbTransaction?: any): Promise<void> {
    // Check if there are any artist changes to apply
    if (!summary.artistChanges || Object.keys(summary.artistChanges).length === 0) {
      return;
    }

    // Get storage methods
    if (!this.storage || !this.storage.getArtistsByGame || !this.storage.updateArtist) {
      console.warn('[ARTIST CHANGES] Storage not available for artist updates');
      return;
    }

    // Check if createMoodEvent method exists for logging
    const canLogMoodEvents = typeof this.storage.createMoodEvent === 'function';

    const artists = await this.storage.getArtistsByGame(this.gameState.id);
    if (!artists || artists.length === 0) {
      console.log('[ARTIST CHANGES] No artists found for mood/energy updates');
      return;
    }

    // Iterate through each artist with accumulated changes
    for (const artistId of Object.keys(summary.artistChanges)) {
      const changes = summary.artistChanges[artistId];

      // Skip if this is not a per-artist object (it's a global number like energy/popularity)
      if (typeof changes !== 'object' || changes === null || Array.isArray(changes)) {
        continue;
      }

      // Skip if no mood/energy changes for this artist
      if (!changes.mood && !changes.energy) {
        continue;
      }

      const artist = artists.find((a: GameArtist) => a.id === artistId);
      if (!artist) {
        console.warn(`[ARTIST CHANGES] Artist ${artistId} not found in database, skipping`);
        continue;
      }

      const updates: any = {};
      let hasUpdates = false;

      // Apply mood change
      if (changes.mood && changes.mood !== 0) {
        const currentMood = artist.mood || 50;
        const newMood = Math.max(0, Math.min(100, currentMood + changes.mood));
        updates.mood = newMood;
        hasUpdates = true;

        console.log(`[ARTIST CHANGES] ${artist.name}: mood ${currentMood} → ${newMood} (${changes.mood > 0 ? '+' : ''}${changes.mood})`);

        // Task 6.2: Log mood event to database with artist targeting
        if (canLogMoodEvents) {
          try {
            await this.storage.createMoodEvent({
              artistId: artistId,
              gameId: this.gameState.id,
              eventType: 'executive_meeting',
              moodChange: changes.mood,
              moodBefore: currentMood,
              moodAfter: newMood,
              description: `Mood ${changes.mood > 0 ? 'improved' : 'decreased'} from executive meeting decision`,
              weekOccurred: this.gameState.currentWeek,
              metadata: {
                source: 'meeting_choice',
                week: this.gameState.currentWeek
              }
            }, dbTransaction);
            console.log(`[MOOD EVENT] Logged mood event for ${artist.name}: ${changes.mood > 0 ? '+' : ''}${changes.mood}`);
          } catch (error) {
            console.error(`[MOOD EVENT] Failed to log mood event for ${artist.name}:`, error);
          }
        }
      }

      // Apply energy change
      if (changes.energy && changes.energy !== 0) {
        const currentEnergy = artist.energy || 50;
        const newEnergy = Math.max(0, Math.min(100, currentEnergy + changes.energy));
        updates.energy = newEnergy;
        hasUpdates = true;

        console.log(`[ARTIST CHANGES] ${artist.name}: energy ${currentEnergy} → ${newEnergy} (${changes.energy > 0 ? '+' : ''}${changes.energy})`);
      }

      // Artist loyalty was refactored to energy - no longer tracking loyalty for artists
      // (Executives still have loyalty tracking)

      // Update the artist in database
      if (hasUpdates) {
        await this.storage.updateArtist(artist.id, updates);
      }
    }

    // Clear all per-artist changes since they've been applied
    for (const artistId of Object.keys(summary.artistChanges)) {
      const changes = summary.artistChanges[artistId];
      if (typeof changes === 'object') {
        changes.mood = 0;
        changes.energy = 0;
      }
    }
  }

  /**
   * Process weekly mood changes for all artists
   */
  private async processWeeklyMoodChanges(summary: WeekSummary): Promise<void> {
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
      // Handle both object format (new) and number format (legacy)
      const artistChange = summary.artistChanges?.[artist.id];
      let releaseMoodBoost = 0;
      if (typeof artistChange === 'object' && artistChange !== null && !Array.isArray(artistChange)) {
        releaseMoodBoost = (artistChange as any).mood || 0;
      } else if (typeof artistChange === 'number') {
        releaseMoodBoost = artistChange;
      }

      if (releaseMoodBoost !== 0) {
        moodChange += releaseMoodBoost;
        summary.changes.push({
          type: 'mood',
          description: `${artist.name}'s mood ${releaseMoodBoost > 0 ? 'improved from successful release' : 'decreased from poor tour performance'} (${releaseMoodBoost > 0 ? '+' : ''}${releaseMoodBoost})`,
          amount: releaseMoodBoost,
          moodChange: releaseMoodBoost,
          artistId: artist.id
        });
      }
      
      // Count active projects for this artist
      const activeProjects = projects.filter(
        (p: any) => p.artistId === artist.id && 
        ['recording', 'mixing', 'mastering'].includes(p.stage)
      ).length;
      
      // Workload stress: -5 mood per project beyond 2
      if (activeProjects > 2) {
        const workloadPenalty = (activeProjects - 2) * -5;
        moodChange += workloadPenalty;
        summary.changes.push({
          type: 'mood',
          description: `${artist.name} is stressed from workload (${activeProjects} active projects)`,
          amount: workloadPenalty,
          moodChange: workloadPenalty,
          artistId: artist.id
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
          amount: moodChange,
          moodChange: moodChange, // UI expects moodChange field
          artistId: artist.id,
          source: 'weekly_routine' // Distinguish from meeting effects
        });
      }
    }
  }

  /**
   * Process weekly popularity changes for all artists
   * Mirrors processWeeklyMoodChanges pattern for consistency
   */
  private async processWeeklyPopularityChanges(summary: WeekSummary): Promise<void> {
    // Get artists from storage if available
    if (!this.storage || !this.storage.getArtistsByGame) {
      return;
    }

    const artists = await this.storage.getArtistsByGame(this.gameState.id);
    if (!artists || artists.length === 0) return;

    for (const artist of artists) {
      let popularityChange = 0;
      const currentPopularity = artist.popularity || 0;

      // Apply any popularity changes accumulated in summary (tours, streaming, etc.)
      const popularityBoostValue = summary.artistChanges?.[`${artist.id}_popularity`];
      const popularityBoost = typeof popularityBoostValue === 'number' ? popularityBoostValue : 0;
      if (popularityBoost > 0) {
        popularityChange += popularityBoost;
      }

      // Apply popularity change
      if (popularityChange !== 0) {
        const newPopularity = Math.round(Math.max(0, Math.min(100, currentPopularity + popularityChange)));

        // Update artist popularity in storage
        if (this.storage.updateArtist) {
          await this.storage.updateArtist(artist.id, { popularity: newPopularity });
        }

        // Track change - always show the total popularity change
        summary.changes.push({
          type: 'popularity',
          description: `${artist.name}'s popularity increased (+${popularityChange.toFixed(1)})`,
          amount: popularityChange
        });
      }
    }
  }

  /**
   * Process weekly mood and loyalty decay for executives
   * - Loyalty decays when executives are ignored for 3+ weeks
   * - Mood naturally drifts toward neutral (50) over time
   */
  private async processExecutiveMoodDecay(summary: WeekSummary, dbTransaction?: any): Promise<void> {
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
      
      const currentWeek = this.gameState.currentWeek || 1;
      console.log(`[GAME-ENGINE] Processing executive decay for week ${currentWeek}, ${executives.length} executives`);
      
      for (const exec of executives) {
      let moodChange = 0;
      let loyaltyChange = 0;
      const currentMood = exec.mood || 50;
      const currentLoyalty = exec.loyalty || 50;
      
      // Calculate loyalty decay for inactivity
      // If lastActionWeek is null/undefined, treat as never used (start from week 0)
      const lastAction = exec.lastActionWeek || 0;
      const weeksSinceAction = lastAction === 0 ? currentWeek : currentWeek - lastAction;
      
      // Check if executive was used this week using in-memory tracking
      // This avoids database transaction isolation issues
      const wasUsedThisWeek = (summary as any).usedExecutives.has(exec.id);
      
      console.log(`[DECAY] Executive ${exec.role}:`);
      console.log(`  - Current mood: ${currentMood}, loyalty: ${currentLoyalty}`);
      console.log(`  - Last used: Week ${lastAction === 0 ? 'Never' : lastAction}`);
      console.log(`  - Weeks since action: ${weeksSinceAction}`);
      console.log(`  - Used this week: ${wasUsedThisWeek}`);
      
      // Loyalty decay: -5 every week after being ignored for 3+ weeks
      if (weeksSinceAction >= 3 && !wasUsedThisWeek) {
        loyaltyChange = -5; // Consistent weekly penalty after 3 weeks of neglect
      }
      
      // Natural mood normalization toward 50 - but NOT for executives used this week
      // This prevents the +5/-5 conflict where used executives get cancelled out
      if (!wasUsedThisWeek) {
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
            description: `${this.formatExecutiveRole(exec.role)}'s loyalty decreased (ignored for ${weeksSinceAction} weeks)`,
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
  private async checkForEvents(summary: WeekSummary): Promise<void> {
    const eventConfig = this.gameData.getEventConfigSync();
    
    if (this.getRandom(0, 1) < eventConfig.weekly_chance) {
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
  private async checkProgressionGates(summary: WeekSummary): Promise<void> {
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

    // Initialize tier unlock history if missing (Task 2.2)
    const gs: any = this.gameState as any;
    if (!gs.tierUnlockHistory) {
      gs.tierUnlockHistory = {};
    }
    
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

      // Task 2.3: Track unlock week in tierUnlockHistory for playlist
      if (!gs.tierUnlockHistory.playlist) gs.tierUnlockHistory.playlist = {};
      const tierKey = this.gameState.playlistAccess;
      if (tierKey && !gs.tierUnlockHistory.playlist[tierKey]) {
        gs.tierUnlockHistory.playlist[tierKey] = this.gameState.currentWeek || 0;
      }
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

      // Task 2.4: Track unlock week in tierUnlockHistory for press
      if (!gs.tierUnlockHistory.press) gs.tierUnlockHistory.press = {};
      const tierKey = this.gameState.pressAccess;
      if (tierKey && !gs.tierUnlockHistory.press[tierKey]) {
        gs.tierUnlockHistory.press[tierKey] = this.gameState.currentWeek || 0;
      }
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

      // Task 2.6: Track unlock week in tierUnlockHistory for venue
      if (!gs.tierUnlockHistory.venue) gs.tierUnlockHistory.venue = {};
      const tierKey = this.gameState.venueAccess;
      if (tierKey && !gs.tierUnlockHistory.venue[tierKey]) {
        gs.tierUnlockHistory.venue[tierKey] = this.gameState.currentWeek || 0;
      }
    }
    
    return tierChanges;
  }

  /**
   * Checks for producer tier unlocks and adds progression notifications
   */
  private checkProducerTierUnlocks(summary: WeekSummary): void {
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
  private async processUnifiedTourRevenue(project: any, cityNumber: number, summary: WeekSummary, dbTransaction?: any): Promise<void> {
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

      // ENHANCED: Extract parameters for FinancialSystem with capacity support
      const venueAccess = currentMetadata.venueAccess || 'none';
      const storedVenueCapacity = currentMetadata.venueCapacity; // New: stored capacity from tour creation
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

      if (storedVenueCapacity) {
        console.log(`[TOUR EXECUTION] Using stored venue capacity: ${storedVenueCapacity}`);
      } else {
        throw new Error(`[TOUR EXECUTION] Missing stored venue capacity for tour ${project.title}. Project metadata: ${JSON.stringify(currentMetadata)}`);
      }

      // ENHANCED: SINGLE SOURCE OF TRUTH with capacity support
      const detailedBreakdown = this.financialSystem.calculateDetailedTourBreakdown({
        venueCapacity: storedVenueCapacity, // Use stored capacity - NO FALLBACK
        venueTier: venueAccess, // Keep for backward compatibility
        artistPopularity,
        localReputation: reputation,
        cities: totalCities,
        marketingBudget
      });

      // Store pre-calculated cities - NO MANUAL CALCULATIONS
      const preCalculatedCities = detailedBreakdown.cities.map((city: any, index: number) => {
        // Add variance to actual tour performance (±20% attendance variance)
        const varianceFactor = 0.8 + (Math.random() * 0.4);
        const actualSellThrough = city.sellThroughRate * varianceFactor;
        const actualRevenue = Math.round(city.totalRevenue * varianceFactor);

        return {
          cityNumber: index + 1,
          venue: this.getVenueNameFromAccess(venueAccess),
          capacity: city.venueCapacity,
          revenue: actualRevenue, // Apply variance to actual revenue
          ticketsSold: Math.round(city.venueCapacity * actualSellThrough),
          attendanceRate: Math.round(actualSellThrough * 100),
          // Enhanced economic breakdown from FinancialSystem
          economics: {
            sellThrough: {
              rate: Math.round(actualSellThrough * 100), // Show actual variance result
              baseRate: Math.round(detailedBreakdown.sellThroughAnalysis.baseRate * 100),
              reputationBonus: Math.round(detailedBreakdown.sellThroughAnalysis.reputationBonus * 100),
              popularityBonus: Math.round(detailedBreakdown.sellThroughAnalysis.popularityBonus * 100),
              marketingBonus: Math.round(detailedBreakdown.sellThroughAnalysis.budgetQualityBonus * 100)
            },
            pricing: {
              ticketPrice: Math.round(city.ticketRevenue / Math.max(1, Math.round(city.venueCapacity * actualSellThrough))),
              basePrice: 0, // Will be calculated by FinancialSystem
              capacityBonus: 0 // Will be calculated by FinancialSystem
            },
            revenue: {
              tickets: Math.round(city.ticketRevenue * varianceFactor),
              merch: Math.round(city.merchRevenue * varianceFactor),
              total: actualRevenue,
              merchRate: 0 // Will be calculated by FinancialSystem
            },
            costs: {
              venue: city.venueFee, // Costs don't vary
              production: city.productionFee, // Costs don't vary
              marketing: city.marketingCost, // Costs don't vary
              total: city.totalCosts // Costs don't vary
            },
            profit: actualRevenue - city.totalCosts // Actual profit with variance
          }
        };
      });

      // Store pre-calculated results
      tourStats.preCalculatedCities = preCalculatedCities;
      console.log(`[UNIFIED TOUR] Pre-calculated ${preCalculatedCities.length} cities`);
    }

    // Reveal one city per week from pre-calculated results
    if (tourStats.preCalculatedCities && tourStats.preCalculatedCities.length >= cityNumber) {
      const cityData = tourStats.preCalculatedCities[cityNumber - 1];

      // Add to revealed cities
      tourStats.cities = tourStats.cities || [];
      tourStats.cities.push(cityData);

      console.log(`[UNIFIED TOUR] Revealed city ${cityNumber}: $${cityData.revenue} revenue, ${cityData.attendanceRate}% attendance`);

      // Apply artist mood and popularity impacts based on performance
      console.log(`[TOUR IMPACTS] About to apply impacts for artist ${project.artistId}, city data:`, cityData);
      await this.applyTourPerformanceImpacts(project.artistId, cityData, summary, dbTransaction);
      console.log(`[TOUR IMPACTS] Completed applying impacts for artist ${project.artistId}`);

      // Add revenue to weekly summary
      const revenue = cityData.revenue;
      summary.revenue += revenue;
      if (!summary.revenueBreakdown) {
        summary.revenueBreakdown = {
          streamingRevenue: 0,
          projectRevenue: 0,
          tourRevenue: 0,
          roleBenefits: 0,
          otherRevenue: 0
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

  /**
   * Apply artist mood and popularity impacts based on tour performance
   * Uses summary accumulation pattern to avoid conflicts with processWeeklyMoodChanges
   */
  private async applyTourPerformanceImpacts(
    artistId: string,
    cityData: any,
    summary: WeekSummary,
    dbTransaction: any
  ): Promise<void> {
    try {
      // Get artist data from storage since this.artists is not initialized
      const artist = await this.storage?.getArtist?.(artistId);
      if (!artist) {
        console.warn(`[TOUR IMPACTS] Artist ${artistId} not found`);
        return;
      }

      const attendanceRate = cityData.attendanceRate || 0;
      const actualAttendees = Math.round((cityData.capacity || 0) * (attendanceRate / 100));

      // Calculate mood impact based on attendance rate
      let moodChange = 0;
      if (attendanceRate < 30) {
        moodChange = -3; // Disappointing show
      } else if (attendanceRate >= 30 && attendanceRate <= 50) {
        moodChange = 0; // Neutral
      } else if (attendanceRate > 50 && attendanceRate <= 85) {
        moodChange = 5; // Good show
      } else if (attendanceRate > 85) {
        moodChange = 8; // Amazing show
      }

      // Calculate popularity impact based on attendance rate and venue size
      let popularityChange = 0;
      if (attendanceRate > 70) {
        if (actualAttendees < 500) {
          popularityChange = 1;
        } else if (actualAttendees < 2000) {
          popularityChange = 2;
        } else if (actualAttendees < 5000) {
          popularityChange = 3;
        } else if (actualAttendees < 10000) {
          popularityChange = 5;
        } else {
          popularityChange = 7;
        }
      }

      // FIXED: Accumulate changes in summary using per-artist object pattern
      // This prevents processWeeklyMoodChanges from overwriting our changes
      if (!summary.artistChanges) {
        summary.artistChanges = {};
      }

      // Store per-artist mood changes using new object format
      if (!summary.artistChanges[artistId] || typeof summary.artistChanges[artistId] !== 'object') {
        summary.artistChanges[artistId] = {};
      }
      const artistChange = summary.artistChanges[artistId] as { mood?: number; energy?: number; loyalty?: number };
      artistChange.mood = (artistChange.mood || 0) + moodChange;

      // Store per-artist popularity changes using popularity key (old format, kept for compatibility)
      if (popularityChange > 0) {
        const popularityKey = `${artistId}_popularity`;
        if (typeof summary.artistChanges[popularityKey] !== 'number') {
          summary.artistChanges[popularityKey] = 0;
        }
        (summary.artistChanges[popularityKey] as number) += popularityChange;
      }

      // Add changes to summary for player visibility
      if (moodChange !== 0) {
        summary.changes.push({
          type: 'mood',
          description: `${artist.name}: ${moodChange > 0 ? '+' : ''}${moodChange} mood from ${attendanceRate}% attendance performance`,
          amount: moodChange,
          moodChange: moodChange,
          artistId: artistId
        });
      }

      if (popularityChange > 0) {
        summary.changes.push({
          type: 'popularity',
          description: `${artist.name}: +${popularityChange} popularity from ${actualAttendees.toLocaleString()} attendees (${attendanceRate}% capacity)`,
          amount: popularityChange,
          artistId: artistId
        });
      }

      console.log(`[TOUR IMPACTS] ${artist.name}: Mood ${moodChange > 0 ? '+' : ''}${moodChange} (${attendanceRate}% attendance), Popularity +${popularityChange} (${actualAttendees} attendees) - accumulated in summary`);

    } catch (error) {
      console.error(`[TOUR IMPACTS] Error applying performance impacts:`, error);
    }
  }

  // LEGACY METHOD REMOVED - processTourCityRevenue()
  // Replaced with processUnifiedTourRevenue() using FinancialSystem calculations

  /**
   * Processes marketing campaigns (PR, Digital Ads, etc.)
   */
  private async processMarketing(action: GameEngineAction, summary: WeekSummary): Promise<void> {
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
        weeklyOperations: 0,
        artistSalaries: 0,
        executiveSalaries: 0,
        signingBonuses: 0,
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
  private async processArtistDialogue(action: GameEngineAction, summary: WeekSummary): Promise<void> {
    if (!action.targetId) return;

    const artistId = action.targetId;

    // Extract scene and choice IDs from metadata
    const { sceneId, choiceId } = action.metadata || {};

    if (!sceneId || !choiceId) {
      console.log(`[GAME-ENGINE] Missing required IDs for dialogue - sceneId: ${sceneId}, choiceId: ${choiceId}`);
      return;
    }

    console.log(`[GAME-ENGINE] Processing artist dialogue - Artist: ${artistId}, Scene: ${sceneId}, Choice: ${choiceId}`);

    // Load the actual dialogue choice from dialogue.json
    const choice = await this.gameData.getDialogueChoiceById(sceneId, choiceId);

    if (!choice) {
      console.error(`[GAME-ENGINE] Dialogue choice not found for sceneId: ${sceneId}, choiceId: ${choiceId}`);
      // Fallback to minimal stub to prevent crashes
      const fallbackChoice = {
        effects_immediate: { artist_mood: -1 },
        effects_delayed: {}
      };
      console.log(`[GAME-ENGINE] Using fallback dialogue choice data`);

      // Apply fallback effects and return
      if (fallbackChoice.effects_immediate) {
        const effects: Record<string, number> = {};
        for (const [key, value] of Object.entries(fallbackChoice.effects_immediate)) {
          if (typeof value === 'number') {
            effects[key] = value;
          }
        }
        await this.applyEffects(effects, summary, artistId, 'dialogue', sceneId, choiceId); // Pass all context for logging (Task 2.2)
      }
      return;
    }

    console.log(`[GAME-ENGINE] Loaded dialogue choice data:`, {
      sceneId,
      choiceId,
      immediateEffects: choice.effects_immediate,
      delayedEffects: choice.effects_delayed
    });

    // Apply immediate effects using the standard applyEffects method
    // This handles artist_mood, artist_energy, creative_capital, etc.
    if (choice.effects_immediate) {
      const effects: Record<string, number> = {};
      for (const [key, value] of Object.entries(choice.effects_immediate)) {
        if (typeof value === 'number') {
          effects[key] = value;
        }
      }
      await this.applyEffects(effects, summary, artistId, 'dialogue', sceneId, choiceId); // Pass all context for logging (Task 2.2)
    }

    // Queue delayed effects for next week with artist targeting (Task 2.5)
    if (choice.effects_delayed) {
      const flags = this.gameState.flags || {};
      const delayedKey = `${artistId}-${sceneId}-${choiceId}-delayed`;
      (flags as any)[delayedKey] = {
        triggerWeek: (this.gameState.currentWeek || 0) + 1,
        effects: choice.effects_delayed,
        artistId: artistId, // Preserve artist targeting
        targetScope: 'dialogue', // Dialogue is always per-artist
        meetingName: sceneId, // Scene ID as meeting name for logging
        choiceId: choiceId
      };
      this.gameState.flags = flags;
    }

    // Add dialogue completion to summary
    summary.changes.push({
      type: 'meeting',
      description: `Artist conversation completed`,
      roleId: artistId
    });
  }

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
    } catch (error) {
      console.error('[CHART PROCESSING] Error generating weekly chart:', error);
      // Don't throw - chart generation should not break weekly processing
    }
  }

  /**
   * Check if the 52-week campaign has been completed and calculate final results
   */
  private async checkCampaignCompletion(summary: WeekSummary): Promise<CampaignResults | undefined> {
    const currentWeek = this.gameState.currentWeek || 0;
    const balanceConfig = await this.gameData.getBalanceConfig();
    const campaignLength = balanceConfig.time_progression.campaign_length_weeks;
    
    // Only complete campaign if we've reached the final week
    if (currentWeek < campaignLength) {
      return undefined;
    }

    // Mark campaign as completed
    this.gameState.campaignCompleted = true;

    // Calculate complete campaign results
    const campaignResults = AchievementsEngine.calculateCampaignResults(this.gameState);

    // Add campaign completion to summary
    summary.changes.push({
      type: 'unlock',
      description: `🎉 Campaign Completed! Final Score: ${campaignResults.finalScore}`,
      amount: campaignResults.finalScore
    });

    return campaignResults;
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
  async calculateProjectOutcomes(project: any, summary: WeekSummary): Promise<{
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
        // Get artist popularity
        const artist = await this.storage?.getArtist(project.artistId);
        const artistPopularity = artist?.popularity || 0;

        // Calculate streaming outcome
        console.log(`[DEBUG] Calculating streams for ${project.type} project:`, {
          quality: project.quality || 40,
          playlistAccess: this.gameState.playlistAccess || 'none',
          reputation: this.gameState.reputation || 5,
          marketingSpend: project.marketingSpend || 0,
          artistPopularity: artistPopularity
        });

        streams = this.calculateStreamingOutcome(
          project.quality || 40,
          this.gameState.playlistAccess || 'none',
          this.gameState.reputation || 5,
          project.marketingSpend || 0,
          artistPopularity
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
   * Enhanced weekly summary generation with economic insights
   */
  private generateEconomicInsights(summary: WeekSummary): void {
    // Track budget efficiency and strategic decisions for the week
    const projectStartChanges = summary.changes.filter(change => 
      change.type === 'project_complete' && change.description.includes('Started')
    );
    
    if (projectStartChanges.length > 0) {
      const totalProjectSpend = projectStartChanges.reduce((total, change) => 
        total + Math.abs(change.amount || 0), 0
      );
      
      summary.changes.push({
        type: 'unlock',
        description: `💰 Weekly project investment: $${totalProjectSpend.toLocaleString()} across ${projectStartChanges.length} project${projectStartChanges.length > 1 ? 's' : ''}`,
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
    
    // Track reputation-to-money efficiency this week
    const reputationGain = Object.values(summary.reputationChanges).reduce((total, change) => total + change, 0);
    const netCashFlow = summary.revenue - summary.expenses;
    
    if (reputationGain > 0 && netCashFlow !== 0) {
      const efficiency = Math.abs(netCashFlow) / reputationGain;
      summary.changes.push({
        type: 'unlock',
        description: `🎯 Strategic efficiency: $${efficiency.toFixed(0)} per reputation point this week`,
        amount: 0
      });
    }
  }

  /**
   * PHASE 1 MIGRATION: Moved from routes.ts
   * Handles all project stage advancement logic within GameEngine
   */
  private async advanceProjectStages(summary: WeekSummary, dbTransaction?: any): Promise<void> {
    if (!dbTransaction) {
      console.warn('[PROJECT ADVANCEMENT] No database transaction provided - cannot advance project stages');
      return;
    }

    console.log(`[PROJECT ADVANCEMENT] Current month: ${this.gameState.currentWeek}`);
    
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
        const stages = ['planning', 'production', 'recorded'];
        const currentStageIndex = stages.indexOf(project.stage || 'planning');
        const weeksElapsed = (this.gameState.currentWeek || 1) - (project.startWeek || 1);
        const isRecordingProject = ['Single', 'EP'].includes(project.type || '');
        const songCount = project.songCount || 1;
        const songsCreated = project.songsCreated || 0;
        const allSongsCreated = songsCreated >= songCount;
        
        console.log(`[PROJECT ADVANCEMENT] Evaluating ${project.title}:`, {
          currentStage: project.stage,
          currentStageIndex,
          weeksElapsed,
          isRecordingProject,
          songCount,
          songsCreated,
          allSongsCreated
        });

        let newStageIndex = currentStageIndex;
        let advancementReason = '';

        // Stage advancement logic
        if (currentStageIndex === 0 && weeksElapsed >= 0) {
          // planning -> production (simple time-based)
          newStageIndex = 1;
          advancementReason = `Planning complete after ${weeksElapsed} week${weeksElapsed > 1 ? 's' : ''}`;
          
          // NOTE: Project costs are now deducted immediately upon creation (see routes.ts)
          // This prevents timing exploits where users cancel before week advance
          // We track the expense for weekly reporting but DON'T deduct money again
          if (project.totalCost) {
            // DO NOT add to summary.expenses - money already deducted at creation!
            // summary.expenses += project.totalCost; // <-- REMOVED to fix double-charging bug

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
            // Track for reporting but don't affect final money calculation
            summary.expenseBreakdown!.projectCosts += project.totalCost;

            summary.changes.push({
              type: 'expense_tracking',
              description: `${project.title} production started (cost previously deducted at creation)`,
              amount: -project.totalCost,
              projectId: project.id
            });
          }
        } else if (currentStageIndex === 1) {
          // production -> marketing/completed
          if (!isRecordingProject && project.type === 'Mini-Tour') {
            // Enhanced tour logic: 1 week per city + planning week
            const citiesPlanned = project.metadata?.cities || 1;
            const weeksInProduction = weeksElapsed - 1; // Subtract planning week
            
            if (weeksInProduction > citiesPlanned) {
              // Tour complete - skip marketing, go directly to completed
              newStageIndex = 2; // Go directly to 'recorded' which acts as 'completed' for tours
              advancementReason = `Tour completed after ${citiesPlanned} cities (${weeksElapsed} total weeks)`;
              
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
                  amount: 0, // Revenue already counted weekly
                  projectId: project.id,
                  grossRevenue: totalRevenue
                });
              }
            } else if (weeksInProduction > 0) {
              // Process this week's city performance using unified system
              await this.processUnifiedTourRevenue(project, weeksInProduction, summary, dbTransaction);
            }
          } else if (!isRecordingProject) {
            // Other non-recording projects - simple time-based
            if (weeksElapsed >= 2) {
              newStageIndex = 2;
              advancementReason = `Production complete after ${weeksElapsed} weeks`;
            }
          } else {
            // Recording projects - need all songs OR max 4 weeks
            if (allSongsCreated && weeksElapsed >= 2) {
              newStageIndex = 2;
              advancementReason = `All ${songsCreated} songs completed after ${weeksElapsed} weeks`;
            } else if (weeksElapsed >= 4) {
              newStageIndex = 2;
              advancementReason = `Maximum production time reached (${weeksElapsed} weeks, ${songsCreated}/${songCount} songs)`;
            }
          }
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
              recordingCompletedWeek: this.gameState.currentWeek,
              recordedAt: new Date().toISOString(),
              advancementReason
            };
            console.log(`[PROJECT ADVANCEMENT] Marking project "${project.title}" as recording completed in week ${this.gameState.currentWeek}`);
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
          console.log(`[PROJECT ADVANCEMENT] ${project.title} staying in ${project.stage} (${weeksElapsed} weeks elapsed)`);
        }
      }
      
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
  private generateFinancialBreakdown(f: WeeklyFinancials): string {
    const parts: string[] = [`$${f.startingBalance.toLocaleString()}`];
    
    if (f.operations.base > 0) {
      parts.push(`- $${f.operations.base.toLocaleString()} (operations)`);
    }
    if (f.operations.artists > 0) {
      parts.push(`- $${f.operations.artists.toLocaleString()} (artists)`);
    }
    if (f.operations.executives > 0) {
      parts.push(`- $${f.operations.executives.toLocaleString()} (executives)`);
    }
    if (f.operations.signingBonuses > 0) {
      parts.push(`- $${f.operations.signingBonuses.toLocaleString()} (signing bonuses)`);
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
   * Does NOT modify game state - that happens at the end of advanceWeek()
   */
  // DELEGATED TO FinancialSystem (originally lines 3126-3172)
  async calculateWeeklyFinancials(summary: WeekSummary): Promise<WeeklyFinancials> {
    return this.financialSystem.calculateWeeklyFinancials(
      summary,
      this.gameState.money || 0
    );
  }


  // REMOVED: getSeasonFromWeek() - now using shared utility

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
      scheduledReleaseWeek: number;
      marketingBudget: Record<string, number>;
      leadSingleStrategy?: {
        leadSingleId: string;
        leadSingleReleaseWeek: number;
        leadSingleBudget: Record<string, number>;
      };
    }
  ) {
    const balance = this.gameData.getBalanceConfigSync();
    
    // Auto-detect season from release week
    const mainReleaseSeason = getSeasonFromWeek(releaseConfig.scheduledReleaseWeek);
    
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
        0, // No marketing spend for base calculation
        artist.popularity || 0
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
        single: { revenue_multiplier: 1.2 },
        ep: { revenue_multiplier: 1.15 },
        album: { revenue_multiplier: 1.25 }
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
    
    // Use shared seasonal calculation utility
    const seasonalRevenueMultiplier = getSeasonalMultiplier(releaseConfig.scheduledReleaseWeek, this.gameData);
    
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
        const timingGap = releaseConfig.scheduledReleaseWeek - releaseConfig.leadSingleStrategy.leadSingleReleaseWeek;
        
        // Calculate timing bonus based on balance.json configuration
        let timingBonus = leadSingleConfig.default_bonus;
        if (leadSingleConfig.optimal_timing_weeks_before.includes(timingGap)) {
          timingBonus = leadSingleConfig.optimal_timing_bonus;
        } else if (timingGap === 3) {
          timingBonus = leadSingleConfig.good_timing_bonus;
        }
        
        const leadSingleBudget = Object.values(releaseConfig.leadSingleStrategy.leadSingleBudget).reduce((sum, budget) => sum + budget, 0);
        const leadSingleMarketingBonus = 1 + Math.sqrt(leadSingleBudget / leadSingleConfig.budget_scaling_factor) * leadSingleConfig.marketing_effectiveness_factor;
        
        // Calculate lead single's own seasonal multiplier based on its release week
        const leadSingleSeason = getSeasonFromWeek(releaseConfig.leadSingleStrategy.leadSingleReleaseWeek);
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
   * Adapter method that uses sophisticated preview calculations for actual releases
   * Converts release metadata into preview format and returns per-song breakdown
   */
  calculateSophisticatedReleaseOutcome(
    release: any,
    songs: any[],
    artist: any
  ): {
    totalStreams: number;
    totalRevenue: number;
    perSongBreakdown: Array<{songId: string; streams: number; revenue: number}>
  } {
    // Extract marketing budget - handle current data structure
    const metadata = release.metadata as any;
    const leadSingleStrategy = metadata?.leadSingleStrategy;

    // Reconstruct marketing budget from stored data structure
    let marketingBudget: Record<string, number> = {};
    if (metadata?.marketingBudgetBreakdown && typeof metadata.marketingBudgetBreakdown === 'object') {
      // CRITICAL FIX: Use stored per-channel budget breakdown instead of even distribution
      marketingBudget = metadata.marketingBudgetBreakdown;
    } else if (metadata?.marketingBudget && typeof metadata.marketingBudget === 'object') {
      // Legacy: detailed budget object (old field name)
      marketingBudget = metadata.marketingBudget;
    } else if (release.marketingBudget && release.marketingBudget > 0) {
      // Fallback: total amount + even distribution (legacy releases)
      const totalBudget = release.marketingBudget;
      const channels = metadata?.marketingChannels || ['digital'];
      const budgetPerChannel = totalBudget / channels.length;
      channels.forEach((channel: string) => {
        marketingBudget[channel] = budgetPerChannel;
      });
    }

    // Process lead single strategy to use stored budget breakdown
    let processedLeadSingleStrategy = null;
    if (leadSingleStrategy) {
      processedLeadSingleStrategy = {
        ...leadSingleStrategy,
        // CRITICAL FIX: Use stored per-channel budget breakdown for lead single
        leadSingleBudget: leadSingleStrategy.leadSingleBudgetBreakdown || leadSingleStrategy.leadSingleBudget || {}
      };
    }

    // Create release config for preview system
    const releaseConfig = {
      releaseType: release.type as 'single' | 'ep' | 'album',
      leadSingleId: leadSingleStrategy?.leadSingleId,
      seasonalTiming: getSeasonFromWeek(release.releaseWeek),
      scheduledReleaseWeek: release.releaseWeek,
      marketingBudget,
      leadSingleStrategy: processedLeadSingleStrategy
    };

    // Use existing sophisticated preview calculation
    const previewResults = this.calculateReleasePreview(songs, artist, releaseConfig);

    // Calculate per-song breakdown by distributing total streams proportionally
    const totalSongQuality = songs.reduce((sum, song) => sum + song.quality, 0);
    const perSongBreakdown = songs.map(song => {
      const qualityProportion = song.quality / totalSongQuality;
      const songStreams = Math.round(previewResults.estimatedStreams * qualityProportion);
      const songRevenue = Math.round(previewResults.estimatedRevenue * qualityProportion);

      return {
        songId: song.id,
        streams: songStreams,
        revenue: songRevenue
      };
    });

    return {
      totalStreams: previewResults.estimatedStreams,
      totalRevenue: previewResults.estimatedRevenue,
      perSongBreakdown
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
    const releaseSeason = getSeasonFromWeek(releaseConfig.scheduledReleaseWeek);
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
    const releaseSeason = getSeasonFromWeek(releaseConfig.scheduledReleaseWeek);
    if (releaseSeason === 'q1') {
      recommendations.push("Q1 release - lower competition but reduced market activity");
    }
    
    return recommendations;
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
  };
  victoryType: 'Commercial Success' | 'Critical Acclaim' | 'Balanced Growth' | 'Survival' | 'Failure';
  summary: string;
  achievements: string[];
}