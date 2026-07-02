import { Router } from 'express';
import { z } from 'zod';
import type { EmailCategory } from "@shared/types/emailTypes";
import { storage } from '../storage';
import { gameStates } from '@shared/schema';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { requireClerkUser } from '../auth';

const router = Router();

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

// Email endpoints
router.get('/api/game/:gameId/emails', requireClerkUser, async (req, res) => {
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

router.get('/api/game/:gameId/emails/unread-count', requireClerkUser, async (req, res) => {
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

router.patch('/api/game/:gameId/emails/:emailId/read', requireClerkUser, async (req, res) => {
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

router.delete('/api/game/:gameId/emails/:emailId', requireClerkUser, async (req, res) => {
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

export default router;
