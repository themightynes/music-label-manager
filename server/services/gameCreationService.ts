/**
 * gameCreationService.ts
 *
 * Backend service for new-game creation and initial access-tier derivation.
 * Extracted from the fat POST /api/game handler (Phase 1, PR-15). Follows the
 * AnalyticsService convention: a class with explicit dependencies defaulted to
 * the module singletons, plus an exported singleton instance.
 *
 * Behavior is intentionally byte-equivalent to the pre-extraction handler,
 * including the (loud) console logging, the difficulty-scaled starting money,
 * the reputation-derived access tiers, atomic label creation, and the
 * best-effort executive seeding that never fails game creation.
 */

import { z } from 'zod';
import { storage as storageSingleton } from '../storage';
import { db as dbSingleton } from '../db';
import { serverGameData as serverGameDataSingleton } from '../data/gameData';
import { insertGameStateSchema, labelRequestSchema, executives } from '@shared/schema';
import { normalizeDifficulty } from '@shared/utils/startingValues';

export class GameCreationService {
  constructor(
    private storage = storageSingleton,
    private db = dbSingleton,
    private serverGameData = serverGameDataSingleton,
  ) {}

  /**
   * Derive an access tier from a reputation value against a tier config object.
   * Picks the highest-threshold tier the reputation qualifies for, defaulting
   * to 'none'. Shared by POST /api/game and GET /api/game-state.
   */
  private pickTier(tiersObj: Record<string, { threshold: number }>, rep: number): string {
    return (
      Object.entries(tiersObj)
        .sort(([, a], [, b]) => (b as any).threshold - (a as any).threshold)
        .find(([, cfg]) => rep >= (cfg as any).threshold)?.[0] || 'none'
    );
  }

  /**
   * Derive the initial {playlist, press, venue} access tiers from a starting
   * reputation using the live balance access-tier config. Assumes
   * serverGameData is initialized (getAccessTiersSync).
   */
  deriveInitialAccessTiers(reputation: number): {
    playlist: string;
    press: string;
    venue: string;
  } {
    const accessTiers = this.serverGameData.getAccessTiersSync() as any;
    const rep = reputation || 0;
    return {
      playlist: this.pickTier(accessTiers.playlist_access, rep),
      press: this.pickTier(accessTiers.press_access, rep),
      venue: this.pickTier(accessTiers.venue_access, rep),
    };
  }

  /**
   * Auto-create a "bare" game for GET /api/game-state when the user has none.
   *
   * PR-13 / D4: this is the ONE remaining second creation path. It routes
   * through gameCreationService (so game creation lives in one module) but
   * intentionally produces the pre-existing GET /api/game-state auto-create
   * SHAPE, which differs from POST /api/game:
   *   - NO music label (returns musicLabel: null). GamePage.tsx keys its
   *     label-creation modal off `!serverGameState.musicLabel` — seeding a
   *     default label here would silently suppress that modal.
   *   - NO executives (POST /api/game seeds 4; the auto-created game does not).
   *   - campaignType "standard" and flags {} (POST /api/game defaults
   *     campaignType from the body and writes flags.difficulty).
   *
   * Shares the balance-starting-values + reputation-derived-tier logic with
   * createGame so those never drift. Difficulty is always normal (1.0x) — the
   * auto-create path has no difficulty selection.
   */
  async createBareGame(userId: string) {
    await this.serverGameData.initialize();

    const startingValues = await this.serverGameData.getStartingValues();
    const tiers = this.deriveInitialAccessTiers(startingValues.reputation || 0);

    const gameState = await this.storage.createGameState({
      userId,
      currentWeek: 1,
      money: startingValues.money,
      reputation: startingValues.reputation,
      creativeCapital: startingValues.creativeCapital,
      focusSlots: 3,
      usedFocusSlots: 0,
      playlistAccess: tiers.playlist,
      pressAccess: tiers.press,
      venueAccess: tiers.venue,
      campaignType: 'standard',
      rngSeed: Math.random().toString(36).substring(7),
      flags: {},
      weeklyStats: {},
    } as any);
    console.log('🎮 Created auto-generated game state (label will be created separately):', gameState.id);

    return {
      ...gameState,
      musicLabel: null,
    };
  }

  /**
   * Create a new game for the given user from a raw request body. Returns the
   * created game state merged with its music label (the exact response shape of
   * the original POST /api/game handler).
   *
   * Throws ZodError for invalid body/label data — the route maps that to 400.
   */
  async createGame(userId: string | undefined, body: any) {
    console.log('🚀 [GAME CREATION] Starting new game creation...');

    const { labelData, difficulty, ...gameStateData } = body;
    const validatedData = insertGameStateSchema.parse(gameStateData);

    // MISSING: no UI exposes difficulty selection yet — every game defaults to
    // 'normal' (1.0x). Passing 'easy'/'hard' applies progression.json's
    // difficulty_modifiers.starting_money_multiplier (1.5x / 0.7x).
    const gameDifficulty = normalizeDifficulty(difficulty);
    console.log('📝 [GAME CREATION] Validated data reputation:', validatedData.reputation);

    // Validate label data if provided
    let validatedLabelData = null;
    if (labelData) {
      validatedLabelData = labelRequestSchema.parse(labelData);
    }

    // Ensure serverGameData is initialized before accessing balance config
    await this.serverGameData.initialize();

    // Set starting values from balance.json configuration (money scaled by difficulty)
    const startingValues = await this.serverGameData.getStartingValues(gameDifficulty);
    // Make these logs more visible
    console.error('🎮🎮🎮 REPUTATION FROM BALANCE:', startingValues.reputation);
    console.error('💰💰💰 MONEY FROM BALANCE:', startingValues.money);
    console.error('🎨🎨🎨 CREATIVE CAPITAL FROM BALANCE:', startingValues.creativeCapital);

    // Derive initial access tiers from starting reputation (ignore client-provided access fields)
    const tiers = this.deriveInitialAccessTiers(startingValues.reputation || 0);
    const initialPlaylist = tiers.playlist;
    const initialPress = tiers.press;
    const initialVenue = tiers.venue;

    const gameDataWithBalance = {
      ...validatedData,
      // Force correct initial access tiers based on reputation
      playlistAccess: initialPlaylist,
      pressAccess: initialPress,
      venueAccess: initialVenue,
      money: startingValues.money,
      reputation: startingValues.reputation,
      creativeCapital: startingValues.creativeCapital, // FIXED: Use balance.json configuration like money and reputation
      // Persist difficulty so future systems (reputation_decay, market_variance,
      // goal_time_extension modifiers) can read it without a schema migration
      flags: { ...((validatedData.flags as Record<string, unknown>) ?? {}), difficulty: gameDifficulty },
      userId: userId  // CRITICAL: Associate game with user
    };
    console.error('✅✅✅ FINAL GAME DATA - Money:', gameDataWithBalance.money, 'Reputation:', gameDataWithBalance.reputation, 'VenueAccess:', gameDataWithBalance.venueAccess);

    // Create game state and music label atomically within a transaction
    const result = await this.db.transaction(async (tx) => {
      const gameState = await this.storage.createGameState(gameDataWithBalance, tx);

      // Create music label for the new game
      const musicLabelData = {
        name: validatedLabelData?.name || "New Music Label",
        gameId: gameState.id,
        foundedWeek: validatedLabelData?.foundedWeek || 1,
        foundedYear: validatedLabelData?.foundedYear || new Date().getFullYear(),
        description: validatedLabelData?.description || null,
        genreFocus: validatedLabelData?.genreFocus || null
      };
      const musicLabel = await this.storage.createMusicLabel(musicLabelData, tx);
      console.log('🎵 Created music label:', musicLabel.name, 'for game:', gameState.id);

      return { gameState, musicLabel };
    });

    const { gameState, musicLabel } = result;

    // Initialize executives for the new game (CEO excluded - player is the CEO)
    console.log('🎭 Creating executives for game:', gameState.id);
    try {
      const executiveRecords = [
        { gameId: gameState.id, role: 'head_ar', level: 1, mood: 50, loyalty: 50 },
        { gameId: gameState.id, role: 'cmo', level: 1, mood: 50, loyalty: 50 },
        { gameId: gameState.id, role: 'cco', level: 1, mood: 50, loyalty: 50 },
        { gameId: gameState.id, role: 'head_distribution', level: 1, mood: 50, loyalty: 50 }
      ];
      await this.db.insert(executives).values(executiveRecords);
      console.log('✅ Successfully created 4 executives for game:', gameState.id);
    } catch (error) {
      console.error('❌ Failed to create executives:', error);
      // Continue anyway - don't break game creation
    }

    return {
      ...gameState,
      musicLabel
    };
  }
}

// Export singleton instance
export const gameCreationService = new GameCreationService();
