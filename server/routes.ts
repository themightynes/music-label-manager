import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import { promises as fs } from 'fs';
import path from 'path';
import { storage } from "./storage";
import { insertGameStateSchema, insertGameSaveSchema, gameSaveSnapshotSchema, insertArtistSchema, insertProjectSchema, insertWeeklyActionSchema, insertMusicLabelSchema, labelRequestSchema, gameStates, weeklyActions, projects, songs, artists, releases, releaseSongs, roles, executives, musicLabels, moodEvents, emails, type GameSaveSnapshot } from "@shared/schema";
import { z } from "zod";
import type { EmailCategory } from "@shared/types/emailTypes";
import { serverGameData } from "./data/gameData";
import { gameDataLoader } from "@shared/utils/dataLoader";
import { GameEngine } from "../shared/engine/game-engine";
import { FinancialSystem, VenueCapacityManager } from "../shared/engine/FinancialSystem";
import { ChartService } from "../shared/engine/ChartService";
import { Song } from "../shared/models/Song";
import {
  AdvanceWeekRequest,
  AdvanceWeekResponse,
  SelectActionsRequest,
  SelectActionsResponse,
  BugReportRequestSchema,
  BugReportRecordSchema,
  BugReportRecord,
  BugReportListResponseSchema,
  BugReportStatusUpdateRequestSchema,
  BugReportStatusUpdateResponseSchema,
  validateRequest,
  createErrorResponse,
  ArtistDialogueRequestSchema,
  ArtistDialogueResponse
} from "@shared/api/contracts";
import { db } from "./db";
import { eq, desc, and, sql, inArray, ne } from "drizzle-orm";
import { requireClerkUser, handleClerkWebhook, requireAdmin } from './auth';
import analyticsRouter from './routes/analytics';
import { ClerkExpressWithAuth, clerkClient } from '@clerk/clerk-sdk-node';
import {
  checkAndArchive,
  readActiveBugReports,
  searchAllReports,
  listArchiveFiles,
  readArchive,
  getBugReportStats
} from './utils/bugReportArchival';

const EMAIL_CATEGORY_VALUES = [
  "chart",
  "financial",
  "artist",
  "ar"
] as const satisfies readonly EmailCategory[];

const emailCategoryEnum = z.enum(EMAIL_CATEGORY_VALUES);

const emailQuerySchema = z.object({
  isRead: z.enum(["true", "false"]).optional(),
  category: emailCategoryEnum.optional(),
  week: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional()
});

const markEmailReadSchema = z.object({
  isRead: z.boolean()
});

export async function registerRoutes(app: Express): Promise<Server> {

  // Clerk webhooks
  app.post('/api/webhooks/clerk', handleClerkWebhook);
  
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Email endpoints
  app.get('/api/game/:gameId/emails', requireClerkUser, async (req, res) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const { gameId } = req.params;
      const queryParams = emailQuerySchema.parse(req.query);

      console.log('[API] GET /emails - Query params:', queryParams);

      const [gameOwnership] = await db
        .select({ id: gameStates.id })
        .from(gameStates)
        .where(and(eq(gameStates.id, gameId), eq(gameStates.userId, userId)))
        .limit(1);

      if (!gameOwnership) {
        return res.status(403).json({
          error: 'UNAUTHORIZED',
          message: 'You do not have permission to access this game'
        });
      }

      const storageParams = {
        isRead: typeof queryParams.isRead === 'string' ? queryParams.isRead === 'true' : undefined,
        category: queryParams.category,
        week: queryParams.week,
        limit: queryParams.limit,
        offset: queryParams.offset
      };

      console.log('[API] Calling storage.getEmailsByGame with:', storageParams);

      const result = await storage.getEmailsByGame(gameId, storageParams);

      console.log('[API] Storage returned:', { total: result.total, emailCount: result.emails.length });

      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Invalid query parameters',
          errors: error.errors
        });
      }
      console.error('[API] Failed to fetch emails:', error);
      res.status(500).json({ message: 'Failed to fetch emails' });
    }
  });

  app.get('/api/game/:gameId/emails/unread-count', requireClerkUser, async (req, res) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const { gameId } = req.params;

      const [gameOwnership] = await db
        .select({ id: gameStates.id })
        .from(gameStates)
        .where(and(eq(gameStates.id, gameId), eq(gameStates.userId, userId)))
        .limit(1);

      if (!gameOwnership) {
        return res.status(403).json({
          error: 'UNAUTHORIZED',
          message: 'You do not have permission to access this game'
        });
      }

      const result = await storage.getEmailsByGame(gameId, {
        isRead: false,
        limit: 1,
        offset: 0
      });

      res.json({ count: result.unreadCount });
    } catch (error) {
      console.error('[API] Failed to fetch unread email count:', error);
      res.status(500).json({ message: 'Failed to fetch unread email count' });
    }
  });

  app.patch('/api/game/:gameId/emails/:emailId/read', requireClerkUser, async (req, res) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const { gameId, emailId } = req.params;
      const body = markEmailReadSchema.parse(req.body);

      const [gameOwnership] = await db
        .select({ id: gameStates.id })
        .from(gameStates)
        .where(and(eq(gameStates.id, gameId), eq(gameStates.userId, userId)))
        .limit(1);

      if (!gameOwnership) {
        return res.status(403).json({
          error: 'UNAUTHORIZED',
          message: 'You do not have permission to access this game'
        });
      }

      const email = await storage.markEmailRead(gameId, emailId, body.isRead);
      res.json({ success: true, email });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Invalid request body',
          errors: error.errors
        });
      }

      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ message: 'Email not found' });
      }

      console.error('[API] Failed to update email read status:', error);
      res.status(500).json({ message: 'Failed to update email read status' });
    }
  });

  app.delete('/api/game/:gameId/emails/:emailId', requireClerkUser, async (req, res) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const { gameId, emailId } = req.params;

      const [gameOwnership] = await db
        .select({ id: gameStates.id })
        .from(gameStates)
        .where(and(eq(gameStates.id, gameId), eq(gameStates.userId, userId)))
        .limit(1);

      if (!gameOwnership) {
        return res.status(403).json({
          error: 'UNAUTHORIZED',
          message: 'You do not have permission to access this game'
        });
      }

      const existingEmail = await storage.getEmailById(gameId, emailId);
      if (!existingEmail) {
        return res.status(404).json({ message: 'Email not found' });
      }

      await storage.deleteEmail(gameId, emailId);
      res.json({ success: true });
    } catch (error) {
      console.error('[API] Failed to delete email:', error);
      res.status(500).json({ message: 'Failed to delete email' });
    }
  });

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

  // Admin-only test endpoint
  app.get('/api/admin/health', requireClerkUser, requireAdmin, (req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  // Debug endpoint to test data loading
  app.get('/api/debug/data-load', requireClerkUser, async (req, res) => {
    const results: any = {};
    
    try {
      // Test loading each file individually
      const loader = gameDataLoader;
      
      try {
        results.artists = await loader.loadArtistsData();
        results.artistsStatus = 'OK';
      } catch (e: any) {
        results.artistsError = e.message;
      }
      
      try {
        results.balance = await loader.loadBalanceData();
        results.balanceStatus = 'OK';
      } catch (e: any) {
        results.balanceError = e.message;
      }
      
      try {
        results.world = await loader.loadWorldData();
        results.worldStatus = 'OK';
      } catch (e: any) {
        results.worldError = e.message;
      }
      
      try {
        results.dialogue = await loader.loadDialogueData();
        results.dialogueStatus = 'OK';
      } catch (e: any) {
        results.dialogueError = e.message;
      }
      
      try {
        results.events = await loader.loadEventsData();
        results.eventsStatus = 'OK';
      } catch (e: any) {
        results.eventsError = e.message;
      }
      
      try {
        results.roles = await loader.loadRolesData();
        results.rolesStatus = 'OK';
      } catch (e: any) {
        results.rolesError = e.message;
      }
      
      try {
        results.actions = await loader.loadActionsData();
        results.actionsStatus = 'OK';
      } catch (e: any) {
        results.actionsError = e.message;
      }
      
      res.json({
        success: true,
        results
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        results
      });
    }
  });
  
  // Data verification endpoints
  app.get("/api/test-data", requireClerkUser, async (req, res) => {
    try {
      await serverGameData.initialize();
      
      const [allRoles, allArtists, allEvents] = await Promise.all([
        serverGameData.getAllRoles(),
        serverGameData.getAllArtists(), 
        serverGameData.getAllEvents()
      ]);

      const sampleRole = allRoles[0];
      
      res.json({
        counts: {
          roles: allRoles.length,
          artists: allArtists.length,
          events: allEvents.length
        },
        sample: {
          role: {
            name: sampleRole?.name || 'No role found',
            relationship: sampleRole?.relationship || 0
          }
        },
        status: 'Data loaded successfully'
      });
    } catch (error) {
      console.error('Test data loading error:', error);
      res.status(500).json({ 
        message: "Failed to load test data", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/validate-types", requireClerkUser, async (req, res) => {
    try {
      await serverGameData.initialize();
      
      const [sampleRole, sampleArtist] = await Promise.all([
        serverGameData.getRoleById('manager'),
        serverGameData.getArtistsByArchetype('Visionary')
      ]);
      
      const validationResults = {
        role: {
          found: !!sampleRole,
          data: sampleRole || null,
          hasValidStructure: sampleRole ? (
            typeof sampleRole.id === 'string' &&
            typeof sampleRole.name === 'string' &&
            typeof sampleRole.relationship === 'number' &&
            Array.isArray(sampleRole.meetings)
          ) : false
        },
        artist: {
          found: sampleArtist && sampleArtist.length > 0,
          data: sampleArtist?.[0] || null,
          hasValidStructure: sampleArtist?.[0] ? (
            typeof sampleArtist[0].id === 'string' &&
            typeof sampleArtist[0].name === 'string' &&
            typeof sampleArtist[0].archetype === 'string' &&
            typeof sampleArtist[0].talent === 'number'
          ) : false
        }
      };
      
      const dataIntegrityCheck = await serverGameData.validateDataIntegrity();
      
      res.json({
        validation: validationResults,
        integrity: dataIntegrityCheck,
        status: 'Type validation complete'
      });
    } catch (error) {
      console.error('Type validation error:', error);
      res.status(500).json({ 
        message: "Failed to validate types", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
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
      const { labelData, ...gameStateData } = req.body;
      const validatedData = insertGameStateSchema.parse(gameStateData);
      console.log('📝 [GAME CREATION] Validated data reputation:', validatedData.reputation);

      // Validate label data if provided
      let validatedLabelData = null;
      if (labelData) {
        validatedLabelData = labelRequestSchema.parse(labelData);
      }

      // Ensure serverGameData is initialized before accessing balance config
      await serverGameData.initialize();

      // Set starting values from balance.json configuration
      const startingValues = await serverGameData.getStartingValues();
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

  // Get available artists for discovery
  app.get("/api/artists/available", async (req, res) => {
    try {
      await serverGameData.initialize();
      const allArtists = await serverGameData.getAllArtists();
      res.json({ artists: allArtists || [] });
    } catch (error) {
      console.error('Failed to load available artists:', error);
      res.status(500).json({ error: 'Failed to load available artists' });
    }
  });

  // ========================= A&R OFFICE ENDPOINTS =========================
  // Start an A&R sourcing operation
  app.post('/api/game/:gameId/ar-office/start', requireClerkUser, async (req, res) => {
    try {
      const { gameId } = req.params;
      const { sourcingType, primaryGenre, secondaryGenre } = req.body || {};
      const gameState = await storage.getGameState(gameId);
      if (!gameState) return res.status(404).json({ message: 'Game not found' });

      // Validate sourcingType
      const validSourcingTypes = ['active', 'passive', 'specialized'];
      if (!sourcingType || !validSourcingTypes.includes(sourcingType)) {
        return res.status(400).json({
          message: `Invalid sourcing type. Must be one of: ${validSourcingTypes.join(', ')}`,
          received: sourcingType,
          valid: validSourcingTypes
        });
      }

      const total = gameState.focusSlots || 3;
      const used = gameState.usedFocusSlots || 0;

      // Disallow starting if an operation is already active
      if (gameState.arOfficeSlotUsed) {
        return res.status(400).json({ message: 'A&R operation already in progress' });
      }

      // Validate available slot capacity
      if (used >= total) {
        return res.status(400).json({ message: 'No focus slots available', used, total });
      }

      const newUsed = Math.min(total, used + 1);

      // Track the start week in flags for completion validation
      const flags = (gameState.flags || {}) as any;
      flags.ar_office_start_week = gameState.currentWeek || 1;
      // NOTE: Keep previous discovered artists - new discoveries will be added to the pool

      const updated = await storage.updateGameState(gameId, {
        arOfficeSlotUsed: true,
        arOfficeSourcingType: sourcingType || 'active',
        arOfficePrimaryGenre: primaryGenre || null,
        arOfficeSecondaryGenre: secondaryGenre || null,
        arOfficeOperationStart: Date.now(),
        usedFocusSlots: newUsed,
        flags
      });

      console.log('[A&R] Started operation with genre filters:', { sourcingType, primaryGenre, secondaryGenre });

      return res.json({ success: true, status: {
        arOfficeSlotUsed: updated.arOfficeSlotUsed || false,
        arOfficeSourcingType: (updated as any).arOfficeSourcingType || null,
        arOfficePrimaryGenre: (updated as any).arOfficePrimaryGenre || null,
        arOfficeSecondaryGenre: (updated as any).arOfficeSecondaryGenre || null,
        arOfficeOperationStart: (updated as any).arOfficeOperationStart || null,
        usedFocusSlots: updated.usedFocusSlots || newUsed,
        focusSlots: updated.focusSlots || total
      }});
    } catch (error) {
      console.error('[A&R] Start operation error:', error);
      res.status(500).json({ message: 'Failed to start A&R operation' });
    }
  });


  // Cancel an A&R sourcing operation
  app.post('/api/game/:gameId/ar-office/cancel', requireClerkUser, async (req, res) => {
    try {
      const { gameId } = req.params;
      const gameState = await storage.getGameState(gameId);
      if (!gameState) return res.status(404).json({ message: 'Game not found' });

      const used = gameState.usedFocusSlots || 0;
      const newUsed = gameState.arOfficeSlotUsed ? Math.max(0, used - 1) : used;

      // Clear only operation-related flags on cancel (keep discovered artists)
      const flags = (gameState.flags || {}) as any;
      delete flags.ar_office_start_week;
      // NOTE: Keep ar_office_discovered_artists array - only clearing current operation state

      const updated = await storage.updateGameState(gameId, {
        arOfficeSlotUsed: false,
        arOfficeSourcingType: null,
        arOfficePrimaryGenre: null,
        arOfficeSecondaryGenre: null,
        usedFocusSlots: newUsed,
        flags
      });

      return res.json({ success: true, status: {
        arOfficeSlotUsed: updated.arOfficeSlotUsed || false,
        arOfficeSourcingType: (updated as any).arOfficeSourcingType || null,
        arOfficePrimaryGenre: null,
        arOfficeSecondaryGenre: null,
        usedFocusSlots: updated.usedFocusSlots || newUsed
      }});
    } catch (error) {
      console.error('[A&R] Cancel operation error:', error);
      res.status(500).json({ message: 'Failed to cancel A&R operation' });
    }
  });

  // Get current A&R status
  app.get('/api/game/:gameId/ar-office/status', requireClerkUser, async (req, res) => {
    try {
      const { gameId } = req.params;
      const gameState = await storage.getGameState(gameId);
      if (!gameState) return res.status(404).json({ message: 'Game not found' });

      return res.json({
        arOfficeSlotUsed: gameState.arOfficeSlotUsed || false,
        arOfficeSourcingType: (gameState as any).arOfficeSourcingType || null,
        arOfficeOperationStart: (gameState as any).arOfficeOperationStart || null,
      });
    } catch (error) {
      console.error('[A&R] Status error:', error);
      res.status(500).json({ message: 'Failed to fetch A&R status' });
    }
  });

  // Get discovered artists for A&R (returns the persisted pick when operation is complete)
  app.get('/api/game/:gameId/ar-office/artists', requireClerkUser, async (req, res) => {
    try {
      const { gameId } = req.params;
      console.log('[A&R DEBUG] Backend: Getting discovered artists for game:', gameId);
      const gameState = await storage.getGameState(gameId);
      if (!gameState) {
        console.log('[A&R DEBUG] Backend: Game not found');
        return res.status(404).json({ message: 'Game not found' });
      }

      // Initialize game data - if this fails, return empty list instead of 500 error
      try {
        await serverGameData.initialize();
      } catch (initError) {
        console.error('[A&R] Failed to initialize game data:', initError);
        return res.json({
          artists: [],
          metadata: {
            error: 'Failed to load game data',
            details: initError instanceof Error ? initError.message : String(initError)
          }
        });
      }

      console.log('[A&R DEBUG] Backend: A&R slot used:', gameState.arOfficeSlotUsed);
      console.log('[A&R DEBUG] Backend: A&R sourcing type:', (gameState as any).arOfficeSourcingType);

      // If operation is active, no artists yet
      if (gameState.arOfficeSlotUsed) {
        console.log('[A&R DEBUG] Backend: Operation active, returning empty list');
        return res.json({
          artists: [],
          metadata: {
            operationActive: true,
            sourcingType: (gameState as any).arOfficeSourcingType
          }
        });
      }

      // Enhanced flags reading and validation
      const flags = (gameState.flags || {}) as any;
      console.log('[A&R DEBUG] Backend: Full flags object:', JSON.stringify(flags, null, 2));

      // Check for new discovered artists array (preferred method)
      let discoveredArtistsArray = flags.ar_office_discovered_artists || [];
      const legacyArtistId = flags.ar_office_discovered_artist_id; // backwards compatibility
      const legacyArtistInfo = flags.ar_office_discovered_artist_info;

      console.log('[A&R DEBUG] Backend: Discovered artists array:', discoveredArtistsArray.length, 'artists');
      console.log('[A&R DEBUG] Backend: Legacy artist ID:', legacyArtistId);

      // Migrate legacy format to new array format if needed
      if (legacyArtistId && legacyArtistInfo && discoveredArtistsArray.length === 0) {
        console.log('[A&R DEBUG] Backend: Migrating legacy artist to array format');
        discoveredArtistsArray = [{
          id: legacyArtistId,
          name: legacyArtistInfo.name,
          archetype: legacyArtistInfo.archetype,
          talent: legacyArtistInfo.talent,
          popularity: legacyArtistInfo.popularity,
          genre: legacyArtistInfo.genre,
          discoveryTime: flags.ar_office_discovery_time,
          sourcingType: flags.ar_office_sourcing_type
        }];

        // Update flags with migrated data
        flags.ar_office_discovered_artists = discoveredArtistsArray;
        await storage.updateGameState(gameId, { flags });
        console.log('[A&R DEBUG] Backend: Migration complete, saved to database');
      }

      if (discoveredArtistsArray.length > 0) {
        // Return all discovered artists
        let allGameArtists;
        try {
          allGameArtists = await serverGameData.getAllArtists();
          console.log('[A&R DEBUG] Backend: Loaded', allGameArtists?.length, 'total game artists');
        } catch (artistLoadError) {
          console.error('[A&R] Failed to load game artists:', artistLoadError);
          // Return the discovered artist data we have in flags without enrichment
          return res.json({
            artists: discoveredArtistsArray.map((a: any) => ({
              ...a,
              isFallback: true,
              loadError: 'Could not enrich with full artist data'
            })),
            metadata: {
              totalDiscovered: discoveredArtistsArray.length,
              isDiscoveredCollection: true,
              enrichmentFailed: true,
              discoveryTime: flags.ar_office_discovery_time,
              sourcingType: flags.ar_office_sourcing_type
            }
          });
        }

        // Filter out artists already signed to this game by name
        const signedForGame = await storage.getArtistsByGame(gameId);
        const signedNames = new Set((signedForGame || []).map(a => String(a.name || '').toLowerCase()))
        const filteredDiscovered = discoveredArtistsArray.filter((a: any) => !signedNames.has(String(a?.name || '').toLowerCase()));

        const discoveredArtists = filteredDiscovered.map((discoveredArtist: any) => {
          // First try to find the full artist data
          const fullArtist = allGameArtists.find((a: any) => a.id === discoveredArtist.id);

          if (fullArtist) {
            // Return full artist data with discovery metadata
            return {
              ...fullArtist,
              discoveryTime: discoveredArtist.discoveryTime,
              discoveredVia: discoveredArtist.sourcingType
            };
          } else {
            // Fallback to stored artist info if full data not found
            return {
              id: discoveredArtist.id,
              name: discoveredArtist.name || 'Unknown Artist',
              archetype: discoveredArtist.archetype || 'Unknown',
              talent: discoveredArtist.talent || 0,
              popularity: discoveredArtist.popularity || 0,
              genre: discoveredArtist.genre || null,
              discoveryTime: discoveredArtist.discoveryTime,
              discoveredVia: discoveredArtist.sourcingType,
              isFallback: true
            };
          }
        });

        console.log('[A&R DEBUG] Backend: Returning', discoveredArtists.length, 'discovered artists');

        return res.json({
          artists: discoveredArtists,
          metadata: {
            totalDiscovered: discoveredArtists.length,
            isDiscoveredCollection: true,
            discoveryTime: flags.ar_office_discovery_time,
            sourcingType: flags.ar_office_sourcing_type
          }
        });
      } else if (legacyArtistId) {
        // Backwards compatibility: handle single legacy artist
        let allArtists;
        try {
          allArtists = await serverGameData.getAllArtists();
          console.log('[A&R DEBUG] Backend: Loaded', allArtists?.length, 'total artists for legacy mode');
        } catch (artistLoadError) {
          console.error('[A&R] Failed to load game artists for legacy mode:', artistLoadError);
          // Return fallback artist info if we can't load full data
          if (legacyArtistInfo) {
            return res.json({
              artists: [{
                id: legacyArtistId,
                name: legacyArtistInfo.name || 'Unknown Artist',
                archetype: legacyArtistInfo.archetype || 'Unknown',
                talent: legacyArtistInfo.talent || 50,
                popularity: legacyArtistInfo.popularity || 0,
                genre: legacyArtistInfo.genre || null,
                isFallback: true,
                loadError: 'Could not load full artist data'
              }],
              metadata: {
                isLegacyFallback: true,
                enrichmentFailed: true,
                discoveryTime: flags.ar_office_discovery_time,
                sourcingType: flags.ar_office_sourcing_type
              }
            });
          }
          // If no legacy info available, return empty
          return res.json({
            artists: [],
            metadata: {
              error: 'Could not load artist data',
              enrichmentFailed: true
            }
          });
        }

        const artist = (allArtists || []).find((a: any) => a.id === legacyArtistId);
        console.log('[A&R DEBUG] Backend: Found legacy artist for ID:', artist?.name || 'none');

        if (artist) {
          // Validate artist has all required fields
          const requiredFields = ['id', 'name', 'archetype', 'talent', 'popularity'];
          const missingFields = requiredFields.filter(field => (artist as any)[field] === undefined || (artist as any)[field] === null);

          if (missingFields.length > 0) {
            console.warn('[A&R DEBUG] Backend: Artist missing required fields:', missingFields);
            // Add fallback values for missing fields
            const enrichedArtist = {
              ...artist,
              talent: artist.talent ?? 50,
              popularity: artist.popularity ?? 0,
              archetype: artist.archetype ?? 'Unknown'
            };
            return res.json({
              artists: [enrichedArtist],
              metadata: {
                missingFields,
                enriched: true,
                discoveryTime: flags.ar_office_discovery_time
              }
            });
          }

          return res.json({
            artists: [artist],
            metadata: {
              discoveryTime: flags.ar_office_discovery_time,
              sourcingType: flags.ar_office_sourcing_type,
              isOriginalDiscovery: true,
              discoveredArtistId: legacyArtistId
            }
          });
        } else {
          // Artist ID not found in current data - fallback mechanism
          console.warn('[A&R DEBUG] Backend: Artist ID not found in current data, generating fallback');

          // Select a new random artist as fallback
          const unsignedArtists = (allArtists || []).filter((a: any) => !a.signed);
          if (unsignedArtists.length > 0) {
            const fallbackArtist = unsignedArtists[Math.floor(Math.random() * unsignedArtists.length)];

            // Update flags with new artist ID
            const updatedFlags = { ...flags, ar_office_discovered_artist_id: fallbackArtist.id };
            await storage.updateGameState(gameId, { flags: updatedFlags });

            console.log('[A&R DEBUG] Backend: Updated flags with fallback artist:', fallbackArtist.id);

            return res.json({
              artists: [fallbackArtist],
              metadata: {
                isFallback: true,
                isOriginalDiscovery: false,
                originalDiscoveredArtistId: legacyArtistId,
                discoveredArtistId: fallbackArtist.id,
                fallbackReason: 'Original artist not found in current data',
                discoveryTime: flags.ar_office_discovery_time,
                sourcingType: flags.ar_office_sourcing_type,
                warning: 'The artist shown differs from the one in the weekly summary due to data changes'
              }
            });
          }

          console.warn('[A&R DEBUG] Backend: No unsigned artists available for fallback');
          return res.json({
            artists: [],
            metadata: {
              error: 'Artist not found and no fallback available',
              isOriginalDiscovery: false,
              originalDiscoveredArtistId: legacyArtistId,
              discoveredArtistId: null,
              fallbackReason: 'Original artist not found and no unsigned artists available',
              warning: 'No artist available - the weekly summary may show a different result'
            }
          });
        }
      }

      // No persisted result yet (operation not completed properly) - return empty list
      console.log('[A&R DEBUG] Backend: No persisted artist, returning empty list');
      return res.json({
        artists: [],
        metadata: {
          noPersistedResult: true,
          hasFlags: Object.keys(flags).length > 0
        }
      });
    } catch (error) {
      console.error('[A&R] Get discovered artists error:', error);

      // Enhanced error response with details
      const errorDetails = {
        message: 'Failed to fetch discovered artists',
        type: error instanceof Error ? error.constructor.name : 'Unknown',
        details: error instanceof Error ? error.message : String(error)
      };

      res.status(500).json(errorDetails);
    }
  });

  // Get available weekly actions with enriched role data and categories
  app.get("/api/actions/weekly", requireClerkUser, async (req, res) => {
    try {
      await serverGameData.initialize();
      const actionsData = await serverGameData.getWeeklyActionsWithCategories();
      const roles = await serverGameData.getAllRoles();
      
      // Enrich actions with role meeting data
      const enrichedActions = actionsData.actions.map((action: any) => {
        if (action.type === 'role_meeting' && action.role_id) {
          const role = roles.find(r => r.id === action.role_id);
          if (role && role.meetings && role.meetings.length > 0) {
            return {
              ...action,
              firstMeetingId: role.meetings[0].id,
              availableMeetings: role.meetings.length
            };
          }
        }
        return action;
      });
      
      res.json({ 
        actions: enrichedActions || [],
        categories: actionsData.categories || []
      });
    } catch (error) {
      console.error('Failed to load weekly actions:', error);
      res.status(500).json({ error: 'Failed to load weekly actions' });
    }
  });

  // Get role/executive data with all their meetings
  // Following the rule: JSON = Content & Config, Database = State & Saves
  app.get("/api/roles/:roleId", requireClerkUser, async (req, res) => {
    try {
      // Use serverGameData to load data properly
      await serverGameData.initialize();
      const rolesData = await serverGameData.getAllRoles();
      const role = rolesData.find((r: any) => r.id === req.params.roleId);
      
      if (!role) {
        return res.status(404).json({ error: `Role ${req.params.roleId} not found` });
      }
      
      // Load actions using serverGameData
      const actionsData = await serverGameData.getWeeklyActionsWithCategories();
      const roleMeetings = actionsData.actions.filter((action: any) => 
        action.type === 'role_meeting' && 
        action.role_id === req.params.roleId
      );
      
      console.log(`Found ${roleMeetings.length} meetings for role ${req.params.roleId}`);
      
      res.json({
        ...role,
        meetings: roleMeetings
      });
    } catch (error: any) {
      console.error('Failed to load role:', error);
      res.status(500).json({ 
        error: 'Failed to load role data',
        details: error.message || 'Unknown error',
        roleId: req.params.roleId
      });
    }
  });

  // Get specific meeting data for a role
  // Following the rule: JSON = Content & Config, Database = State & Saves
  app.get("/api/roles/:roleId/meetings/:meetingId", requireClerkUser, async (req, res) => {
    try {
      // Use the same serverGameData methods that work elsewhere
      await serverGameData.initialize();
      const actionsData = await serverGameData.getWeeklyActionsWithCategories();
      
      // Find the meeting in actions (getWeeklyActionsWithCategories returns actions array)
      const meeting = actionsData.actions.find((action: any) => 
        action.type === 'role_meeting' && 
        action.role_id === req.params.roleId && 
        action.id === req.params.meetingId
      );
      
      console.log('Looking for meeting:', req.params.meetingId, 'for role:', req.params.roleId);
      console.log('Found meeting:', meeting ? 'Yes' : 'No');
      if (meeting) {
        console.log('Meeting data:', JSON.stringify(meeting, null, 2));
      }
      
      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }
      
      // Return the meeting data in the format DialogueModal expects
      res.json({
        id: meeting.id,
        prompt: meeting.prompt || '',
        choices: meeting.choices || []
      });
    } catch (error) {
      console.error('Failed to load meeting:', error);
      res.status(500).json({ error: 'Failed to load meeting data' });
    }
  });

  // Get executives for a game
  app.get("/api/game/:gameId/executives", requireClerkUser, async (req, res) => {
    try {
      const { gameId } = req.params;
      console.log('[ROUTES] Fetching executives for game:', gameId);
      
      const executives = await storage.getExecutivesByGame(gameId);
      console.log('[ROUTES] Found executives:', executives.length);
      
      res.json(executives);
    } catch (error) {
      console.error('[ROUTES] Error fetching executives:', error);
      res.status(500).json({ message: "Failed to fetch executives" });
    }
  });

  // Process executive action/decision (Week 2 Task)
  app.post("/api/game/:gameId/executive/:execId/action", requireClerkUser, async (req, res) => {
    try {
      const { gameId, execId } = req.params;
      const { actionId, meetingId, choiceId, metadata } = req.body;
      
      // Get the game state
      const gameState = await storage.getGameState(gameId);
      if (!gameState) {
        return res.status(404).json({ message: "Game not found" });
      }
      
      // Store the executive action as a selected action for the week
      const executiveAction = {
        actionType: 'role_meeting' as const,
        targetId: execId,
        metadata: {
          roleId: metadata?.roleId || 'unknown',
          actionId: actionId,
          choiceId: choiceId,
          executiveId: execId,
          ...metadata
        }
      };

      // Check if focus slots are available
      const usedSlots = gameState.usedFocusSlots || 0;
      const totalSlots = gameState.focusSlots || 3;

      if (usedSlots >= totalSlots) {
        return res.status(400).json({
          message: "No focus slots available",
          usedSlots,
          totalSlots
        });
      }

      // NOTE: Executive mood/loyalty processing now handled during week advancement
      // This ensures single source of truth and prevents duplicate processing

      // Update the used focus slots count
      gameState.usedFocusSlots = usedSlots + 1;

      // Save the updated game state
      await storage.updateGameState(gameId, {
        ...gameState,
        flags: gameState.flags as any, // Type assertion to handle unknown -> Json conversion
        weeklyStats: gameState.weeklyStats as any, // Type assertion to handle unknown -> Json conversion
        tierUnlockHistory: gameState.tierUnlockHistory as any // Type assertion to handle unknown -> Json conversion
      });

      // Return success response with updated state
      res.json({
        success: true,
        executiveId: execId,
        actionId: actionId,
        gameId: gameId,
        week: gameState.currentWeek,
        usedSlots: gameState.usedFocusSlots,
        totalSlots: totalSlots,
        message: "Executive action processed successfully"
      });
    } catch (error) {
      console.error('Failed to process executive action:', error);
      res.status(500).json({ message: "Failed to process executive action" });
    }
  });

  // ========================================
  // Artist Dialogue Endpoint
  // ========================================

  app.post("/api/game/:gameId/artist-dialogue", requireClerkUser, async (req, res) => {
    try {
      // 1. Extract and validate request data
      const { gameId } = req.params;
      const requestBody = req.body;

      const validationResult = ArtistDialogueRequestSchema.safeParse(requestBody);
      if (!validationResult.success) {
        console.error('Artist dialogue validation failed:', validationResult.error);
        return res.status(400).json({
          success: false,
          message: "Invalid request data",
          details: validationResult.error.errors
        });
      }

      const { artistId, sceneId, choiceId } = validationResult.data;
      console.log(`Processing artist dialogue - Game: ${gameId}, Artist: ${artistId}, Scene: ${sceneId}, Choice: ${choiceId}`);

      // 2. Validate game and artist
      const gameState = await storage.getGameState(gameId);
      if (!gameState) {
        return res.status(404).json({
          success: false,
          message: "Game not found"
        });
      }

      const artist = await storage.getArtist(artistId);
      if (!artist) {
        return res.status(404).json({
          success: false,
          message: "Artist not found"
        });
      }

      if (artist.gameId !== gameId) {
        return res.status(400).json({
          success: false,
          message: "Artist does not belong to this game"
        });
      }

      // 3. Load and validate dialogue choice
      await serverGameData.initialize();
      const choice = await serverGameData.getDialogueChoiceById(sceneId, choiceId);

      if (!choice) {
        return res.status(400).json({
          success: false,
          message: "Invalid dialogue choice"
        });
      }

      console.log('Loaded dialogue choice:', { sceneId, choiceId, choice });

      // Helper function to clamp values
      const clamp = (value: number, min: number, max: number): number => {
        return Math.max(min, Math.min(max, value));
      };

      // 4. Apply immediate effects to database
      const effectsImmediate = choice.effects_immediate || {};
      const effectsApplied: Record<string, number> = {};
      const gamePatch: Record<string, number> = {};

      for (const [effectKey, effectValue] of Object.entries(effectsImmediate)) {
        if (typeof effectValue !== 'number') {
          continue;
        }

        console.log(`Applying immediate effect: ${effectKey} = ${effectValue}`);

        if (effectKey === 'artist_mood') {
          const current = artist.mood ?? 50;
          const newMood = clamp(current + Number(effectValue), 0, 100);
          await storage.updateArtist(artistId, { mood: newMood });
          effectsApplied[effectKey] = Number(effectValue);
        } else if (effectKey === 'artist_energy') {
          const current = artist.energy ?? 50;
          const newEnergy = clamp(current + Number(effectValue), 0, 100);
          await storage.updateArtist(artistId, { energy: newEnergy });
          effectsApplied[effectKey] = Number(effectValue);
        } else if (effectKey === 'artist_popularity') {
          const current = artist.popularity ?? 50;
          const newPopularity = clamp(current + Number(effectValue), 0, 100);
          await storage.updateArtist(artistId, { popularity: newPopularity });
          effectsApplied[effectKey] = Number(effectValue);
        } else if (effectKey === 'money') {
          gamePatch.money = (gameState.money ?? 0) + Number(effectValue);
          effectsApplied[effectKey] = Number(effectValue);
        } else if (effectKey === 'reputation') {
          gamePatch.reputation = clamp((gameState.reputation ?? 0) + Number(effectValue), 0, 100);
          effectsApplied[effectKey] = Number(effectValue);
        } else if (effectKey === 'creative_capital') {
          gamePatch.creativeCapital = (gameState.creativeCapital ?? 0) + Number(effectValue);
          effectsApplied[effectKey] = Number(effectValue);
        }
      }

      // Apply batched game state updates
      if (Object.keys(gamePatch).length > 0) {
        await storage.updateGameState(gameId, gamePatch as any);
      }

      // 5. Store delayed effects in game state flags
      const effectsDelayed = choice.effects_delayed || {};

      if (Object.keys(effectsDelayed).length > 0) {
        const flags = (gameState.flags || {}) as Record<string, any>;
        const delayedKey = `dialogue-${artistId}-${sceneId}-${choiceId}-${Date.now()}`;

        flags[delayedKey] = {
          triggerWeek: (gameState.currentWeek ?? 1) + 1,
          effects: effectsDelayed,
          artistId
        };

        await storage.updateGameState(gameId, { flags: flags as any });
        console.log('Stored delayed effects:', { delayedKey, effects: effectsDelayed, artistId });
      }

      // 6. Return success response
      const response: ArtistDialogueResponse = {
        success: true,
        artistId,
        artistName: artist.name,
        sceneId,
        choiceId,
        effects: effectsApplied,
        delayedEffects: effectsDelayed,
        message: "Conversation completed successfully"
      };

      console.log('Artist dialogue processed successfully:', response);
      res.json(response);

    } catch (error) {
      console.error('Failed to process artist dialogue:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to process artist dialogue"
      });
    }
  });

  // Get project types and configuration
  app.get("/api/project-types", requireClerkUser, async (req, res) => {
    try {
      await serverGameData.initialize();
      const projectTypes = await serverGameData.getProjectTypes();
      res.json({ projectTypes: projectTypes || {} });
    } catch (error) {
      console.error('Failed to load project types:', error);
      res.status(500).json({ error: 'Failed to load project types' });
    }
  });

  // Calculate budget info for project creation
  app.post("/api/budget-calculation", requireClerkUser, async (req, res) => {
    try {
      await serverGameData.initialize();
      const {
        budgetPerSong,
        projectType = 'Single',
        producerTier = 'local',
        timeInvestment = 'standard',
        songCount = 1
      } = req.body;

      if (!budgetPerSong || budgetPerSong <= 0) {
        return res.json({
          error: 'Invalid budget',
          budgetMultiplier: 1.0,
          efficiencyRating: { rating: "Unknown", description: "Enter budget to see efficiency", color: "text-gray-400" }
        });
      }

      // Create FinancialSystem for budget calculations
      await serverGameData.initialize();
      const financialSystem = new FinancialSystem(serverGameData, () => Math.random());

      // Calculate budget multiplier
      const budgetMultiplier = financialSystem.calculateBudgetQualityMultiplier(
        budgetPerSong,
        projectType,
        producerTier,
        timeInvestment,
        songCount
      );

      // Get efficiency rating
      const efficiencyRating = financialSystem.getBudgetEfficiencyRating(
        budgetPerSong,
        projectType,
        producerTier,
        timeInvestment,
        songCount
      );

      // Calculate minimum viable cost
      const minimumViableCost = financialSystem.calculateDynamicMinimumViableCost(
        projectType,
        producerTier,
        timeInvestment,
        songCount
      );

      res.json({
        budgetMultiplier,
        efficiencyRating,
        minimumViableCost
      });
    } catch (error) {
      console.error('Failed to calculate budget:', error);
      res.status(500).json({ error: 'Failed to calculate budget' });
    }
  });

  // Artist routes
  app.post("/api/game/:gameId/artists", requireClerkUser, async (req, res) => {
    try {
      const gameId = req.params.gameId;
      const signingCost = req.body.signingCost || 0;
      
      // Get current game state to check money
      const gameState = await storage.getGameState(gameId);
      if (!gameState) {
        return res.status(404).json({ message: "Game not found" });
      }
      
      // Check if player has enough money
      if ((gameState.money || 0) < signingCost) {
        return res.status(400).json({ message: "Insufficient funds to sign artist" });
      }

      // Prevent duplicate signings by name (case-insensitive) within the same game
      const existing = await storage.getArtistsByGame(gameId);
      const incomingName = String(req.body?.name || '').toLowerCase();
      if (incomingName && existing.some(a => (a.name || '').toLowerCase() === incomingName)) {
        return res.status(409).json({ code: 'DUPLICATE_ARTIST', message: 'This artist is already signed to your roster.' });
      }
      
      // Prepare artist data
      const validatedData = insertArtistSchema.parse({
        ...req.body,
        gameId: gameId,
        weeklyCost: req.body.weeklyCost || 1200 // Store weekly cost from JSON data
      });
      
      // Create artist and deduct money in a transaction-like operation
      const artist = await storage.createArtist(validatedData);
      
      // Update game state to deduct signing cost and track artist count
      if (signingCost > 0) {
        await storage.updateGameState(gameId, {
          money: Math.max(0, (gameState.money || 0) - signingCost)
        });
      }
      
      // Update artist count flag for GameEngine weekly costs
      const currentArtists = await storage.getArtistsByGame(gameId);
      const flags = (gameState.flags || {}) as any;
      (flags as any)['signed_artists_count'] = currentArtists.length + 1; // +1 for the new artist

      if (signingCost > 0) {
        const signingEvent = {
          artistId: artist.id,
          name: artist.name,
          amount: signingCost,
          week: gameState.currentWeek || 1,
          recordedAt: new Date().toISOString(),
        };

        if (!Array.isArray(flags.pending_signing_fees)) {
          flags.pending_signing_fees = [];
        }
        flags.pending_signing_fees.push(signingEvent);
      }
      
      // Remove this artist from discovered collections using discovered (content) ID or name
      if (flags.ar_office_discovered_artists) {
        const discoveredId = req.body?.id;
        const signedNameLc = String(artist.name || '').toLowerCase();
        flags.ar_office_discovered_artists = flags.ar_office_discovered_artists.filter((a: any) => {
          const aNameLc = String(a?.name || '').toLowerCase();
          return (discoveredId ? a.id !== discoveredId : true) && aNameLc !== signedNameLc;
        });
        console.log('[A&R DEBUG] Removed signed artist from discovered collection. Remaining:', flags.ar_office_discovered_artists.length);
      }

      // Legacy cleanup: If this artist is the persisted discovered one, clear it now
      if ((flags as any).ar_office_discovered_artist_id) {
        const discoveredId = req.body?.id;
        if ((flags as any).ar_office_discovered_artist_id === discoveredId) {
          delete flags.ar_office_discovered_artist_id;
          delete flags.ar_office_discovered_artist_info;
        }
      }

      await storage.updateGameState(gameId, { flags });

      // Generate welcome email for signed artist
      try {
        const labelDisplay = ((gameState as any).labelName) || ((gameState as any).musicLabel?.name) || 'your label';
        const emailBody = {
          artistId: artist.id,
          name: artist.name,
          archetype: artist.archetype ?? 'Unknown',
          talent: artist.talent ?? 0,
          genre: artist.genre ?? null,
          signingCost: signingCost,
          weeklyCost: artist.weeklyCost ?? null,
        };

        await storage.createEmail({
          gameId: gameId,
          week: gameState.currentWeek ?? 1,
          category: 'ar',
          sender: 'Marcus "Mac" Rodriguez',
          senderRoleId: 'head_ar',
          subject: `Artist Signed – ${artist.name}`,
          preview: `${artist.name} has officially signed with ${labelDisplay}!`,
          body: emailBody,
          metadata: emailBody,
          isRead: false,
        });
        console.log(`[ARTIST SIGNING] Generated welcome email for ${artist.name}`);
      } catch (emailError) {
        console.error('[ARTIST SIGNING] Failed to generate welcome email:', emailError);
        // Don't fail the signing if email generation fails
      }

      res.json(artist);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid artist data", errors: error.errors });
      } else {
        console.error('Artist signing error:', error);
        res.status(500).json({ message: "Failed to sign artist" });
      }
    }
  });

  app.patch("/api/artists/:id", requireClerkUser, async (req, res) => {
    try {
      const artist = await storage.updateArtist(req.params.id, req.body);
      res.json(artist);
    } catch (error) {
      res.status(500).json({ message: "Failed to update artist" });
    }
  });

  // Project routes
  app.post("/api/game/:gameId/projects", requireClerkUser, async (req, res) => {
    try {
      console.log('[PROJECT CREATION] Raw request body received:', JSON.stringify({
        title: req.body.title,
        type: req.body.type,
        budgetPerSong: req.body.budgetPerSong,
        totalCost: req.body.totalCost,
        songCount: req.body.songCount,
        producerTier: req.body.producerTier,
        timeInvestment: req.body.timeInvestment,
        artistId: req.body.artistId
      }, null, 2));

      const validatedData = insertProjectSchema.parse({
        ...req.body,
        gameId: req.params.gameId
      });
      
      // Additional budget validation based on economy.json
      const projectTypes = await serverGameData.getProjectTypes();
      const projectTypeKey = validatedData.type === 'Single' ? 'single' :
                            validatedData.type === 'EP' ? 'ep' : 'mini_tour';
      const projectTypeConfig = projectTypes[projectTypeKey];

      // Debug log to verify the configuration
      console.log(`[PROJECT CREATION] Project type config for ${validatedData.type}:`, projectTypeConfig);
      
      if (projectTypeConfig && validatedData.type !== 'Mini-Tour') {
        // For recording projects, validate budget per song
        const budgetPerSong = validatedData.budgetPerSong || 0;
        const songCount = validatedData.songCount || projectTypeConfig.song_count_default || 1;
        const minPerSong = Math.round(projectTypeConfig.min / songCount);
        const maxPerSong = Math.round(projectTypeConfig.max / songCount);
        
        if (budgetPerSong < minPerSong) {
          throw new Error(`Budget per song must be at least $${minPerSong.toLocaleString()} for ${validatedData.type} projects`);
        }
        if (budgetPerSong > maxPerSong) {
          throw new Error(`Budget per song cannot exceed $${maxPerSong.toLocaleString()} for ${validatedData.type} projects`);
        }
      } else if (projectTypeConfig) {
        // For tour projects, validate total budget
        const totalCost = validatedData.totalCost || 0;
        if (totalCost < projectTypeConfig.min) {
          throw new Error(`Budget must be at least $${projectTypeConfig.min.toLocaleString()} for ${validatedData.type} projects`);
        }
        if (totalCost > projectTypeConfig.max) {
          throw new Error(`Budget cannot exceed $${projectTypeConfig.max.toLocaleString()} for ${validatedData.type} projects`);
        }
      }
      
      console.log('[PROJECT CREATION] Validated data after schema parse and budget validation:', JSON.stringify({
        title: validatedData.title,
        type: validatedData.type,
        budgetPerSong: validatedData.budgetPerSong,
        totalCost: validatedData.totalCost,
        songCount: validatedData.songCount,
        producerTier: validatedData.producerTier,
        timeInvestment: validatedData.timeInvestment,
        artistId: validatedData.artistId,
        gameId: validatedData.gameId
      }, null, 2));
      
      // Check if user has sufficient funds BEFORE creating project
      if (!validatedData.gameId) {
        throw new Error('Game ID is required');
      }
      const gameState = await storage.getGameState(validatedData.gameId);
      if (!gameState) {
        throw new Error('Game state not found');
      }
      
      // Check if user has sufficient creative capital
      const currentCreativeCapital = gameState.creativeCapital || 0;
      if (currentCreativeCapital < 1) {
        throw new Error(`Insufficient creative capital. You need 1 creative capital to start a new project, but you have ${currentCreativeCapital}.`);
      }
      
      const projectCost = validatedData.totalCost || validatedData.budgetPerSong || 0;
      if (projectCost > (gameState.money ?? 0)) {
        throw new Error(`Insufficient funds. Project costs $${projectCost.toLocaleString()} but you only have $${(gameState.money ?? 0).toLocaleString()}`);
      }
      
      const project = await storage.createProject(validatedData);
      
      // IMMEDIATELY deduct project cost and creative capital to prevent timing exploit
      await storage.updateGameState(validatedData.gameId!, {
        money: (gameState.money ?? 0) - projectCost,
        creativeCapital: currentCreativeCapital - 1
      });
      
      if (projectCost > 0) {
        console.log(`[PROJECT CREATION] Immediately deducted $${projectCost} and 1 creative capital for project "${project.title}"`);
      } else {
        console.log(`[PROJECT CREATION] Immediately deducted 1 creative capital for project "${project.title}"`);
      }
      
      console.log('[PROJECT CREATION] Project created in database:', JSON.stringify({
        id: project.id,
        title: project.title,
        type: project.type,
        budgetPerSong: project.budgetPerSong,
        totalCost: project.totalCost,
        songCount: project.songCount,
        producerTier: project.producerTier,
        timeInvestment: project.timeInvestment,
        artistId: project.artistId,
        costDeducted: projectCost
      }, null, 2));
      
      res.json(project);
    } catch (error) {
      console.error('[PROJECT CREATION] Error occurred:', error);
      if (error instanceof z.ZodError) {
        console.error('[PROJECT CREATION] Schema validation errors:', error.errors);
        res.status(400).json({ message: "Invalid project data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create project" });
      }
    }
  });

  app.patch("/api/projects/:id", requireClerkUser, async (req, res) => {
    try {
      const project = await storage.updateProject(req.params.id, req.body);
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // Cancel project (tours) with refund calculation
  app.delete("/api/projects/:id/cancel", requireClerkUser, async (req, res) => {
    try {
      const projectId = req.params.id;
      const { refundAmount } = req.body;
      
      console.log(`[CANCEL PROJECT] Cancelling project ${projectId} with refund $${refundAmount}`);
      
      // Get the project details before deletion
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Verify this is a tour project
      if (project.type !== 'Mini-Tour') {
        return res.status(400).json({ message: "Only tours can be cancelled" });
      }
      
      // Get game state to update money
      const gameState = await storage.getGameState(project.gameId!);
      if (!gameState) {
        return res.status(404).json({ message: "Game state not found" });
      }
      
      // Update project with cancellation data (keep for ROI tracking)
      await storage.updateProject(projectId, {
        totalRevenue: -((project.totalCost ?? 0) - refundAmount), // Loss = total cost minus refund
        completionStatus: 'cancelled',
        stage: 'cancelled' // Mark as cancelled instead of deleting
      });
      
      // Update game state with refund
      const updatedGameState = await storage.updateGameState(project.gameId!, {
        money: (gameState.money ?? 0) + refundAmount
      });
      
      console.log(`[CANCEL PROJECT] Project ${project.title} cancelled. Refund: $${refundAmount}`);
      
      res.json({ 
        success: true, 
        refundAmount,
        newBalance: updatedGameState.money,
        message: `Tour "${project.title}" cancelled successfully`
      });
      
    } catch (error) {
      console.error('[CANCEL PROJECT] Error:', error);
      res.status(500).json({ message: "Failed to cancel project" });
    }
  });

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
      const targetGameState = snapshot.gameState;
      const sourceGameId = targetGameState?.id;

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

          console.log('[RESTORE] Step 2: Deleting release_songs junction table...');
          await tx.execute(sql`DELETE FROM release_songs WHERE release_id IN (SELECT id FROM releases WHERE game_id = ${sourceGameId})`);

          console.log('[RESTORE] Step 3: Deleting songs (depends on artists, projects, releases)...');
          await tx.delete(songs).where(eq(songs.gameId, sourceGameId));

          console.log('[RESTORE] Step 4: Deleting releases (depends on artists)...');
          await tx.delete(releases).where(eq(releases.gameId, sourceGameId));

          console.log('[RESTORE] Step 5: Deleting projects (depends on artists)...');
          await tx.delete(projects).where(eq(projects.gameId, sourceGameId));

          console.log('[RESTORE] Step 6: Deleting mood_events (depends on artists)...');
          await tx.delete(moodEvents).where(eq(moodEvents.gameId, sourceGameId));

          console.log('[RESTORE] Step 7: Deleting artists (no more dependencies)...');
          await tx.delete(artists).where(eq(artists.gameId, sourceGameId));

          console.log('[RESTORE] Step 8: Deleting roles...');
          await tx.delete(roles).where(eq(roles.gameId, sourceGameId));

          console.log('[RESTORE] Step 9: Deleting weekly_actions...');
          await tx.delete(weeklyActions).where(eq(weeklyActions.gameId, sourceGameId));

          console.log('[RESTORE] Step 10: Deleting music_labels...');
          await tx.delete(musicLabels).where(eq(musicLabels.gameId, sourceGameId));

          console.log('[RESTORE] Step 11: Deleting emails...');
          await tx.delete(emails).where(eq(emails.gameId, sourceGameId));

          // Now insert everything back in reverse order (parents first, children last)

          console.log('[RESTORE] Step 12: Reinserting music_labels...');
          if (snapshot.musicLabel) {
            await tx.insert(musicLabels).values(
              convertTimestamps({
                ...snapshot.musicLabel,
                gameId: sourceGameId,
              }) as any
            );
          }

          console.log('[RESTORE] Step 13: Reinserting weekly_actions...');
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

          console.log('[RESTORE] Step 14: Reinserting roles...');
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

          console.log('[RESTORE] Step 15: Reinserting artists...');
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

          console.log('[RESTORE] Step 16: Reinserting projects...');
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

          console.log('[RESTORE] Step 17: Reinserting releases...');
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

          console.log('[RESTORE] Step 18: Reinserting songs...');
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

          console.log('[RESTORE] Step 19: Reinserting emails...');
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

  // Artist dialogue endpoints
  app.get("/api/artists/:archetype/dialogue", async (req, res) => {
    try {
      const dialogues = await serverGameData.getArtistDialogue(req.params.archetype);
      res.json(dialogues);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch artist dialogue" });
    }
  });

  // Dialogue choices (legacy endpoint - kept for backwards compatibility)
  app.get("/api/dialogue/:roleType", async (req, res) => {
    try {
      const { sceneId } = req.query;
      const choices = await storage.getDialogueChoices(
        req.params.roleType, 
        sceneId as string
      );
      res.json(choices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dialogue choices" });
    }
  });

  // Get all dialogue scenes for frontend random selection
  app.get("/api/dialogue-scenes", async (req, res) => {
    try {
      const dialogueData = await gameDataLoader.loadDialogueData();
      res.json({
        version: dialogueData.version,
        scenes: dialogueData.additional_scenes
      });
    } catch (error) {
      console.error('[API] Failed to load dialogue data:', error);
      res.status(500).json({
        message: "Failed to load dialogue data",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Game events
  app.get("/api/events", async (req, res) => {
    try {
      const events = await storage.getGameEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch game events" });
    }
  });

  // Phase 1: Song and Release Management API Routes
  
  // Get songs for a game
  app.get("/api/game/:gameId/songs", requireClerkUser, async (req, res) => {
    try {
      const songs = await serverGameData.getSongsByGame(req.params.gameId);
      res.json(songs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch songs" });
    }
  });

  // Get songs for a specific artist
  app.get("/api/game/:gameId/artists/:artistId/songs", requireClerkUser, async (req, res) => {
    try {
      const { gameId, artistId } = req.params;
      
      // Validate parameters
      if (!gameId || !artistId) {
        return res.status(400).json({ 
          message: "Missing required parameters", 
          error: "gameId and artistId are required" 
        });
      }
      
      // Validate UUID format (basic check)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(gameId) || !uuidRegex.test(artistId)) {
        return res.status(400).json({ 
          message: "Invalid parameter format", 
          error: "gameId and artistId must be valid UUIDs" 
        });
      }
      
      console.log('[API] Fetching songs for artist:', artistId, 'game:', gameId);
      const rawSongs = await serverGameData.getSongsByArtist(artistId, gameId);
      console.log('[API] Found songs:', rawSongs?.length || 0);

      // Ensure we always return an array, even if no songs found
      const songsArray = Array.isArray(rawSongs) ? rawSongs : [];

      // Enhance songs with chart data
      try {
        // Create ChartService instance for this game
        const chartService = new ChartService(
          serverGameData,
          () => Math.random(), // Use simple RNG for API calls
          storage,
          gameId
        );

        // Batch fetch chart data for all songs to avoid N+1 queries
        const songIds = songsArray.map(song => song.id);
        const batchChartData = await chartService.getBatchChartData(songIds);

        // Enrich songs with chart data from batch
        const enrichedSongs = songsArray.map(rawSong => ({
          ...rawSong,
          currentChartPosition: batchChartData.get(rawSong.id)?.currentPosition || null,
          chartMovement: batchChartData.get(rawSong.id)?.movement || 0,
          weeksOnChart: batchChartData.get(rawSong.id)?.weeksOnChart || 0,
          peakPosition: batchChartData.get(rawSong.id)?.peakPosition || null,
          isChartDebut: batchChartData.get(rawSong.id)?.isDebut || false
        }));

        res.json(enrichedSongs);
        console.log('[API] Returned enriched songs with chart data:', enrichedSongs.length);

      } catch (chartError) {
        console.error('[API] Error enriching songs with chart data:', chartError);
        // Fallback to raw songs if chart enrichment fails
        res.json(songsArray);
      }
      
    } catch (error) {
      console.error('[API] Error fetching artist songs:', error);
      res.status(500).json({ 
        message: "Failed to fetch artist songs", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Get Top 10 chart data for a game
  app.get("/api/game/:gameId/charts/top10", requireClerkUser, async (req, res) => {
    try {
      const { gameId } = req.params;
      const userId = req.userId!;

      // Verify user has access to this game
      const [gameOwnership] = await db.select()
        .from(gameStates)
        .where(and(
          eq(gameStates.id, gameId),
          eq(gameStates.userId, userId)
        ))
        .limit(1);

      if (!gameOwnership) {
        return res.status(403).json({
          error: 'UNAUTHORIZED',
          message: 'You do not have permission to access this game'
        });
      }

      // Get current game to determine chart week
      const game = await storage.getGameState(gameId);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      // Create ChartService instance
      const rng = () => Math.random(); // Simple RNG for chart generation
      const chartService = new ChartService(serverGameData, rng, storage, gameId);

      // Calculate current chart week from game week
      const currentChartWeek = ChartService.generateChartWeekFromGameWeek(game.currentWeek ?? 1);

      // Get Top 10 chart data
      const top10Data = await chartService.getTop10ChartData(currentChartWeek);

      console.log(`[API] Top 10 chart data fetched for game ${gameId}, week ${currentChartWeek}:`, {
        totalEntries: top10Data.length,
        playerSongs: top10Data.filter(entry => entry.isPlayerSong).length,
        competitorSongs: top10Data.filter(entry => entry.isCompetitorSong).length,
        debuts: top10Data.filter(entry => entry.isDebut).length
      });

      res.json({
        chartWeek: currentChartWeek,
        currentWeek: game.currentWeek,
        top10: top10Data
      });

    } catch (error) {
      console.error('[API] Error fetching Top 10 chart data:', error);
      res.status(500).json({
        message: "Failed to fetch Top 10 chart data",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get Top 100 chart data for a game
  app.get("/api/game/:gameId/charts/top100", requireClerkUser, async (req, res) => {
    try {
      const { gameId } = req.params;
      const userId = req.userId!;

      // Verify user has access to this game
      const [gameOwnership] = await db.select()
        .from(gameStates)
        .where(and(
          eq(gameStates.id, gameId),
          eq(gameStates.userId, userId)
        ))
        .limit(1);

      if (!gameOwnership) {
        return res.status(403).json({
          error: 'UNAUTHORIZED',
          message: 'You do not have permission to access this game'
        });
      }

      // Get current game to determine chart week
      const game = await storage.getGameState(gameId);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      // Create ChartService instance
      const rng = () => Math.random(); // Simple RNG for chart generation
      const chartService = new ChartService(serverGameData, rng, storage, gameId);

      // Calculate current chart week from game week
      const currentChartWeek = ChartService.generateChartWeekFromGameWeek(game.currentWeek ?? 1);

      // Get Top 100 chart data (all charting songs)
      const currentEntries = await chartService.getCurrentWeekChartEntries(currentChartWeek);
      const top100Entries = currentEntries
        .filter(entry => entry.position !== null && entry.position >= 1 && entry.position <= 100)
        .sort((a, b) => (a.position || 101) - (b.position || 101))
        .map(entry => ({
          position: entry.position!,
          songId: entry.songId || entry.competitorTitle || 'unknown',
          songTitle: entry.songTitle,
          artistName: entry.artistName,
          streams: entry.streams,
          movement: entry.movement ?? 0,
          weeksOnChart: entry.weeksOnChart,
          peakPosition: entry.peakPosition ?? (entry.position ?? null),
          lastWeekPosition: entry.lastWeekPosition ?? null,
          isPlayerSong: !entry.isCompetitorSong,
          isCompetitorSong: entry.isCompetitorSong ?? false,
          isDebut: entry.isDebut ?? false
        }));

      console.log(`[API] Top 100 chart data fetched for game ${gameId}, week ${currentChartWeek}:`, {
        totalEntries: top100Entries.length,
        playerSongs: top100Entries.filter(entry => entry.isPlayerSong).length,
        competitorSongs: top100Entries.filter(entry => !entry.isPlayerSong).length,
        debuts: top100Entries.filter(entry => entry.isDebut).length
      });

      // Debug: Log first few entries to check lastWeekPosition
      if (top100Entries.length > 0) {
        console.log('[API] First 3 entries with lastWeekPosition:', top100Entries.slice(0, 3).map(entry => ({
          position: entry.position,
          songTitle: entry.songTitle,
          lastWeekPosition: entry.lastWeekPosition,
          movement: entry.movement
        })));
      }

      res.json({
        chartWeek: currentChartWeek,
        currentWeek: game.currentWeek,
        top100: top100Entries
      });

    } catch (error) {
      console.error('[API] Error fetching Top 100 chart data:', error);
      res.status(500).json({
        message: "Failed to fetch Top 100 chart data",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get releases for a game
  app.get("/api/game/:gameId/releases", requireClerkUser, async (req, res) => {
    try {
      const releases = await serverGameData.getReleasesByGame(req.params.gameId);
      res.json(releases);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch releases" });
    }
  });

  // Create a new release (Single/EP/Album)
  app.post("/api/game/:gameId/releases", requireClerkUser, async (req, res) => {
    try {
      const releaseData = {
        ...req.body,
        gameId: req.params.gameId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const release = await serverGameData.createRelease(releaseData);
      
      // If songs are provided, create the release-song relationships
      if (req.body.songIds && req.body.songIds.length > 0) {
        for (let i = 0; i < req.body.songIds.length; i++) {
          await serverGameData.createReleaseSong({
            releaseId: release.id,
            songId: req.body.songIds[i],
            trackNumber: i + 1
          });
        }
      }
      
      res.json(release);
    } catch (error) {
      console.error("Failed to create release:", error);
      res.status(500).json({ message: "Failed to create release" });
    }
  });

  // PLAN RELEASE ENDPOINTS

  // Get artists with ready songs for release planning
  app.get("/api/game/:gameId/artists/ready-for-release", requireClerkUser, async (req, res) => {
    try {
      const gameId = req.params.gameId;
      const minSongs = parseInt(req.query.minSongs as string) || 1;
      
      // Get all artists for this game with their song counts
      const artistsResult = await db
        .select({
          id: artists.id,
          name: artists.name,
          mood: artists.mood,
          energy: artists.energy,
          archetype: artists.archetype,
          signedWeek: artists.signedWeek,
          readySongsCount: sql<string>`COUNT(CASE WHEN ${songs.isRecorded} = true AND ${songs.isReleased} = false AND ${songs.releaseId} IS NULL THEN 1 END)`,
          totalSongsCount: sql<string>`COUNT(${songs.id})`
        })
        .from(artists)
        .leftJoin(songs, eq(songs.artistId, artists.id))
        .where(eq(artists.gameId, gameId))
        .groupBy(artists.id, artists.name, artists.mood, artists.energy, artists.archetype, artists.signedWeek)
        .having(sql`COUNT(CASE WHEN ${songs.isRecorded} = true AND ${songs.isReleased} = false AND ${songs.releaseId} IS NULL THEN 1 END) >= ${minSongs}`);

      const totalReadySongs = artistsResult.reduce((sum: number, artist: any) => sum + parseInt(artist.readySongsCount as string), 0);
      
      // Sort by readiness (ready songs count + mood)
      const sortedArtists = artistsResult.sort((a: any, b: any) => {
        const scoreA = parseInt(a.readySongsCount as string) * 10 + (a.mood || 50);
        const scoreB = parseInt(b.readySongsCount as string) * 10 + (b.mood || 50);
        return scoreB - scoreA;
      });

      res.json({
        success: true,
        artists: sortedArtists.map((artist: any) => ({
          id: artist.id,
          name: artist.name,
          genre: 'Pop', // Default genre since not stored in artists table
          mood: artist.mood || 50,
          energy: artist.energy || 50,
          readySongsCount: parseInt(artist.readySongsCount as string),
          totalSongsCount: parseInt(artist.totalSongsCount as string),
          lastProjectWeek: artist.signedWeek,
          archetype: artist.archetype
        })),
        metadata: {
          totalArtists: artistsResult.length,
          totalReadySongs,
          recommendedArtists: sortedArtists.slice(0, 3).map((a: any) => a.id)
        }
      });
    } catch (error) {
      console.error("Failed to fetch ready artists:", error);
      res.status(500).json({ 
        error: 'FETCH_ERROR',
        message: "Failed to fetch artists ready for release" 
      });
    }
  });

  // Get ready songs for a specific artist
  app.get("/api/game/:gameId/artists/:artistId/songs/ready", requireClerkUser, async (req, res) => {
    try {
      const { gameId, artistId } = req.params;
      const includeDrafts = req.query.includeDrafts === 'true';
      const sortBy = req.query.sortBy as string || 'quality';
      const sortOrder = req.query.sortOrder as string || 'desc';
      
      // Get artist info
      const [artist] = await db
        .select()
        .from(artists)
        .where(and(eq(artists.id, artistId), eq(artists.gameId, gameId)));
        
      if (!artist) {
        return res.status(404).json({
          error: 'ARTIST_NOT_FOUND',
          message: 'Artist not found in this game',
          artistId,
          gameId
        });
      }

      // Get ready songs (recorded but not released, and not already scheduled for a release)
      let songQuery = db
        .select()
        .from(songs)
        .where(and(
          eq(songs.artistId, artistId),
          eq(songs.gameId, gameId),
          includeDrafts ? sql`true` : eq(songs.isRecorded, true),
          eq(songs.isReleased, false),
          sql`${songs.releaseId} IS NULL` // Only include songs not already scheduled for releases
        ));

      // Apply sorting
      const orderColumn = sortBy === 'quality' ? songs.quality : 
                         sortBy === 'createdDate' ? songs.createdAt :
                         songs.totalRevenue;
      const orderDirection = sortOrder === 'asc' ? orderColumn : desc(orderColumn);
      const orderedQuery = songQuery.orderBy(orderDirection);

      const readySongs = await orderedQuery;

      // Calculate estimated metrics for each song (simplified version)
      const songsWithMetrics = readySongs.map(song => ({
        id: song.id,
        title: song.title,
        quality: song.quality,
        genre: song.genre || 'Pop',
        mood: song.mood || 'neutral',
        createdWeek: song.createdWeek || 1,
        isRecorded: song.isRecorded,
        isReleased: song.isReleased,
        projectId: null, // Not available in current schema
        producerTier: song.producerTier || 'local',
        timeInvestment: song.timeInvestment || 'standard',
        estimatedMetrics: {
          streams: song.weeklyStreams || 0, // Use actual streams if available, otherwise 0 (will be calculated properly in release preview)
          revenue: song.totalRevenue || 0, // Use actual revenue if available, otherwise 0
          chartPotential: Math.min(100, Math.max(0, song.quality + ((artist.mood || 50) - 50) / 2))
        },
        metadata: {
          recordingCost: 5000, // Default recording cost
          budgetPerSong: 5000, // Default budget per song
          artistMoodAtCreation: artist.mood || 50
        }
      }));

      const totalRevenuePotential = songsWithMetrics.reduce((sum, song) => sum + song.estimatedMetrics.revenue, 0);
      const averageQuality = songsWithMetrics.length > 0 ? 
        songsWithMetrics.reduce((sum, song) => sum + song.quality, 0) / songsWithMetrics.length : 0;

      res.json({
        success: true,
        artist: {
          id: artist.id,
          name: artist.name,
          genre: 'Pop', // Default genre since not available in schema
          mood: artist.mood || 50,
          energy: artist.energy || 50
        },
        songs: songsWithMetrics,
        totalRevenuePotential,
        averageQuality: Math.round(averageQuality)
      });
    } catch (error) {
      console.error("Failed to fetch artist songs:", error);
      res.status(500).json({ 
        error: 'FETCH_ERROR',
        message: "Failed to fetch artist ready songs" 
      });
    }
  });

  // Calculate release preview metrics
  app.post("/api/game/:gameId/releases/preview", requireClerkUser, async (req, res) => {
    try {
      const gameId = req.params.gameId;
      const {
        artistId,
        songIds,
        releaseType,
        leadSingleId,
        seasonalTiming,
        scheduledReleaseWeek,
        marketingBudget,
        leadSingleStrategy
      } = req.body;

      // Validate basic inputs
      if (!artistId || !songIds || songIds.length === 0 || !releaseType) {
        return res.status(400).json({
          error: 'INVALID_RELEASE_CONFIG',
          message: 'Invalid release configuration',
          details: [
            { field: 'artistId', issue: 'Required' },
            { field: 'songIds', issue: 'Must have at least one song' },
            { field: 'releaseType', issue: 'Required' }
          ]
        });
      }

      // Get songs and artist data
      const [artist] = await db.select().from(artists)
        .where(and(eq(artists.id, artistId), eq(artists.gameId, gameId)));
      
      const releaseSongs = await db.select().from(songs)
        .where(and(
          eq(songs.gameId, gameId),
          inArray(songs.id, songIds)
        ));

      if (!artist) {
        return res.status(404).json({
          error: 'ARTIST_NOT_FOUND',
          message: 'Artist not found',
          artistId
        });
      }

      if (releaseSongs.length !== songIds.length) {
        const foundIds = releaseSongs.map(s => s.id);
        const missingIds = songIds.filter((id: string) => !foundIds.includes(id));
        return res.status(404).json({
          error: 'SONGS_NOT_FOUND',
          message: 'One or more songs not found or not available',
          missingSongIds: missingIds,
          unavailableSongIds: []
        });
      }

      // Get current game state for GameEngine
      const [gameState] = await db.select().from(gameStates)
        .where(eq(gameStates.id, gameId));
      
      if (!gameState) {
        return res.status(404).json({
          error: 'GAME_NOT_FOUND',
          message: 'Game state not found'
        });
      }

      // Initialize GameEngine with sophisticated calculations
      console.log('[RELEASE PREVIEW] Initializing GameEngine for sophisticated calculations...');
      await serverGameData.initialize();
      const gameEngine = new GameEngine(gameState, serverGameData, storage);
      
      // Use GameEngine's sophisticated release preview calculation
      const releaseConfig = {
        releaseType: releaseType as 'single' | 'ep' | 'album',
        leadSingleId,
        seasonalTiming,
        scheduledReleaseWeek,
        marketingBudget: marketingBudget || {},
        leadSingleStrategy
      };
      
      console.log('[RELEASE PREVIEW] Calculating preview with GameEngine...', {
        songCount: releaseSongs.length,
        releaseType,
        totalMarketingBudget: Object.values(marketingBudget || {}).reduce((sum: number, budget) => sum + (budget as number), 0)
      });

      const previewResults = gameEngine.calculateReleasePreview(
        releaseSongs,
        artist,
        releaseConfig
      );
      
      console.log('[RELEASE PREVIEW] GameEngine calculation completed:', {
        estimatedStreams: previewResults.estimatedStreams,
        estimatedRevenue: previewResults.estimatedRevenue,
        totalMarketingCost: previewResults.totalMarketingCost,
        projectedROI: previewResults.projectedROI
      });

      res.json({
        success: true,
        preview: previewResults,
        validationWarnings: []
      });
    } catch (error) {
      console.error("Failed to calculate release preview:", error);
      console.error("Error stack:", (error as Error).stack);
      console.error("Error message:", (error as Error).message);
      console.error("Error name:", (error as Error).name);
      res.status(500).json({ 
        error: 'CALCULATION_ERROR',
        message: "Failed to calculate release preview",
        details: (error as Error).message,
        stack: (error as Error).stack
      });
    }
  });

  // Create planned release
  app.post("/api/game/:gameId/releases/plan", requireClerkUser, async (req, res) => {
    try {
      const gameId = req.params.gameId;
      const {
        artistId,
        title,
        type,
        songIds,
        leadSingleId,
        seasonalTiming,
        scheduledReleaseWeek,
        marketingBudget,
        leadSingleStrategy,
        metadata
      } = req.body;

      // Validate inputs
      if (!artistId || !title || !type || !songIds || songIds.length === 0) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Release validation failed',
          details: [
            { field: 'artistId', error: 'Required' },
            { field: 'title', error: 'Required' },
            { field: 'type', error: 'Required' },
            { field: 'songIds', error: 'Must have at least one song' }
          ]
        });
      }

      // Check if user has sufficient funds
      const [gameState] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
      if (!gameState) {
        return res.status(404).json({
          error: 'GAME_NOT_FOUND',
          message: 'Game session not found',
          gameId
        });
      }

      // Validate release week is in the future
      const currentWeek = gameState.currentWeek || 1;
      if (scheduledReleaseWeek && scheduledReleaseWeek <= currentWeek) {
        return res.status(400).json({
          error: 'INVALID_RELEASE_WEEK',
          message: 'Cannot plan releases for current or past weeks',
          currentWeek,
          scheduledReleaseWeek,
          details: [
            { field: 'scheduledReleaseWeek', error: `Must be greater than current week (${currentWeek})` }
          ]
        });
      }

      // Validate lead single week if provided
      if (leadSingleStrategy?.leadSingleReleaseWeek) {
        if (leadSingleStrategy.leadSingleReleaseWeek <= currentWeek) {
          return res.status(400).json({
            error: 'INVALID_LEAD_SINGLE_WEEK',
            message: 'Cannot plan lead single for current or past weeks',
            currentWeek,
            leadSingleReleaseWeek: leadSingleStrategy.leadSingleReleaseWeek,
            details: [
              { field: 'leadSingleReleaseWeek', error: `Must be greater than current week (${currentWeek})` }
            ]
          });
        }
      }

      const totalBudget = Object.values(marketingBudget || {}).reduce((sum: number, budget) => sum + (budget as number), 0) +
        (leadSingleStrategy ? Object.values(leadSingleStrategy.leadSingleBudget || {}).reduce((sum: number, budget) => sum + (budget as number), 0) : 0);
      
      // Check if user has sufficient creative capital
      const currentCreativeCapital = gameState.creativeCapital || 0;
      if (currentCreativeCapital < 1) {
        return res.status(402).json({
          error: 'INSUFFICIENT_CREATIVE_CAPITAL',
          message: 'Insufficient creative capital. You need 1 creative capital to plan a release.',
          required: 1,
          available: currentCreativeCapital
        });
      }

      if ((gameState.money || 0) < totalBudget) {
        return res.status(402).json({
          error: 'INSUFFICIENT_FUNDS',
          message: 'Not enough money for marketing budget',
          required: totalBudget,
          available: gameState.money || 0,
          suggestions: [
            { action: 'REDUCE_BUDGET', description: 'Reduce marketing allocation', potentialSavings: totalBudget - (gameState.money || 0) }
          ]
        });
      }

      // Check for song conflicts (songs already scheduled for release)
      const conflictingSongs = await db
        .select()
        .from(songs)
        .where(and(
          eq(songs.gameId, gameId),
          inArray(songs.id, songIds),
          sql`${songs.releaseId} IS NOT NULL`
        ));

      if (conflictingSongs.length > 0) {
        return res.status(409).json({
          error: 'SONG_ALREADY_SCHEDULED',
          message: 'Some songs are already part of a planned release',
          conflictingSongs: conflictingSongs.map(c => ({
            songId: c.id,
            songTitle: c.title,
            conflictingReleaseId: c.releaseId,
            conflictingReleaseTitle: 'Unknown Release'
          })),
          resolutionOptions: [
            { action: 'CHOOSE_DIFFERENT_SONGS', description: 'Select different songs for this release' }
          ]
        });
      }

      // Create the planned release in a transaction
      const result = await db.transaction(async (tx) => {
        // CRITICAL FIX: Single deduction of marketing budget and creative capital
        await tx.update(gameStates)
          .set({ 
            money: (gameState.money || 0) - totalBudget,
            creativeCapital: currentCreativeCapital - 1
          })
          .where(eq(gameStates.id, gameId));
        
        console.log(`[PLAN RELEASE] Deducted $${totalBudget} and 1 creative capital for release planning`);

        // Create release record
        const [newRelease] = await tx.insert(releases).values({
          gameId,
          artistId,
          title,
          type,
          releaseWeek: scheduledReleaseWeek,
          status: 'planned',
          marketingBudget: totalBudget,
          metadata: {
            ...metadata,
            seasonalTiming,
            scheduledReleaseWeek,
            marketingChannels: Object.keys(marketingBudget || {}),
            marketingBudgetBreakdown: marketingBudget || {}, // CRITICAL FIX: Store per-channel budgets for release execution
            leadSingleStrategy: leadSingleStrategy ? {
              ...leadSingleStrategy,
              leadSingleBudgetBreakdown: leadSingleStrategy.leadSingleBudget || {} // Store per-channel breakdown for lead single too
            } : null
          }
        }).returning();

        // Update songs to mark them as reserved for this release
        await tx.update(songs)
          .set({ releaseId: newRelease.id })
          .where(inArray(songs.id, songIds));

        // CRITICAL FIX: Also create entries in the junction table for proper song-release association
        // This ensures songs are properly linked when releases are executed
        const releaseSongEntries = songIds.map((songId: string, index: number) => ({
          id: crypto.randomUUID(),
          releaseId: newRelease.id,
          songId: songId,
          trackNumber: index + 1, // Track order based on selection order
          createdAt: new Date()
        }));

        await tx.insert(releaseSongs).values(releaseSongEntries);
        console.log(`[PLAN RELEASE] Created ${releaseSongEntries.length} junction table entries for release ${newRelease.id}`);

        return newRelease;
      });

      // Get updated game state and planned releases
      const [updatedGameState] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
      const plannedReleases = await db.select().from(releases)
        .where(and(eq(releases.gameId, gameId), eq(releases.status, 'planned')));

      res.status(201).json({
        success: true,
        release: {
          id: result.id,
          title: result.title,
          type: result.type,
          artistId: result.artistId,
          artistName: 'Artist Name', // Would need artist lookup
          songIds,
          leadSingleId,
          scheduledReleaseWeek,
          status: 'planned',
          estimatedMetrics: {
            streams: metadata?.estimatedStreams || 0,
            revenue: metadata?.estimatedRevenue || 0,
            roi: metadata?.projectedROI || 0,
            chartPotential: 50
          },
          createdAt: result.createdAt?.toISOString(),
          createdByWeek: updatedGameState.currentWeek
        },
        updatedGameState: {
          money: updatedGameState.money,
          plannedReleases: plannedReleases.map(r => ({
            id: r.id,
            title: r.title,
            artistName: 'Artist Name', // Would need artist lookup
            type: r.type,
            scheduledWeek: r.releaseWeek,
            status: r.status
          })),
          artistsAffected: [{
            artistId,
            songsReserved: songIds.length,
            moodImpact: 5 // Positive mood boost from planned release
          }]
        }
      });
    } catch (error) {
      console.error("Failed to create planned release:", error);
      console.error("Error stack:", (error as Error).stack);
      console.error("Error message:", (error as Error).message);
      console.error("Error name:", (error as Error).name);
      res.status(500).json({ 
        error: 'CREATION_ERROR',
        message: "Failed to create planned release",
        details: (error as Error).message,
        stack: (error as Error).stack
      });
    }
  });


  // DEBUG: Check project and song revenue status
  app.get("/api/debug/game/:gameId/revenue", async (req, res) => {
    try {
      const gameId = req.params.gameId;
      
      // Get all projects for this game
      const allProjects = await db.select().from(projects).where(eq(projects.gameId, gameId));
      
      // Get all songs for this game
      const allSongs = await db.select().from(songs).where(eq(songs.gameId, gameId));
      
      // Get released projects specifically
      const releasedProjects = await db.select().from(projects)
        .where(and(eq(projects.gameId, gameId), eq(projects.stage, 'released')));
      
      res.json({
        summary: {
          totalProjects: allProjects.length,
          releasedProjects: releasedProjects.length,
          totalSongs: allSongs.length,
          releasedSongs: allSongs.filter(s => s.isReleased).length
        },
        projects: allProjects.map(p => ({
          id: p.id,
          title: p.title,
          type: p.type,
          stage: p.stage,
          artistId: p.artistId,
          songCount: p.songCount,
          songsCreated: p.songsCreated,
          startWeek: p.startWeek,
          metadata: p.metadata
        })),
        songs: allSongs.map(s => ({
          id: s.id,
          title: s.title,
          artistId: s.artistId,
          quality: s.quality,
          isRecorded: s.isRecorded,
          isReleased: s.isReleased,
          createdWeek: s.createdWeek,
          metadata: s.metadata
        })),
        releasedProjects: releasedProjects.map(p => ({
          id: p.id,
          title: p.title,
          metadata: p.metadata,
          hasRevenue: !!(p.metadata as any)?.revenue,
          hasStreams: !!(p.metadata as any)?.streams
        }))
      });
    } catch (error) {
      console.error('[DEBUG] Error fetching revenue debug status:', error);
      res.status(500).json({ message: "Failed to fetch revenue debug status" });
    }
  });

  // Song conflict resolution endpoints
  app.get("/api/game/:gameId/songs/conflicts", requireClerkUser, async (req, res) => {
    try {
      const gameId = req.params.gameId;
      
      // Find all songs that are reserved for planned releases
      const reservedSongs = await db.select().from(songs)
        .where(and(
          eq(songs.gameId, gameId),
          sql`${songs.releaseId} IS NOT NULL`
        ));
      
      // Get the planned releases these songs are associated with
      const plannedReleases = await db.select().from(releases)
        .where(and(
          eq(releases.gameId, gameId),
          eq(releases.status, 'planned')
        ));
      
      // Group reserved songs by release
      const conflictsByRelease = plannedReleases.map(release => ({
        releaseId: release.id,
        releaseTitle: release.title,
        releaseType: release.type,
        scheduledWeek: release.releaseWeek,
        reservedSongs: reservedSongs.filter(s => s.releaseId === release.id).map(s => ({
          songId: s.id,
          songTitle: s.title,
          artistId: s.artistId
        }))
      }));
      
      res.json({
        success: true,
        conflicts: {
          totalReservedSongs: reservedSongs.length,
          plannedReleases: plannedReleases.length,
          conflictsByRelease
        }
      });
    } catch (error) {
      console.error("Failed to get song conflicts:", error);
      res.status(500).json({
        error: 'CONFLICT_CHECK_ERROR',
        message: "Failed to check song conflicts"
      });
    }
  });

  // Update song title
  app.patch("/api/songs/:songId", requireClerkUser, async (req, res) => {
    try {
      const { songId } = req.params;
      const { title } = req.body;
      const userId = req.userId;
      
      // Validate user ID exists
      if (!userId) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'User authentication required'
        });
      }
      
      // Validate title
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({
          error: 'INVALID_TITLE',
          message: 'Song title must be a non-empty string'
        });
      }
      
      // Validate title length
      if (title.length > 100) {
        return res.status(400).json({
          error: 'TITLE_TOO_LONG',
          message: 'Song title must be 100 characters or less'
        });
      }
      
      // First check if song exists and belongs to user's game
      const [song] = await db.select({
        songId: songs.id,
        gameId: songs.gameId,
        currentTitle: songs.title
      })
      .from(songs)
      .where(eq(songs.id, songId))
      .limit(1);
      
      if (!song) {
        return res.status(404).json({
          error: 'SONG_NOT_FOUND',
          message: 'Song not found'
        });
      }
      
      // Verify the game belongs to the user
      const [game] = await db.select()
        .from(gameStates)
        .where(and(
          eq(gameStates.id, song.gameId),
          eq(gameStates.userId, userId)
        ))
        .limit(1);
      
      if (!game) {
        return res.status(403).json({
          error: 'UNAUTHORIZED',
          message: 'You do not have permission to edit this song'
        });
      }
      
      // Update the song title
      const [updatedSong] = await db.update(songs)
        .set({ 
          title: title.trim()
        })
        .where(eq(songs.id, songId))
        .returning();
      
      res.json({
        success: true,
        song: {
          id: updatedSong.id,
          title: updatedSong.title,
          previousTitle: song.currentTitle
        }
      });
      
    } catch (error) {
      console.error("Failed to update song title:", error);
      res.status(500).json({
        error: 'UPDATE_FAILED',
        message: 'Failed to update song title'
      });
    }
  });

  // Clear all song reservations (for debugging/testing)
  app.post("/api/game/:gameId/songs/clear-reservations", requireClerkUser, async (req, res) => {
    try {
      const gameId = req.params.gameId;
      
      // Clear all song reservations
      const result = await db.update(songs)
        .set({ releaseId: null })
        .where(and(
          eq(songs.gameId, gameId),
          sql`${songs.releaseId} IS NOT NULL`
        ))
        .returning();
      
      res.json({
        success: true,
        message: `Cleared reservations for ${result.length} songs`,
        clearedSongs: result.map(s => ({
          songId: s.id,
          songTitle: s.title,
          artistId: s.artistId
        }))
      });
    } catch (error) {
      console.error("Failed to clear song reservations:", error);
      res.status(500).json({
        error: 'CLEAR_RESERVATIONS_ERROR',
        message: "Failed to clear song reservations"
      });
    }
  });


  // Delete a planned release and free up its songs
  app.delete("/api/game/:gameId/releases/:releaseId", requireClerkUser, async (req, res) => {
    try {
      const gameId = req.params.gameId;
      const releaseId = req.params.releaseId;
      
      // Get the release to return marketing budget
      const [release] = await db.select().from(releases)
        .where(and(eq(releases.id, releaseId), eq(releases.gameId, gameId)));
      
      if (!release) {
        return res.status(404).json({
          error: 'RELEASE_NOT_FOUND',
          message: 'Planned release not found'
        });
      }
      
      if (release.status !== 'planned') {
        return res.status(400).json({
          error: 'CANNOT_DELETE_RELEASED',
          message: 'Cannot delete a release that has already been executed'
        });
      }
      
      // Execute deletion in transaction
      const result = await db.transaction(async (tx) => {
        // Free up songs reserved for this release
        const freedSongs = await tx.update(songs)
          .set({ releaseId: null })
          .where(eq(songs.releaseId, releaseId))
          .returning();
        
        // Return marketing budget to player
        const [gameState] = await tx.select().from(gameStates)
          .where(eq(gameStates.id, gameId));
        
        if (gameState) {
          await tx.update(gameStates)
            .set({ money: (gameState.money || 0) + (release.marketingBudget || 0) })
            .where(eq(gameStates.id, gameId));
        }
        
        // Delete the planned release
        await tx.delete(releases).where(eq(releases.id, releaseId));
        
        return { freedSongs, refundedAmount: release.marketingBudget || 0 };
      });
      
      res.json({
        success: true,
        message: `Deleted planned release "${release.title}"`,
        freedSongs: result.freedSongs.map(s => ({
          songId: s.id,
          songTitle: s.title
        })),
        refundedAmount: result.refundedAmount
      });
    } catch (error) {
      console.error("Failed to delete planned release:", error);
      res.status(500).json({
        error: 'DELETE_RELEASE_ERROR',
        message: "Failed to delete planned release"
      });
    }
  });

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

  // Tour estimation endpoint - Phase 3: API Bridge
  app.post('/api/tour/estimate', requireClerkUser, async (req, res) => {
    try {
      const { artistId, cities, budgetPerCity, gameId, venueCapacity } = req.body;

      // VALIDATE INPUTS - CRASH IF INVALID
      if (!artistId || !cities || budgetPerCity === undefined || !gameId) {
        return res.status(400).json({
          error: 'Missing required parameters: artistId, cities, budgetPerCity, gameId'
        });
      }

      // ENHANCED: Validate venueCapacity if provided
      if (venueCapacity !== undefined) {
        if (typeof venueCapacity !== 'number' || venueCapacity < 50) {
          return res.status(400).json({
            error: 'venueCapacity must be a number >= 50'
          });
        }
      }

      // Get game state - CRASH IF MISSING
      const gameState = await storage.getGameState(gameId);
      if (!gameState) {
        return res.status(404).json({ error: `Game not found: ${gameId}` });
      }

      // Get artist - CRASH IF MISSING
      const artist = await storage.getArtist(artistId);
      if (!artist) {
        return res.status(404).json({ error: `Artist not found: ${artistId}` });
      }

      // Get venue access - CRASH IF MISSING
      const venueAccess = gameState.venueAccess;
      if (!venueAccess || venueAccess === 'none') {
        return res.status(400).json({ error: `Invalid venue access: ${venueAccess}` });
      }

      // Initialize serverGameData before creating financial system
      await serverGameData.initialize();

      // Initialize financial system for validation and calculations
      const financialSystem = new FinancialSystem(serverGameData, () => Math.random());

      // ENHANCED: Validate venueCapacity using VenueCapacityManager
      if (venueCapacity !== undefined) {
        try {
          VenueCapacityManager.validateCapacity(venueCapacity, venueAccess, serverGameData);
        } catch (error) {
          return res.status(400).json({
            error: `Venue capacity validation failed: ${(error as Error).message}`
          });
        }
      }

      // Get base costs to determine marketing budget
      const baseCosts = financialSystem.calculateTourCosts(venueAccess, cities, 0);
      const totalMarketingBudget = budgetPerCity * cities;
      const totalBudget = baseCosts.totalCosts + totalMarketingBudget;

      // ENHANCED: Calculate detailed breakdown with specific capacity or tier fallback
      const detailedBreakdown = financialSystem.calculateDetailedTourBreakdown({
        venueCapacity: venueCapacity || 0, // Use provided capacity or fallback to tier
        venueTier: venueAccess, // Keep for backward compatibility and fallback
        artistPopularity: artist.popularity || 0,
        localReputation: gameState.reputation || 0,
        cities,
        marketingBudget: totalMarketingBudget
      });

      // Get tier range for response using VenueCapacityManager
      const tierRange = VenueCapacityManager.getCapacityRangeFromTier(venueAccess, serverGameData);

      // Calculate price per ticket from first city (all cities have same pricing)
      const firstCity = detailedBreakdown.cities[0];
      const pricePerTicket = firstCity
        ? Math.round((firstCity.ticketRevenue / (firstCity.venueCapacity * firstCity.sellThroughRate)) || 0)
        : 0;

      // Get venue categorization using VenueCapacityManager
      console.log('[TOUR ESTIMATE] Getting venue categorization for capacity:', venueCapacity || 500);
      const venueCategory = VenueCapacityManager.categorizeVenue(venueCapacity || 500, serverGameData);
      console.log('[TOUR ESTIMATE] Venue category result:', venueCategory);

      // Create enhanced response with detailed breakdown
      const response = {
        estimatedRevenue: detailedBreakdown.totalRevenue,
        totalCosts: detailedBreakdown.totalCosts,
        estimatedProfit: detailedBreakdown.netProfit,
        roi: detailedBreakdown.totalCosts > 0 ? (detailedBreakdown.netProfit / detailedBreakdown.totalCosts) * 100 : 0,
        canAfford: totalBudget <= (gameState.money || 0),
        totalBudget,
        breakdown: detailedBreakdown.costBreakdown,
        sellThroughRate: detailedBreakdown.sellThroughAnalysis.finalRate,
        // ENHANCED: Include detailed city-by-city breakdown
        cities: detailedBreakdown.cities,
        sellThroughAnalysis: detailedBreakdown.sellThroughAnalysis,
        venueCapacity: detailedBreakdown.cities[0]?.venueCapacity || 0,
        // PHASE 2 ENHANCEMENTS: New fields for capacity selection
        selectedCapacity: detailedBreakdown.cities[0]?.venueCapacity || 0,
        tierRange,
        pricePerTicket,
        playerTier: venueAccess,
        venueCategory // NEW: Configuration-driven venue categorization
      };

      res.json(response);

    } catch (error) {
      // LOG ERROR BUT DON'T HIDE IT
      console.error('[TOUR ESTIMATE ERROR]', (error as Error).message);
      res.status(500).json({
        error: 'Tour estimation failed',
        details: (error as Error).message
      });
    }
  });

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

  app.post('/api/bug-reports', requireClerkUser, async (req, res) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json(createErrorResponse('UNAUTHENTICATED', 'Authentication required to submit bug reports'));
      }

      const payload = BugReportRequestSchema.parse(req.body);
      const bugReportsPath = path.join(process.cwd(), 'data', 'bugReports.json');

      let existingReports: any[] = [];
      try {
        const raw = await fs.readFile(bugReportsPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          existingReports = parsed;
        }
      } catch (error) {
        const nodeError = error as NodeJS.ErrnoException;
        if (nodeError.code !== 'ENOENT') {
          throw error;
        }
      }

      const clerkUserId = (req as any).clerkUserId as string | undefined;
      const record = {
        id: crypto.randomUUID(),
        submittedAt: new Date().toISOString(),
        summary: payload.summary,
        severity: payload.severity,
        area: payload.area,
        frequency: payload.frequency,
        status: 'new',
        whatHappened: payload.whatHappened,
        stepsToReproduce: payload.stepsToReproduce ?? null,
        expectedResult: payload.expectedResult ?? null,
        additionalContext: payload.additionalContext ?? null,
        reporter: {
          userId,
          clerkUserId: clerkUserId ?? null,
          contactEmail: payload.contactEmail ?? null
        },
        metadata: {
          ...(payload.metadata ?? {}),
          ip: req.ip
        }
      };

      existingReports.unshift(record);

      const serialized = JSON.stringify(existingReports, null, 2);
      await fs.writeFile(bugReportsPath, serialized, 'utf8');

      res.status(201).json({ success: true, reportId: record.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid bug report submission',
          error.errors
        ));
      }

      console.error('Failed to persist bug report:', error);
      res.status(500).json(createErrorResponse('BUG_REPORT_ERROR', 'Failed to submit bug report'));
    }
  });

  app.get('/api/bug-reports', requireClerkUser, requireAdmin, async (req, res) => {
    console.log('GET /api/bug-reports endpoint called');
    try {
      const { includeArchived, status, search } = req.query;

      // Check and run auto-archival if needed
      const archivalResult = await checkAndArchive();
      if (archivalResult.triggered) {
        console.log('Auto-archival triggered:', archivalResult.result);
      }

      let reports: BugReportRecord[] = [];

      if (includeArchived === 'true' || search) {
        // Search across all reports (active + archived)
        reports = await searchAllReports(
          search as string | undefined,
          status as 'new' | 'in_review' | 'completed' | undefined
        );
      } else {
        // Return only active reports
        const activeReports = await readActiveBugReports();

        // Apply status filter if provided
        if (status) {
          reports = activeReports.filter(r => r.status === status);
        } else {
          reports = activeReports;
        }

        // Validate reports with schema
        const validatedReports: BugReportRecord[] = [];
        for (const item of reports) {
          const result = BugReportRecordSchema.safeParse(item);
          if (result.success) {
            validatedReports.push(result.data);
          } else {
            console.error('Invalid bug report record, skipping:', result.error);
          }
        }
        reports = validatedReports;
      }

      res.status(200).json({
        success: true,
        reports,
        count: reports.length,
        archivalInfo: archivalResult.triggered ? archivalResult.result : undefined
      });
    } catch (error) {
      console.error('Failed to fetch bug reports:', error);
      res.status(500).json(createErrorResponse('BUG_REPORTS_FETCH_ERROR', 'Failed to fetch bug reports'));
    }
  });

  app.patch('/api/bug-reports/:id/status', requireClerkUser, requireAdmin, async (req, res) => {
    try {
      const id = req.params.id;
      const payload = BugReportStatusUpdateRequestSchema.parse(req.body);

      // Read all active reports
      const activeReports = await readActiveBugReports();
      const reportIndex = activeReports.findIndex(report => report.id === id);

      if (reportIndex === -1) {
        return res.status(404).json(createErrorResponse('NOT_FOUND', 'Bug report not found in active reports'));
      }

      // Update status
      activeReports[reportIndex].status = payload.status;

      // If marking as completed, add resolution timestamp
      if (payload.status === 'completed' && !activeReports[reportIndex].resolution) {
        activeReports[reportIndex].resolution = {
          resolvedAt: new Date().toISOString(),
          resolvedBy: 'Admin',
          fixDescription: 'Status updated to completed',
          filesModified: []
        };
      }

      // Save back to active file
      const bugReportsPath = path.join(process.cwd(), 'data', 'bugReports.json');
      const serialized = JSON.stringify(activeReports, null, 2);
      await fs.writeFile(bugReportsPath, serialized, 'utf8');

      res.status(200).json({ success: true, reportId: id, status: payload.status });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid status update request',
          error.errors
        ));
      }

      console.error('Failed to update bug report status:', error);
      res.status(500).json(createErrorResponse('BUG_REPORT_STATUS_UPDATE_ERROR', 'Failed to update bug report status'));
    }
  });

  // Get bug report statistics (active + archived)
  app.get('/api/bug-reports/stats', requireClerkUser, requireAdmin, async (req, res) => {
    try {
      const stats = await getBugReportStats();
      res.status(200).json({ success: true, stats });
    } catch (error) {
      console.error('Failed to get bug report stats:', error);
      res.status(500).json(createErrorResponse('BUG_REPORTS_STATS_ERROR', 'Failed to get bug report statistics'));
    }
  });

  // List available archive files
  app.get('/api/bug-reports/archives', requireClerkUser, requireAdmin, async (req, res) => {
    try {
      const archives = await listArchiveFiles();
      res.status(200).json({ success: true, archives });
    } catch (error) {
      console.error('Failed to list bug report archives:', error);
      res.status(500).json(createErrorResponse('BUG_REPORTS_ARCHIVES_ERROR', 'Failed to list archives'));
    }
  });

  // Get specific archive file contents
  app.get('/api/bug-reports/archives/:fileName', requireClerkUser, requireAdmin, async (req, res) => {
    try {
      const { fileName } = req.params;

      // Validate fileName to prevent directory traversal
      if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
        return res.status(400).json(createErrorResponse('INVALID_FILENAME', 'Invalid archive file name'));
      }

      const reports = await readArchive(fileName);
      res.status(200).json({ success: true, reports, count: reports.length, fileName });
    } catch (error) {
      console.error('Failed to read bug report archive:', error);
      res.status(500).json(createErrorResponse('BUG_REPORTS_ARCHIVE_READ_ERROR', 'Failed to read archive file'));
    }
  });

  // Developer tools endpoints
  app.get('/api/dev/markets-config', requireClerkUser, async (req, res) => {
    try {
      const marketsPath = path.join(process.cwd(), 'data', 'balance', 'markets.json');
      const configData = await fs.readFile(marketsPath, 'utf8');
      const config = JSON.parse(configData);
      res.json(config);
    } catch (error) {
      console.error('Failed to load markets config:', error);
      res.status(500).json({ error: 'Failed to load markets configuration' });
    }
  });

  app.post('/api/dev/markets-config', requireClerkUser, async (req, res) => {
    try {
      const { config } = req.body;

      if (!config) {
        return res.status(400).json({ error: 'Configuration data is required' });
      }

      // Validate the structure
      if (!config.market_formulas || !config.seasonal_modifiers) {
        return res.status(400).json({ error: 'Invalid configuration structure' });
      }

      const marketsPath = path.join(process.cwd(), 'data', 'balance', 'markets.json');
      const formattedConfig = JSON.stringify(config, null, 2);

      await fs.writeFile(marketsPath, formattedConfig, 'utf8');

      res.json({ success: true, message: 'Markets configuration updated successfully' });
    } catch (error) {
      console.error('Failed to save markets config:', error);
      res.status(500).json({ error: 'Failed to save markets configuration' });
    }
  });

  // Actions configuration endpoints (Admin only)
  app.get('/api/admin/actions-config', requireClerkUser, requireAdmin, async (req, res) => {
    try {
      const actionsPath = path.join(process.cwd(), 'data', 'actions.json');
      const configData = await fs.readFile(actionsPath, 'utf8');
      const config = JSON.parse(configData);
      res.json(config);
    } catch (error) {
      console.error('Failed to load actions config:', error);
      res.status(500).json({ error: 'Failed to load actions configuration' });
    }
  });

  app.post('/api/admin/actions-config', requireClerkUser, requireAdmin, async (req, res) => {
    try {
      const { config } = req.body;

      if (!config) {
        return res.status(400).json({ error: 'Configuration data is required' });
      }

      // Validate using the schema from gameDataLoader
      const actionsSchema = z.object({
        version: z.string(),
        generated: z.string().optional(),
        description: z.string().optional(),
        weekly_actions: z.array(z.object({
          id: z.string(),
          name: z.string(),
          type: z.string(),
          icon: z.string(),
          description: z.string().optional(),
          role_id: z.string().optional(),
          meeting_id: z.string().optional(),
          category: z.string(),
          project_type: z.string().optional(),
          campaign_type: z.string().optional(),
          prompt: z.string().optional(),
          prompt_before_selection: z.string().optional(),
          target_scope: z.enum(['global', 'predetermined', 'user_selected']).optional(),
          choices: z.array(z.any()).optional(),
          details: z.object({
            cost: z.string(),
            duration: z.string(),
            prerequisites: z.string(),
            outcomes: z.array(z.string()),
            benefits: z.array(z.string())
          }).optional(),
          recommendations: z.object({
            urgent_when: z.record(z.any()).optional(),
            recommended_when: z.record(z.any()).optional(),
            reasons: z.record(z.string()).optional()
          }).optional()
        }).passthrough()),
        action_categories: z.array(z.object({
          id: z.string(),
          name: z.string(),
          icon: z.string(),
          description: z.string(),
          color: z.string()
        })).optional()
      }).passthrough();

      // Validate the configuration
      try {
        actionsSchema.parse(config);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          return res.status(400).json({
            error: 'Invalid actions configuration structure',
            details: validationError.errors
          });
        }
        throw validationError;
      }

      const actionsPath = path.join(process.cwd(), 'data', 'actions.json');

      // Create backup before overwriting
      const backupPath = path.join(process.cwd(), 'data', 'actions.json.backup');
      try {
        const existingData = await fs.readFile(actionsPath, 'utf8');
        await fs.writeFile(backupPath, existingData, 'utf8');
        console.log('Created backup at', backupPath);
      } catch (backupError) {
        console.warn('Failed to create backup, continuing with save:', backupError);
      }

      // Write the new configuration
      const formattedConfig = JSON.stringify(config, null, 2);
      await fs.writeFile(actionsPath, formattedConfig, 'utf8');

      res.json({
        success: true,
        message: 'Actions configuration updated successfully',
        backupCreated: true
      });
    } catch (error) {
      console.error('Failed to save actions config:', error);
      res.status(500).json({
        error: 'Failed to save actions configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Streaming decay testing endpoint
  app.post('/api/game/:gameId/test/streaming-decay', requireClerkUser, async (req, res) => {
    try {
      const gameId = req.params.gameId;
      const {
        songQuality,
        artistPopularity,
        playlistAccess,
        reputation,
        marketingBudget,
        weeksToSimulate = 8,
        streamingConfig,
        awarenessConfig
      } = req.body;

      // Get game state for current week
      const [gameState] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
      if (!gameState) {
        return res.status(404).json({ error: 'Game not found' });
      }

      // Create mock song and release data for testing
      const mockSong = {
        id: 'test-song',
        quality: songQuality,
        releaseId: 'test-release',
        releaseWeek: gameState.currentWeek || 1,
        initialStreams: 0 // Will be calculated
      };

      const mockRelease = {
        id: 'test-release',
        releaseWeek: gameState.currentWeek || 1,
        metadata: {
          marketingBudgetBreakdown: marketingBudget,
          totalInvestment: Object.values(marketingBudget).reduce((a: number, b: unknown) => a + (typeof b === 'number' ? b : 0), 0)
        }
      };

      // Initialize storage mock for testing
      const storageMock = {
        getRelease: async (releaseId: string) => {
          if (releaseId === 'test-release') {
            return mockRelease;
          }
          return null;
        }
      };

      // Realistic streaming calculation that matches PlanReleasePage scale
      const calculateRealisticStreams = (quality: number, playlistAccess: string, reputation: number, popularity: number) => {
        // Base streaming formula scaled to match actual game values
        const qualityComponent = quality * 200; // Higher base for realistic numbers
        const playlistMultiplier = playlistAccess === 'arenas' ? 4.0 : playlistAccess === 'theaters' ? 2.5 : playlistAccess === 'clubs' ? 1.8 : 1.0;
        const playlistComponent = playlistMultiplier * 150;
        const reputationComponent = reputation * 100;
        const popularityComponent = popularity * 80;

        const baseStreams = qualityComponent + playlistComponent + reputationComponent + popularityComponent;
        const variance = 0.8 + (Math.random() * 0.4); // ±20% variance for more realistic spread
        const firstWeekMultiplier = 3.0; // Higher multiplier for realistic initial streams

        return Math.round(baseStreams * variance * firstWeekMultiplier);
      };

      // Load awareness system configuration (use custom config if provided)
      const balanceConfig = await serverGameData.getBalanceConfig();
      const defaultAwarenessConfig = balanceConfig?.market_formulas?.awareness_system;
      const finalAwarenessConfig = awarenessConfig || defaultAwarenessConfig;

      // Calculate awareness gain for a song based on marketing spend and channel coefficients
      const calculateAwarenessGain = (songQuality: number, artistPopularity: number, marketingBudget: any) => {
        if (!finalAwarenessConfig?.enabled) return 0;

        const channelCoefficients = finalAwarenessConfig.channel_awareness_coefficients || {
          radio: 0.1,
          digital: 0.2,
          pr: 0.4,
          influencer: 0.3
        };

        const perUnitSpend = finalAwarenessConfig.per_unit_spend || 1000;

        // Calculate base awareness gain from marketing channels
        let awarenessGain = 0;

        // Radio awareness contribution
        const radioSpend = marketingBudget.radio || 0;
        if (radioSpend > 0) {
          awarenessGain += (radioSpend / perUnitSpend) * channelCoefficients.radio;
        }

        // Digital awareness contribution
        const digitalSpend = marketingBudget.digital || 0;
        if (digitalSpend > 0) {
          awarenessGain += (digitalSpend / perUnitSpend) * channelCoefficients.digital;
        }

        // PR awareness contribution
        const prSpend = marketingBudget.pr || 0;
        if (prSpend > 0) {
          awarenessGain += (prSpend / perUnitSpend) * channelCoefficients.pr;
        }

        // Influencer awareness contribution
        const influencerSpend = marketingBudget.influencer || 0;
        if (influencerSpend > 0) {
          awarenessGain += (influencerSpend / perUnitSpend) * channelCoefficients.influencer;
        }

        // Apply quality multiplier
        const qualityMultiplier = songQuality / 100;
        awarenessGain *= qualityMultiplier;

        // Apply artist popularity bonus
        const popularityBonus = 1 + (artistPopularity / 200);
        awarenessGain *= popularityBonus;

        // Cap awareness gain at 25 points per week
        return Math.min(awarenessGain, 25);
      };

      // Calculate marketing boost factor for a given week
      const calculateMarketingBoost = (weeksSinceRelease: number, marketingBudget: any) => {
        if (weeksSinceRelease < 2 || weeksSinceRelease > 4) return 1.0;

        let totalBoost = 1.0;

        // Radio: 85% effectiveness, sustained discovery
        const radioSpend = marketingBudget.radio || 0;
        if (radioSpend > 0) {
          totalBoost += (radioSpend / 10000) * 0.85 * 0.2;
        }

        // Digital: 92% effectiveness, algorithm feeding
        const digitalSpend = marketingBudget.digital || 0;
        if (digitalSpend > 0) {
          totalBoost += (digitalSpend / 8000) * 0.92 * 0.25;
        }

        // PR: 78% effectiveness, peaks in week 3
        const prSpend = marketingBudget.pr || 0;
        if (prSpend > 0) {
          const prWeekMultiplier = weeksSinceRelease === 3 ? 1.2 : 0.8;
          totalBoost += (prSpend / 6000) * 0.78 * 0.3 * prWeekMultiplier;
        }

        // Influencer: 88% effectiveness, social momentum
        const influencerSpend = marketingBudget.influencer || 0;
        if (influencerSpend > 0) {
          totalBoost += (influencerSpend / 5000) * 0.88 * 0.22;
        }

        return Math.min(totalBoost, 1.5); // Cap at 50% boost
      };

      const initialStreams = calculateRealisticStreams(songQuality, playlistAccess, reputation, artistPopularity);

      // Initialize awareness tracking
      let currentAwareness = 0;
      let peakAwareness = 0;
      let breakthroughAchieved = false;

      // Calculate progression for each week
      const results = [];
      for (let week = 1; week <= weeksToSimulate; week++) {
        const weeksSinceRelease = week;

        // Awareness processing
        let awarenessGain = 0;
        let awarenessDecay = 0;
        let awarenessModifier = 1.0;
        let breakthroughPotential = 0;

        if (weeksSinceRelease >= 1 && weeksSinceRelease <= 4) {
          // Awareness Building Phase (Weeks 1-4)
          awarenessGain = calculateAwarenessGain(songQuality, artistPopularity, marketingBudget);
          currentAwareness = Math.min(currentAwareness + awarenessGain, 100);
          peakAwareness = Math.max(peakAwareness, currentAwareness);

          // Calculate breakthrough potential
          if (finalAwarenessConfig?.enabled) {
            const thresholds = finalAwarenessConfig.breakthrough_thresholds || {};
            if (songQuality >= 80) {
              breakthroughPotential = Math.min(currentAwareness / 40, 1) * 0.65;
            } else if (songQuality >= 70) {
              breakthroughPotential = Math.min(currentAwareness / 60, 1) * 0.35;
            } else {
              breakthroughPotential = Math.min(currentAwareness / 80, 1) * 0.15;
            }

            // Roll for breakthrough achievement (deterministic for testing)
            if (!breakthroughAchieved && breakthroughPotential > 0) {
              // Use week-based seed for deterministic results across runs
              const seed = songQuality + artistPopularity + week + currentAwareness;
              const random = (Math.sin(seed) + 1) / 2; // Deterministic pseudo-random [0,1]

              if (random < breakthroughPotential) {
                breakthroughAchieved = true;

                // BREAKTHROUGH EFFECTS: Apply awareness explosion
                const breakthroughEffects = finalAwarenessConfig.breakthrough_effects || {};
                const awarenessMultiplier = breakthroughEffects.awareness_multiplier || 2.5;
                currentAwareness = Math.min(currentAwareness * awarenessMultiplier, 100);
                peakAwareness = Math.max(peakAwareness, currentAwareness);
              }
            }
          }
        } else if (weeksSinceRelease >= 5 && currentAwareness > 0) {
          // Awareness Decay Phase (Weeks 5+)
          if (finalAwarenessConfig?.enabled) {
            const decayRates = finalAwarenessConfig.awareness_decay_rates || {};
            let decayRate = breakthroughAchieved
              ? (decayRates.breakthrough_songs || 0.03)
              : (decayRates.standard_songs || 0.05);

            // Apply quality bonus reduction for high-quality songs
            if (songQuality >= (decayRates.quality_bonus_threshold || 85)) {
              decayRate = Math.max(0, decayRate - (decayRates.quality_bonus_reduction || 0.01));
            }

            awarenessDecay = currentAwareness * decayRate;
            currentAwareness = Math.max(0, currentAwareness - awarenessDecay);

            // Apply awareness modifier for sustained impact
            const impactFactors = finalAwarenessConfig.awareness_impact_factors || {};
            let impactFactor = 0;
            if (weeksSinceRelease >= 7) {
              impactFactor = impactFactors.weeks_7_plus || 0.5;
            } else { // weeks 5-6
              impactFactor = impactFactors.weeks_3_6 || 0.3;
            }

            awarenessModifier = 1.0 + (currentAwareness / 100) * impactFactor;

            // Cap awareness modifier to prevent runaway multipliers
            const maxModifier = finalAwarenessConfig.max_awareness_modifier || 2.0;
            awarenessModifier = Math.min(awarenessModifier, maxModifier);
          }
        }

        // Base decay calculation (use custom config if provided)
        let decayRate = streamingConfig?.weekly_decay_rate || 0.85;

        // BREAKTHROUGH EFFECT: Enhanced decay rate for breakthrough songs
        if (breakthroughAchieved && finalAwarenessConfig?.enabled) {
          const breakthroughEffects = finalAwarenessConfig.breakthrough_effects || {};
          decayRate = breakthroughEffects.enhanced_decay_rate || 0.92;
        }

        const ongoingFactor = streamingConfig?.ongoing_factor || 0.8;
        const reputationBonus = 1 + (reputation - 50) * (streamingConfig?.reputation_bonus_factor || 0.002);
        const accessBonus = 1 + (playlistAccess === 'arenas' ? 3.0 : playlistAccess === 'theaters' ? 2.0 : playlistAccess === 'clubs' ? 1.5 : 1.0 - 1) * (streamingConfig?.access_tier_bonus_factor || 0.1);

        // Calculate base streaming with appropriate decay rate
        let baseStreams;

        // BREAKTHROUGH EFFECT: Stream growth during breakthrough period
        if (breakthroughAchieved && finalAwarenessConfig?.enabled) {
          const breakthroughEffects = finalAwarenessConfig.breakthrough_effects || {};
          const streamGrowthDuration = breakthroughEffects.stream_growth_duration || 4;

          if (weeksSinceRelease <= streamGrowthDuration) {
            // Stream growth phase: 20-40% increase instead of decay
            const growthRate = 1.2 + (Math.random() * 0.2); // 1.2x to 1.4x growth
            const growthDecay = Math.pow(growthRate, weeksSinceRelease - 1); // Growth instead of decay
            baseStreams = initialStreams * growthDecay * reputationBonus * accessBonus * ongoingFactor;
          } else {
            // After growth phase, use enhanced decay rate
            const postGrowthWeeks = weeksSinceRelease - streamGrowthDuration;
            const baseDecay = Math.pow(decayRate, postGrowthWeeks);
            // Apply growth peak as new baseline
            const peakStreams = initialStreams * Math.pow(1.3, streamGrowthDuration - 1); // Use average 1.3x growth
            baseStreams = peakStreams * baseDecay * reputationBonus * accessBonus * ongoingFactor;
          }
        } else {
          // Standard decay calculation
          const baseDecay = Math.pow(decayRate, weeksSinceRelease);
          baseStreams = initialStreams * baseDecay * reputationBonus * accessBonus * ongoingFactor;
        }

        // Calculate with marketing boost
        const marketingBoost = calculateMarketingBoost(weeksSinceRelease, marketingBudget);
        baseStreams *= marketingBoost;

        // Apply awareness modifier for weeks 5+
        if (weeksSinceRelease >= 5) {
          baseStreams *= awarenessModifier;
        }

        const withMarketing = Math.round(baseStreams);

        // Calculate withoutMarketing baseline (for comparison)
        let withoutMarketingStreams;
        if (breakthroughAchieved && finalAwarenessConfig?.enabled) {
          const breakthroughEffects = finalAwarenessConfig.breakthrough_effects || {};
          const streamGrowthDuration = breakthroughEffects.stream_growth_duration || 4;

          if (weeksSinceRelease <= streamGrowthDuration) {
            const growthRate = 1.3; // Use average growth for baseline
            const growthDecay = Math.pow(growthRate, weeksSinceRelease - 1);
            withoutMarketingStreams = initialStreams * growthDecay * reputationBonus * accessBonus * ongoingFactor;
          } else {
            const postGrowthWeeks = weeksSinceRelease - streamGrowthDuration;
            const baseDecay = Math.pow(decayRate, postGrowthWeeks);
            const peakStreams = initialStreams * Math.pow(1.3, streamGrowthDuration - 1);
            withoutMarketingStreams = peakStreams * baseDecay * reputationBonus * accessBonus * ongoingFactor;
          }
        } else {
          const standardDecayRate = streamingConfig?.weekly_decay_rate || 0.85;
          const baseDecay = Math.pow(standardDecayRate, weeksSinceRelease);
          withoutMarketingStreams = initialStreams * baseDecay * reputationBonus * accessBonus * ongoingFactor;
        }

        const withoutMarketing = Math.round(withoutMarketingStreams);

        results.push({
          week,
          withMarketing,
          withoutMarketing,
          marketingBoost,
          weeksSinceRelease,
          awareness: Math.round(currentAwareness),
          awarenessGain,
          awarenessDecay,
          awarenessModifier,
          breakthroughPotential
        });
      }

      res.json({
        success: true,
        results,
        initialStreams,
        parameters: {
          songQuality,
          artistPopularity,
          playlistAccess,
          reputation,
          marketingBudget,
          totalMarketingBudget: Object.values(marketingBudget).reduce((a: number, b: unknown) => a + (typeof b === 'number' ? b : 0), 0)
        }
      });

    } catch (error: any) {
      console.error('[STREAMING TEST] Error:', error);
      res.status(500).json({
        error: 'STREAMING_TEST_FAILED',
        message: error.message || 'Failed to calculate streaming progression'
      });
    }
  });

  // Balance data endpoint
  app.get('/api/game/:gameId/balance', requireClerkUser, async (req, res) => {
    try {
      const balance = await serverGameData.getBalanceConfig();
      res.json({ balance });
    } catch (error: any) {
      console.error('[BALANCE] Failed to load balance data:', error);
      res.status(500).json({
        error: 'BALANCE_LOAD_FAILED',
        message: error.message || 'Failed to load balance configuration'
      });
    }
  });

  // Register analytics routes
  app.use('/api/analytics', requireClerkUser, analyticsRouter);

  const httpServer = createServer(app);
  return httpServer;
}
