import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { requireClerkUser } from '../auth';
import { requireGameOwner } from '../middleware/requireGameOwner';
import {
  AdvanceWeekRequest,
  validateRequest,
  createErrorResponse,
} from '@shared/api/contracts';
import { insertWeeklyActionSchema } from '@shared/schema';
import { advanceWeekService } from '../services/advanceWeekService';

const router = Router();

  // Weekly action routes
  router.post("/api/game/:gameId/actions", requireClerkUser, requireGameOwner, async (req, res) => {
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
  // gameId arrives in the request body; requireGameOwner resolves it via its
  // body fallback and 404s a non-owner before any transaction runs. The
  // in-transaction re-read below is kept intentionally for freshness/locking.
  router.post("/api/advance-week", requireClerkUser, requireGameOwner, async (req, res) => {
    try {
      // Validate request using shared contract
      const request = validateRequest(AdvanceWeekRequest, req.body);
      const { gameId, selectedActions } = request;

      const finalResult = await advanceWeekService.advanceWeek(gameId, selectedActions);

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
