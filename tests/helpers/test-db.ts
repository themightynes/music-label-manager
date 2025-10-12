import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@shared/schema';
import { GameState, Artist, Song } from '@shared/types/gameTypes';

/**
 * Test database configuration
 * Uses real PostgreSQL running in Docker on port 5433
 */
const TEST_DATABASE_URL = 'postgresql://testuser:testpassword@localhost:5433/music_label_test';

let testPool: Pool | null = null;
let testDb: NodePgDatabase<typeof schema> | null = null;

/**
 * Creates a connection to the test PostgreSQL database
 * Uses the EXACT same setup as production (drizzle-orm/node-postgres + pg Pool)
 */
export function createTestDatabase(): NodePgDatabase<typeof schema> {
  if (testDb) {
    return testDb;
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

  return testDb;
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
  await testPool!.query(`
    TRUNCATE TABLE
      "chart_entries",
      "releases",
      "songs",
      "projects",
      "artists",
      "game_states",
      "users"
    CASCADE;
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
  overrides?: Partial<Omit<Artist, 'id' | 'gameId' | 'createdAt'>>
): Promise<Artist> {
  const artistId = crypto.randomUUID();

  const artist: Artist = {
    id: artistId,
    gameId,
    name: 'Test Artist',
    genre: 'pop',
    mood: 50,
    energy: 50,
    popularity: 50, // Added popularity field
    talent: 60,
    workEthic: 70,
    stress: 20,
    creativity: 65,
    massAppeal: 55,
    status: 'signed',
    weeksSinceLastRelease: 0,
    archetype: 'workhorse', // Default archetype - required field
    signedWeek: 1, // Default signed week
    loyalty: 50, // Default loyalty
    createdAt: new Date(),
    ...overrides,
  };

  await db.insert(schema.artists).values({
    id: artist.id,
    gameId: artist.gameId,
    name: artist.name,
    genre: artist.genre,
    mood: artist.mood,
    energy: artist.energy,
    popularity: artist.popularity, // Added popularity field
    talent: artist.talent,
    workEthic: artist.workEthic,
    stress: artist.stress,
    creativity: artist.creativity,
    massAppeal: artist.massAppeal,
    status: artist.status,
    weeksSinceLastRelease: artist.weeksSinceLastRelease,
    archetype: artist.archetype,
    signedWeek: artist.signedWeek,
    loyalty: artist.loyalty,
    createdAt: artist.createdAt,
  });

  return artist;
}

/**
 * Seeds a test song
 */
export async function seedSong(
  db: NodePgDatabase<typeof schema>,
  gameId: string,
  artistId: string,
  overrides?: Partial<Omit<Song, 'id' | 'gameId' | 'artistId' | 'createdAt'>>
): Promise<Song> {
  const songId = crypto.randomUUID();

  const song: Song = {
    id: songId,
    gameId,
    projectId: null,
    artistId,
    title: 'Test Song',
    genre: 'pop',
    quality: 75,
    commercialAppeal: 70,
    status: 'unreleased',
    streams: 0,
    peakChartPosition: null,
    weeksOnChart: 0,
    createdAt: new Date(),
    ...overrides,
  };

  await db.insert(schema.songs).values({
    id: song.id,
    gameId: song.gameId,
    projectId: song.projectId,
    artistId: song.artistId,
    title: song.title,
    genre: song.genre,
    quality: song.quality,
    commercialAppeal: song.commercialAppeal,
    status: song.status,
    streams: song.streams || 0,
    peakChartPosition: song.peakChartPosition,
    weeksOnChart: song.weeksOnChart || 0,
    createdAt: song.createdAt,
  });

  return song;
}
