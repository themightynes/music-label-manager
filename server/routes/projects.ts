import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { requireClerkUser } from '../auth';
import { serverGameData } from '../data/gameData';
import { insertProjectSchema } from '@shared/schema';
import { FinancialSystem } from '@shared/engine/FinancialSystem';

const router = Router();

// Calculate budget info for project creation
router.post("/api/budget-calculation", requireClerkUser, async (req, res) => {
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

  // Project routes
  router.post("/api/game/:gameId/projects", requireClerkUser, async (req, res) => {
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

  router.patch("/api/projects/:id", requireClerkUser, async (req, res) => {
    try {
      const project = await storage.updateProject(req.params.id, req.body);
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // Cancel project (tours) with refund calculation
  router.delete("/api/projects/:id/cancel", requireClerkUser, async (req, res) => {
    try {
      const projectId = req.params.id;
      // TODO(C40): refund amount is client-supplied — recompute server-side (standalone PR after Phase 1 move)
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

export default router;
