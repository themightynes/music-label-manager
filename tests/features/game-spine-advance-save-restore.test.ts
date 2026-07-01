import { describe, it, expect, beforeEach } from 'vitest';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { GameEngine } from '@shared/engine/game-engine';
import * as schema from '@shared/schema';
import { DatabaseStorage } from '../../server/storage';
import {
  createTestDatabase,
  clearDatabase,
  seedMinimalGame,
  seedArtist,
  seedSong,
} from '../helpers/test-db';

/**
 * Spine smoke test: create game -> advance several weeks (real GameEngine) ->
 * build a production-shaped save snapshot -> persist it -> read it back ->
 * assert end-to-end data parity.
 *
 * This is the ONE flow that guards the refactoring spine. The existing tests
 * cover the halves separately:
 *   - game-engine-advance-week-integration.test.ts: create -> advanceWeek (no save)
 *   - save-load-snapshot-integrity.test.ts: build snapshot -> store -> read (no advance)
 * Neither chains advance -> save -> restore-readback in a single flow.
 *
 * Production shape (see CLAUDE.md "Save/Load Snapshots"): `musicLabel` and all
 * collections are SIBLINGS of `gameState` in the snapshot, NOT nested inside it.
 */

/**
 * Minimal gameData mock that reads the real balance JSON files synchronously.
 * Mirrors createMockGameData() in game-engine-advance-week-integration.test.ts.
 */
function createMockGameData() {
  const balanceDir = path.join(process.cwd(), 'data', 'balance');

  const economy = JSON.parse(fs.readFileSync(path.join(balanceDir, 'economy.json'), 'utf-8'));
  const progression = JSON.parse(fs.readFileSync(path.join(balanceDir, 'progression.json'), 'utf-8'));
  const config = JSON.parse(fs.readFileSync(path.join(balanceDir, 'config.json'), 'utf-8'));
  const markets = JSON.parse(fs.readFileSync(path.join(balanceDir, 'markets.json'), 'utf-8'));

  markets.venue_capacities = progression.access_tier_system.venue_access;

  const balance = {
    economy,
    time_progression: {
      campaign_length_weeks: 52,
      week_duration: 7,
    },
    ...config,
  };

  return {
    getBalanceConfigSync: () => balance,
    getBalanceConfig: async () => balance,
    getAllArtists: async () => [],
    getAllExecutives: async () => [],
    getAllRoles: async () => [],
    getAllEvents: async () => [],
    getTourConfigSync: () => ({
      sell_through_base: 0.7,
      reputation_modifier: 1.0,
      local_popularity_weight: 1.0,
      ticket_price_base: 20,
      ticket_price_per_capacity: 0.01,
      merch_percentage: 0.25,
      revenue_per_fan: 25,
      base_attendance: 100,
      sell_through_range: 0.3,
      costs: { small: 5000, medium: 15000, large: 40000 },
    }),
    getAccessTiersSync: () => progression.access_tier_system,
    getMarketConfigSync: () => markets,
    getReleasedSongs: async () => [],
    getActiveRecordingProjects: async () => [],
    getReleasesByGame: async () => [],
    getChartHistoryByGame: async () => [],
    getPlannedReleases: async () => [],
    getEventConfigSync: () => ({ weekly_chance: 0, event_types: [] }),
    getWeeklyBurnRangeSync: () => balance.economy?.weekly_burn_range || [1500, 2500],
    getProgressionThresholdsSync: () => progression,
    getProducerTierSystemSync: () => progression.producer_tiers || {},
    getAvailableProducerTiers: () => ['local'],
  };
}

describe('Game spine: advance -> save -> restore parity', () => {
  let db: NodePgDatabase<typeof schema> & { $client: Pool };
  let storage: DatabaseStorage;
  let gameData: any;

  beforeEach(async () => {
    db = createTestDatabase();
    await clearDatabase(db);
    storage = new DatabaseStorage(db);
    gameData = createMockGameData();
  });

  it('advances several weeks, saves a snapshot, and reads it back with full parity', async () => {
    // --- Create game (with owner, label, artist, song) ---
    const userId = crypto.randomUUID();
    await db.insert(schema.users).values({
      id: userId,
      clerkId: `clerk_${userId}`,
      email: 'spine@test.com',
    });

    const seeded = await seedMinimalGame(db, {
      currentWeek: 1,
      money: 100000,
      reputation: 0,
    });

    await db.update(schema.gameStates)
      .set({ userId })
      .where(eq(schema.gameStates.id, seeded.id));

    const labelName = 'Spine Records';
    const labelId = crypto.randomUUID();
    await db.insert(schema.musicLabels).values({
      id: labelId,
      gameId: seeded.id,
      name: labelName,
      genreFocus: 'pop',
    });

    const artist = await seedArtist(db, seeded.id, { name: 'Spine Artist' });
    const song = await seedSong(db, seeded.id, artist.id, {
      title: 'Spine Single',
      isRecorded: true,
    });

    // --- Advance several weeks with the REAL GameEngine ---
    const gameState: any = {
      id: seeded.id,
      currentWeek: seeded.currentWeek,
      money: seeded.money,
      reputation: seeded.reputation,
      campaignCompleted: false,
    };

    const engine = new GameEngine(gameState, gameData, storage);

    const WEEKS_TO_ADVANCE = 3;
    for (let i = 0; i < WEEKS_TO_ADVANCE; i++) {
      await engine.advanceWeek([]);
    }

    // Week should have advanced by exactly WEEKS_TO_ADVANCE, and money burned down.
    expect(gameState.currentWeek).toBe(seeded.currentWeek + WEEKS_TO_ADVANCE);
    expect(gameState.money).toBeLessThan(seeded.money);

    // Persist the advanced state back to the DB (production writes gameState after advance).
    await storage.updateGameState(seeded.id, {
      currentWeek: gameState.currentWeek,
      money: gameState.money,
      reputation: gameState.reputation,
    });

    const persisted = await storage.getGameState(seeded.id);
    expect(persisted?.currentWeek).toBe(gameState.currentWeek);
    expect(persisted?.money).toBe(gameState.money);

    // --- Build a production-shaped snapshot: musicLabel + collections are SIBLINGS
    // of gameState, NOT nested inside it. ---
    const label = (await db.select().from(schema.musicLabels)
      .where(eq(schema.musicLabels.gameId, seeded.id)))[0];
    const artists = await db.select().from(schema.artists)
      .where(eq(schema.artists.gameId, seeded.id));
    const songs = await db.select().from(schema.songs)
      .where(eq(schema.songs.gameId, seeded.id));

    const snapshot: schema.GameSaveSnapshot = {
      snapshotVersion: schema.SNAPSHOT_VERSION,
      gameState: {
        id: persisted!.id,
        currentWeek: persisted!.currentWeek,
        money: persisted!.money,
        reputation: persisted!.reputation,
      } as any,
      musicLabel: label, // sibling, not nested
      artists,
      projects: [],
      roles: [],
      songs,
      releases: [],
      releaseSongs: [],
      executives: [],
      moodEvents: [],
      weeklyActions: [],
    } as schema.GameSaveSnapshot;

    // --- Save snapshot ---
    const saveId = crypto.randomUUID();
    await storage.createGameSave({
      id: saveId,
      userId,
      name: 'Spine Save',
      week: persisted!.currentWeek,
      gameState: snapshot,
      isAutosave: false,
    } as any);

    // --- Restore: read the snapshot back and assert end-to-end parity ---
    const reloaded = await storage.getGameSave(saveId);
    expect(reloaded).toBeDefined();

    const restored = reloaded!.gameState as schema.GameSaveSnapshot;

    // Snapshot version + inner game state parity.
    expect(restored.snapshotVersion).toBe(schema.SNAPSHOT_VERSION);
    expect(restored.gameState.id).toBe(seeded.id);
    expect(restored.gameState.currentWeek).toBe(gameState.currentWeek);
    expect(restored.gameState.money).toBe(gameState.money);
    expect(restored.gameState.reputation).toBe(gameState.reputation);

    // musicLabel restored as a SIBLING (not under gameState) with the correct name.
    expect((restored.gameState as any).musicLabel).toBeUndefined();
    expect(restored.musicLabel?.name).toBe(labelName);
    expect(restored.musicLabel?.gameId).toBe(seeded.id);

    // Collections survive the round-trip intact.
    expect(restored.artists).toHaveLength(1);
    expect(restored.artists?.[0].id).toBe(artist.id);
    expect(restored.artists?.[0].name).toBe('Spine Artist');
    expect(restored.songs).toHaveLength(1);
    expect(restored.songs?.[0].id).toBe(song.id);
    expect(restored.songs?.[0].title).toBe('Spine Single');
  });
});
