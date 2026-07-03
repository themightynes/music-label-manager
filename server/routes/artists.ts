import { Router } from 'express';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { storage } from '../storage';
import { requireClerkUser } from '../auth';
import { requireGameOwner } from '../middleware/requireGameOwner';
import { serverGameData } from '../data/gameData';
import { artists, gameStates } from '@shared/schema';
import { artistService, ArtistServiceError } from '../services/artistService';
import {
  ArtistDialogueRequestSchema,
  ArtistDialogueResponse,
} from '@shared/api/contracts';

const router = Router();

// HARDENING (PR-13): whitelist the fields the client is actually allowed to
// PATCH on an artist. PATCH /api/artists/:id previously passed raw req.body
// straight to storage.updateArtist — a mass-assignment hole. The only client
// caller is gameStore.updateArtist (client/src/store/gameStore.ts), which has
// no live callers today, so this locks the route down to the minimal safe set
// of genuinely user-mutable runtime-state fields. mood/energy carry DB CHECK
// constraints (0-100) mirrored here. .strict() rejects any other key so
// identity (id, gameId) and server-computed fields (talent, popularity,
// signingCost, weeklyCost, signed, signedWeek, ...) can never be mass-assigned.
const patchArtistSchema = z
  .object({
    mood: z.number().int().min(0).max(100).optional(),
    energy: z.number().int().min(0).max(100).optional(),
  })
  .strict();

// ========================================
// Artist Dialogue Endpoint
// ========================================

router.post("/api/game/:gameId/artist-dialogue", requireClerkUser, requireGameOwner, async (req, res) => {
    try {
      // 1. Extract and validate request data
      const { gameId } = req.params;
      const requestBody = req.body;

      const validationResult = ArtistDialogueRequestSchema.safeParse(requestBody);
      if (!validationResult.success) {
        console.error('Artist dialogue validation failed:', validationResult.error);
        return res.status(400).json({
          success: false,
          message: "Invalid request data",
          details: validationResult.error.errors
        });
      }

      const { artistId, sceneId, choiceId } = validationResult.data;
      console.log(`Processing artist dialogue - Game: ${gameId}, Artist: ${artistId}, Scene: ${sceneId}, Choice: ${choiceId}`);

      // 2. Validate game and artist. Game ownership is verified by
      //    requireGameOwner; gameState is available on req.gameState.
      const gameState = req.gameState!;

      const artist = await storage.getArtist(artistId);
      if (!artist) {
        return res.status(404).json({
          success: false,
          message: "Artist not found"
        });
      }

      if (artist.gameId !== gameId) {
        return res.status(400).json({
          success: false,
          message: "Artist does not belong to this game"
        });
      }

      // 3. Load and validate dialogue choice
      await serverGameData.initialize();
      const choice = await serverGameData.getDialogueChoiceById(sceneId, choiceId);

      if (!choice) {
        return res.status(400).json({
          success: false,
          message: "Invalid dialogue choice"
        });
      }

      console.log('Loaded dialogue choice:', { sceneId, choiceId, choice });

      // Helper function to clamp values
      const clamp = (value: number, min: number, max: number): number => {
        return Math.max(min, Math.min(max, value));
      };

      // 4. Apply immediate effects to database
      const effectsImmediate = choice.effects_immediate || {};
      const effectsApplied: Record<string, number> = {};
      const gamePatch: Record<string, number> = {};

      for (const [effectKey, effectValue] of Object.entries(effectsImmediate)) {
        if (typeof effectValue !== 'number') {
          continue;
        }

        console.log(`Applying immediate effect: ${effectKey} = ${effectValue}`);

        if (effectKey === 'artist_mood') {
          const current = artist.mood ?? 50;
          const newMood = clamp(current + Number(effectValue), 0, 100);
          await storage.updateArtist(artistId, { mood: newMood });
          effectsApplied[effectKey] = Number(effectValue);
        } else if (effectKey === 'artist_energy') {
          const current = artist.energy ?? 50;
          const newEnergy = clamp(current + Number(effectValue), 0, 100);
          await storage.updateArtist(artistId, { energy: newEnergy });
          effectsApplied[effectKey] = Number(effectValue);
        } else if (effectKey === 'artist_popularity') {
          const current = artist.popularity ?? 50;
          const newPopularity = clamp(current + Number(effectValue), 0, 100);
          await storage.updateArtist(artistId, { popularity: newPopularity });
          effectsApplied[effectKey] = Number(effectValue);
        } else if (effectKey === 'money') {
          gamePatch.money = (gameState.money ?? 0) + Number(effectValue);
          effectsApplied[effectKey] = Number(effectValue);
        } else if (effectKey === 'reputation') {
          gamePatch.reputation = clamp((gameState.reputation ?? 0) + Number(effectValue), 0, 100);
          effectsApplied[effectKey] = Number(effectValue);
        } else if (effectKey === 'creative_capital') {
          gamePatch.creativeCapital = (gameState.creativeCapital ?? 0) + Number(effectValue);
          effectsApplied[effectKey] = Number(effectValue);
        }
      }

      // Apply batched game state updates
      if (Object.keys(gamePatch).length > 0) {
        await storage.updateGameState(gameId, gamePatch as any);
      }

      // 5. Store delayed effects in game state flags
      const effectsDelayed = choice.effects_delayed || {};

      if (Object.keys(effectsDelayed).length > 0) {
        const flags = (gameState.flags || {}) as Record<string, any>;
        const delayedKey = `dialogue-${artistId}-${sceneId}-${choiceId}-${Date.now()}`;

        flags[delayedKey] = {
          triggerWeek: (gameState.currentWeek ?? 1) + 1,
          effects: effectsDelayed,
          artistId
        };

        await storage.updateGameState(gameId, { flags: flags as any });
        console.log('Stored delayed effects:', { delayedKey, effects: effectsDelayed, artistId });
      }

      // 6. Return success response
      const response: ArtistDialogueResponse = {
        success: true,
        artistId,
        artistName: artist.name,
        sceneId,
        choiceId,
        effects: effectsApplied,
        delayedEffects: effectsDelayed,
        message: "Conversation completed successfully"
      };

      console.log('Artist dialogue processed successfully:', response);
      res.json(response);

    } catch (error) {
      console.error('Failed to process artist dialogue:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to process artist dialogue"
      });
    }
  });

  // Sign an artist to the roster. Thin route: ownership + validation are the
  // middleware's job; all economic derivation, guards, atomicity, and flags
  // bookkeeping live in artistService.signArtist (PR-18). Status mapping stays
  // here via ArtistServiceError.
  router.post("/api/game/:gameId/artists", requireClerkUser, requireGameOwner, async (req, res) => {
    try {
      const gameId = req.params.gameId;
      const artist = await artistService.signArtist(req.userId, gameId, req.gameState!, req.body);
      res.json(artist);
    } catch (error) {
      if (error instanceof ArtistServiceError) {
        return res.status(error.status).json(error.body);
      }
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid artist data", errors: error.errors });
      }
      console.error('Artist signing error:', error);
      res.status(500).json({ message: "Failed to sign artist" });
    }
  });

  router.patch("/api/artists/:id", requireClerkUser, async (req, res) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'UNAUTHORIZED', message: 'User authentication required' });
      }

      // Entity-walk ownership check (mirrors PATCH /api/songs/:songId in
      // releases.ts): artist → gameId → game.userId; 404 if not owned so we
      // don't leak existence to a non-owner.
      const [artist] = await db.select({ id: artists.id, gameId: artists.gameId })
        .from(artists)
        .where(eq(artists.id, req.params.id))
        .limit(1);

      if (!artist) {
        return res.status(404).json({ error: 'ARTIST_NOT_FOUND', message: 'Artist not found' });
      }

      const [game] = await db.select()
        .from(gameStates)
        .where(and(eq(gameStates.id, artist.gameId), eq(gameStates.userId, userId)))
        .limit(1);

      if (!game) {
        return res.status(404).json({ error: 'ARTIST_NOT_FOUND', message: 'Artist not found' });
      }

      // HARDENING (PR-13): reject unknown / identity / server-computed fields
      // (mass-assignment). Mirrors INVALID_GAME_FIELDS in games.ts.
      const parsed = patchArtistSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'INVALID_ARTIST_FIELDS',
          message: 'Artist update payload contains unexpected fields',
          details: parsed.error.errors,
        });
      }

      const updated = await storage.updateArtist(req.params.id, parsed.data);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update artist" });
    }
  });

  router.get("/api/game/:gameId/mood-events", requireClerkUser, requireGameOwner, async (req, res) => {
    try {
      const { gameId } = req.params;
      // Ownership verified by requireGameOwner (its 404 replaces the previous
      // inline 403 UNAUTHORIZED check).
      const events = await storage.getMoodEventsByGame(gameId);
      res.json(events);
    } catch (error) {
      console.error('[API] Failed to fetch mood events:', error);
      res.status(500).json({ message: 'Failed to fetch mood events' });
    }
  });

export default router;
