import { Router } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { storage } from '../storage';
import { db } from '../db';
import { eq, inArray } from 'drizzle-orm';
import { requireClerkUser } from '../auth';
import {
  insertGameSaveSchema,
  gameSaveSnapshotSchema,
  gameStates,
  weeklyActions,
  projects,
  songs,
  artists,
  releases,
  releaseSongs,
  roles,
  executives,
  musicLabels,
  moodEvents,
  emails,
  type GameSaveSnapshot,
  SNAPSHOT_VERSION,
} from '@shared/schema';

const router = Router();

const validateSnapshotCollections = (snapshot: GameSaveSnapshot) => {
  const errors: string[] = [];

  const ensureArray = (value: unknown, name: string): value is unknown[] => {
    if (value === undefined || value === null) return false;
    if (!Array.isArray(value)) {
      errors.push(`${name} must be an array`);
      return false;
    }
    return true;
  };

  if (ensureArray(snapshot.releaseSongs, 'releaseSongs')) {
    snapshot.releaseSongs.forEach((entry, index) => {
      if (!entry || typeof entry.releaseId !== 'string' || typeof entry.songId !== 'string') {
        errors.push(`releaseSongs[${index}] is missing required releaseId/songId`);
      }
    });
  }

  if (ensureArray(snapshot.executives, 'executives')) {
    snapshot.executives.forEach((exec: any, index) => {
      if (!exec || typeof exec.id !== 'string' || typeof exec.role !== 'string') {
        errors.push(`executives[${index}] is missing required id/role`);
      }
    });
  }

  if (ensureArray(snapshot.moodEvents, 'moodEvents')) {
    snapshot.moodEvents.forEach((event: any, index) => {
      if (!event || typeof event.id !== 'string' || typeof event.artistId !== 'string') {
        errors.push(`moodEvents[${index}] is missing required id/artistId`);
      }
    });
  }

  if (ensureArray(snapshot.emails, 'emails')) {
    snapshot.emails.forEach((email: any, index) => {
      if (!email || typeof (email as any).id !== 'string' || typeof email.subject !== 'string') {
        errors.push(`emails[${index}] is missing required id/subject`);
      }
    });
  }

  if (errors.length > 0) {
    const error = new Error('Invalid snapshot collections');
    (error as any).code = 'INVALID_SNAPSHOT_COLLECTIONS';
    (error as any).details = errors;
    throw error;
  }
};

  // Save game routes
  router.get("/api/saves", requireClerkUser, async (req, res) => {
    try {
      const saves = await storage.getGameSaves(req.userId!);
      res.json(saves);
    } catch (error) {
      console.error('[API] Failed to fetch save summaries:', error);
      res.status(500).json({ message: "Failed to fetch saves" });
    }
  });

  router.get("/api/saves/:saveId", requireClerkUser, async (req, res) => {
    try {
      const save = await storage.getGameSaveForUser(req.params.saveId, req.userId!);
      if (!save) {
        return res.status(404).json({
          error: 'SAVE_NOT_FOUND',
          message: 'Save file not found or does not belong to this user'
        });
      }

      const { userId: _userId, ...rest } = save as any;
      res.json(rest);
    } catch (error) {
      console.error('[API] Failed to fetch save snapshot:', error);
      res.status(500).json({ message: "Failed to fetch save snapshot" });
    }
  });

  router.post("/api/saves", requireClerkUser, async (req, res) => {
    try {
      const validatedData = insertGameSaveSchema.parse(req.body);
      const snapshot = validatedData.gameState;
      const snapshotGameId = snapshot?.gameState?.id;

      if (!snapshotGameId) {
        return res.status(400).json({
          error: 'INVALID_SNAPSHOT',
          message: 'Save snapshot is missing game identifier'
        });
      }

      const save = await storage.createGameSave({
        ...validatedData,
        week: snapshot.gameState.currentWeek,
        userId: req.userId!,
      });

      if (validatedData.isAutosave) {
        await storage.purgeOldAutosaves(req.userId!, snapshotGameId, 3);
      }

      res.json(save);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid save data", errors: error.errors });
      } else {
        console.error('Save creation error:', error);
        res.status(500).json({ message: "Failed to create save" });
      }
    }
  });

  router.post("/api/saves/:saveId/restore", requireClerkUser, async (req, res) => {
    const restoreRequestSchema = z.object({
      mode: z.enum(['overwrite', 'fork']).default('overwrite'),
    });

    // Helper function to convert timestamp strings to Date objects
    const convertTimestamps = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;

      if (Array.isArray(obj)) {
        return obj.map(item => convertTimestamps(item));
      }

      const converted: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Convert fields that end with 'At' or are known timestamp fields
        if ((key.endsWith('At') || key === 'createdAt' || key === 'updatedAt') &&
            typeof value === 'string' && value) {
          converted[key] = new Date(value);
        } else if (value && typeof value === 'object') {
          converted[key] = convertTimestamps(value);
        } else {
          converted[key] = value;
        }
      }
      return converted;
    };

    try {
      const { mode } = restoreRequestSchema.parse(req.body ?? {});

      const save = await storage.getGameSaveForUser(req.params.saveId, req.userId!);
      if (!save) {
        return res.status(404).json({
          error: 'SAVE_NOT_FOUND',
          message: 'Save file not found or does not belong to this user',
        });
      }

      const snapshot = gameSaveSnapshotSchema.parse(save.gameState) as GameSaveSnapshot;
      if ((snapshot.snapshotVersion ?? 1) !== SNAPSHOT_VERSION) {
        return res.status(400).json({
          error: 'UNSUPPORTED_SNAPSHOT_VERSION',
          message: `Snapshot version ${snapshot.snapshotVersion ?? 1} is not supported. Expected version ${SNAPSHOT_VERSION}.`,
        });
      }
      const targetGameState = snapshot.gameState;
      const sourceGameId = targetGameState?.id;

      validateSnapshotCollections(snapshot);

      if (!sourceGameId) {
        return res.status(400).json({
          error: 'INVALID_SNAPSHOT',
          message: 'Save snapshot is missing game identifier',
        });
      }

      if (mode === 'overwrite') {
        console.log('[RESTORE] Starting overwrite mode for game:', sourceGameId);
        const existingGame = await storage.getGameState(sourceGameId);
        if (!existingGame || existingGame.userId !== req.userId) {
          return res.status(403).json({
            error: 'UNAUTHORIZED',
            message: 'You do not have permission to restore this game',
          });
        }

        console.log('[RESTORE] Beginning transaction...');
        await db.transaction(async (tx) => {
          console.log('[RESTORE] Step 1: Updating game_states...');
          await tx.update(gameStates)
            .set({
              currentWeek: targetGameState.currentWeek,
              money: targetGameState.money,
              reputation: targetGameState.reputation,
              creativeCapital: targetGameState.creativeCapital,
              focusSlots: targetGameState.focusSlots ?? existingGame.focusSlots,
              usedFocusSlots: targetGameState.usedFocusSlots ?? 0,
              arOfficeSlotUsed: targetGameState.arOfficeSlotUsed ?? false,
              arOfficeSourcingType: targetGameState.arOfficeSourcingType ?? null,
              arOfficePrimaryGenre: targetGameState.arOfficePrimaryGenre ?? null,
              arOfficeSecondaryGenre: targetGameState.arOfficeSecondaryGenre ?? null,
              arOfficeOperationStart: targetGameState.arOfficeOperationStart ?? null,
              playlistAccess: targetGameState.playlistAccess ?? existingGame.playlistAccess,
              pressAccess: targetGameState.pressAccess ?? existingGame.pressAccess,
              venueAccess: targetGameState.venueAccess ?? existingGame.venueAccess,
              campaignType: targetGameState.campaignType ?? existingGame.campaignType,
              campaignCompleted: targetGameState.campaignCompleted ?? existingGame.campaignCompleted,
              rngSeed: targetGameState.rngSeed ?? existingGame.rngSeed,
              flags: targetGameState.flags ?? existingGame.flags ?? {},
              weeklyStats: targetGameState.weeklyStats ?? existingGame.weeklyStats ?? {},
              tierUnlockHistory: targetGameState.tierUnlockHistory ?? existingGame.tierUnlockHistory ?? {},
              userId: req.userId!,
              updatedAt: new Date(),
            })
            .where(eq(gameStates.id, sourceGameId));

          // IMPORTANT: Delete in order of foreign key dependencies (children first, parents last)
          // Deletion ordering summary:
          // 1. release_songs → depends on releases & songs (junction table must be cleared first)
          // 2. songs → depends on artists, projects, releases (remove track rows before their parents)
          // 3. releases → depends on artists (planned releases point back to artist roster)
          // 4. projects → depends on artists (projects reference artist owners)
          // 5. mood_events → depends on artists (events track artist history)
          // 6. artists → depends only on game state once children are gone
          // 7. roles / weekly_actions / music_labels / emails / executives → all hang directly off game_state
          // The inserts later run in the exact reverse order so parents exist before their dependent rows.

          console.log('[RESTORE] Step 2: Deleting release_songs junction table...');
          // Clear junction table first so dependent release/song deletions don't hit FK constraints
          const releaseRows = await tx
            .select({ id: releases.id })
            .from(releases)
            .where(eq(releases.gameId, sourceGameId));

          if (releaseRows.length > 0) {
            const releaseIds = releaseRows.map(({ id }) => id);
            await tx
              .delete(releaseSongs)
              .where(inArray(releaseSongs.releaseId, releaseIds));
          }

          console.log('[RESTORE] Step 3: Deleting songs (depends on artists, projects, releases)...');
          // Remove songs before their parent releases/projects/artists to keep FK chain intact
          await tx.delete(songs).where(eq(songs.gameId, sourceGameId));

          console.log('[RESTORE] Step 4: Deleting releases (depends on artists)...');
          // Releases reference artists; with tracks gone we can safely drop the release rows
          await tx.delete(releases).where(eq(releases.gameId, sourceGameId));

          console.log('[RESTORE] Step 5: Deleting projects (depends on artists)...');
          // Projects still point at artists, so they must disappear before we remove the roster
          await tx.delete(projects).where(eq(projects.gameId, sourceGameId));

          console.log('[RESTORE] Step 6: Deleting mood_events (depends on artists)...');
          // Mood history also references artists; delete events prior to artist removal
          await tx.delete(moodEvents).where(eq(moodEvents.gameId, sourceGameId));

          console.log('[RESTORE] Step 7: Deleting artists (no more dependencies)...');
          // With all child tables cleared we can drop artist rows
          await tx.delete(artists).where(eq(artists.gameId, sourceGameId));

          console.log('[RESTORE] Step 8: Deleting roles...');
          // Remaining tables (roles/weekly_actions/label/emails/executives) hang directly off game_state
          await tx.delete(roles).where(eq(roles.gameId, sourceGameId));

          console.log('[RESTORE] Step 9: Deleting weekly_actions...');
          await tx.delete(weeklyActions).where(eq(weeklyActions.gameId, sourceGameId));

          console.log('[RESTORE] Step 10: Deleting music_labels...');
          await tx.delete(musicLabels).where(eq(musicLabels.gameId, sourceGameId));

          console.log('[RESTORE] Step 11: Deleting emails...');
          await tx.delete(emails).where(eq(emails.gameId, sourceGameId));

          console.log('[RESTORE] Step 12: Deleting executives...');
          await tx.delete(executives).where(eq(executives.gameId, sourceGameId));

          // Now insert everything back in reverse order (parents first, children last)

          console.log('[RESTORE] Step 13: Reinserting music_labels...');
          // Rebuild parents first so dependent collections have targets
          if (snapshot.musicLabel) {
            await tx.insert(musicLabels).values(
              convertTimestamps({
                ...snapshot.musicLabel,
                gameId: sourceGameId,
              }) as any
            );
          }

          console.log('[RESTORE] Step 14: Reinserting weekly_actions...');
          // Weekly history depends only on game state, insert early for clarity
          if (Array.isArray(snapshot.weeklyActions) && snapshot.weeklyActions.length > 0) {
            await tx.insert(weeklyActions).values(
              snapshot.weeklyActions.map((action) =>
                convertTimestamps({
                  ...action,
                  gameId: sourceGameId,
                })
              ) as any,
            );
          }

          console.log('[RESTORE] Step 15: Reinserting roles...');
          // Roles also hang off the game directly
          if (Array.isArray(snapshot.roles) && snapshot.roles.length > 0) {
            await tx.insert(roles).values(
              snapshot.roles.map((role) =>
                convertTimestamps({
                  ...role,
                  gameId: sourceGameId,
                })
              ) as any,
            );
          }

          console.log('[RESTORE] Step 16: Reinserting artists...');
          // Restore roster before any collection that references artist IDs
          if (Array.isArray(snapshot.artists) && snapshot.artists.length > 0) {
            await tx.insert(artists).values(
              snapshot.artists.map((artist) =>
                convertTimestamps({
                  ...artist,
                  gameId: sourceGameId,
                })
              ) as any,
            );
          }

          console.log('[RESTORE] Step 17: Reinserting mood_events...');
          // Mood events can now target their owning artists
          if (Array.isArray(snapshot.moodEvents) && snapshot.moodEvents.length > 0) {
            await tx.insert(moodEvents).values(
              snapshot.moodEvents.map((event: any) =>
                convertTimestamps({
                  ...event,
                  gameId: sourceGameId,
                })
              ) as any,
            );
          }

          console.log('[RESTORE] Step 18: Reinserting projects...');
          // Projects require artist IDs but must exist before songs referencing project_id
          if (Array.isArray(snapshot.projects) && snapshot.projects.length > 0) {
            await tx.insert(projects).values(
              snapshot.projects.map((project) =>
                convertTimestamps({
                  ...project,
                  gameId: sourceGameId,
                })
              ) as any,
            );
          }

          console.log('[RESTORE] Step 19: Reinserting releases...');
          // Releases depend on artists and are parents for songs/release_songs
          if (Array.isArray(snapshot.releases) && snapshot.releases.length > 0) {
            await tx.insert(releases).values(
              snapshot.releases.map((release) =>
                convertTimestamps({
                  ...release,
                  gameId: sourceGameId,
                })
              ) as any,
            );
          }

          console.log('[RESTORE] Step 20: Reinserting songs...');
          // Songs can now safely reference artists/projects/releases
          if (Array.isArray(snapshot.songs) && snapshot.songs.length > 0) {
            await tx.insert(songs).values(
              snapshot.songs.map((song) =>
                convertTimestamps({
                  ...song,
                  gameId: sourceGameId,
                })
              ) as any,
            );
          }

          console.log('[RESTORE] Step 21: Reinserting release_songs...');
          // Junction requires both song and release rows to exist first
          if (Array.isArray(snapshot.releaseSongs) && snapshot.releaseSongs.length > 0) {
            await tx.insert(releaseSongs).values(
              snapshot.releaseSongs.map((entry: any) => ({
                releaseId: entry.releaseId,
                songId: entry.songId,
                trackNumber: entry.trackNumber ?? 0,
                isSingle: entry.isSingle ?? false,
              })) as any,
            );
          }

          console.log('[RESTORE] Step 22: Reinserting executives...');
          // Executives and emails only reference the game so they can go near the end
          if (Array.isArray(snapshot.executives) && snapshot.executives.length > 0) {
            await tx.insert(executives).values(
              snapshot.executives.map((exec: any) =>
                convertTimestamps({
                  ...exec,
                  gameId: sourceGameId,
                })
              ) as any,
            );
          }

          console.log('[RESTORE] Step 23: Reinserting emails...');
          // Final pass restores inbox entries tied to the game
          if (Array.isArray(snapshot.emails) && snapshot.emails.length > 0) {
            await tx.insert(emails).values(
              snapshot.emails.map((email) =>
                convertTimestamps({
                  ...email,
                  gameId: sourceGameId,
                })
              ) as any,
            );
          }

          console.log('[RESTORE] Transaction complete!');
        });

        return res.json({ gameId: sourceGameId });
      }

      const idMap = new Map<string, string>();
      const mapId = (value?: string | null, create = true) => {
        if (!value) return value;
        if (!idMap.has(value)) {
          if (!create) {
            return value;
          }
          idMap.set(value, randomUUID());
        }
        return idMap.get(value)!;
      };

      const mapReference = (value?: string | null) => mapId(value, false);

      const newGameId = mapId(sourceGameId)!;

      if (snapshot.musicLabel) {
        mapId((snapshot.musicLabel as any).id ?? undefined);
      }
      if (Array.isArray(snapshot.weeklyActions)) {
        snapshot.weeklyActions.forEach((action) => mapId(action.id));
      }
      if (Array.isArray(snapshot.artists)) {
        snapshot.artists.forEach((artist) => mapId(artist.id));
      }
      if (Array.isArray(snapshot.projects)) {
        snapshot.projects.forEach((project) => mapId(project.id));
      }
      if (Array.isArray(snapshot.roles)) {
        snapshot.roles.forEach((role) => mapId(role.id));
      }
      if (Array.isArray(snapshot.releases)) {
        snapshot.releases.forEach((release) => mapId(release.id));
      }
      if (Array.isArray(snapshot.songs)) {
        snapshot.songs.forEach((song) => mapId(song.id));
      }
      if (Array.isArray(snapshot.executives)) {
        snapshot.executives.forEach((exec) => mapId(exec.id));
      }
      if (Array.isArray(snapshot.moodEvents)) {
        snapshot.moodEvents.forEach((event) => mapId(event.id));
      }
      if (Array.isArray(snapshot.emails)) {
        snapshot.emails.forEach((email) => mapId((email as any).id));
      }

      await db.transaction(async (tx) => {
        await tx.insert(gameStates).values({
          id: newGameId,
          userId: req.userId!,
          currentWeek: targetGameState.currentWeek,
          money: targetGameState.money,
          reputation: targetGameState.reputation,
          creativeCapital: targetGameState.creativeCapital,
          focusSlots: targetGameState.focusSlots ?? 3,
          usedFocusSlots: targetGameState.usedFocusSlots ?? 0,
          arOfficeSlotUsed: targetGameState.arOfficeSlotUsed ?? false,
          arOfficeSourcingType: targetGameState.arOfficeSourcingType ?? null,
          arOfficePrimaryGenre: targetGameState.arOfficePrimaryGenre ?? null,
          arOfficeSecondaryGenre: targetGameState.arOfficeSecondaryGenre ?? null,
          arOfficeOperationStart: targetGameState.arOfficeOperationStart ?? null,
          playlistAccess: targetGameState.playlistAccess ?? 'none',
          pressAccess: targetGameState.pressAccess ?? 'none',
          venueAccess: targetGameState.venueAccess ?? 'none',
          campaignType: targetGameState.campaignType ?? 'Balanced',
          campaignCompleted: targetGameState.campaignCompleted ?? false,
          rngSeed: targetGameState.rngSeed ?? null,
          flags: targetGameState.flags ?? {},
          weeklyStats: targetGameState.weeklyStats ?? {},
          tierUnlockHistory: targetGameState.tierUnlockHistory ?? {},
        });

        if (snapshot.musicLabel) {
          await tx.insert(musicLabels).values(
            convertTimestamps({
              ...snapshot.musicLabel,
              id: mapId((snapshot.musicLabel as any).id ?? undefined),
              gameId: newGameId,
            }) as any
          );
        }

        if (Array.isArray(snapshot.weeklyActions) && snapshot.weeklyActions.length > 0) {
          await tx.insert(weeklyActions).values(
            snapshot.weeklyActions.map((action) =>
              convertTimestamps({
                ...action,
                id: mapId(action.id),
                gameId: newGameId,
                targetId: mapReference(action.targetId as string | undefined),
                choiceId: mapReference(action.choiceId as string | undefined),
              })
            ) as any,
          );
        }

        if (Array.isArray(snapshot.artists) && snapshot.artists.length > 0) {
          await tx.insert(artists).values(
            snapshot.artists.map((artist) =>
              convertTimestamps({
                ...artist,
                id: mapId(artist.id),
                gameId: newGameId,
              })
            ) as any,
          );
        }

        if (Array.isArray(snapshot.projects) && snapshot.projects.length > 0) {
          await tx.insert(projects).values(
            snapshot.projects.map((project) =>
              convertTimestamps({
                ...project,
                id: mapId(project.id),
                gameId: newGameId,
                artistId: mapReference(project.artistId),
              })
            ) as any,
          );
        }

        if (Array.isArray(snapshot.roles) && snapshot.roles.length > 0) {
          await tx.insert(roles).values(
            snapshot.roles.map((role) =>
              convertTimestamps({
                ...role,
                id: mapId(role.id),
                gameId: newGameId,
              })
            ) as any,
          );
        }

        if (Array.isArray(snapshot.executives) && snapshot.executives.length > 0) {
          await tx.insert(executives).values(
            snapshot.executives.map((exec) =>
              convertTimestamps({
                ...exec,
                id: mapId(exec.id),
                gameId: newGameId,
              })
            ) as any,
          );
        }

        if (Array.isArray(snapshot.releases) && snapshot.releases.length > 0) {
          await tx.insert(releases).values(
            snapshot.releases.map((release) =>
              convertTimestamps({
                ...release,
                id: mapId(release.id),
                gameId: newGameId,
                artistId: mapReference(release.artistId),
              })
            ) as any,
          );
        }

        if (Array.isArray(snapshot.songs) && snapshot.songs.length > 0) {
          await tx.insert(songs).values(
            snapshot.songs.map((song) =>
              convertTimestamps({
                ...song,
                id: mapId(song.id),
                gameId: newGameId,
                artistId: mapReference(song.artistId),
                projectId: mapReference(song.projectId),
                releaseId: mapReference(song.releaseId),
              })
            ) as any,
          );
        }

        if (Array.isArray(snapshot.releaseSongs) && snapshot.releaseSongs.length > 0) {
          await tx.insert(releaseSongs).values(
            snapshot.releaseSongs.map((entry: any) => ({
              releaseId: mapReference(entry.releaseId) ?? entry.releaseId,
              songId: mapReference(entry.songId) ?? entry.songId,
              trackNumber: entry.trackNumber ?? 0,
              isSingle: entry.isSingle ?? false,
            })) as any,
          );
        }

        if (Array.isArray(snapshot.moodEvents) && snapshot.moodEvents.length > 0) {
          await tx.insert(moodEvents).values(
            snapshot.moodEvents.map((event) =>
              convertTimestamps({
                ...event,
                id: mapId(event.id),
                gameId: newGameId,
                artistId: mapReference(event.artistId) ?? event.artistId,
              })
            ) as any,
          );
        }

        if (Array.isArray(snapshot.emails) && snapshot.emails.length > 0) {
          await tx.insert(emails).values(
            snapshot.emails.map((email) =>
              convertTimestamps({
                ...email,
                id: mapId((email as any).id),
                gameId: newGameId,
              })
            ) as any,
          );
        }
      });

      res.json({ gameId: newGameId });
    } catch (error) {
      if ((error as any)?.code === 'INVALID_SNAPSHOT_COLLECTIONS') {
        return res.status(400).json({
          error: 'INVALID_SNAPSHOT_COLLECTIONS',
          message: 'Snapshot collections are missing required fields or are malformed',
          details: (error as any)?.details ?? [],
        });
      }
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid restore request", errors: error.errors });
      }

      console.error('[API] Failed to restore save:', error);
      res.status(500).json({ message: "Failed to restore save" });
    }
  });

  router.delete("/api/saves/:saveId", requireClerkUser, async (req, res) => {
    try {
      const deleted = await storage.deleteGameSave(req.params.saveId, req.userId!);
      if (deleted === 0) {
        return res.status(404).json({
          error: 'SAVE_NOT_FOUND',
          message: 'Save file not found or does not belong to this user',
        });
      }

      res.json({
        message: 'Save deleted successfully',
        deletedSaveId: req.params.saveId,
      });
    } catch (error) {
      console.error("Failed to delete save:", error);
      res.status(500).json({
        error: 'DELETE_SAVE_ERROR',
        message: "Failed to delete save file",
      });
    }
  });

export default router;
