import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { storage } from '../storage';
import { db } from '../db';
import { requireClerkUser } from '../auth';
import { serverGameData } from '../data/gameData';
import { gameStates, projects as projectsTable } from '@shared/schema';
import { FinancialSystem } from '@shared/engine/FinancialSystem';

const router = Router();

// B3: strict whitelist of the fields an honest client is allowed to supply on
// project creation. Unknown keys (quality, songsCreated, budget, ...) are
// REJECTED (.strict) to close mass-assignment. stage/startWeek/totalCost are
// tolerated because the live client (gameStore.createProject) still sends
// stage:'planning' + startWeek, but the server IGNORES them and sets its own
// authoritative values — a client-sent stage:'production' cannot skip planning.
const createProjectInputSchema = z
  .object({
    title: z.string().min(1),
    type: z.enum(['Single', 'EP', 'Mini-Tour']),
    artistId: z.string().uuid().optional(),
    budgetPerSong: z.number().int().nonnegative().optional(),
    totalCost: z.number().int().nonnegative().optional(),
    songCount: z.number().int().positive().optional(),
    producerTier: z.enum(['local', 'regional', 'national', 'legendary']).optional(),
    timeInvestment: z.enum(['rushed', 'standard', 'extended', 'perfectionist']).optional(),
    metadata: z.any().optional(),
    // Tolerated-but-ignored (live client sends these; server overrides them).
    stage: z.any().optional(),
    startWeek: z.any().optional(),
  })
  .strict();

// B3/B1: strict whitelist for PATCH. Only stage progression is a legitimate
// client-driven update on an existing project; everything cost/quality-bearing
// is engine-owned. Unknown keys are rejected (.strict) to close mass-assignment.
const patchProjectInputSchema = z
  .object({
    stage: z.enum(['planning', 'production', 'recorded', 'cancelled']).optional(),
    title: z.string().min(1).optional(),
  })
  .strict();

// Legit song-count bounds per recording type (design contract; economy.json only
// carries song_count_default). Keeps a huge songCount from gaming the per-song
// minimum (minPerSong = min / songCount).
// HARDCODED: mirror data/balance design (Single 1-3, EP 3-5); move to config later.
const SONG_COUNT_BOUNDS: Record<string, { min: number; max: number }> = {
  Single: { min: 1, max: 3 },
  EP: { min: 3, max: 5 },
};

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
      // B3: whitelist client-supplied fields; strip unknown/server-owned keys.
      const input = createProjectInputSchema.parse(req.body);
      const gameId = req.params.gameId;

      console.log('[PROJECT CREATION] Raw request body received:', JSON.stringify({
        title: input.title,
        type: input.type,
        budgetPerSong: input.budgetPerSong,
        totalCost: input.totalCost,
        songCount: input.songCount,
        producerTier: input.producerTier,
        timeInvestment: input.timeInvestment,
        artistId: input.artistId
      }, null, 2));

      // B1: verify the game exists AND belongs to the caller. game-scoped query
      // (emails.ts pattern) — 404 GAME_NOT_FOUND so we don't leak existence.
      const [gameState] = await db
        .select()
        .from(gameStates)
        .where(eq(gameStates.id, gameId));
      if (!gameState || gameState.userId !== req.userId) {
        return res.status(404).json({
          error: 'GAME_NOT_FOUND',
          message: 'Game not found or does not belong to this user'
        });
      }

      // Entity-scoping: the artist (if provided) must belong to THIS game.
      if (input.artistId) {
        const artist = await storage.getArtist(input.artistId);
        if (!artist || artist.gameId !== gameId) {
          return res.status(400).json({
            error: 'ARTIST_NOT_IN_GAME',
            message: 'Artist does not belong to this game'
          });
        }
      }

      // Budget validation based on economy.json project_costs.
      const projectTypes = await serverGameData.getProjectTypes();
      const projectTypeKey = input.type === 'Single' ? 'single' :
                            input.type === 'EP' ? 'ep' : 'mini_tour';
      const projectTypeConfig = projectTypes[projectTypeKey];

      console.log(`[PROJECT CREATION] Project type config for ${input.type}:`, projectTypeConfig);

      const isRecording = input.type === 'Single' || input.type === 'EP';

      // Server-computed cost. For recording projects (B2) we IGNORE client
      // totalCost and recompute from budgetPerSong. Tours keep their existing
      // client-totalCost path verbatim (a separate creation flow / backlog C40).
      let projectCost: number;
      let songCount = input.songCount ?? projectTypeConfig?.song_count_default ?? 1;

      if (isRecording && projectTypeConfig) {
        // B3: bound songCount to the type's legit range so a huge count can't
        // depress the per-song minimum below.
        const bounds = SONG_COUNT_BOUNDS[input.type];
        if (bounds && (songCount < bounds.min || songCount > bounds.max)) {
          return res.status(400).json({
            error: 'INVALID_SONG_COUNT',
            message: `${input.type} projects must have between ${bounds.min} and ${bounds.max} songs`
          });
        }

        // Per-song budget bounds (unchanged from prior behavior).
        const budgetPerSong = input.budgetPerSong || 0;
        const minPerSong = Math.round(projectTypeConfig.min / songCount);
        const maxPerSong = Math.round(projectTypeConfig.max / songCount);
        if (budgetPerSong < minPerSong) {
          throw new Error(`Budget per song must be at least $${minPerSong.toLocaleString()} for ${input.type} projects`);
        }
        if (budgetPerSong > maxPerSong) {
          throw new Error(`Budget per song cannot exceed $${maxPerSong.toLocaleString()} for ${input.type} projects`);
        }

        // B2: recompute total cost SERVER-SIDE via the same shared engine math
        // the quality/economy uses (FinancialSystem.calculatePerSongProjectCost:
        // round(budgetPerSong * songCount * producerMult * timeMult)). Client
        // totalCost is discarded.
        const financialSystem = new FinancialSystem(serverGameData, () => Math.random());
        const computed = financialSystem.calculatePerSongProjectCost(
          budgetPerSong,
          songCount,
          input.producerTier || 'local',
          input.timeInvestment || 'standard'
        );
        projectCost = computed.totalCost;
      } else if (projectTypeConfig) {
        // Tour projects: validate + charge the client-supplied total budget
        // (preserved verbatim; not in scope for B2's recording-cost recompute).
        const totalCost = input.totalCost || 0;
        if (totalCost < projectTypeConfig.min) {
          throw new Error(`Budget must be at least $${projectTypeConfig.min.toLocaleString()} for ${input.type} projects`);
        }
        if (totalCost > projectTypeConfig.max) {
          throw new Error(`Budget cannot exceed $${projectTypeConfig.max.toLocaleString()} for ${input.type} projects`);
        }
        projectCost = totalCost;
      } else {
        projectCost = input.totalCost || input.budgetPerSong || 0;
      }

      // Check sufficient creative capital.
      const currentCreativeCapital = gameState.creativeCapital || 0;
      if (currentCreativeCapital < 1) {
        throw new Error(`Insufficient creative capital. You need 1 creative capital to start a new project, but you have ${currentCreativeCapital}.`);
      }

      if (projectCost > (gameState.money ?? 0)) {
        throw new Error(`Insufficient funds. Project costs $${projectCost.toLocaleString()} but you only have $${(gameState.money ?? 0).toLocaleString()}`);
      }

      // Server-owned creation record: stage/startWeek/totalCost/songsCreated/
      // quality are set here, NOT trusted from the client.
      const insertValues = {
        title: input.title,
        type: input.type,
        artistId: input.artistId ?? null,
        gameId,
        budgetPerSong: isRecording ? (input.budgetPerSong ?? 0) : 0,
        totalCost: projectCost,
        songCount: isRecording ? songCount : 1,
        songsCreated: 0,
        quality: 0,
        producerTier: input.producerTier ?? 'local',
        timeInvestment: input.timeInvestment ?? 'standard',
        stage: 'planning' as const,
        startWeek: gameState.currentWeek ?? null,
        metadata: input.metadata ?? null,
      };

      // B4: create + deduct atomically. A crash between them no longer yields an
      // unpaid project or a double charge.
      const project = await db.transaction(async (tx) => {
        const [created] = await tx.insert(projectsTable).values(insertValues).returning();
        await tx
          .update(gameStates)
          .set({
            money: (gameState.money ?? 0) - projectCost,
            creativeCapital: currentCreativeCapital - 1,
            updatedAt: new Date(),
          })
          .where(eq(gameStates.id, gameId));
        return created;
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
      // B3: whitelist patchable fields; reject unknown keys (mass-assignment).
      const updates = patchProjectInputSchema.parse(req.body);

      // B1: entity-walk ownership (project -> gameId -> game.userId). 404 (not
      // 403) so we don't leak the existence of other users' projects.
      const existing = await storage.getProject(req.params.id);
      if (!existing) {
        return res.status(404).json({
          error: 'PROJECT_NOT_FOUND',
          message: 'Project not found or does not belong to this user'
        });
      }
      const owner = existing.gameId ? await storage.getGameState(existing.gameId) : undefined;
      if (!owner || owner.userId !== req.userId) {
        return res.status(404).json({
          error: 'PROJECT_NOT_FOUND',
          message: 'Project not found or does not belong to this user'
        });
      }

      const project = await storage.updateProject(req.params.id, updates);
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // Cancel project (tours) with refund calculation
  router.delete("/api/projects/:id/cancel", requireClerkUser, async (req, res) => {
    try {
      const projectId = req.params.id;

      console.log(`[CANCEL PROJECT] Cancelling project ${projectId}`);

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

      // Ownership check (entity-walk: project -> gameId -> game.userId).
      // 404 (not 403) so we don't leak the existence of other users' projects.
      if (gameState.userId !== req.userId) {
        return res.status(404).json({
          error: 'PROJECT_NOT_FOUND',
          message: 'Project not found or does not belong to this user'
        });
      }

      // C40: recompute the refund SERVER-SIDE from the STORED project row.
      // Mirrors the legitimate client formula (client/src/components/ActiveTours.tsx):
      //   refund = round(remainingCities * (totalCost / plannedCities) * 0.6)
      // body.refundAmount is IGNORED so a tampered client cannot mint money.
      // HARDCODED: 0.6 refund rate — move to balance config with the rest of the
      // tour economy (tracked in C40's backlog note).
      const metadata = (project.metadata as any) || {};
      const plannedCities = metadata.cities || 1;
      const completedCities = metadata.tourStats?.cities?.length || 0;
      const remainingCities = Math.max(0, plannedCities - completedCities);
      const totalCost = project.totalCost ?? 0;
      const costPerCity = totalCost / plannedCities;
      const refundAmount = Math.round(remainingCities * costPerCity * 0.6);

      // Update project with cancellation data (keep for ROI tracking)
      await storage.updateProject(projectId, {
        totalRevenue: -(totalCost - refundAmount), // Loss = total cost minus refund
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
