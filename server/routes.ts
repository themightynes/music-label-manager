import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from 'passport';
import { storage } from "./storage";
import { insertGameStateSchema, insertGameSaveSchema, insertArtistSchema, insertProjectSchema, insertMonthlyActionSchema, gameStates, monthlyActions, projects, songs } from "@shared/schema";
import { z } from "zod";
import { serverGameData } from "./data/gameData";
import { gameDataLoader } from "@shared/utils/dataLoader";
import { GameEngine } from "../shared/engine/game-engine";
import { 
  AdvanceMonthRequest, 
  AdvanceMonthResponse,
  SelectActionsRequest,
  SelectActionsResponse,
  validateRequest,
  createErrorResponse 
} from "@shared/api/contracts";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireAuth, getUserId, registerUser, loginUser, registerSchema, loginSchema } from './auth';

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication endpoints
  app.post('/api/auth/register', async (req, res) => {
    try {
      const user = await registerUser(req.body.username, req.body.password);
      res.json({ 
        success: true, 
        user: { id: user.id, username: user.username } 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid input', errors: error.errors });
      } else {
        res.status(400).json({ message: error instanceof Error ? error.message : 'Registration failed' });
      }
    }
  });

  app.post('/api/auth/login', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: 'Authentication error' });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || 'Login failed' });
      }
      
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Login session error' });
        }
        return res.json({ 
          success: true, 
          user: { id: user.id, username: user.username } 
        });
      });
    })(req, res, next);
  });

  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout error' });
      }
      res.json({ success: true });
    });
  });

  app.get('/api/auth/me', (req, res) => {
    if (req.user) {
      res.json({ 
        user: { 
          id: (req.user as any).id, 
          username: (req.user as any).username 
        } 
      });
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });
  
  // Data verification endpoints
  app.get("/api/test-data", async (req, res) => {
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

  app.get("/api/validate-types", async (req, res) => {
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
  app.get("/api/game/:id", getUserId, async (req, res) => {
    try {
      const gameState = await storage.getGameState(req.params.id);
      if (!gameState) {
        return res.status(404).json({ message: "Game not found" });
      }
      
      // Get related data
      const artists = await storage.getArtistsByGame(gameState.id);
      const projects = await storage.getProjectsByGame(gameState.id);
      const roles = await storage.getRolesByGame(gameState.id);
      const monthlyActions = await storage.getMonthlyActions(gameState.id, gameState.currentMonth || 1);
      
      res.json({
        gameState,
        artists,
        projects,
        roles,
        monthlyActions
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch game data" });
    }
  });

  app.post("/api/game", getUserId, async (req, res) => {
    try {
      const validatedData = insertGameStateSchema.parse(req.body);
      
      // Set starting money from balance.json configuration
      const startingMoney = await serverGameData.getStartingMoney();
      const gameDataWithBalance = {
        ...validatedData,
        money: startingMoney
      };
      
      const gameState = await storage.createGameState(gameDataWithBalance);
      
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
      // For now, returning basic game state
      
      res.json(gameState);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid game data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create game" });
      }
    }
  });

  app.patch("/api/game/:id", getUserId, async (req, res) => {
    try {
      const gameState = await storage.updateGameState(req.params.id, req.body);
      res.json(gameState);
    } catch (error) {
      res.status(500).json({ message: "Failed to update game state" });
    }
  });

  // Artist routes
  app.post("/api/game/:gameId/artists", getUserId, async (req, res) => {
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
      
      // Prepare artist data
      const validatedData = insertArtistSchema.parse({
        ...req.body,
        gameId: gameId
      });
      
      // Create artist and deduct money in a transaction-like operation
      const artist = await storage.createArtist(validatedData);
      
      // Update game state to deduct signing cost and track artist count
      if (signingCost > 0) {
        await storage.updateGameState(gameId, {
          money: Math.max(0, (gameState.money || 0) - signingCost)
        });
      }
      
      // Update artist count flag for GameEngine monthly costs
      const currentArtists = await storage.getArtistsByGame(gameId);
      const flags = gameState.flags || {};
      (flags as any)['signed_artists_count'] = currentArtists.length + 1; // +1 for the new artist
      await storage.updateGameState(gameId, { flags });
      
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

  app.patch("/api/artists/:id", getUserId, async (req, res) => {
    try {
      const artist = await storage.updateArtist(req.params.id, req.body);
      res.json(artist);
    } catch (error) {
      res.status(500).json({ message: "Failed to update artist" });
    }
  });

  // Project routes
  app.post("/api/game/:gameId/projects", getUserId, async (req, res) => {
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
      
      console.log('[PROJECT CREATION] Validated data after schema parse:', JSON.stringify({
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
      
      const project = await storage.createProject(validatedData);
      
      console.log('[PROJECT CREATION] Project created in database:', JSON.stringify({
        id: project.id,
        title: project.title,
        type: project.type,
        budgetPerSong: project.budgetPerSong,
        totalCost: project.totalCost,
        songCount: project.songCount,
        producerTier: project.producerTier,
        timeInvestment: project.timeInvestment,
        artistId: project.artistId
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

  app.patch("/api/projects/:id", getUserId, async (req, res) => {
    try {
      const project = await storage.updateProject(req.params.id, req.body);
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // Monthly action routes
  app.post("/api/game/:gameId/actions", getUserId, async (req, res) => {
    try {
      const validatedData = insertMonthlyActionSchema.parse({
        ...req.body,
        gameId: req.params.gameId
      });
      const action = await storage.createMonthlyAction(validatedData);
      res.json(action);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid action data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create action" });
      }
    }
  });

  // OLD ENDPOINT REMOVED - Use /api/advance-month instead
  // This endpoint did not have 12-month campaign completion logic

  // Save game routes
  app.get("/api/saves", getUserId, async (req, res) => {
    try {
      const saves = await storage.getGameSaves(req.userId!);
      res.json(saves);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch saves" });
    }
  });

  app.post("/api/saves", getUserId, async (req, res) => {
    try {
      const validatedData = insertGameSaveSchema.parse(req.body);
      // Add userId from middleware
      const saveDataWithUserId = {
        ...validatedData,
        userId: req.userId!
      };
      const save = await storage.createGameSave(saveDataWithUserId);
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





  // Role endpoints for dialogue system
  app.get("/api/roles/:roleId", async (req, res) => {
    try {
      const role = await serverGameData.getRoleById(req.params.roleId);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      res.json(role);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch role data" });
    }
  });

  app.get("/api/roles/:roleId/meetings/:meetingId", async (req, res) => {
    try {
      const meeting = await serverGameData.getRoleMeetingById(req.params.roleId, req.params.meetingId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      res.json(meeting);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch meeting data" });
    }
  });

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
  app.get("/api/game/:gameId/songs", getUserId, async (req, res) => {
    try {
      const songs = await serverGameData.getSongsByGame(req.params.gameId);
      res.json(songs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch songs" });
    }
  });

  // Get songs for a specific artist
  app.get("/api/game/:gameId/artists/:artistId/songs", getUserId, async (req, res) => {
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
      const songs = await serverGameData.getSongsByArtist(artistId, gameId);
      console.log('[API] Found songs:', songs?.length || 0);
      
      // Ensure we always return an array, even if no songs found
      const songArray = Array.isArray(songs) ? songs : [];
      res.json(songArray);
      
    } catch (error) {
      console.error('[API] Error fetching artist songs:', error);
      res.status(500).json({ 
        message: "Failed to fetch artist songs", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Get releases for a game
  app.get("/api/game/:gameId/releases", getUserId, async (req, res) => {
    try {
      const releases = await serverGameData.getReleasesByGame(req.params.gameId);
      res.json(releases);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch releases" });
    }
  });

  // Create a new release (Single/EP/Album)
  app.post("/api/game/:gameId/releases", getUserId, async (req, res) => {
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
          startMonth: p.startMonth,
          metadata: p.metadata
        })),
        songs: allSongs.map(s => ({
          id: s.id,
          title: s.title,
          artistId: s.artistId,
          quality: s.quality,
          isRecorded: s.isRecorded,
          isReleased: s.isReleased,
          createdMonth: s.createdMonth,
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

  // Phase 2: Turn System Endpoints
  
  // Get current game state  
  app.get("/api/game-state", getUserId, async (req, res) => {
    try {
      const userId = req.userId!;
      
      // Debug: Get all games for this user to see what's happening
      const allGames = await db
        .select()
        .from(gameStates)
        .where(eq(gameStates.userId, userId))
        .orderBy(desc(gameStates.currentMonth), desc(gameStates.updatedAt));

      console.log('All games for user:', allGames.map(g => ({ 
        id: g.id.substring(0, 8), 
        month: g.currentMonth, 
        money: g.money,
        updatedAt: g.updatedAt 
      })));

      if (allGames.length > 0) {
        return res.json(allGames[0]);
      }

      // Create new game state for user
      // Get starting money from balance configuration
      const startingMoney = await serverGameData.getStartingMoney();
      
      const defaultState = {
        userId: userId,
          currentMonth: 1,
          money: startingMoney,
          reputation: 5,
          creativeCapital: 10,
          focusSlots: 3,
          usedFocusSlots: 0,
          playlistAccess: "none",
          pressAccess: "none",
          venueAccess: "none",
          campaignType: "standard",
          rngSeed: Math.random().toString(36).substring(7),
          flags: {},
          monthlyStats: {}
        };
        
        const gameState = await storage.createGameState(defaultState);
        return res.json(gameState);
    } catch (error) {
      console.error('Get game state error:', error);
      res.status(500).json({ message: "Failed to fetch game state" });
    }
  });


  // Month advancement with action processing using GameEngine and transactions
  app.post("/api/advance-month", getUserId, async (req, res) => {
    try {
      // Validate request using shared contract
      const request = validateRequest(AdvanceMonthRequest, req.body);
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
        
        // Get starting money from balance configuration
        const startingMoney = await serverGameData.getStartingMoney();
        
        // Convert database gameState to proper GameState type
        const gameStateForEngine = {
          ...gameState,
          currentMonth: gameState.currentMonth || 1,
          money: gameState.money || startingMoney,
          reputation: gameState.reputation || 5,
          creativeCapital: gameState.creativeCapital || 10,
          focusSlots: gameState.focusSlots || 3,
          usedFocusSlots: gameState.usedFocusSlots || 0,
          playlistAccess: gameState.playlistAccess || 'none',
          pressAccess: gameState.pressAccess || 'none',
          venueAccess: gameState.venueAccess || 'none',
          campaignType: gameState.campaignType || 'standard',
          rngSeed: gameState.rngSeed || Math.random().toString(36).substring(7),
          flags: gameState.flags || {},
          monthlyStats: gameState.monthlyStats || {}
        };
        
        // Check if campaign is already completed before creating engine
        if (gameState.campaignCompleted) {
          // Return campaign results without advancing month
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
            summary: 'Your 12-month campaign has ended. Time to start fresh!',
            achievements: ['📅 Campaign Completed']
          };
          
          return {
            gameState: gameStateForEngine,
            summary: {
              month: gameState.currentMonth || 14,
              changes: [],
              revenue: 0,
              expenses: 0,
              reputationChanges: {},
              events: []
            },
            campaignResults
          };
        }

        // Initialize game data to load balance configuration
        await serverGameData.initialize();
        
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
        console.log('[ADVANCE MONTH] Starting month advancement processing');
        console.log('[ADVANCE MONTH] Current month:', gameStateForEngine.currentMonth);
        console.log('='.repeat(80));

        // Create GameEngine instance for this game state
        let gameEngine: GameEngine;
        try {
          console.log('[DEBUG] Creating GameEngine instance...');
          gameEngine = new GameEngine(gameStateForEngine, serverGameData);
          console.log('[DEBUG] GameEngine created successfully');
        } catch (error) {
          console.error('[ERROR] Failed to create GameEngine:', error);
          throw new Error(`GameEngine initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        // Use GameEngine for business logic - convert selectedActions to proper format
        let monthResult: Awaited<ReturnType<GameEngine['advanceMonth']>> | undefined;
        try {
          console.log('[DEBUG] Processing month advancement...');
          const formattedActions = selectedActions.map(action => ({
            actionType: action.actionType,
            targetId: action.targetId,
            metadata: action.metadata || {},
            details: action.metadata || {} // Convert metadata to details for compatibility
          }));
          console.log('[DEBUG] Formatted actions:', JSON.stringify(formattedActions, null, 2));
          
          // PRE-PROCESSING: Only handle basic planning -> production advancement
          console.log('[DEBUG] === PROJECT PRE-ADVANCEMENT (BASIC) ===');
          const currentMonth = (gameStateForEngine.currentMonth || 1) + 1; // Next month after advancement
          const projectsToAdvance = await tx
            .select()
            .from(projects)
            .where(eq(projects.gameId, gameId));

          for (const project of projectsToAdvance) {
            const stages = ['planning', 'production', 'marketing', 'released'];
            const currentStageIndex = stages.indexOf(project.stage || 'planning');
            const monthsElapsed = currentMonth - (project.startMonth || 1);
            
            // Only handle planning -> production (doesn't depend on songsCreated)
            if (currentStageIndex === 0 && monthsElapsed >= 1) {
              console.log(`[DEBUG] Advancing ${project.title} from planning to production`);
              await tx
                .update(projects)
                .set({ 
                  stage: 'production',
                  quality: Math.min(100, (project.quality || 0) + 25)
                })
                .where(eq(projects.id, project.id));
            }
          }
          console.log('[DEBUG] === PROJECT PRE-ADVANCEMENT (BASIC) COMPLETE ===');
          
          // Song release processing moved to post-GameEngine advancement (below)
          console.log('[DEBUG] === SONG RELEASE PROCESSING MOVED TO POST-ENGINE ===');
          
          // Now execute GameEngine with the updated project states within the same transaction
          console.log('[DEBUG] Starting GameEngine processing...');
          monthResult = await gameEngine.advanceMonth(formattedActions, tx); // Pass transaction context
          console.log('[DEBUG] Month advancement completed successfully');
          
          // CRITICAL FIX: Re-read projects after GameEngine to get updated songsCreated values
          console.log('[DEBUG] === POST-GAMEENGINE PROJECT ADVANCEMENT ===');
          const updatedProjectsAfterEngine = await tx
            .select()
            .from(projects)
            .where(eq(projects.gameId, gameId));

          for (const project of updatedProjectsAfterEngine) {
            const currentMonth = monthResult.gameState.currentMonth || 1;
            const stages = ['planning', 'production', 'marketing', 'released'];
            const currentStageIndex = stages.indexOf(project.stage || 'planning');
            const monthsElapsed = currentMonth - (project.startMonth || 1);
            const isRecordingProject = ['Single', 'EP'].includes(project.type || '');
            const songCount = project.songCount || 1;
            const songsCreated = project.songsCreated || 0; // NOW gets updated value from GameEngine
            const allSongsCreated = songsCreated >= songCount;
            
            console.log(`[DEBUG] Post-engine advancement check for ${project.title}:`, {
              projectId: project.id,
              currentStageIndex,
              monthsElapsed,
              isRecordingProject,
              songCount,
              songsCreated,
              allSongsCreated,
              currentStage: stages[currentStageIndex],
              artistId: project.artistId,
              gameEngineExists: !!gameEngine
            });
            
            let newStageIndex = currentStageIndex;
            
            // Use the UPDATED songsCreated value for advancement logic
            if (currentStageIndex === 1) { // production -> marketing
              if (!isRecordingProject) {
                if (monthsElapsed >= 2) newStageIndex = 2;
              } else {
                // Now using CORRECT songsCreated value after GameEngine updates
                if (allSongsCreated && monthsElapsed >= 2) {
                  newStageIndex = 2;
                  console.log(`[DEBUG] Recording project ${project.title} completed all songs (${songsCreated}/${songCount}), advancing to marketing`);
                } else if (monthsElapsed >= 4) { // Max 4 months in production
                  newStageIndex = 2;
                  console.log(`[DEBUG] Forcing ${project.title} to marketing after 4 months (${songsCreated}/${songCount} songs created)`);
                } else {
                  console.log(`[DEBUG] Keeping ${project.title} in production for song generation (${songsCreated}/${songCount} songs, ${monthsElapsed} months)`);
                }
              }
            } else if (monthsElapsed >= 3 && currentStageIndex === 2) { // marketing -> released
              newStageIndex = 3;
            }
            
            if (newStageIndex > currentStageIndex) {
              console.log(`[DEBUG] Post-engine advancement: ${project.title} ${stages[currentStageIndex]} -> ${stages[newStageIndex]}`);
              
              // Prepare update data
              const updateData: any = { 
                stage: stages[newStageIndex],
                quality: Math.min(100, (project.quality || 0) + 25)
              };
              
              // If advancing to released stage, track release month in metadata
              if (stages[newStageIndex] === 'released') {
                const existingMetadata = project.metadata || {};
                updateData.metadata = {
                  ...existingMetadata,
                  releaseMonth: monthResult.gameState.currentMonth,
                  releasedAt: new Date().toISOString()
                };
                console.log(`[PROJECT STAGE] Marking project "${project.title}" as released in month ${monthResult.gameState.currentMonth}`);
              }
              
              await tx
                .update(projects)
                .set(updateData)
                .where(eq(projects.id, project.id));
              
              // Project stage advancement completed - GameEngine will handle song releases during monthly advancement
              console.log(`[PROJECT STAGE] Project "${project.title}" advanced to stage: ${stages[newStageIndex]} - GameEngine will process songs during monthly advancement`);
            }
          }
          console.log('[DEBUG] === POST-GAMEENGINE PROJECT ADVANCEMENT COMPLETE ===');
        } catch (engineError) {
          console.error('[ERROR] GameEngine processing failed:', engineError);
          throw new Error(`Month advancement failed: ${engineError instanceof Error ? engineError.message : 'Unknown error'}`);
        }
        
        return { gameStateForEngine, monthResult };
      }); // End the first transaction here
      
      console.log('[DEBUG] Project advancement transaction committed');
      
      // Destructure the result from the first transaction
      const { gameStateForEngine, monthResult } = result;
      
      // Ensure monthResult is defined (it should always be due to the throw in catch block)
      if (!monthResult) {
        throw new Error('Month advancement failed: No result returned from GameEngine');
      }
        
      // Now continue with the rest of the transaction for final updates
      const finalResult = await db.transaction(async (tx) => {
          
          // Update game state in database
          const [updatedGameState] = await tx
          .update(gameStates)
          .set({
            currentMonth: monthResult.gameState.currentMonth,
            money: monthResult.gameState.money,
            reputation: monthResult.gameState.reputation,
            creativeCapital: monthResult.gameState.creativeCapital,
            usedFocusSlots: monthResult.gameState.usedFocusSlots,
            playlistAccess: monthResult.gameState.playlistAccess,
            pressAccess: monthResult.gameState.pressAccess,
            venueAccess: monthResult.gameState.venueAccess,
            campaignCompleted: monthResult.gameState.campaignCompleted,
            flags: monthResult.gameState.flags,
            monthlyStats: monthResult.gameState.monthlyStats,
            updatedAt: new Date()
          })
          .where(eq(gameStates.id, gameId))
          .returning();
        
        // Save monthly actions
        if (selectedActions.length > 0) {
          await tx.insert(monthlyActions).values(
            selectedActions.map(action => ({
              id: crypto.randomUUID(),
              gameId,
              month: (monthResult.gameState.currentMonth || 1) - 1, // Previous month
              actionType: action.actionType,
              targetId: action.targetId ? (action.targetId.length === 36 && action.targetId.includes('-')) ? action.targetId : null : null, // Only use if it's a valid UUID
              results: {
                revenue: monthResult.summary.revenue / selectedActions.length,
                expenses: monthResult.summary.expenses / selectedActions.length
              },
              createdAt: new Date()
            }))
          );
        }

        // POST-PROCESSING: Song releases now handled entirely by GameEngine
        console.log('[DEBUG] === POST-PROCESSING: SONG RELEASES HANDLED BY GAMEENGINE ===');
        console.log('[DEBUG] Routes.ts no longer processes individual song releases - GameEngine handles all song revenue processing');
        
        // Update released projects with ongoing revenue metadata
        try {
          console.log('[DEBUG] Updating released projects with ongoing revenue metadata...');
          const processedReleasedProjects = (monthResult.gameState.flags as any)?.['released_projects'] || [];
          console.log('[DEBUG] Found', processedReleasedProjects.length, 'processed released projects');
          
          for (const processedProject of processedReleasedProjects) {
            if (processedProject.metadata?.lastMonthRevenue && processedProject.metadata.lastMonthRevenue > 0) {
              console.log(`[DEBUG] Updating metadata for project ${processedProject.id} with revenue ${processedProject.metadata.lastMonthRevenue}`);
              
              try {
                // Update the project metadata in the database
                await tx
                  .update(projects)
                  .set({
                    metadata: {
                      ...processedProject.metadata
                    }
                  })
                  .where(eq(projects.id, processedProject.id));
                console.log(`[DEBUG] Successfully updated project ${processedProject.id} metadata`);
              } catch (projectUpdateError) {
                console.error(`[ERROR] Failed to update project ${processedProject.id} metadata:`, projectUpdateError);
                throw new Error(`Failed to update project metadata: ${projectUpdateError instanceof Error ? projectUpdateError.message : 'Unknown error'}`);
              }
            }
          }
          console.log('[DEBUG] Completed updating released projects metadata');
        } catch (error) {
          console.error('[ERROR] Failed during released projects metadata update:', error);
          throw new Error(`Released projects update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
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
              gameEngineExecuted: !!monthResult,
              monthResultSummary: !!monthResult.summary,
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

          // Song release changes now handled by GameEngine during monthly processing
          console.log('[DEBUG] Song release revenue now processed by GameEngine, not routes.ts');

          return {
            gameState: updatedGameState,
            summary: monthResult.summary,
            campaignResults: monthResult.campaignResults,
            debug: debugInfo
          };
        });
      
      res.json(finalResult);
    } catch (error) {
      console.error('=== ADVANCE MONTH ERROR ===');
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
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to advance month';
      console.error('Sending error response:', errorMessage);
      
      res.status(500).json(createErrorResponse(
        'ADVANCE_MONTH_ERROR',
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
        
        // Get starting money from balance configuration
        const startingMoney = await serverGameData.getStartingMoney();
        
        // Convert database gameState to proper GameState type
        const gameStateForEngine = {
          ...gameState,
          currentMonth: gameState.currentMonth || 1,
          money: gameState.money || startingMoney,
          reputation: gameState.reputation || 5,
          creativeCapital: gameState.creativeCapital || 10,
          focusSlots: gameState.focusSlots || 3,
          usedFocusSlots: gameState.usedFocusSlots || 0,
          playlistAccess: gameState.playlistAccess || 'none',
          pressAccess: gameState.pressAccess || 'none',
          venueAccess: gameState.venueAccess || 'none',
          campaignType: gameState.campaignType || 'standard',
          rngSeed: gameState.rngSeed || Math.random().toString(36).substring(7),
          flags: gameState.flags || {},
          monthlyStats: gameState.monthlyStats || {}
        };
        
        // Create GameEngine instance and update action selection
        const gameEngine = new GameEngine(gameStateForEngine, serverGameData);
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


  const httpServer = createServer(app);
  return httpServer;
}
