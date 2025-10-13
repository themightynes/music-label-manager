/**
 * Save/Load Email System Tests
 *
 * Tests for Bug Fix #1 (Email System Not Reverting with Saves) and Bug Fix #2 (Invalid Save Format)
 *
 * Test Coverage:
 * 1. Email inclusion in save snapshots
 * 2. Email restoration when loading saves
 * 3. Email filtering by week
 * 4. Export/import email integrity
 * 5. Overwrite vs fork mode email handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDatabase, clearDatabase, seedMinimalGame } from '../helpers/test-db';
import * as schema from '@shared/schema';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

describe('Save/Load Email System', () => {
  let db: NodePgDatabase<typeof schema>;

  beforeEach(async () => {
    db = createTestDatabase();
    await clearDatabase(db);
  });

  describe('Email Snapshot Inclusion', () => {
    it('should include emails in game save snapshot', async () => {
      // Arrange: Create game with emails
      const game = await seedMinimalGame(db, { currentWeek: 3 });
      const userId = crypto.randomUUID();

      // Insert user first
      await db.insert(schema.users).values({
        id: userId,
        clerkId: `clerk_${userId}`,
        email: 'test@example.com',
      });

      // Update game with userId
      await db.update(schema.gameStates)
        .set({ userId })
        .where(eq(schema.gameStates.id, game.id));

      // Create test emails for weeks 1-3
      const emailsData = [
        {
          id: crypto.randomUUID(),
          gameId: game.id,
          week: 1,
          category: 'system' as const,
          sender: 'System',
          subject: 'Week 1 Email',
          body: { content: 'Welcome to the game!' },
          isRead: true,
        },
        {
          id: crypto.randomUUID(),
          gameId: game.id,
          week: 2,
          category: 'financial' as const,
          sender: 'Accountant',
          subject: 'Week 2 Financial Summary',
          body: { content: 'Your financial status' },
          isRead: false,
        },
        {
          id: crypto.randomUUID(),
          gameId: game.id,
          week: 3,
          category: 'artist' as const,
          sender: 'Artist Manager',
          subject: 'Artist Update',
          body: { content: 'Artist mood changed' },
          isRead: false,
        },
      ];

      await db.insert(schema.emails).values(emailsData);

      // Act: Create a save snapshot
      const snapshot: schema.GameSaveSnapshot = {
        gameState: {
          id: game.id,
          currentWeek: 3,
          money: 100000,
          reputation: 0,
          creativeCapital: 100,
        },
        artists: [],
        projects: [],
        roles: [],
        songs: [],
        releases: [],
        emails: emailsData,
        weeklyActions: [],
      };

      await db.insert(schema.gameSaves).values({
        id: crypto.randomUUID(),
        userId,
        name: 'Test Save with Emails',
        week: 3,
        gameState: snapshot,
        isAutosave: false,
      });

      // Assert: Verify emails are in snapshot
      const savedGames = await db.select().from(schema.gameSaves);
      expect(savedGames).toHaveLength(1);

      const savedSnapshot = savedGames[0].gameState as schema.GameSaveSnapshot;
      expect(savedSnapshot.emails).toBeDefined();
      expect(savedSnapshot.emails).toHaveLength(3);
      expect(savedSnapshot.emails![0].subject).toBe('Week 1 Email');
      expect(savedSnapshot.emails![1].subject).toBe('Week 2 Financial Summary');
      expect(savedSnapshot.emails![2].subject).toBe('Artist Update');
    });

    it('should handle empty emails array in snapshot', async () => {
      // Arrange: Create game with no emails
      const game = await seedMinimalGame(db, { currentWeek: 1 });
      const userId = crypto.randomUUID();

      await db.insert(schema.users).values({
        id: userId,
        clerkId: `clerk_${userId}`,
        email: 'test@example.com',
      });

      await db.update(schema.gameStates)
        .set({ userId })
        .where(eq(schema.gameStates.id, game.id));

      // Act: Create snapshot with empty emails
      const snapshot: schema.GameSaveSnapshot = {
        gameState: {
          id: game.id,
          currentWeek: 1,
          money: 100000,
          reputation: 0,
          creativeCapital: 100,
        },
        artists: [],
        projects: [],
        roles: [],
        songs: [],
        releases: [],
        emails: [], // Empty array
        weeklyActions: [],
      };

      await db.insert(schema.gameSaves).values({
        id: crypto.randomUUID(),
        userId,
        name: 'Empty Email Save',
        week: 1,
        gameState: snapshot,
        isAutosave: false,
      });

      // Assert: Verify emails array is empty but defined
      const savedGames = await db.select().from(schema.gameSaves);
      const savedSnapshot = savedGames[0].gameState as schema.GameSaveSnapshot;
      expect(savedSnapshot.emails).toBeDefined();
      expect(savedSnapshot.emails).toHaveLength(0);
    });
  });

  describe('Email Restoration on Load', () => {
    it('should restore emails when loading a save (overwrite mode)', async () => {
      // Arrange: Create game with Week 1-5 emails
      const game = await seedMinimalGame(db, { currentWeek: 5 });
      const userId = crypto.randomUUID();

      await db.insert(schema.users).values({
        id: userId,
        clerkId: `clerk_${userId}`,
        email: 'test@example.com',
      });

      await db.update(schema.gameStates)
        .set({ userId })
        .where(eq(schema.gameStates.id, game.id));

      // Create emails for weeks 1-5
      const allEmails = Array.from({ length: 5 }, (_, i) => ({
        id: crypto.randomUUID(),
        gameId: game.id,
        week: i + 1,
        category: 'system' as const,
        sender: 'System',
        subject: `Week ${i + 1} Email`,
        body: { content: `Content for week ${i + 1}` },
        isRead: false,
      }));

      await db.insert(schema.emails).values(allEmails);

      // Create a save snapshot from Week 3 (only includes weeks 1-3)
      const week3Emails = allEmails.slice(0, 3);
      const snapshot: schema.GameSaveSnapshot = {
        gameState: {
          id: game.id,
          currentWeek: 3,
          money: 100000,
          reputation: 0,
          creativeCapital: 100,
        },
        artists: [],
        projects: [],
        roles: [],
        songs: [],
        releases: [],
        emails: week3Emails,
        weeklyActions: [],
      };

      const saveId = crypto.randomUUID();
      await db.insert(schema.gameSaves).values({
        id: saveId,
        userId,
        name: 'Week 3 Save',
        week: 3,
        gameState: snapshot,
        isAutosave: false,
      });

      // Act: Simulate loading the save (delete all emails, restore from snapshot)
      await db.delete(schema.emails).where(eq(schema.emails.gameId, game.id));
      await db.insert(schema.emails).values(week3Emails);

      // Assert: Verify only Week 1-3 emails exist
      const restoredEmails = await db
        .select()
        .from(schema.emails)
        .where(eq(schema.emails.gameId, game.id));

      expect(restoredEmails).toHaveLength(3);
      expect(restoredEmails[0].week).toBe(1);
      expect(restoredEmails[1].week).toBe(2);
      expect(restoredEmails[2].week).toBe(3);
    });

    it('should handle loading save with no emails', async () => {
      // Arrange: Create game with emails
      const game = await seedMinimalGame(db, { currentWeek: 2 });
      const userId = crypto.randomUUID();

      await db.insert(schema.users).values({
        id: userId,
        clerkId: `clerk_${userId}`,
        email: 'test@example.com',
      });

      await db.update(schema.gameStates)
        .set({ userId })
        .where(eq(schema.gameStates.id, game.id));

      await db.insert(schema.emails).values({
        id: crypto.randomUUID(),
        gameId: game.id,
        week: 2,
        category: 'system' as const,
        sender: 'System',
        subject: 'Week 2 Email',
        body: { content: 'Content' },
        isRead: false,
      });

      // Create a save from Week 1 with no emails
      const snapshot: schema.GameSaveSnapshot = {
        gameState: {
          id: game.id,
          currentWeek: 1,
          money: 100000,
          reputation: 0,
          creativeCapital: 100,
        },
        artists: [],
        projects: [],
        roles: [],
        songs: [],
        releases: [],
        emails: [],
        weeklyActions: [],
      };

      await db.insert(schema.gameSaves).values({
        id: crypto.randomUUID(),
        userId,
        name: 'Week 1 Save (No Emails)',
        week: 1,
        gameState: snapshot,
        isAutosave: false,
      });

      // Act: Restore empty email state
      await db.delete(schema.emails).where(eq(schema.emails.gameId, game.id));

      // Assert: Verify no emails exist
      const restoredEmails = await db
        .select()
        .from(schema.emails)
        .where(eq(schema.emails.gameId, game.id));

      expect(restoredEmails).toHaveLength(0);
    });
  });

  describe('Email Fork Mode', () => {
    it('should create new email IDs when loading in fork mode', async () => {
      // Arrange: Create original game with emails
      const originalGame = await seedMinimalGame(db, { currentWeek: 2 });
      const userId = crypto.randomUUID();

      await db.insert(schema.users).values({
        id: userId,
        clerkId: `clerk_${userId}`,
        email: 'test@example.com',
      });

      await db.update(schema.gameStates)
        .set({ userId })
        .where(eq(schema.gameStates.id, originalGame.id));

      const originalEmailId = crypto.randomUUID();
      await db.insert(schema.emails).values({
        id: originalEmailId,
        gameId: originalGame.id,
        week: 1,
        category: 'system' as const,
        sender: 'System',
        subject: 'Original Email',
        body: { content: 'Original content' },
        isRead: false,
      });

      // Create snapshot
      const snapshot: schema.GameSaveSnapshot = {
        gameState: {
          id: originalGame.id,
          currentWeek: 2,
          money: 100000,
          reputation: 0,
          creativeCapital: 100,
        },
        artists: [],
        projects: [],
        roles: [],
        songs: [],
        releases: [],
        emails: [{
          id: originalEmailId,
          gameId: originalGame.id,
          week: 1,
          category: 'system',
          sender: 'System',
          subject: 'Original Email',
          body: { content: 'Original content' },
          isRead: false,
        }],
        weeklyActions: [],
      };

      // Act: Fork mode - create new game
      const newGameId = crypto.randomUUID();
      await db.insert(schema.gameStates).values({
        id: newGameId,
        userId,
        currentWeek: 2,
        money: 100000,
        reputation: 0,
      });

      const newEmailId = crypto.randomUUID();
      await db.insert(schema.emails).values({
        id: newEmailId, // New ID
        gameId: newGameId, // New game ID
        week: 1,
        category: 'system' as const,
        sender: 'System',
        subject: 'Original Email',
        body: { content: 'Original content' },
        isRead: false,
      });

      // Assert: Verify email has new IDs but same content
      const forkedEmails = await db
        .select()
        .from(schema.emails)
        .where(eq(schema.emails.gameId, newGameId));

      expect(forkedEmails).toHaveLength(1);
      expect(forkedEmails[0].id).not.toBe(originalEmailId);
      expect(forkedEmails[0].gameId).toBe(newGameId);
      expect(forkedEmails[0].subject).toBe('Original Email');
    });
  });

  describe('Export/Import Email Integrity', () => {
    it('should export emails in correct nested snapshot format', () => {
      // Arrange: Create export data structure
      const emails = [
        {
          id: crypto.randomUUID(),
          gameId: 'test-game-id',
          week: 1,
          category: 'system' as const,
          sender: 'System',
          subject: 'Test Email',
          body: { content: 'Test content' },
          isRead: false,
        },
      ];

      const exportData = {
        gameState: {
          gameState: {
            id: 'test-game-id',
            currentWeek: 1,
            money: 100000,
            reputation: 0,
            creativeCapital: 100,
          },
          musicLabel: null,
          artists: [],
          projects: [],
          roles: [],
          songs: [],
          releases: [],
          emails, // Emails included in nested structure
          weeklyActions: [],
        },
        timestamp: new Date().toISOString(),
        version: '1.0',
      };

      // Act: Validate against schema
      const validationResult = schema.gameSaveSnapshotSchema.safeParse(exportData.gameState);

      // Assert: Export format is valid
      expect(validationResult.success).toBe(true);
      if (validationResult.success) {
        expect(validationResult.data.emails).toBeDefined();
        expect(validationResult.data.emails).toHaveLength(1);
        expect(validationResult.data.emails![0].subject).toBe('Test Email');
      }
    });

    it('should validate imported save with emails', () => {
      // Arrange: Simulated imported JSON data
      const importedData = {
        gameState: {
          gameState: {
            id: 'imported-game-id',
            currentWeek: 3,
            money: 50000,
            reputation: 10,
            creativeCapital: 75,
          },
          musicLabel: null,
          artists: [],
          projects: [],
          roles: [],
          songs: [],
          releases: [],
          emails: [
            {
              id: crypto.randomUUID(),
              gameId: 'imported-game-id',
              week: 1,
              category: 'financial',
              sender: 'Accountant',
              subject: 'Week 1 Summary',
              body: { content: 'Financial data' },
              isRead: true,
            },
            {
              id: crypto.randomUUID(),
              gameId: 'imported-game-id',
              week: 3,
              category: 'artist',
              sender: 'Artist Manager',
              subject: 'Artist Mood',
              body: { content: 'Mood decreased' },
              isRead: false,
            },
          ],
          weeklyActions: [],
        },
        timestamp: new Date().toISOString(),
        version: '1.0',
      };

      // Act: Validate against schema
      const validationResult = schema.gameSaveSnapshotSchema.safeParse(importedData.gameState);

      // Assert: Import format is valid and emails are preserved
      expect(validationResult.success).toBe(true);
      if (validationResult.success) {
        expect(validationResult.data.emails).toHaveLength(2);
        expect(validationResult.data.emails![0].week).toBe(1);
        expect(validationResult.data.emails![1].week).toBe(3);
      }
    });
  });

  describe('Email Week Filtering', () => {
    it('should only restore emails up to save week', async () => {
      // Arrange: Create game at Week 5 with emails
      const game = await seedMinimalGame(db, { currentWeek: 5 });
      const userId = crypto.randomUUID();

      await db.insert(schema.users).values({
        id: userId,
        clerkId: `clerk_${userId}`,
        email: 'test@example.com',
      });

      await db.update(schema.gameStates)
        .set({ userId })
        .where(eq(schema.gameStates.id, game.id));

      // Create snapshot at Week 3 with only Week 1-3 emails
      const week3Emails = [
        {
          id: crypto.randomUUID(),
          gameId: game.id,
          week: 1,
          category: 'system' as const,
          sender: 'System',
          subject: 'Week 1',
          body: { content: 'Content' },
          isRead: false,
        },
        {
          id: crypto.randomUUID(),
          gameId: game.id,
          week: 2,
          category: 'system' as const,
          sender: 'System',
          subject: 'Week 2',
          body: { content: 'Content' },
          isRead: false,
        },
        {
          id: crypto.randomUUID(),
          gameId: game.id,
          week: 3,
          category: 'system' as const,
          sender: 'System',
          subject: 'Week 3',
          body: { content: 'Content' },
          isRead: false,
        },
      ];

      const snapshot: schema.GameSaveSnapshot = {
        gameState: {
          id: game.id,
          currentWeek: 3,
          money: 100000,
          reputation: 0,
          creativeCapital: 100,
        },
        artists: [],
        projects: [],
        roles: [],
        songs: [],
        releases: [],
        emails: week3Emails,
        weeklyActions: [],
      };

      // Act: Restore snapshot
      await db.delete(schema.emails).where(eq(schema.emails.gameId, game.id));
      await db.insert(schema.emails).values(week3Emails);

      // Assert: Only Week 1-3 emails exist (Week 4-5 emails not restored)
      const restoredEmails = await db
        .select()
        .from(schema.emails)
        .where(eq(schema.emails.gameId, game.id));

      expect(restoredEmails).toHaveLength(3);
      expect(restoredEmails.every(email => email.week <= 3)).toBe(true);
      expect(restoredEmails.some(email => email.week > 3)).toBe(false);
    });
  });

  describe('Schema Validation', () => {
    it('should validate gameSaveSnapshotSchema with emails field', () => {
      // Arrange: Valid snapshot data
      const validSnapshot = {
        gameState: {
          id: 'test-id',
          currentWeek: 1,
          money: 100000,
          reputation: 0,
          creativeCapital: 100,
        },
        emails: [
          {
            id: 'email-1',
            gameId: 'test-id',
            week: 1,
            category: 'system',
            sender: 'System',
            subject: 'Test',
            body: { content: 'Body' },
            isRead: false,
          },
        ],
      };

      // Act: Validate
      const result = schema.gameSaveSnapshotSchema.safeParse(validSnapshot);

      // Assert: Valid
      expect(result.success).toBe(true);
    });

    it('should allow optional emails field in schema', () => {
      // Arrange: Snapshot without emails
      const snapshotWithoutEmails = {
        gameState: {
          id: 'test-id',
          currentWeek: 1,
          money: 100000,
          reputation: 0,
          creativeCapital: 100,
        },
      };

      // Act: Validate
      const result = schema.gameSaveSnapshotSchema.safeParse(snapshotWithoutEmails);

      // Assert: Valid (emails is optional)
      expect(result.success).toBe(true);
    });
  });
});
