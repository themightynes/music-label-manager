/**
 * requireGameOwner.ts
 *
 * Shared game-ownership middleware (Phase 1, PR-17). Promotes the inline
 * ownership check used across emails.ts (46-57) and the releases router into a
 * single reusable middleware, closing the broken-object-level-authorization
 * (IDOR) gap documented in OWNERSHIP_AUTHORIZATION_SWEEP_2026-07-02.md.
 *
 * Reads `req.params.gameId`, loads the game scoped by BOTH id AND
 * `req.userId`, and 404s (not 403) if no such row exists so we don't leak
 * whether a given gameId exists to a non-owner. On success it stashes the
 * loaded game row on `req.gameState` so downstream handlers can reuse it
 * without a second query.
 *
 * MUST run after requireClerkUser (which populates req.userId).
 */
import type { Request, Response, NextFunction } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { gameStates, type GameState } from '@shared/schema';

export async function requireGameOwner(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const gameId = req.params.gameId;
    if (!gameId) {
      return res.status(400).json({
        error: 'MISSING_GAME_ID',
        message: 'gameId route parameter is required',
      });
    }

    const [game] = await db
      .select()
      .from(gameStates)
      .where(and(eq(gameStates.id, gameId), eq(gameStates.userId, userId)))
      .limit(1);

    if (!game) {
      // 404 (not 403): do not leak whether a game with this id exists to a
      // caller who does not own it.
      return res.status(404).json({
        error: 'GAME_NOT_FOUND',
        message: 'Game not found or does not belong to this user',
      });
    }

    req.gameState = game;
    next();
  } catch (error) {
    console.error('[requireGameOwner] Failed to verify game ownership', error);
    res.status(500).json({ message: 'Failed to verify game ownership' });
  }
}

declare global {
  namespace Express {
    interface Request {
      gameState?: GameState;
    }
  }
}
