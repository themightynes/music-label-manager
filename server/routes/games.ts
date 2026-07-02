import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { db } from '../db';
import { eq, desc, sql } from 'drizzle-orm';
import { requireClerkUser } from '../auth';
import { serverGameData } from '../data/gameData';
import { insertGameStateSchema, labelRequestSchema, gameStates, gameSaves, executives } from '@shared/schema';
import { normalizeDifficulty } from '@shared/utils/startingValues';

const router = Router();

  // Game state routes
  router.get("/api/game/:id", requireClerkUser, async (req, res) => {
    try {
      const gameState = await storage.getGameState(req.params.id);
      if (!gameState) {
        return res.status(404).json({ message: "Game not found" });
      }

      // Get related data
      const musicLabel = await storage.getMusicLabel(gameState.id);
      const artists = await storage.getArtistsByGame(gameState.id);
      const projects = await storage.getProjectsByGame(gameState.id);
      const roles = await storage.getRolesByGame(gameState.id);
      const weeklyActions = await storage.getWeeklyActions(gameState.id, gameState.currentWeek || 1);
      const releases = await serverGameData.getReleasesByGame(gameState.id);

      res.json({
        gameState,
        musicLabel,
        artists,
        projects,
        roles,
        weeklyActions,
        releases
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch game data" });
    }
  });

  router.post("/api/game", requireClerkUser, async (req, res) => {
    console.log('🚀 [GAME CREATION] Starting new game creation...');
    try {
      const { labelData, difficulty, ...gameStateData } = req.body;
      const validatedData = insertGameStateSchema.parse(gameStateData);

      // MISSING: no UI exposes difficulty selection yet — every game defaults to
      // 'normal' (1.0x). Passing 'easy'/'hard' applies progression.json's
      // difficulty_modifiers.starting_money_multiplier (1.5x / 0.7x).
      const gameDifficulty = normalizeDifficulty(difficulty);
      console.log('📝 [GAME CREATION] Validated data reputation:', validatedData.reputation);

      // Validate label data if provided
      let validatedLabelData = null;
      if (labelData) {
        validatedLabelData = labelRequestSchema.parse(labelData);
      }

      // Ensure serverGameData is initialized before accessing balance config
      await serverGameData.initialize();

      // Set starting values from balance.json configuration (money scaled by difficulty)
      const startingValues = await serverGameData.getStartingValues(gameDifficulty);
      // Make these logs more visible
      console.error('🎮🎮🎮 REPUTATION FROM BALANCE:', startingValues.reputation);
      console.error('💰💰💰 MONEY FROM BALANCE:', startingValues.money);
      console.error('🎨🎨🎨 CREATIVE CAPITAL FROM BALANCE:', startingValues.creativeCapital);

      // Derive initial access tiers from starting reputation (ignore client-provided access fields)
      const accessTiers = serverGameData.getAccessTiersSync() as any;
      const rep = startingValues.reputation || 0;
      const pickTier = (tiersObj: Record<string, { threshold: number }>) => (
        Object.entries(tiersObj)
          .sort(([, a], [, b]) => (b as any).threshold - (a as any).threshold)
          .find(([, cfg]) => rep >= (cfg as any).threshold)?.[0] || 'none'
      );
      const initialPlaylist = pickTier(accessTiers.playlist_access);
      const initialPress = pickTier(accessTiers.press_access);
      const initialVenue = pickTier(accessTiers.venue_access);

      const gameDataWithBalance = {
        ...validatedData,
        // Force correct initial access tiers based on reputation
        playlistAccess: initialPlaylist,
        pressAccess: initialPress,
        venueAccess: initialVenue,
        money: startingValues.money,
        reputation: startingValues.reputation,
        creativeCapital: startingValues.creativeCapital, // FIXED: Use balance.json configuration like money and reputation
        // Persist difficulty so future systems (reputation_decay, market_variance,
        // goal_time_extension modifiers) can read it without a schema migration
        flags: { ...((validatedData.flags as Record<string, unknown>) ?? {}), difficulty: gameDifficulty },
        userId: req.userId  // CRITICAL: Associate game with user
      };
      console.error('✅✅✅ FINAL GAME DATA - Money:', gameDataWithBalance.money, 'Reputation:', gameDataWithBalance.reputation, 'VenueAccess:', gameDataWithBalance.venueAccess);

      // Create game state and music label atomically within a transaction
      const result = await db.transaction(async (tx) => {
        const gameState = await storage.createGameState(gameDataWithBalance, tx);

        // Create music label for the new game
const musicLabelData = {
          name: validatedLabelData?.name || "New Music Label",
          gameId: gameState.id,
          foundedWeek: validatedLabelData?.foundedWeek || 1,
          foundedYear: validatedLabelData?.foundedYear || new Date().getFullYear(),
          description: validatedLabelData?.description || null,
          genreFocus: validatedLabelData?.genreFocus || null
        };
        const musicLabel = await storage.createMusicLabel(musicLabelData, tx);
        console.log('🎵 Created music label:', musicLabel.name, 'for game:', gameState.id);

        return { gameState, musicLabel };
      });

      const { gameState, musicLabel } = result;

      // Initialize executives for the new game (CEO excluded - player is the CEO)
      console.log('🎭 Creating executives for game:', gameState.id);
      try {
        const executiveRecords = [
          { gameId: gameState.id, role: 'head_ar', level: 1, mood: 50, loyalty: 50 },
          { gameId: gameState.id, role: 'cmo', level: 1, mood: 50, loyalty: 50 },
          { gameId: gameState.id, role: 'cco', level: 1, mood: 50, loyalty: 50 },
          { gameId: gameState.id, role: 'head_distribution', level: 1, mood: 50, loyalty: 50 }
        ];
        await db.insert(executives).values(executiveRecords);
        console.log('✅ Successfully created 4 executives for game:', gameState.id);
      } catch (error) {
        console.error('❌ Failed to create executives:', error);
        // Continue anyway - don't break game creation
      }

      // Initialize default roles for new game
      const defaultRoles = [
        { name: "Sarah Mitchell", title: "Manager", type: "Manager", gameId: gameState.id },
        { name: "Marcus Chen", title: "A&R Representative", type: "A&R", gameId: gameState.id },
        { name: "Elena Rodriguez", title: "Producer", type: "Producer", gameId: gameState.id },
        { name: "David Kim", title: "PR Specialist", type: "PR", gameId: gameState.id },
        { name: "Lisa Thompson", title: "Digital Marketing", type: "Digital", gameId: gameState.id },
        { name: "Ryan Jackson", title: "Streaming Curator", type: "Streaming", gameId: gameState.id },
        { name: "Amanda Foster", title: "Booking Agent", type: "Booking", gameId: gameState.id },
        { name: "Chris Park", title: "Operations Manager", type: "Operations", gameId: gameState.id }
      ];

      // Note: This would need proper role creation through storage interface
      // For now, returning basic game state with music label

      res.json({
        ...gameState,
        musicLabel
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid game data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create game" });
      }
    }
  });

  router.patch("/api/game/:id", requireClerkUser, async (req, res) => {
    try {
      console.log('[PATCH /api/game/:id] Request params:', req.params.id);
      console.log('[PATCH /api/game/:id] Request body:', req.body);

      const gameState = await storage.updateGameState(req.params.id, req.body);

      console.log('[PATCH /api/game/:id] Updated game state:', gameState);

      if (!gameState) {
        console.error('[PATCH /api/game/:id] No game state returned from storage.updateGameState');
        return res.status(404).json({ message: "Game not found or update failed" });
      }

      res.json(gameState);
    } catch (error) {
      console.error('[PATCH /api/game/:id] Error:', error);
      res.status(500).json({ message: "Failed to update game state", error: (error as any).message });
    }
  });

  // List all games for the current user (FR-5: Server State Recovery)
  router.get("/api/games", requireClerkUser, async (req, res) => {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Get all games for this user, sorted by created date (newest first)
      const games = await db
        .select()
        .from(gameStates)
        .where(eq(gameStates.userId, userId))
        .orderBy(desc(gameStates.createdAt));

      console.log(`[GET /api/games] Found ${games.length} game(s) for user ${userId}`);

      res.json(games);
    } catch (error) {
      console.error('[GET /api/games] Error:', error);
      res.status(500).json({ message: 'Failed to fetch games', error: (error as any).message });
    }
  });

  // ============================================================================
  // DELETE /api/game/:gameId - Delete Game and All Related Data
  // ============================================================================
  // Purpose: Delete a game and all its related records (orphaned game cleanup)
  // PRD Reference: tasks/0006-prd-database-maintenance-orphaned-games.md (FR-1)
  //
  // CASCADE DELETE BEHAVIOR (Configured in shared/schema.ts):
  // When a game_state is deleted, ALL related records are automatically deleted
  // via foreign key constraints with ON DELETE CASCADE:
  //
  // Tables with CASCADE delete:
  // - artists (all artists signed to this game)
  // - songs (all songs created in this game, even unreleased)
  // - projects (all projects: singles, EPs, tours)
  // - releases (all planned and active releases)
  // - release_songs (all release-song mappings)
  // - emails (all inbox emails)
  // - executives (all hired executives)
  // - mood_events (all artist mood change events)
  // - weekly_actions (all queued and completed actions)
  // - charts (all chart position records)
  // - music_labels (the game's music label configuration)
  //
  // This ensures NO orphaned data remains in the database after deletion.
  //
  // Security Model:
  // - Authentication required (requireClerkUser middleware)
  // - Ownership verification (only game owner can delete)
  // - No information leakage (returns 404 for both non-existent and unauthorized)
  // ============================================================================
  router.delete("/api/game/:gameId", requireClerkUser, async (req, res) => {
    try {
      const userId = req.userId;
      const { gameId } = req.params;

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      console.log('[DELETE /api/game/:gameId] User:', userId, 'attempting to delete game:', gameId);

      // Step 1: Verify game exists and check ownership
      // We fetch both id and userId to perform ownership check in a single query
      const [gameOwnership] = await db
        .select({ id: gameStates.id, userId: gameStates.userId, currentWeek: gameStates.currentWeek })
        .from(gameStates)
        .where(eq(gameStates.id, gameId))
        .limit(1);

      // Step 2: Return 404 if game doesn't exist
      if (!gameOwnership) {
        console.log('[DELETE /api/game/:gameId] Game not found:', gameId);
        return res.status(404).json({ message: 'Game not found' });
      }

      // Step 3: Return 404 if user doesn't own the game
      // Security: We return 404 (not 403) to avoid leaking game existence
      // An attacker shouldn't be able to determine if a gameId exists
      if (gameOwnership.userId !== userId) {
        console.log('[DELETE /api/game/:gameId] Unauthorized deletion attempt by user:', userId);
        return res.status(404).json({ message: 'Game not found' });
      }

      // Step 4: Delete orphaned game_saves records
      // game_saves stores gameId inside JSON (game_state->'gameState'->>'id')
      // No FK constraint exists, so we must manually delete to prevent orphaned saves
      // that would cause 403 errors when users try to restore them
      await db.delete(gameSaves).where(sql`game_state->'gameState'->>'id' = ${gameId}`);

      console.log('[DELETE /api/game/:gameId] Deleted orphaned game_saves for game:', gameId);

      // Step 5: Delete the game_state record
      // CASCADE configuration in schema.ts automatically deletes ALL related records
      // This is a SINGLE query - Drizzle ORM handles the deletion, PostgreSQL handles CASCADE
      // No need to manually delete artists, songs, projects, etc. - CASCADE does it automatically!
      await db.delete(gameStates).where(eq(gameStates.id, gameId));

      console.log('[DELETE /api/game/:gameId] Successfully deleted game:', gameId, '(Week', gameOwnership.currentWeek + ')');

      // Step 6: Return success response with deletion confirmation
      res.json({
        success: true,
        message: 'Game deleted successfully',
        gameId: gameId
      });
    } catch (error) {
      console.error('[DELETE /api/game/:gameId] Error:', error);
      res.status(500).json({ message: 'Failed to delete game', error: (error as any).message });
    }
  });

// Create/update music label for existing game
  router.post("/api/game/:gameId/label", requireClerkUser, async (req, res) => {
    try {
      const { gameId } = req.params;
      console.log('[POST /api/game/:gameId/label] Creating/updating label for game:', gameId);
      console.log('[POST /api/game/:gameId/label] Label data:', req.body);

      // Validate the game exists and belongs to the user
      const gameState = await storage.getGameState(gameId);
      if (!gameState) {
        return res.status(404).json({ message: "Game not found" });
      }

      // Validate label data
      const validatedLabelData = labelRequestSchema.parse(req.body);

      // Check if label already exists for this game
      const existingLabel = await storage.getMusicLabel(gameId);

      let musicLabel;
      if (existingLabel) {
        // Update existing label
        musicLabel = await storage.updateMusicLabel(gameId, {
          ...validatedLabelData,
          foundedYear: validatedLabelData.foundedYear || existingLabel.foundedYear || new Date().getFullYear(),
        });
        console.log('[POST /api/game/:gameId/label] Updated existing label:', musicLabel?.name);
      } else {
        // Create new label
        const musicLabelData = {
          name: validatedLabelData.name,
          gameId: gameId,
          foundedWeek: validatedLabelData.foundedWeek || 1,
          foundedYear: validatedLabelData.foundedYear || new Date().getFullYear(),
          description: validatedLabelData.description || null,
          genreFocus: validatedLabelData.genreFocus || null
        };
        musicLabel = await storage.createMusicLabel(musicLabelData);
        console.log('[POST /api/game/:gameId/label] Created new label:', musicLabel.name);
      }

      if (!musicLabel) {
        return res.status(500).json({ message: "Failed to create/update music label" });
      }

      res.json(musicLabel);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid label data", errors: error.errors });
      } else {
        console.error('[POST /api/game/:gameId/label] Error:', error);
        res.status(500).json({ message: "Failed to create/update music label", error: (error as any).message });
      }
    }
  });

  // Phase 2: Turn System Endpoints

  // Get current game state
  router.get("/api/game-state", requireClerkUser, async (req, res) => {
    try {
      const userId = req.userId!;

      // Debug: Get all games for this user to see what's happening
      const allGames = await db
        .select()
        .from(gameStates)
        .where(eq(gameStates.userId, userId))
        .orderBy(desc(gameStates.currentWeek), desc(gameStates.updatedAt));

      console.log('All games for user:', allGames.map(g => ({
        id: g.id.substring(0, 8),
        week: g.currentWeek,
        money: g.money,
        updatedAt: g.updatedAt
      })));

      if (allGames.length > 0) {
        const existingGame = allGames[0];

        // Get music label for existing game
        const musicLabel = await storage.getMusicLabel(existingGame.id);

        return res.json({
          ...existingGame,
          musicLabel
        });
      }

      // Create new game state for user
      // Get starting values from balance configuration
      const startingValues = await serverGameData.getStartingValues();

      // Determine initial access tiers based on starting reputation
      // This ensures venue access starts at 'clubs' when starting reputation >= 5
      const accessTiers = serverGameData.getAccessTiersSync() as any;
      const rep = startingValues.reputation || 0;
      const pickTier = (tiersObj: Record<string, { threshold: number }>) => {
        return (
          Object.entries(tiersObj)
            .sort(([, a], [, b]) => (b as any).threshold - (a as any).threshold)
            .find(([, cfg]) => rep >= (cfg as any).threshold)?.[0] || 'none'
        );
      };
      const initialPlaylist = pickTier(accessTiers.playlist_access);
      const initialPress = pickTier(accessTiers.press_access);
      const initialVenue = pickTier(accessTiers.venue_access);

      const defaultState = {
        userId: userId,
          currentWeek: 1,
          money: startingValues.money,
          reputation: startingValues.reputation,
          creativeCapital: startingValues.creativeCapital,
          focusSlots: 3,
          usedFocusSlots: 0,
          playlistAccess: initialPlaylist,
          pressAccess: initialPress,
          venueAccess: initialVenue,
          campaignType: "standard",
          rngSeed: Math.random().toString(36).substring(7),
          flags: {},
          weeklyStats: {}
        };

        // Create game state without music label - label will be created separately via frontend flow
        const gameState = await storage.createGameState(defaultState);
        console.log('🎮 Created auto-generated game state (label will be created separately):', gameState.id);

        return res.json({
          ...gameState,
          musicLabel: null
        });
    } catch (error) {
      console.error('Get game state error:', error);
      res.status(500).json({ message: "Failed to fetch game state" });
    }
  });

export default router;
