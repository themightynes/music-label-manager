/**
 * requireGameOwner.ts
 *
 * Shared game-ownership middleware (Phase 1, PR-17). Promotes the inline
 * ownership check used across emails.ts (46-57) and the releases router into a
 * single reusable middleware, closing the broken-object-level-authorization
 * (IDOR) gap documented in OWNERSHIP_AUTHORIZATION_SWEEP_2026-07-02.md.
 *
 * Resolves the gameId from `req.params.gameId ?? req.body?.gameId ?? req.query?.gameId`
 * (URL param preferred; body/query fallbacks support routes that carry the id
 * off-path, e.g. POST /api/advance-week and the analytics ROI reads), loads the
 * game scoped by BOTH id AND `req.userId`, and 404s (not 403) if no such row
 * exists so we don't leak whether a given gameId exists to a non-owner. On
 * success it stashes the loaded game row on `req.gameState` so downstream
 * handlers can reuse it without a second query.
 *
 * For routes whose param is NOT named `gameId` (games.ts uses `:id`), use
 * `requireGameOwnerByParam('id')` which builds a wrapper that reads the given
 * param name; the shared middleware deliberately does NOT add a generic `:id`
 * fallback so the route paths in the manifest never change.
 *
 * MUST run after requireClerkUser (which populates req.userId).
 */
import type { Request, Response, NextFunction } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { gameStates, type GameState } from '@shared/schema';

/**
 * Core ownership check. `resolveGameId` extracts the candidate gameId from the
 * request; the default reads params.gameId, then body.gameId, then query.gameId.
 */
async function enforceGameOwnership(
  req: Request,
  res: Response,
  next: NextFunction,
  resolveGameId: (req: Request) => unknown,
) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const rawGameId = resolveGameId(req);
    const gameId = typeof rawGameId === 'string' ? rawGameId : undefined;
    if (!gameId) {
      return res.status(400).json({
        error: 'MISSING_GAME_ID',
        message: 'gameId is required',
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

export async function requireGameOwner(req: Request, res: Response, next: NextFunction) {
  return enforceGameOwnership(
    req,
    res,
    next,
    (r) => r.params.gameId ?? r.body?.gameId ?? r.query?.gameId,
  );
}

/**
 * Ownership middleware for routes whose route parameter is NOT named `gameId`
 * (e.g. games.ts's GET/PATCH /api/game/:id). Reads only the named param so the
 * route path in the manifest stays `:id` and we never introduce a generic
 * `:id` fallback into the shared middleware.
 */
export function requireGameOwnerByParam(paramName: string) {
  // Distinct inner name (no collision with the factory binding) so the
  // route-manifest snapshot reads `requireGameOwnerForParam`, not a
  // V8-suffixed `requireGameOwnerByParam2`.
  return function requireGameOwnerForParam(req: Request, res: Response, next: NextFunction) {
    return enforceGameOwnership(req, res, next, (r) => r.params[paramName]);
  };
}

declare global {
  namespace Express {
    interface Request {
      gameState?: GameState;
    }
  }
}
