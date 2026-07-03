import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { requireClerkUser } from '../auth';
import { insertGameSaveSchema } from '@shared/schema';
import { saveService } from '../services/saveService';

const router = Router();

  // Save game routes
  router.get("/api/saves", requireClerkUser, async (req, res) => {
    try {
      const saves = await storage.getGameSaves(req.userId!);
      res.json(saves);
    } catch (error) {
      console.error('[API] Failed to fetch save summaries:', error);
      res.status(500).json({ message: "Failed to fetch saves" });
    }
  });

  router.get("/api/saves/:saveId", requireClerkUser, async (req, res) => {
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

  router.post("/api/saves", requireClerkUser, async (req, res) => {
    try {
      const validatedData = insertGameSaveSchema.parse(req.body);

      const save = await saveService.createSave(req.userId!, validatedData);

      res.json(save);
    } catch (error) {
      if ((error as any)?.code === 'INVALID_SNAPSHOT') {
        return res.status(400).json({
          error: 'INVALID_SNAPSHOT',
          message: 'Save snapshot is missing game identifier'
        });
      }
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid save data", errors: error.errors });
      } else {
        console.error('Save creation error:', error);
        res.status(500).json({ message: "Failed to create save" });
      }
    }
  });

  router.post("/api/saves/:saveId/restore", requireClerkUser, async (req, res) => {
    const restoreRequestSchema = z.object({
      mode: z.enum(['overwrite', 'fork']).default('overwrite'),
    });

    try {
      const { mode } = restoreRequestSchema.parse(req.body ?? {});

      const result = mode === 'overwrite'
        ? await saveService.restoreOverwrite(req.params.saveId, req.userId!)
        : await saveService.restoreFork(req.params.saveId, req.userId!);

      return res.json(result);
    } catch (error) {
      if ((error as any)?.code === 'SAVE_NOT_FOUND') {
        return res.status(404).json({
          error: 'SAVE_NOT_FOUND',
          message: 'Save file not found or does not belong to this user',
        });
      }
      if ((error as any)?.code === 'UNSUPPORTED_SNAPSHOT_VERSION') {
        return res.status(400).json({
          error: 'UNSUPPORTED_SNAPSHOT_VERSION',
          message: (error as Error).message,
        });
      }
      if ((error as any)?.code === 'INVALID_SNAPSHOT') {
        return res.status(400).json({
          error: 'INVALID_SNAPSHOT',
          message: 'Save snapshot is missing game identifier',
        });
      }
      if ((error as any)?.code === 'UNAUTHORIZED') {
        return res.status(403).json({
          error: 'UNAUTHORIZED',
          message: 'You do not have permission to restore this game',
        });
      }
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

  router.delete("/api/saves/:saveId", requireClerkUser, async (req, res) => {
    try {
      const result = await saveService.deleteSave(req.params.saveId, req.userId!);

      res.json({
        message: 'Save deleted successfully',
        deletedSaveId: result.deletedSaveId,
      });
    } catch (error) {
      if ((error as any)?.code === 'SAVE_NOT_FOUND') {
        return res.status(404).json({
          error: 'SAVE_NOT_FOUND',
          message: 'Save file not found or does not belong to this user',
        });
      }
      console.error("Failed to delete save:", error);
      res.status(500).json({
        error: 'DELETE_SAVE_ERROR',
        message: "Failed to delete save file",
      });
    }
  });

export default router;
