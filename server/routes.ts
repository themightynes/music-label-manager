import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from 'passport';
import { storage } from "./storage";
import { insertGameStateSchema, insertGameSaveSchema, insertArtistSchema, insertProjectSchema, insertMonthlyActionSchema, gameStates, monthlyActions } from "@shared/schema";
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
import { eq, desc } from "drizzle-orm";
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
      const gameState = await storage.createGameState(validatedData);
      
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
      const validatedData = insertArtistSchema.parse({
        ...req.body,
        gameId: req.params.gameId
      });
      const artist = await storage.createArtist(validatedData);
      res.json(artist);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid artist data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create artist" });
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
      const validatedData = insertProjectSchema.parse({
        ...req.body,
        gameId: req.params.gameId
      });
      const project = await storage.createProject(validatedData);
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
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

  // Turn advancement
  app.post("/api/game/:id/advance-month", getUserId, async (req, res) => {
    try {
      const gameState = await storage.getGameState(req.params.id);
      if (!gameState) {
        return res.status(404).json({ message: "Game not found" });
      }

      // Process monthly actions and update game state
      const actions = await storage.getMonthlyActions(gameState.id, gameState.currentMonth || 1);
      
      // Calculate monthly outcomes (simplified for MVP)
      const monthlyOutcome = {
        revenue: Math.floor(Math.random() * 10000),
        expenses: Math.floor(Math.random() * 5000),
        reputationChange: Math.floor(Math.random() * 10 - 5),
        streams: Math.floor(Math.random() * 50000 + 10000)
      };

      const updatedState = await storage.updateGameState(req.params.id, {
        currentMonth: (gameState.currentMonth || 1) + 1,
        money: (gameState.money || 75000) + monthlyOutcome.revenue - monthlyOutcome.expenses,
        reputation: Math.max(0, Math.min(100, (gameState.reputation || 0) + monthlyOutcome.reputationChange)),
        usedFocusSlots: 0, // Reset for new month
        monthlyStats: {
          ...gameState.monthlyStats as object,
          [`month${gameState.currentMonth || 1}`]: monthlyOutcome
        }
      });

      res.json({ 
        gameState: updatedState, 
        monthlyOutcome,
        actions 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to advance month" });
    }
  });

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
      const save = await storage.createGameSave(validatedData);
      res.json(save);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid save data", errors: error.errors });
      } else {
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
      const defaultState = {
        userId: userId,
          currentMonth: 1,
          money: 75000,
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
        
        // Convert database gameState to proper GameState type
        const gameStateForEngine = {
          ...gameState,
          currentMonth: gameState.currentMonth || 1,
          money: gameState.money || 75000,
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
        
        // Create GameEngine instance for this game state
        const gameEngine = new GameEngine(gameStateForEngine, serverGameData);
        
        // Use GameEngine for business logic - convert selectedActions to proper format
        const formattedActions = selectedActions.map(action => ({
          actionType: action.actionType,
          targetId: action.targetId,
          metadata: action.metadata || {},
          details: action.metadata || {} // Convert metadata to details for compatibility
        }));
        const monthResult = await gameEngine.advanceMonth(formattedActions);
        
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
        
        return {
          gameState: updatedGameState,
          summary: monthResult.summary
        };
      });
      
      res.json(result);
    } catch (error) {
      console.error('Advance month error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid request data',
          error.errors
        ));
      }
      res.status(500).json(createErrorResponse(
        'ADVANCE_MONTH_ERROR',
        error instanceof Error ? error.message : 'Failed to advance month'
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
        
        // Convert database gameState to proper GameState type
        const gameStateForEngine = {
          ...gameState,
          currentMonth: gameState.currentMonth || 1,
          money: gameState.money || 75000,
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
