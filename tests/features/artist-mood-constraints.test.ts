/**
 * Tests for Artist Mood Database Constraints
 * Validates that mood values are properly constrained between 0 and 100
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDatabase, clearDatabase } from '../helpers/test-db';
import { artists } from '../../shared/schema';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../shared/schema';
import { sql } from 'drizzle-orm';

describe('Artist Mood Database Constraints', () => {
  let db: NodePgDatabase<typeof schema>;

  beforeEach(async () => {
    // Use test database and clear it before each test
    db = createTestDatabase();
    await clearDatabase(db);
  });

  afterEach(async () => {
    // Clean up any test artists that were successfully created
    try {
      await db.delete(artists).where(sql`${artists.name} LIKE 'Test Artist%'`);
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should reject mood values greater than 100', async () => {
    await expect(
      db.insert(artists).values({
        name: 'Test Artist Over 100',
        archetype: 'pop',
        mood: 101,
        gameId: '00000000-0000-0000-0000-000000000000'
      })
    ).rejects.toThrow(/check constraint|mood/i);
  });

  it('should reject mood values less than 0', async () => {
    await expect(
      db.insert(artists).values({
        name: 'Test Artist Under 0',
        archetype: 'rock',
        mood: -1,
        gameId: '00000000-0000-0000-0000-000000000000'
      })
    ).rejects.toThrow(/check constraint|mood/i);
  });

  it('should default mood to 50 when not provided', async () => {
    const [artist] = await db.insert(artists).values({
      name: 'Test Artist Default Mood',
      archetype: 'indie',
      gameId: '00000000-0000-0000-0000-000000000000'
    }).returning();

    expect(artist.mood).toBe(50);
  });

  it('should accept valid mood values between 0 and 100', async () => {
    const [artist] = await db.insert(artists).values({
      name: 'Test Artist Valid Mood',
      archetype: 'pop',
      mood: 75,
      gameId: '00000000-0000-0000-0000-000000000000'
    }).returning();

    expect(artist.mood).toBe(75);
  });
});
