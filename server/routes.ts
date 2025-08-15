import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGameStateSchema, insertGameSaveSchema, insertArtistSchema, insertProjectSchema, insertMonthlyActionSchema } from "@shared/schema";
import { z } from "zod";
import { serverGameData } from "./data/gameData";
import { gameDataLoader } from "@shared/utils/dataLoader";

export async function registerRoutes(app: Express): Promise<Server> {
  
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
  
  // Demo user for game state management
  let DEMO_USER_ID: string | null = null;
  let DEMO_GAME_ID: string | null = null;

  // Game state routes
  app.get("/api/game/:id", async (req, res) => {
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

  app.post("/api/game", async (req, res) => {
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

  app.patch("/api/game/:id", async (req, res) => {
    try {
      const gameState = await storage.updateGameState(req.params.id, req.body);
      res.json(gameState);
    } catch (error) {
      res.status(500).json({ message: "Failed to update game state" });
    }
  });

  // Artist routes
  app.post("/api/game/:gameId/artists", async (req, res) => {
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

  app.patch("/api/artists/:id", async (req, res) => {
    try {
      const artist = await storage.updateArtist(req.params.id, req.body);
      res.json(artist);
    } catch (error) {
      res.status(500).json({ message: "Failed to update artist" });
    }
  });

  // Project routes
  app.post("/api/game/:gameId/projects", async (req, res) => {
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

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.updateProject(req.params.id, req.body);
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // Monthly action routes
  app.post("/api/game/:gameId/actions", async (req, res) => {
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
  app.post("/api/game/:id/advance-month", async (req, res) => {
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
  app.get("/api/saves", async (req, res) => {
    try {
      // For demo purposes, using a mock user ID
      // In production, this would come from authentication
      const saves = await storage.getGameSaves("demo-user-id");
      res.json(saves);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch saves" });
    }
  });

  app.post("/api/saves", async (req, res) => {
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

  // Dialogue choices
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
  app.get("/api/game-state", async (req, res) => {
    try {
      // Create demo user if doesn't exist
      if (!DEMO_USER_ID) {
        try {
          let demoUser = await storage.getUserByUsername('demo-user');
          if (!demoUser) {
            demoUser = await storage.createUser({
              username: 'demo-user',
              password: 'demo-password'
            });
          }
          DEMO_USER_ID = demoUser.id;
        } catch (error) {
          console.error('Error creating demo user:', error);
          return res.status(500).json({ message: "Failed to create demo user" });
        }
      }

      // Get or create game state for demo user
      if (!DEMO_GAME_ID) {
        // Try to find existing game state for demo user
        // For now, we'll create a new one each time since we don't have a getUserGameStates method
        const defaultState = {
          userId: DEMO_USER_ID,
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
        DEMO_GAME_ID = gameState.id;
        return res.json(gameState);
      }
      
      // Get existing game state
      const gameState = await storage.getGameState(DEMO_GAME_ID);
      if (!gameState) {
        // Reset demo game ID and try again
        DEMO_GAME_ID = null;
        return res.status(404).json({ message: "Game state not found, please refresh" });
      }
      
      res.json(gameState);
    } catch (error) {
      console.error('Get game state error:', error);
      res.status(500).json({ message: "Failed to fetch game state" });
    }
  });

  // Month advancement with action processing
  app.post("/api/advance-month", async (req, res) => {
    try {
      const { gameId, selectedActions } = req.body;
      
      // Validate gameId
      if (!gameId) {
        return res.status(400).json({ message: "Game ID is required" });
      }
      
      // Get balance config for calculations
      const balanceConfig = await serverGameData.getBalanceConfig();
      
      // Get current game state  
      const gameState = await storage.getGameState(gameId);
      if (!gameState) {
        return res.status(404).json({ message: "Game not found" });
      }

      // Calculate monthly burn from balance.json
      const burnRange = balanceConfig.economy.monthly_burn_base;
      const baseBurn = burnRange[0] + Math.random() * (burnRange[1] - burnRange[0]);
      
      // Apply RNG variance
      const variance = balanceConfig.economy.rng_variance;
      const rngFactor = variance[0] + Math.random() * (variance[1] - variance[0]);
      const monthlyBurn = Math.floor(baseBurn * rngFactor);

      // Process selected actions (simplified for MVP)
      let actionRevenue = 0;
      let actionExpenses = 0;
      let reputationChange = 0;
      
      if (selectedActions && selectedActions.length > 0) {
        // Each action has potential for revenue/reputation gain
        actionRevenue = selectedActions.length * (Math.random() * 5000 + 2000);
        actionExpenses = selectedActions.length * (Math.random() * 2000 + 1000);
        reputationChange = selectedActions.length * (Math.random() * 2 - 0.5);
      }

      const totalRevenue = Math.floor(actionRevenue);
      const totalExpenses = Math.floor(monthlyBurn + actionExpenses);
      const netChange = totalRevenue - totalExpenses;
      const newMoney = (gameState.money || 75000) + netChange;
      const newReputation = Math.floor(Math.max(0, Math.min(100, (gameState.reputation || 5) + reputationChange)));
      
      // Update game state
      const updatedState = await storage.updateGameState(gameId, {
        currentMonth: (gameState.currentMonth || 1) + 1,
        money: newMoney,
        reputation: newReputation,
        usedFocusSlots: 0, // Reset for new month
        monthlyStats: {
          ...(gameState.monthlyStats as object || {}),
          [`month${gameState.currentMonth}`]: {
            revenue: totalRevenue,
            expenses: totalExpenses,
            netChange: netChange,
            reputationChange: Math.round(reputationChange * 10) / 10,
            actions: selectedActions || []
          }
        }
      });

      // Return summary
      const summary = {
        month: gameState.currentMonth,
        revenue: totalRevenue,
        expenses: totalExpenses,
        netChange: netChange,
        reputationChange: Math.round(reputationChange * 10) / 10,
        gameState: updatedState,
        actions: selectedActions || []
      };

      res.json(summary);
    } catch (error) {
      console.error('Advance month error:', error);
      res.status(500).json({ message: "Failed to advance month" });
    }
  });

  // Save player action selections
  app.post("/api/select-actions", async (req, res) => {
    try {
      const { gameId, selectedActions } = req.body;
      
      if (!selectedActions || selectedActions.length > 3) {
        return res.status(400).json({ message: "Invalid action selection - maximum 3 actions allowed" });
      }
      
      // Validate gameId
      if (!gameId) {
        return res.status(400).json({ message: "Game ID is required" });
      }
      
      // Update game state with selected actions
      const gameState = await storage.updateGameState(gameId, {
        usedFocusSlots: selectedActions.length,
        flags: {
          selectedActions: selectedActions
        }
      });
      
      res.json({ success: true, gameState });
    } catch (error) {
      console.error('Select actions error:', error);
      res.status(500).json({ message: "Failed to save action selection" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
