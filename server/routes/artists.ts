import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { requireClerkUser } from '../auth';
import { serverGameData } from '../data/gameData';
import { insertArtistSchema } from '@shared/schema';
import {
  ArtistDialogueRequestSchema,
  ArtistDialogueResponse,
} from '@shared/api/contracts';

const router = Router();

// ========================================
// Artist Dialogue Endpoint
// ========================================

router.post("/api/game/:gameId/artist-dialogue", requireClerkUser, async (req, res) => {
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

      // 2. Validate game and artist
      const gameState = await storage.getGameState(gameId);
      if (!gameState) {
        return res.status(404).json({
          success: false,
          message: "Game not found"
        });
      }

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

  // Artist routes
  router.post("/api/game/:gameId/artists", requireClerkUser, async (req, res) => {
    try {
      const gameId = req.params.gameId;
      const signingCost = req.body.signingCost || 0;

      // Get current game state to check money
      const gameState = await storage.getGameState(gameId);
      if (!gameState) {
        return res.status(404).json({ message: "Game not found" });
      }

      // Check if player has enough money
      if ((gameState.money || 0) < signingCost) {
        return res.status(400).json({ message: "Insufficient funds to sign artist" });
      }

      // Prevent duplicate signings by name (case-insensitive) within the same game
      const existing = await storage.getArtistsByGame(gameId);
      const incomingName = String(req.body?.name || '').toLowerCase();
      if (incomingName && existing.some(a => (a.name || '').toLowerCase() === incomingName)) {
        return res.status(409).json({ code: 'DUPLICATE_ARTIST', message: 'This artist is already signed to your roster.' });
      }

      // Prepare artist data
      const validatedData = insertArtistSchema.parse({
        ...req.body,
        gameId: gameId,
        weeklyCost: req.body.weeklyCost || 1200 // Store weekly cost from JSON data
      });

      // Create artist and deduct money in a transaction-like operation
      const artist = await storage.createArtist(validatedData);

      // Update game state to deduct signing cost and track artist count
      if (signingCost > 0) {
        await storage.updateGameState(gameId, {
          money: Math.max(0, (gameState.money || 0) - signingCost)
        });
      }

      // Update artist count flag for GameEngine weekly costs
      const currentArtists = await storage.getArtistsByGame(gameId);
      const flags = (gameState.flags || {}) as any;
      (flags as any)['signed_artists_count'] = currentArtists.length + 1; // +1 for the new artist

      if (signingCost > 0) {
        const signingEvent = {
          artistId: artist.id,
          name: artist.name,
          amount: signingCost,
          week: gameState.currentWeek || 1,
          recordedAt: new Date().toISOString(),
        };

        if (!Array.isArray(flags.pending_signing_fees)) {
          flags.pending_signing_fees = [];
        }
        flags.pending_signing_fees.push(signingEvent);
      }

      // Remove this artist from discovered collections using discovered (content) ID or name
      if (flags.ar_office_discovered_artists) {
        const discoveredId = req.body?.id;
        const signedNameLc = String(artist.name || '').toLowerCase();
        flags.ar_office_discovered_artists = flags.ar_office_discovered_artists.filter((a: any) => {
          const aNameLc = String(a?.name || '').toLowerCase();
          return (discoveredId ? a.id !== discoveredId : true) && aNameLc !== signedNameLc;
        });
        console.log('[A&R DEBUG] Removed signed artist from discovered collection. Remaining:', flags.ar_office_discovered_artists.length);
      }

      // Legacy cleanup: If this artist is the persisted discovered one, clear it now
      if ((flags as any).ar_office_discovered_artist_id) {
        const discoveredId = req.body?.id;
        if ((flags as any).ar_office_discovered_artist_id === discoveredId) {
          delete flags.ar_office_discovered_artist_id;
          delete flags.ar_office_discovered_artist_info;
        }
      }

      await storage.updateGameState(gameId, { flags });

      // Generate welcome email for signed artist
      try {
        const labelDisplay = ((gameState as any).labelName) || ((gameState as any).musicLabel?.name) || 'your label';
        const emailBody = {
          artistId: artist.id,
          name: artist.name,
          archetype: artist.archetype ?? 'Unknown',
          talent: artist.talent ?? 0,
          genre: artist.genre ?? null,
          signingCost: signingCost,
          weeklyCost: artist.weeklyCost ?? null,
        };

        await storage.createEmail({
          gameId: gameId,
          week: gameState.currentWeek ?? 1,
          category: 'ar',
          sender: 'Marcus "Mac" Rodriguez',
          senderRoleId: 'head_ar',
          subject: `Artist Signed – ${artist.name}`,
          preview: `${artist.name} has officially signed with ${labelDisplay}!`,
          body: emailBody,
          metadata: emailBody,
          isRead: false,
        });
        console.log(`[ARTIST SIGNING] Generated welcome email for ${artist.name}`);
      } catch (emailError) {
        console.error('[ARTIST SIGNING] Failed to generate welcome email:', emailError);
        // Don't fail the signing if email generation fails
      }

      res.json(artist);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid artist data", errors: error.errors });
      } else {
        console.error('Artist signing error:', error);
        res.status(500).json({ message: "Failed to sign artist" });
      }
    }
  });

  router.patch("/api/artists/:id", requireClerkUser, async (req, res) => {
    try {
      const artist = await storage.updateArtist(req.params.id, req.body);
      res.json(artist);
    } catch (error) {
      res.status(500).json({ message: "Failed to update artist" });
    }
  });

  router.get("/api/game/:gameId/mood-events", requireClerkUser, async (req, res) => {
    try {
      const { gameId } = req.params;
      const gameState = await storage.getGameState(gameId);
      if (!gameState || gameState.userId !== req.userId) {
        return res.status(403).json({
          error: 'UNAUTHORIZED',
          message: 'You do not have permission to access this game'
        });
      }

      const events = await storage.getMoodEventsByGame(gameId);
      res.json(events);
    } catch (error) {
      console.error('[API] Failed to fetch mood events:', error);
      res.status(500).json({ message: 'Failed to fetch mood events' });
    }
  });

export default router;
