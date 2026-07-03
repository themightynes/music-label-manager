import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { requireClerkUser } from '../auth';
import { serverGameData } from '../data/gameData';
import { GameEngine } from '../../shared/engine/game-engine';
import {
  AdvanceWeekRequest,
  validateRequest,
  createErrorResponse,
} from '@shared/api/contracts';
import { insertWeeklyActionSchema, gameStates, weeklyActions, projects, songs, artists } from '@shared/schema';

const router = Router();

  // Weekly action routes
  router.post("/api/game/:gameId/actions", requireClerkUser, async (req, res) => {
    try {
      const validatedData = insertWeeklyActionSchema.parse({
        ...req.body,
        gameId: req.params.gameId
      });
      const action = await storage.createWeeklyAction(validatedData);
      res.json(action);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid action data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create action" });
      }
    }
  });

  // Week advancement with action processing using GameEngine and transactions
  router.post("/api/advance-week", requireClerkUser, async (req, res) => {
    try {
      // Validate request using shared contract
      const request = validateRequest(AdvanceWeekRequest, req.body);
      const { gameId, selectedActions } = request;

      // Wrap everything in a database transaction
      const result = await db.transaction(async (tx) => {
        // Get current game state
        const [gameState] = await tx
          .select()
          .from(gameStates)
          .where(eq(gameStates.id, gameId));

        if (!gameState) {
          throw new Error('Game not found');
        }

        // Load current artists for mood calculations
        const gameArtists = await tx
          .select()
          .from(artists)
          .where(eq(artists.gameId, gameId));

        // Get starting values from balance configuration
        const startingValues = await serverGameData.getStartingValues();

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
          const balanceConfig = await serverGameData.getBalanceConfig();
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
          return { gameStateForEngine, weekResult };
        }

        // Initialize game data to load balance configuration
        console.log('[DEBUG] Initializing serverGameData...');
        await serverGameData.initialize();
        console.log('[DEBUG] ServerGameData initialized successfully');

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
          console.log('[DEBUG] serverGameData instance:', !!serverGameData);
          console.log('[DEBUG] storage instance:', !!storage);
          gameEngine = new GameEngine(gameStateForEngine, serverGameData, storage);
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

        return { gameStateForEngine, weekResult };
      }); // End the first transaction here

      console.log('[DEBUG] Project advancement transaction committed');

      // Destructure the result from the first transaction
      const { gameStateForEngine, weekResult } = result;

      // Ensure weekResult is defined (it should always be due to the throw in catch block)
      if (!weekResult) {
        throw new Error('Week advancement failed: No result returned from GameEngine');
      }

      // Now continue with the rest of the transaction for final updates
      const finalResult = await db.transaction(async (tx) => {

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
              final: finalProjects?.map(p => ({
                id: p.id,
                title: p.title,
                stage: p.stage,
                songsCreated: p.songsCreated
              })) || []
            },
            songStates: {
              total: finalSongs?.length || 0,
              released: finalSongs?.filter(s => s.isReleased).length || 0,
              ready: finalSongs?.filter(s => s.isRecorded && !s.isReleased).length || 0,
              songDetails: finalSongs?.map(s => ({
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
        });

      res.json(finalResult);
    } catch (error) {
      console.error('=== ADVANCE WEEK ERROR ===');
      console.error('Error type:', typeof error);
      console.error('Error instance:', error?.constructor?.name);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('Error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      console.error('========================');

      if (error instanceof z.ZodError) {
        console.error('Zod validation errors:', error.errors);
        return res.status(400).json(createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid request data',
          error.errors
        ));
      }

      const errorMessage = error instanceof Error ? error.message : 'Failed to advance week';
      console.error('Sending error response:', errorMessage);

      res.status(500).json(createErrorResponse(
        'ADVANCE_WEEK_ERROR',
        errorMessage
      ));
    }
  });

export default router;
