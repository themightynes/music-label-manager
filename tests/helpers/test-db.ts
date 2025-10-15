import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@shared/schema';
import type { Song, Artist } from '@shared/schema';

/**
 * Test database configuration
 * Uses real PostgreSQL running in Docker on port 5433
 */
const TEST_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/music_label_test';

let testPool: Pool | null = null;
let testDb: NodePgDatabase<typeof schema> | null = null;

/**
 * Creates a connection to the test PostgreSQL database
 * Uses the EXACT same setup as production (drizzle-orm/node-postgres + pg Pool)
 */
export function createTestDatabase(): NodePgDatabase<typeof schema> & { $client: Pool } {
  if (testDb) {
    return testDb as NodePgDatabase<typeof schema> & { $client: Pool };
  }

  // Create connection pool (same as production)
  testPool = new Pool({
    connectionString: TEST_DATABASE_URL,
    max: 5, // Fewer connections for testing
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  // Create Drizzle instance with our schema (same as production)
  testDb = drizzle(testPool, { schema });

  // Attach the $client property for compatibility with code that expects it
  (testDb as any).$client = testPool;

  return testDb as NodePgDatabase<typeof schema> & { $client: Pool };
}

/**
 * Sets up the database tables
 * Run this once before your test suite starts
 *
 * NOTE: Tables are created by running `drizzle-kit push` before tests start.
 * This ensures the test schema EXACTLY matches production schema from shared/schema.ts
 */
export async function setupDatabase() {
  const db = createTestDatabase();

  // Tables already created by drizzle-kit push
  // Just verify connection works
  try {
    await testPool!.query('SELECT 1');
    console.log('[Test DB] Connection verified');
  } catch (error) {
    console.error('[Test DB] Connection failed:', error);
    throw error;
  }
}

/**
 * Clears all data from test database (TRUNCATE - faster than DELETE)
 * Run this between tests to ensure clean state
 */
export async function clearDatabase(db: NodePgDatabase<typeof schema>) {
  // Use TRUNCATE CASCADE to clear all tables and reset sequences
  // Order matters: child tables first, then parent tables
  await testPool!.query(`
    TRUNCATE TABLE
      "chart_entries",
      "release_songs",
      "weekly_actions",
      "mood_events",
      "emails",
      "executives",
      "dialogue_choices",
      "game_events",
      "music_labels",
      "releases",
      "songs",
      "projects",
      "roles",
      "artists",
      "game_saves",
      "game_states",
      "users"
    RESTART IDENTITY CASCADE;
  `);
}

/**
 * Closes the database connection pool
 * Call this after all tests are done
 */
export async function closeDatabaseConnection() {
  if (testPool) {
    await testPool.end();
    testPool = null;
    testDb = null;
  }
}

/**
 * Seeds a minimal game state for testing
 * Only sets the bare minimum fields needed for tests
 */
export async function seedMinimalGame(
  db: NodePgDatabase<typeof schema>,
  overrides?: Partial<{ currentWeek: number; money: number; reputation: number }>
): Promise<{ id: string; currentWeek: number; money: number; reputation: number }> {
  const gameId = crypto.randomUUID();

  // Insert minimal game state
  await db.insert(schema.gameStates).values({
    id: gameId,
    currentWeek: overrides?.currentWeek ?? 1,
    money: overrides?.money ?? 100000,
    reputation: overrides?.reputation ?? 0,
    // All other fields use defaults from schema
  });

  // Return simplified game state object for testing
  return {
    id: gameId,
    currentWeek: overrides?.currentWeek ?? 1,
    money: overrides?.money ?? 100000,
    reputation: overrides?.reputation ?? 0,
  };
}

/**
 * Seeds a test artist
 */
export async function seedArtist(
  db: NodePgDatabase<typeof schema>,
  gameId: string,
  overrides?: Partial<schema.Artist>
): Promise<schema.Artist> {
  const artistId = crypto.randomUUID();

  const artist: Partial<schema.Artist> = {
    id: artistId,
    name: 'Test Artist',
    archetype: 'Workhorse', // Default archetype - required field (proper casing)
    talent: 60,
    workEthic: 70,
    popularity: 50,
    temperament: 50,
    energy: 50,
    mood: 50,
    signed: true,
    genre: 'pop',
    ...overrides,
  };

  const inserted = await db.insert(schema.artists).values({
    id: artist.id!,
    gameId: gameId,
    name: artist.name!,
    archetype: artist.archetype!,
    genre: artist.genre,
    mood: artist.mood,
    energy: artist.energy,
    popularity: artist.popularity,
    talent: artist.talent,
    workEthic: artist.workEthic,
    temperament: artist.temperament,
    signed: artist.signed,
    signedWeek: artist.signedWeek,
    weeklyCost: artist.weeklyCost,
    signingCost: artist.signingCost,
    bio: artist.bio,
    age: artist.age,
  }).returning();

  return inserted[0];
}

/**
 * Seeds a test song
 */
export async function seedSong(
  db: NodePgDatabase<typeof schema>,
  gameId: string,
  artistId: string,
  overrides?: Partial<Omit<Song, 'id' | 'gameId' | 'artistId'>>
): Promise<Song> {
  const songId = crypto.randomUUID();

  const songData = {
    id: songId,
    gameId,
    artistId,
    title: 'Test Song',
    genre: 'pop',
    quality: 75,
    isRecorded: false,
    isReleased: false,
    initialStreams: 0,
    totalStreams: 0,
    totalRevenue: 0,
    weeklyStreams: 0,
    lastWeekRevenue: 0,
    ...overrides,
  };

  await db.insert(schema.songs).values(songData);

  // Return song matching the schema type
  return songData as Song;
}
