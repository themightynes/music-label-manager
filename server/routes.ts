import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import { insertGameStateSchema, insertGameSaveSchema, gameSaveSnapshotSchema, insertWeeklyActionSchema, insertMusicLabelSchema, labelRequestSchema, gameStates, gameSaves, weeklyActions, projects, songs, artists, releases, releaseSongs, roles, executives, musicLabels, moodEvents, emails, type GameSaveSnapshot, SNAPSHOT_VERSION } from "@shared/schema";
import { z } from "zod";
import { serverGameData } from "./data/gameData";
import { GameEngine } from "../shared/engine/game-engine";
import {
  AdvanceWeekRequest,
  AdvanceWeekResponse,
  SelectActionsRequest,
  SelectActionsResponse,
  validateRequest,
  createErrorResponse,
  SaveActionsConfigRequestSchema,
  SaveActionsConfigResponseSchema
} from "@shared/api/contracts";
import { db } from "./db";
import { eq, desc, and, sql, inArray, ne } from "drizzle-orm";
import { requireClerkUser, handleClerkWebhook, requireAdmin } from './auth';
import analyticsRouter from './routes/analytics';
import bugReportsRouter from './routes/bugReports';
import adminRouter from './routes/admin';
import emailsRouter from './routes/emails';
import devToolsRouter from './routes/devTools';
import contentRouter from './routes/content';
import arOfficeRouter from './routes/arOffice';
import executivesRouter from './routes/executives';
import artistsRouter from './routes/artists';
import projectsRouter from './routes/projects';
import chartsRouter from './routes/charts';
import releasesRouter from './routes/releases';
import tourRouter from './routes/tour';
import { ClerkExpressWithAuth, clerkClient } from '@clerk/clerk-sdk-node';
import { normalizeDifficulty } from '@shared/utils/startingValues';

export async function registerRoutes(app: Express): Promise<Server> {

  const validateSnapshotCollections = (snapshot: GameSaveSnapshot) => {
    const errors: string[] = [];

    const ensureArray = (value: unknown, name: string): value is unknown[] => {
      if (value === undefined || value === null) return false;
      if (!Array.isArray(value)) {
        errors.push(`${name} must be an array`);
        return false;
      }
      return true;
    };

    if (ensureArray(snapshot.releaseSongs, 'releaseSongs')) {
      snapshot.releaseSongs.forEach((entry, index) => {
        if (!entry || typeof entry.releaseId !== 'string' || typeof entry.songId !== 'string') {
          errors.push(`releaseSongs[${index}] is missing required releaseId/songId`);
        }
      });
    }

    if (ensureArray(snapshot.executives, 'executives')) {
      snapshot.executives.forEach((exec: any, index) => {
        if (!exec || typeof exec.id !== 'string' || typeof exec.role !== 'string') {
          errors.push(`executives[${index}] is missing required id/role`);
        }
      });
    }

    if (ensureArray(snapshot.moodEvents, 'moodEvents')) {
      snapshot.moodEvents.forEach((event: any, index) => {
        if (!event || typeof event.id !== 'string' || typeof event.artistId !== 'string') {
          errors.push(`moodEvents[${index}] is missing required id/artistId`);
        }
      });
    }

    if (ensureArray(snapshot.emails, 'emails')) {
      snapshot.emails.forEach((email: any, index) => {
        if (!email || typeof (email as any).id !== 'string' || typeof email.subject !== 'string') {
          errors.push(`emails[${index}] is missing required id/subject`);
        }
      });
    }

    if (errors.length > 0) {
      const error = new Error('Invalid snapshot collections');
      (error as any).code = 'INVALID_SNAPSHOT_COLLECTIONS';
      (error as any).details = errors;
      throw error;
    }
  };

  // Clerk webhooks
  app.post('/api/webhooks/clerk', handleClerkWebhook);
  
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Email endpoints
  app.use(emailsRouter);

  // Current user metadata (minimal): isAdmin flag derived from Clerk privateMetadata
  app.get('/api/me', ClerkExpressWithAuth(), async (req, res) => {
    try {
      const clerkUserId = (req as any).auth?.userId;
      if (!clerkUserId) {
        return res.json({ isAuthenticated: false, isAdmin: false, user: null });
      }
      const user = await clerkClient.users.getUser(clerkUserId);
      const isAdmin = (user as any)?.privateMetadata?.role === 'admin';
      res.json({
        isAuthenticated: true,
        isAdmin,
        user: {
          id: user.id,
          email: user.emailAddresses?.[0]?.emailAddress ?? null,
          firstName: user.firstName ?? null,
          lastName: user.lastName ?? null,
        },
      });
    } catch (error) {
      console.error('[API /me] Error:', error);
      res.status(500).json({ isAuthenticated: false, isAdmin: false, user: null });
    }
  });

  app.use(adminRouter);

  app.use(devToolsRouter);

  // Game state routes
  app.get("/api/game/:id", requireClerkUser, async (req, res) => {
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

  app.post("/api/game", requireClerkUser, async (req, res) => {
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

  app.patch("/api/game/:id", requireClerkUser, async (req, res) => {
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
  app.get("/api/games", requireClerkUser, async (req, res) => {
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
  app.delete("/api/game/:gameId", requireClerkUser, async (req, res) => {
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
  app.post("/api/game/:gameId/label", requireClerkUser, async (req, res) => {
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

  app.use(contentRouter);

  // ========================= A&R OFFICE ENDPOINTS =========================
  app.use(arOfficeRouter);

  // Roles / executives / dialogue endpoints extracted to server/routes/executives.ts (PR-8)
  // Mounted at the original position of GET /api/roles/:roleId to preserve registration order.
  app.use(executivesRouter);

  // Artist (state) endpoints extracted to server/routes/artists.ts (PR-9)
  // Mounted at the original position of POST /api/game/:gameId/artist-dialogue to preserve registration order.
  app.use(artistsRouter);

  // Projects endpoints extracted to server/routes/projects.ts (PR-10)
  // Mounted at the original position of POST /api/budget-calculation to preserve registration order.
  app.use(projectsRouter);

  // Weekly action routes
  app.post("/api/game/:gameId/actions", requireClerkUser, async (req, res) => {
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

  // OLD ENDPOINT REMOVED - Use /api/advance-week instead
  // This endpoint did not have 12-week campaign completion logic

  // Save game routes
  app.get("/api/saves", requireClerkUser, async (req, res) => {
    try {
      const saves = await storage.getGameSaves(req.userId!);
      res.json(saves);
    } catch (error) {
      console.error('[API] Failed to fetch save summaries:', error);
      res.status(500).json({ message: "Failed to fetch saves" });
    }
  });

  app.get("/api/saves/:saveId", requireClerkUser, async (req, res) => {
    try {
      const save = await storage.getGameSaveForUser(req.params.saveId, req.userId!);
      if (!save) {
        return res.status(404).json({
          error: 'SAVE_NOT_FOUND',
          message: 'Save file not found or does not belong to this user'
        });
      }

      const { userId: _userId, ...rest } = save as any;
      res.json(rest);
    } catch (error) {
      console.error('[API] Failed to fetch save snapshot:', error);
      res.status(500).json({ message: "Failed to fetch save snapshot" });
    }
  });

  app.post("/api/saves", requireClerkUser, async (req, res) => {
    try {
      const validatedData = insertGameSaveSchema.parse(req.body);
      const snapshot = validatedData.gameState;
      const snapshotGameId = snapshot?.gameState?.id;

      if (!snapshotGameId) {
        return res.status(400).json({
          error: 'INVALID_SNAPSHOT',
          message: 'Save snapshot is missing game identifier'
        });
      }

      const save = await storage.createGameSave({
        ...validatedData,
        week: snapshot.gameState.currentWeek,
        userId: req.userId!,
      });

      if (validatedData.isAutosave) {
        await storage.purgeOldAutosaves(req.userId!, snapshotGameId, 3);
      }

      res.json(save);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid save data", errors: error.errors });
      } else {
        console.error('Save creation error:', error);
        res.status(500).json({ message: "Failed to create save" });
      }
    }
  });

  app.post("/api/saves/:saveId/restore", requireClerkUser, async (req, res) => {
    const restoreRequestSchema = z.object({
      mode: z.enum(['overwrite', 'fork']).default('overwrite'),
    });

    // Helper function to convert timestamp strings to Date objects
    const convertTimestamps = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;

      if (Array.isArray(obj)) {
        return obj.map(item => convertTimestamps(item));
      }

      const converted: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Convert fields that end with 'At' or are known timestamp fields
        if ((key.endsWith('At') || key === 'createdAt' || key === 'updatedAt') &&
            typeof value === 'string' && value) {
          converted[key] = new Date(value);
        } else if (value && typeof value === 'object') {
          converted[key] = convertTimestamps(value);
        } else {
          converted[key] = value;
        }
      }
      return converted;
    };

    try {
      const { mode } = restoreRequestSchema.parse(req.body ?? {});

      const save = await storage.getGameSaveForUser(req.params.saveId, req.userId!);
      if (!save) {
        return res.status(404).json({
          error: 'SAVE_NOT_FOUND',
          message: 'Save file not found or does not belong to this user',
        });
      }

      const snapshot = gameSaveSnapshotSchema.parse(save.gameState) as GameSaveSnapshot;
      if ((snapshot.snapshotVersion ?? 1) !== SNAPSHOT_VERSION) {
        return res.status(400).json({
          error: 'UNSUPPORTED_SNAPSHOT_VERSION',
          message: `Snapshot version ${snapshot.snapshotVersion ?? 1} is not supported. Expected version ${SNAPSHOT_VERSION}.`,
        });
      }
      const targetGameState = snapshot.gameState;
      const sourceGameId = targetGameState?.id;

      validateSnapshotCollections(snapshot);

      if (!sourceGameId) {
        return res.status(400).json({
          error: 'INVALID_SNAPSHOT',
          message: 'Save snapshot is missing game identifier',
        });
      }

      if (mode === 'overwrite') {
        console.log('[RESTORE] Starting overwrite mode for game:', sourceGameId);
        const existingGame = await storage.getGameState(sourceGameId);
        if (!existingGame || existingGame.userId !== req.userId) {
          return res.status(403).json({
            error: 'UNAUTHORIZED',
            message: 'You do not have permission to restore this game',
          });
        }

        console.log('[RESTORE] Beginning transaction...');
        await db.transaction(async (tx) => {
          console.log('[RESTORE] Step 1: Updating game_states...');
          await tx.update(gameStates)
            .set({
              currentWeek: targetGameState.currentWeek,
              money: targetGameState.money,
              reputation: targetGameState.reputation,
              creativeCapital: targetGameState.creativeCapital,
              focusSlots: targetGameState.focusSlots ?? existingGame.focusSlots,
              usedFocusSlots: targetGameState.usedFocusSlots ?? 0,
              arOfficeSlotUsed: targetGameState.arOfficeSlotUsed ?? false,
              arOfficeSourcingType: targetGameState.arOfficeSourcingType ?? null,
              arOfficePrimaryGenre: targetGameState.arOfficePrimaryGenre ?? null,
              arOfficeSecondaryGenre: targetGameState.arOfficeSecondaryGenre ?? null,
              arOfficeOperationStart: targetGameState.arOfficeOperationStart ?? null,
              playlistAccess: targetGameState.playlistAccess ?? existingGame.playlistAccess,
              pressAccess: targetGameState.pressAccess ?? existingGame.pressAccess,
              venueAccess: targetGameState.venueAccess ?? existingGame.venueAccess,
              campaignType: targetGameState.campaignType ?? existingGame.campaignType,
              campaignCompleted: targetGameState.campaignCompleted ?? existingGame.campaignCompleted,
              rngSeed: targetGameState.rngSeed ?? existingGame.rngSeed,
              flags: targetGameState.flags ?? existingGame.flags ?? {},
              weeklyStats: targetGameState.weeklyStats ?? existingGame.weeklyStats ?? {},
              tierUnlockHistory: targetGameState.tierUnlockHistory ?? existingGame.tierUnlockHistory ?? {},
              userId: req.userId!,
              updatedAt: new Date(),
            })
            .where(eq(gameStates.id, sourceGameId));

          // IMPORTANT: Delete in order of foreign key dependencies (children first, parents last)
          // Deletion ordering summary:
          // 1. release_songs → depends on releases & songs (junction table must be cleared first)
          // 2. songs → depends on artists, projects, releases (remove track rows before their parents)
          // 3. releases → depends on artists (planned releases point back to artist roster)
          // 4. projects → depends on artists (projects reference artist owners)
          // 5. mood_events → depends on artists (events track artist history)
          // 6. artists → depends only on game state once children are gone
          // 7. roles / weekly_actions / music_labels / emails / executives → all hang directly off game_state
          // The inserts later run in the exact reverse order so parents exist before their dependent rows.

          console.log('[RESTORE] Step 2: Deleting release_songs junction table...');
          // Clear junction table first so dependent release/song deletions don't hit FK constraints
          const releaseRows = await tx
            .select({ id: releases.id })
            .from(releases)
            .where(eq(releases.gameId, sourceGameId));

          if (releaseRows.length > 0) {
            const releaseIds = releaseRows.map(({ id }) => id);
            await tx
              .delete(releaseSongs)
              .where(inArray(releaseSongs.releaseId, releaseIds));
          }

          console.log('[RESTORE] Step 3: Deleting songs (depends on artists, projects, releases)...');
          // Remove songs before their parent releases/projects/artists to keep FK chain intact
          await tx.delete(songs).where(eq(songs.gameId, sourceGameId));

          console.log('[RESTORE] Step 4: Deleting releases (depends on artists)...');
          // Releases reference artists; with tracks gone we can safely drop the release rows
          await tx.delete(releases).where(eq(releases.gameId, sourceGameId));

          console.log('[RESTORE] Step 5: Deleting projects (depends on artists)...');
          // Projects still point at artists, so they must disappear before we remove the roster
          await tx.delete(projects).where(eq(projects.gameId, sourceGameId));

          console.log('[RESTORE] Step 6: Deleting mood_events (depends on artists)...');
          // Mood history also references artists; delete events prior to artist removal
          await tx.delete(moodEvents).where(eq(moodEvents.gameId, sourceGameId));

          console.log('[RESTORE] Step 7: Deleting artists (no more dependencies)...');
          // With all child tables cleared we can drop artist rows
          await tx.delete(artists).where(eq(artists.gameId, sourceGameId));

          console.log('[RESTORE] Step 8: Deleting roles...');
          // Remaining tables (roles/weekly_actions/label/emails/executives) hang directly off game_state
          await tx.delete(roles).where(eq(roles.gameId, sourceGameId));

          console.log('[RESTORE] Step 9: Deleting weekly_actions...');
          await tx.delete(weeklyActions).where(eq(weeklyActions.gameId, sourceGameId));

          console.log('[RESTORE] Step 10: Deleting music_labels...');
          await tx.delete(musicLabels).where(eq(musicLabels.gameId, sourceGameId));

          console.log('[RESTORE] Step 11: Deleting emails...');
          await tx.delete(emails).where(eq(emails.gameId, sourceGameId));

          console.log('[RESTORE] Step 12: Deleting executives...');
          await tx.delete(executives).where(eq(executives.gameId, sourceGameId));

          // Now insert everything back in reverse order (parents first, children last)

          console.log('[RESTORE] Step 13: Reinserting music_labels...');
          // Rebuild parents first so dependent collections have targets
          if (snapshot.musicLabel) {
            await tx.insert(musicLabels).values(
              convertTimestamps({
                ...snapshot.musicLabel,
                gameId: sourceGameId,
              }) as any
            );
          }

          console.log('[RESTORE] Step 14: Reinserting weekly_actions...');
          // Weekly history depends only on game state, insert early for clarity
          if (Array.isArray(snapshot.weeklyActions) && snapshot.weeklyActions.length > 0) {
            await tx.insert(weeklyActions).values(
              snapshot.weeklyActions.map((action) =>
                convertTimestamps({
                  ...action,
                  gameId: sourceGameId,
                })
              ) as any,
            );
          }

          console.log('[RESTORE] Step 15: Reinserting roles...');
          // Roles also hang off the game directly
          if (Array.isArray(snapshot.roles) && snapshot.roles.length > 0) {
            await tx.insert(roles).values(
              snapshot.roles.map((role) =>
                convertTimestamps({
                  ...role,
                  gameId: sourceGameId,
                })
              ) as any,
            );
          }

          console.log('[RESTORE] Step 16: Reinserting artists...');
          // Restore roster before any collection that references artist IDs
          if (Array.isArray(snapshot.artists) && snapshot.artists.length > 0) {
            await tx.insert(artists).values(
              snapshot.artists.map((artist) =>
                convertTimestamps({
                  ...artist,
                  gameId: sourceGameId,
                })
              ) as any,
            );
          }

          console.log('[RESTORE] Step 17: Reinserting mood_events...');
          // Mood events can now target their owning artists
          if (Array.isArray(snapshot.moodEvents) && snapshot.moodEvents.length > 0) {
            await tx.insert(moodEvents).values(
              snapshot.moodEvents.map((event: any) =>
                convertTimestamps({
                  ...event,
                  gameId: sourceGameId,
                })
              ) as any,
            );
          }

          console.log('[RESTORE] Step 18: Reinserting projects...');
          // Projects require artist IDs but must exist before songs referencing project_id
          if (Array.isArray(snapshot.projects) && snapshot.projects.length > 0) {
            await tx.insert(projects).values(
              snapshot.projects.map((project) =>
                convertTimestamps({
                  ...project,
                  gameId: sourceGameId,
                })
              ) as any,
            );
          }

          console.log('[RESTORE] Step 19: Reinserting releases...');
          // Releases depend on artists and are parents for songs/release_songs
          if (Array.isArray(snapshot.releases) && snapshot.releases.length > 0) {
            await tx.insert(releases).values(
              snapshot.releases.map((release) =>
                convertTimestamps({
                  ...release,
                  gameId: sourceGameId,
                })
              ) as any,
            );
          }

          console.log('[RESTORE] Step 20: Reinserting songs...');
          // Songs can now safely reference artists/projects/releases
          if (Array.isArray(snapshot.songs) && snapshot.songs.length > 0) {
            await tx.insert(songs).values(
              snapshot.songs.map((song) =>
                convertTimestamps({
                  ...song,
                  gameId: sourceGameId,
                })
              ) as any,
            );
          }

          console.log('[RESTORE] Step 21: Reinserting release_songs...');
          // Junction requires both song and release rows to exist first
          if (Array.isArray(snapshot.releaseSongs) && snapshot.releaseSongs.length > 0) {
            await tx.insert(releaseSongs).values(
              snapshot.releaseSongs.map((entry: any) => ({
                releaseId: entry.releaseId,
                songId: entry.songId,
                trackNumber: entry.trackNumber ?? 0,
                isSingle: entry.isSingle ?? false,
              })) as any,
            );
          }

          console.log('[RESTORE] Step 22: Reinserting executives...');
          // Executives and emails only reference the game so they can go near the end
          if (Array.isArray(snapshot.executives) && snapshot.executives.length > 0) {
            await tx.insert(executives).values(
              snapshot.executives.map((exec: any) =>
                convertTimestamps({
                  ...exec,
                  gameId: sourceGameId,
                })
              ) as any,
            );
          }

          console.log('[RESTORE] Step 23: Reinserting emails...');
          // Final pass restores inbox entries tied to the game
          if (Array.isArray(snapshot.emails) && snapshot.emails.length > 0) {
            await tx.insert(emails).values(
              snapshot.emails.map((email) =>
                convertTimestamps({
                  ...email,
                  gameId: sourceGameId,
                })
              ) as any,
            );
          }

          console.log('[RESTORE] Transaction complete!');
        });

        return res.json({ gameId: sourceGameId });
      }

      const idMap = new Map<string, string>();
      const mapId = (value?: string | null, create = true) => {
        if (!value) return value;
        if (!idMap.has(value)) {
          if (!create) {
            return value;
          }
          idMap.set(value, randomUUID());
        }
        return idMap.get(value)!;
      };

      const mapReference = (value?: string | null) => mapId(value, false);

      const newGameId = mapId(sourceGameId)!;

      if (snapshot.musicLabel) {
        mapId((snapshot.musicLabel as any).id ?? undefined);
      }
      if (Array.isArray(snapshot.weeklyActions)) {
        snapshot.weeklyActions.forEach((action) => mapId(action.id));
      }
      if (Array.isArray(snapshot.artists)) {
        snapshot.artists.forEach((artist) => mapId(artist.id));
      }
      if (Array.isArray(snapshot.projects)) {
        snapshot.projects.forEach((project) => mapId(project.id));
      }
      if (Array.isArray(snapshot.roles)) {
        snapshot.roles.forEach((role) => mapId(role.id));
      }
      if (Array.isArray(snapshot.releases)) {
        snapshot.releases.forEach((release) => mapId(release.id));
      }
      if (Array.isArray(snapshot.songs)) {
        snapshot.songs.forEach((song) => mapId(song.id));
      }
      if (Array.isArray(snapshot.executives)) {
        snapshot.executives.forEach((exec) => mapId(exec.id));
      }
      if (Array.isArray(snapshot.moodEvents)) {
        snapshot.moodEvents.forEach((event) => mapId(event.id));
      }
      if (Array.isArray(snapshot.emails)) {
        snapshot.emails.forEach((email) => mapId((email as any).id));
      }

      await db.transaction(async (tx) => {
        await tx.insert(gameStates).values({
          id: newGameId,
          userId: req.userId!,
          currentWeek: targetGameState.currentWeek,
          money: targetGameState.money,
          reputation: targetGameState.reputation,
          creativeCapital: targetGameState.creativeCapital,
          focusSlots: targetGameState.focusSlots ?? 3,
          usedFocusSlots: targetGameState.usedFocusSlots ?? 0,
          arOfficeSlotUsed: targetGameState.arOfficeSlotUsed ?? false,
          arOfficeSourcingType: targetGameState.arOfficeSourcingType ?? null,
          arOfficePrimaryGenre: targetGameState.arOfficePrimaryGenre ?? null,
          arOfficeSecondaryGenre: targetGameState.arOfficeSecondaryGenre ?? null,
          arOfficeOperationStart: targetGameState.arOfficeOperationStart ?? null,
          playlistAccess: targetGameState.playlistAccess ?? 'none',
          pressAccess: targetGameState.pressAccess ?? 'none',
          venueAccess: targetGameState.venueAccess ?? 'none',
          campaignType: targetGameState.campaignType ?? 'Balanced',
          campaignCompleted: targetGameState.campaignCompleted ?? false,
          rngSeed: targetGameState.rngSeed ?? null,
          flags: targetGameState.flags ?? {},
          weeklyStats: targetGameState.weeklyStats ?? {},
          tierUnlockHistory: targetGameState.tierUnlockHistory ?? {},
        });

        if (snapshot.musicLabel) {
          await tx.insert(musicLabels).values(
            convertTimestamps({
              ...snapshot.musicLabel,
              id: mapId((snapshot.musicLabel as any).id ?? undefined),
              gameId: newGameId,
            }) as any
          );
        }

        if (Array.isArray(snapshot.weeklyActions) && snapshot.weeklyActions.length > 0) {
          await tx.insert(weeklyActions).values(
            snapshot.weeklyActions.map((action) =>
              convertTimestamps({
                ...action,
                id: mapId(action.id),
                gameId: newGameId,
                targetId: mapReference(action.targetId as string | undefined),
                choiceId: mapReference(action.choiceId as string | undefined),
              })
            ) as any,
          );
        }

        if (Array.isArray(snapshot.artists) && snapshot.artists.length > 0) {
          await tx.insert(artists).values(
            snapshot.artists.map((artist) =>
              convertTimestamps({
                ...artist,
                id: mapId(artist.id),
                gameId: newGameId,
              })
            ) as any,
          );
        }

        if (Array.isArray(snapshot.projects) && snapshot.projects.length > 0) {
          await tx.insert(projects).values(
            snapshot.projects.map((project) =>
              convertTimestamps({
                ...project,
                id: mapId(project.id),
                gameId: newGameId,
                artistId: mapReference(project.artistId),
              })
            ) as any,
          );
        }

        if (Array.isArray(snapshot.roles) && snapshot.roles.length > 0) {
          await tx.insert(roles).values(
            snapshot.roles.map((role) =>
              convertTimestamps({
                ...role,
                id: mapId(role.id),
                gameId: newGameId,
              })
            ) as any,
          );
        }

        if (Array.isArray(snapshot.executives) && snapshot.executives.length > 0) {
          await tx.insert(executives).values(
            snapshot.executives.map((exec) =>
              convertTimestamps({
                ...exec,
                id: mapId(exec.id),
                gameId: newGameId,
              })
            ) as any,
          );
        }

        if (Array.isArray(snapshot.releases) && snapshot.releases.length > 0) {
          await tx.insert(releases).values(
            snapshot.releases.map((release) =>
              convertTimestamps({
                ...release,
                id: mapId(release.id),
                gameId: newGameId,
                artistId: mapReference(release.artistId),
              })
            ) as any,
          );
        }

        if (Array.isArray(snapshot.songs) && snapshot.songs.length > 0) {
          await tx.insert(songs).values(
            snapshot.songs.map((song) =>
              convertTimestamps({
                ...song,
                id: mapId(song.id),
                gameId: newGameId,
                artistId: mapReference(song.artistId),
                projectId: mapReference(song.projectId),
                releaseId: mapReference(song.releaseId),
              })
            ) as any,
          );
        }

        if (Array.isArray(snapshot.releaseSongs) && snapshot.releaseSongs.length > 0) {
          await tx.insert(releaseSongs).values(
            snapshot.releaseSongs.map((entry: any) => ({
              releaseId: mapReference(entry.releaseId) ?? entry.releaseId,
              songId: mapReference(entry.songId) ?? entry.songId,
              trackNumber: entry.trackNumber ?? 0,
              isSingle: entry.isSingle ?? false,
            })) as any,
          );
        }

        if (Array.isArray(snapshot.moodEvents) && snapshot.moodEvents.length > 0) {
          await tx.insert(moodEvents).values(
            snapshot.moodEvents.map((event) =>
              convertTimestamps({
                ...event,
                id: mapId(event.id),
                gameId: newGameId,
                artistId: mapReference(event.artistId) ?? event.artistId,
              })
            ) as any,
          );
        }

        if (Array.isArray(snapshot.emails) && snapshot.emails.length > 0) {
          await tx.insert(emails).values(
            snapshot.emails.map((email) =>
              convertTimestamps({
                ...email,
                id: mapId((email as any).id),
                gameId: newGameId,
              })
            ) as any,
          );
        }
      });

      res.json({ gameId: newGameId });
    } catch (error) {
      if ((error as any)?.code === 'INVALID_SNAPSHOT_COLLECTIONS') {
        return res.status(400).json({
          error: 'INVALID_SNAPSHOT_COLLECTIONS',
          message: 'Snapshot collections are missing required fields or are malformed',
          details: (error as any)?.details ?? [],
        });
      }
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid restore request", errors: error.errors });
      }

      console.error('[API] Failed to restore save:', error);
      res.status(500).json({ message: "Failed to restore save" });
    }
  });

  app.delete("/api/saves/:saveId", requireClerkUser, async (req, res) => {
    try {
      const deleted = await storage.deleteGameSave(req.params.saveId, req.userId!);
      if (deleted === 0) {
        return res.status(404).json({
          error: 'SAVE_NOT_FOUND',
          message: 'Save file not found or does not belong to this user',
        });
      }

      res.json({
        message: 'Save deleted successfully',
        deletedSaveId: req.params.saveId,
      });
    } catch (error) {
      console.error("Failed to delete save:", error);
      res.status(500).json({
        error: 'DELETE_SAVE_ERROR',
        message: "Failed to delete save file",
      });
    }
  });





  // REMOVED: Duplicate role endpoints - using the implementation at lines 307-362 instead

  // Dialogue endpoints (/api/dialogue/:roleType, /api/dialogue-scenes) extracted to
  // server/routes/executives.ts (PR-8), mounted via executivesRouter above.

  // Songs & Releases endpoints (13 routes) extracted to
  // server/routes/releases.ts (PR-12), mounted via releasesRouter here.
  app.use(releasesRouter);

  app.use(chartsRouter);

  // Phase 2: Turn System Endpoints
  
  // Get current game state  
  app.get("/api/game-state", requireClerkUser, async (req, res) => {
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

  app.use(tourRouter);

  // Week advancement with action processing using GameEngine and transactions
  app.post("/api/advance-week", requireClerkUser, async (req, res) => {
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

  // Save player action selections with transactions
  app.post("/api/select-actions", async (req, res) => {
    try {
      // Validate request using shared contract
      const request = validateRequest(SelectActionsRequest, req.body);
      const { gameId, selectedActions } = request;
      
      // Wrap in transaction
      const result = await db.transaction(async (tx) => {
        // Get current game state
        const [gameState] = await tx
          .select()
          .from(gameStates)
          .where(eq(gameStates.id, gameId));
        
        if (!gameState) {
          throw new Error('Game not found');
        }
        
        // Get starting values from balance configuration
        const startingValues = await serverGameData.getStartingValues();

        // Convert database gameState to proper GameState type
        const gameStateForEngine = {
          ...gameState,
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
          weeklyStats: gameState.weeklyStats ?? {}
        };
        
        // Create GameEngine instance and update action selection
        const gameEngine = new GameEngine(gameStateForEngine, serverGameData, storage);
        const updatedGameState = gameStateForEngine; // For now, just return current state
        
        // Update in database
        await tx
          .update(gameStates)
          .set({
            usedFocusSlots: updatedGameState.usedFocusSlots,
            flags: updatedGameState.flags,
            updatedAt: new Date()
          })
          .where(eq(gameStates.id, gameId));
        
        return {
          success: true,
          gameState: updatedGameState
        };
      });
      
      res.json(result);
    } catch (error) {
      console.error('Select actions error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid request data',
          error.errors
        ));
      }
      res.status(500).json(createErrorResponse(
        'SELECT_ACTIONS_ERROR',
        error instanceof Error ? error.message : 'Failed to save action selection'
      ));
    }
  });

  app.use(bugReportsRouter);

  // Register analytics routes
  app.use('/api/analytics', requireClerkUser, analyticsRouter);

  const httpServer = createServer(app);
  return httpServer;
}
