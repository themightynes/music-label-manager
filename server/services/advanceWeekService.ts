/**
 * advanceWeekService.ts
 *
 * Backend service for weekly game advancement — the POST /api/advance-week
 * engine orchestration extracted from the fat gameLoop.ts handler (Phase 2,
 * PR-3). Follows the GameCreationService / saveService convention: a class with
 * explicit dependencies defaulted to the module singletons, plus an exported
 * singleton instance.
 *
 * Behavior is intentionally byte-equivalent to the pre-extraction handler,
 * including every console.log, the GameEngine construction, the action
 * formatting, and the campaign-completed early return.
 *
 * D6 PR-3: the ENTIRE week advance is now ONE PostgreSQL transaction. The former
 * TX 2 (gameStates UPDATE + weekly_actions INSERT + debug read-backs) was merged
 * into TX 1, immediately after engine.advanceWeek(actions, tx) returns, in the
 * SAME statement order. A crash anywhere mid-advance now rolls back the entire
 * week — all-or-nothing (see tests/features/advance-week-atomicity.test.ts).
 *
 * The initial gameStates select takes a `SELECT ... FOR UPDATE` row lock so two
 * concurrent advances for the same game serialize (the second blocks on the
 * first's committed week N+1 state, then advances once more) instead of both
 * reading week N and double-applying. (Reject-on-stale-week is a follow-up.)
 *
 * Balance-config loads (getStartingValues + serverGameData.initialize — fs reads
 * + Zod, no DB) run BEFORE the transaction so the row lock is never held across
 * disk I/O.
 *
 * SINGLE TX: locks + loads gameState + artists, checks campaign completion
 *       (early return — read-only), loads released
 *       projects, builds the engine, runs engine.advanceWeek(actions, tx),
 *       persists the updated gameState, saves weekly actions, reads back
 *       projects/songs for the debug envelope, and assembles the response.
 *       Response assembly/return happen from the resolved tx value; res.json is
 *       after commit in the route.
 *
 * Errors: the service throws plain Errors (mirroring the handler's inline
 * `throw new Error(...)` sites). The route maps ZodError -> 400 VALIDATION_ERROR
 * and everything else -> 500 ADVANCE_WEEK_ERROR, byte-identical to before.
 */

import { eq, and } from 'drizzle-orm';
import { storage as storageSingleton } from '../storage';
import { db as dbSingleton } from '../db';
import { serverGameData as serverGameDataSingleton } from '../data/gameData';
import { GameEngine } from '../../shared/engine/game-engine';
import { gameStates, weeklyActions, projects, songs, artists } from '@shared/schema';

/**
 * C58: thrown when the caller's `expectedCurrentWeek` (from AdvanceWeekRequest)
 * no longer matches the row's `currentWeek` after the `SELECT ... FOR UPDATE`
 * re-read. This is the "reject-on-stale-week" follow-up noted in the D6 plan
 * (`docs/01-planning/implementation-specs/COMPLETED/[COMPLETE]
 * d6-week-transaction-atomicity-plan.md`, §3 + discovered-debt #10): D6's
 * `FOR UPDATE` lock already serializes concurrent advances for the same game,
 * but both still SUCCEED — a double-submitted click advances two weeks instead
 * of one. This guard makes the second (stale) request 409 instead of
 * re-reading week N+1 and advancing to N+2.
 *
 * Follows the ArtistServiceError / ReleaseServiceError convention: the route
 * layer maps `res.status(err.status).json(err.body)` verbatim.
 */
export class AdvanceWeekConflictError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: Record<string, unknown>,
  ) {
    super('ADVANCE_WEEK_CONFLICT');
    this.name = 'AdvanceWeekConflictError';
  }
}

export class AdvanceWeekService {
  constructor(
    private storage = storageSingleton,
    private db = dbSingleton,
    private serverGameData = serverGameDataSingleton,
  ) {}

  /**
   * Advance the game by one week. `gameId` + `selectedActions` come from the
   * validated AdvanceWeekRequest body; ownership has already been enforced by
   * requireGameOwner in the route. Returns the exact response envelope the
   * original handler returned ({ gameState, summary, campaignResults, debug }).
   */
  async advanceWeek(gameId: string, selectedActions: any[], expectedCurrentWeek?: number) {
    // D6 PR-3 review fix: load balance config BEFORE the transaction so the
    // FOR UPDATE row lock is never held across disk I/O. Neither call touches
    // the DB or depends on tx: getStartingValues() reads balance JSON, and
    // initialize() clears + reloads the JSON data files (fs.readFile + Zod).
    // Get starting values from balance configuration
    const startingValues = await this.serverGameData.getStartingValues();
    // Initialize game data to load balance configuration
    console.log('[DEBUG] Initializing serverGameData...');
    await this.serverGameData.initialize();
    console.log('[DEBUG] ServerGameData initialized successfully');

    // Wrap everything in a database transaction
    const finalResult = await this.db.transaction(async (tx) => {
      // Get current game state. FOR UPDATE (D6 PR-3): lock this game's row for the
      // whole transaction so two concurrent advance-week requests for the SAME game
      // serialize — the second blocks here until the first commits week N+1, then
      // reads that committed state and advances once more, instead of both reading
      // week N and double-applying the week's effects.
      const [gameState] = await tx
        .select()
        .from(gameStates)
        .where(eq(gameStates.id, gameId))
        .for('update');

      if (!gameState) {
        throw new Error('Game not found');
      }

      // C58: optimistic stale-week guard, enforced INSIDE the FOR UPDATE lock,
      // right after the re-read. Only checked when the client sent
      // expectedCurrentWeek (backward-compatible — omitting it preserves prior
      // behavior). A double-submitted advance click races two requests for the
      // same game; the FOR UPDATE lock already serializes them, but without
      // this guard the second one would just re-read week N+1 and advance to
      // N+2. Reject it instead so exactly one request advances the week.
      if (
        expectedCurrentWeek !== undefined &&
        (gameState.currentWeek ?? 1) !== expectedCurrentWeek
      ) {
        throw new AdvanceWeekConflictError(409, {
          error: 'ADVANCE_WEEK_CONFLICT',
          message: 'Week already advanced',
          currentWeek: gameState.currentWeek ?? 1,
          expectedCurrentWeek,
        });
      }

      // Load current artists for mood calculations
      const gameArtists = await tx
        .select()
        .from(artists)
        .where(eq(artists.gameId, gameId));

      // Convert database gameState to proper GameState type
      const gameStateForEngine = {
        ...gameState,
        artists: gameArtists,
        currentWeek: gameState.currentWeek || 1,
        money: gameState.money ?? startingValues.money,
        reputation: gameState.reputation ?? startingValues.reputation,
        creativeCapital: gameState.creativeCapital ?? startingValues.creativeCapital,
        focusSlots: gameState.focusSlots ?? 3,
        usedFocusSlots: gameState.usedFocusSlots ?? 0,
        // A&R Office fields
        arOfficeSlotUsed: (gameState as any).arOfficeSlotUsed || false,
        arOfficeSourcingType: (gameState as any).arOfficeSourcingType || null,
        playlistAccess: gameState.playlistAccess ?? 'none',
        pressAccess: gameState.pressAccess ?? 'none',
        venueAccess: gameState.venueAccess ?? 'none',
        campaignType: gameState.campaignType ?? 'standard',
        rngSeed: gameState.rngSeed ?? Math.random().toString(36).substring(7),
        flags: gameState.flags ?? {},
        weeklyStats: gameState.weeklyStats ?? {},
        // BUGFIX: Reset campaignCompleted flag if we're clearly not at the end
        // Campaigns should only be completed at week 52 or later
        campaignCompleted: (gameState.currentWeek || 1) >= 52 ? gameState.campaignCompleted : false
      };

      // Check if campaign is already completed before creating engine
      console.log('[DEBUG] RAW gameState.campaignCompleted:', gameState.campaignCompleted);
      console.log('[DEBUG] CORRECTED gameStateForEngine.campaignCompleted:', gameStateForEngine.campaignCompleted);
      console.log('[DEBUG] Game state week:', gameState.currentWeek);
      console.log('[DEBUG] Full game state:', {
        id: gameState.id,
        currentWeek: gameState.currentWeek,
        rawCampaignCompleted: gameState.campaignCompleted,
        correctedCampaignCompleted: gameStateForEngine.campaignCompleted,
        money: gameState.money,
        reputation: gameState.reputation
      });
      if (gameStateForEngine.campaignCompleted) {
        console.log('[DEBUG] Campaign already completed - taking early return path');
        // Return campaign results without advancing week
        const balanceConfig = await this.serverGameData.getBalanceConfig();
        const campaignResults = {
          campaignCompleted: true,
          finalScore: Math.max(0, Math.floor((gameState.money || 0) / 1000)) + Math.max(0, Math.floor((gameState.reputation || 0) / 5)),
          scoreBreakdown: {
            money: Math.max(0, Math.floor((gameState.money || 0) / 1000)),
            reputation: Math.max(0, Math.floor((gameState.reputation || 0) / 5)),
            artistsSuccessful: 0,
            projectsCompleted: 0,
            accessTierBonus: 0
          },
          victoryType: gameState.money && gameState.money > 0 ? 'Survival' : 'Failure',
          summary: 'Your 12-week campaign has ended. Time to start fresh!',
          achievements: ['📅 Campaign Completed']
        };

        const weekResult = {
          gameState: gameStateForEngine,
          summary: {
            week: gameState.currentWeek || 14,
            changes: [],
            revenue: 0,
            expenses: 0,
            reputationChanges: {},
            events: []
          },
          campaignResults
        };
        console.log('[DEBUG] Early return weekResult created:', {
          hasGameState: !!weekResult.gameState,
          hasSummary: !!weekResult.summary,
          hasCampaignResults: !!weekResult.campaignResults
        });
        // D6 PR-3: the campaign-completed path performs NO engine writes, but to
        // stay byte-equivalent with the pre-merge two-tx handler (which always ran
        // tx2 — persisting the unchanged gameState, no actions here, and assembling
        // the debug envelope), we fall through to the SHARED persistence block
        // below rather than returning early. currentWeek is unchanged (week 52),
        // so the gameStates UPDATE is a no-op write of the same values.
        return await this.persistAndAssemble(tx, gameId, weekResult, selectedActions);
      }

      // (serverGameData.initialize() hoisted above the transaction — see top of method)

      // Query released projects for ongoing revenue calculation
      const releasedProjects = await tx
        .select()
        .from(projects)
        .where(and(
          eq(projects.gameId, gameId),
          eq(projects.stage, 'released')
        ));

      // Add released projects to game state flags for the engine
      if (!gameStateForEngine.flags) gameStateForEngine.flags = {};
      (gameStateForEngine.flags as any)['released_projects'] = releasedProjects.map(p => ({
        id: p.id,
        title: p.title,
        type: p.type,
        metadata: p.metadata || {}
      }));

      // DEBUGGING: Log current state before processing
      console.log('='.repeat(80));
      console.log('[ADVANCE WEEK] Starting week advancement processing');
      console.log('[ADVANCE WEEK] Current week:', gameStateForEngine.currentWeek);
      console.log('[A&R DEBUG] gameState A&R fields from DB:', {
        arOfficeSlotUsed: (gameState as any).arOfficeSlotUsed,
        arOfficeSourcingType: (gameState as any).arOfficeSourcingType
      });
      console.log('[A&R DEBUG] gameStateForEngine A&R fields:', {
        arOfficeSlotUsed: (gameStateForEngine as any).arOfficeSlotUsed,
        arOfficeSourcingType: (gameStateForEngine as any).arOfficeSourcingType
      });
      console.log('='.repeat(80));

      // Create GameEngine instance for this game state
      let gameEngine: GameEngine;
      try {
        console.log('[DEBUG] Creating GameEngine instance...');
        console.log('[DEBUG] gameStateForEngine keys:', Object.keys(gameStateForEngine));
        console.log('[DEBUG] gameStateForEngine.id:', gameStateForEngine.id);
        console.log('[DEBUG] serverGameData instance:', !!this.serverGameData);
        console.log('[DEBUG] storage instance:', !!this.storage);
        gameEngine = new GameEngine(gameStateForEngine, this.serverGameData, this.storage);
        console.log('[DEBUG] GameEngine created successfully');
      } catch (error) {
        console.error('[ERROR] Failed to create GameEngine:', error);
        console.error('[ERROR] GameEngine creation error stack:', (error as Error)?.stack);
        throw new Error(`GameEngine initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Use GameEngine for business logic - convert selectedActions to proper format
      let weekResult: Awaited<ReturnType<GameEngine['advanceWeek']>> | undefined;
      try {
        console.log('[DEBUG] Processing week advancement...');
        console.log('[DEBUG SERVER] Raw selectedActions from client:', JSON.stringify(selectedActions, null, 2));

        const formattedActions = selectedActions.map(action => {
          console.log(`[DEBUG SERVER] Processing action:`, action);
          console.log(`[DEBUG SERVER] Action metadata:`, action.metadata);
          console.log(`[DEBUG SERVER] ExecutiveId in metadata:`, action.metadata?.executiveId);

          const formatted = {
            actionType: action.actionType,
            targetId: action.targetId,
            metadata: action.metadata || {},
            details: action.metadata || {} // Convert metadata to details for compatibility
          };

          console.log(`[DEBUG SERVER] Formatted action result:`, formatted);
          return formatted;
        });
        console.log('[DEBUG SERVER] All formatted actions:', JSON.stringify(formattedActions, null, 2));

        // PHASE 4 MIGRATION: Project advancement now handled entirely by GameEngine
        console.log('[DEBUG] === PROJECT ADVANCEMENT DELEGATED TO GAMEENGINE ===');

        // Now execute GameEngine with the updated project states within the same transaction
        console.log('[DEBUG] Starting GameEngine processing...');

        try {
          weekResult = await gameEngine.advanceWeek(formattedActions, tx); // Pass transaction context
          console.log('[DEBUG] Week advancement completed successfully');
          console.log('[DEBUG] WeekResult received from GameEngine:', {
            weekResult,
            type: typeof weekResult,
            isUndefined: weekResult === undefined,
            isNull: weekResult === null,
            hasGameState: weekResult?.gameState !== undefined,
            hasSummary: weekResult?.summary !== undefined
          });
        } catch (advanceWeekError) {
          console.error('[ERROR] GameEngine.advanceWeek threw exception:', advanceWeekError);
          console.error('[ERROR] Full error stack:', (advanceWeekError as Error)?.stack);
          throw advanceWeekError;
        }

        // PHASE 4 MIGRATION: Post-GameEngine advancement logic removed
        // All project stage advancement now handled within GameEngine.advanceProjectStages()
        console.log('[DEBUG] === PROJECT ADVANCEMENT COMPLETE (GameEngine handled all stages) ===');
      } catch (engineError) {
        console.error('[ERROR] GameEngine processing failed:', engineError);
        throw new Error(`Week advancement failed: ${engineError instanceof Error ? engineError.message : 'Unknown error'}`);
      }

      // Ensure weekResult is defined (it should always be due to the throw in catch block)
      if (!weekResult) {
        throw new Error('Week advancement failed: No result returned from GameEngine');
      }

      // D6 PR-3: persist + assemble the response INSIDE this same transaction
      // (formerly the separate tx2). A crash anywhere above rolls the whole week
      // back — all-or-nothing.
      return await this.persistAndAssemble(tx, gameId, weekResult, selectedActions);
    }); // End the single week-advance transaction here

    console.log('[DEBUG] Week advancement transaction committed');

    // Post-commit: return the envelope assembled from in-tx values. The route's
    // res.json runs after this resolves (§4 post-commit ordering).
    return finalResult;
  }

  /**
   * Persists the advanced gameState + weekly actions and assembles the response
   * envelope, running the debug read-backs. D6 PR-3: this is the former tx2 body,
   * verbatim (same statements, same order), now invoked INSIDE the single
   * week-advance transaction via the passed `tx`. Callers (both the normal and the
   * campaign-completed early-return paths) share it so the envelope shape is
   * identical in both branches.
   */
  private async persistAndAssemble(
    tx: any,
    gameId: string,
    weekResult: any,
    selectedActions: any[],
  ) {
        // Update game state in database
        const [updatedGameState] = await tx
        .update(gameStates)
        .set({
          currentWeek: weekResult.gameState.currentWeek,
          money: Math.round(weekResult.gameState.money || 0), // Ensure integer for database
          reputation: weekResult.gameState.reputation,
          creativeCapital: weekResult.gameState.creativeCapital,
          focusSlots: weekResult.gameState.focusSlots,
          usedFocusSlots: weekResult.gameState.usedFocusSlots,
          playlistAccess: weekResult.gameState.playlistAccess,
          pressAccess: weekResult.gameState.pressAccess,
          venueAccess: weekResult.gameState.venueAccess,
          // Persist tier unlock history for UI display in AccessTierBadges
          tierUnlockHistory: (weekResult.gameState as any).tierUnlockHistory ?? {},
          campaignCompleted: weekResult.gameState.campaignCompleted,
          // Persist A&R Office state from GameEngine (columns must exist in schema)
          // If your schema does not have these columns yet, consider storing them under flags instead.
          arOfficeSlotUsed: (weekResult.gameState as any).arOfficeSlotUsed ?? null,
          arOfficeSourcingType: (weekResult.gameState as any).arOfficeSourcingType ?? null,
          arOfficeOperationStart: (weekResult.gameState as any).arOfficeOperationStart ?? null,
          flags: weekResult.gameState.flags,
          weeklyStats: weekResult.gameState.weeklyStats,
          updatedAt: new Date()
        })
        .where(eq(gameStates.id, gameId))
        .returning();

      // Save weekly actions
      if (selectedActions.length > 0) {
        await tx.insert(weeklyActions).values(
          selectedActions.map(action => ({
            id: crypto.randomUUID(),
            gameId,
            week: (weekResult.gameState.currentWeek || 1) - 1, // Previous week
            actionType: action.actionType,
            targetId: action.targetId ? (action.targetId.length === 36 && action.targetId.includes('-')) ? action.targetId : null : null, // Only use if it's a valid UUID
            results: {
              revenue: weekResult.summary.revenue / selectedActions.length,
              expenses: weekResult.summary.expenses / selectedActions.length
            },
            createdAt: new Date()
          }))
        );
      }

      // POST-PROCESSING: Song releases now handled entirely by GameEngine
      console.log('[DEBUG] === POST-PROCESSING: SONG RELEASES HANDLED BY GAMEENGINE ===');
      console.log('[DEBUG] Routes.ts no longer processes individual song releases - GameEngine handles all song revenue processing');

      // Legacy project metadata update removed - individual songs handle their own revenue tracking

        // Add comprehensive debugging information visible in browser
        console.log('[DEBUG] Preparing response with debug information...');

        // Get final project states for debugging
        const finalProjects = await tx
          .select()
          .from(projects)
          .where(eq(projects.gameId, gameId));

        // Get final song states for debugging
        const finalSongs = await tx
          .select()
          .from(songs)
          .where(eq(songs.gameId, gameId));

        const debugInfo = {
          serverMessage: "Server-side processing completed",
          processingSteps: {
            totalProjectsCount: finalProjects?.length || 0,
            gameEngineExecuted: !!weekResult,
            weekResultSummary: !!weekResult.summary,
            postEngineProjectCount: finalProjects?.length || 0
          },
          projectStates: {
            final: finalProjects?.map((p: any) => ({
              id: p.id,
              title: p.title,
              stage: p.stage,
              songsCreated: p.songsCreated
            })) || []
          },
          songStates: {
            total: finalSongs?.length || 0,
            released: finalSongs?.filter((s: any) => s.isReleased).length || 0,
            ready: finalSongs?.filter((s: any) => s.isRecorded && !s.isReleased).length || 0,
            songDetails: finalSongs?.map((s: any) => ({
              id: s.id,
              title: s.title,
              isRecorded: s.isRecorded,
              isReleased: s.isReleased,
              initialStreams: s.initialStreams,
              projectId: (s.metadata as any)?.projectId
            })) || []
          },
          timestamp: new Date().toISOString()
        };
        console.log('[DEBUG] Comprehensive debug info:', JSON.stringify(debugInfo, null, 2));

        // Song release changes now handled by GameEngine during weekly processing
        console.log('[DEBUG] Song release revenue now processed by GameEngine, not routes.ts');

        return {
          gameState: updatedGameState,
          summary: weekResult.summary,
          campaignResults: weekResult.campaignResults,
          debug: debugInfo
        };
  }
}

// Export singleton instance
export const advanceWeekService = new AdvanceWeekService();
