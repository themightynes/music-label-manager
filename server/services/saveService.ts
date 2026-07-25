/**
 * saveService.ts
 *
 * Backend service for save creation, restore (overwrite + fork), and deletion.
 * Extracted from the fat server/routes/saves.ts handlers (Phase 1, PR-16).
 * Follows the GameCreationService convention: a class with explicit
 * dependencies defaulted to the module singletons, plus an exported singleton.
 *
 * Behavior is intentionally byte-equivalent to the pre-extraction handlers,
 * including every '[RESTORE] Step N:' console.log, the children-first deletion
 * ordering, and the id-remapping fork logic. Service methods throw CODED errors
 * (error.code); the routes map those codes to HTTP status + the exact JSON
 * bodies they returned before the extraction.
 *
 * Coded errors thrown by this service (route -> status):
 *   INVALID_SNAPSHOT              -> 400
 *   SAVE_NOT_FOUND               -> 404
 *   UNSUPPORTED_SNAPSHOT_VERSION -> 400
 *   INVALID_SNAPSHOT_COLLECTIONS -> 400 (carries .details)
 *   UNAUTHORIZED                 -> 403
 * ZodErrors from parsing continue to propagate and are caught in the route.
 */

import { randomUUID } from 'crypto';
import { storage as storageSingleton } from '../storage';
import { db as dbSingleton } from '../db';
import { eq, inArray } from 'drizzle-orm';
import {
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
  type InsertGameSave,
  SNAPSHOT_VERSION,
} from '@shared/schema';

/** Create a coded error the route can map to an HTTP status. */
function codedError(code: string, message: string, details?: unknown): Error {
  const error = new Error(message);
  (error as any).code = code;
  if (details !== undefined) {
    (error as any).details = details;
  }
  return error;
}

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

// HARDCODED: autosave retention per game; make configurable if players ask for it
export const AUTOSAVE_RETENTION = 3;

export class SaveService {
  constructor(
    private storage = storageSingleton,
    private db = dbSingleton,
  ) {}

  /**
   * Create a new save for the given user from already-validated insert data.
   * The route parses the body with insertGameSaveSchema (ZodError -> 400) and
   * passes the result here. Throws INVALID_SNAPSHOT (400) when the snapshot has
   * no game identifier. Returns the created GameSave.
   */
  async createSave(userId: string, validatedData: InsertGameSave) {
    const snapshot = validatedData.gameState;
    const snapshotGameId = snapshot?.gameState?.id;

    if (!snapshotGameId) {
      throw codedError('INVALID_SNAPSHOT', 'Save snapshot is missing game identifier');
    }

    const save = await this.storage.createGameSave({
      ...validatedData,
      week: snapshot.gameState.currentWeek,
      userId,
    });

    if (validatedData.isAutosave) {
      await this.storage.purgeOldAutosaves(userId, snapshotGameId, AUTOSAVE_RETENTION);
    }

    return save;
  }

  /**
   * Shared setup for both restore modes: fetch + ownership-check the save,
   * parse the snapshot, validate version + collections + game identifier.
   * Throws SAVE_NOT_FOUND (404), UNSUPPORTED_SNAPSHOT_VERSION (400),
   * INVALID_SNAPSHOT_COLLECTIONS (400), INVALID_SNAPSHOT (400), or a ZodError
   * from snapshot parsing. Returns the parsed snapshot + derived ids.
   */
  private async loadRestoreSnapshot(saveId: string, userId: string) {
    const save = await this.storage.getGameSaveForUser(saveId, userId);
    if (!save) {
      throw codedError(
        'SAVE_NOT_FOUND',
        'Save file not found or does not belong to this user',
      );
    }

    const snapshot = gameSaveSnapshotSchema.parse(save.gameState) as GameSaveSnapshot;
    if ((snapshot.snapshotVersion ?? 1) !== SNAPSHOT_VERSION) {
      throw codedError(
        'UNSUPPORTED_SNAPSHOT_VERSION',
        `Snapshot version ${snapshot.snapshotVersion ?? 1} is not supported. Expected version ${SNAPSHOT_VERSION}.`,
      );
    }
    const targetGameState = snapshot.gameState;
    const sourceGameId = targetGameState?.id;

    validateSnapshotCollections(snapshot);

    if (!sourceGameId) {
      throw codedError('INVALID_SNAPSHOT', 'Save snapshot is missing game identifier');
    }

    return { snapshot, targetGameState, sourceGameId };
  }

  /**
   * Restore a save onto its original game (overwrite mode). Deletes all child
   * rows children-first, then reinserts them parents-first inside one
   * transaction. Throws SAVE_NOT_FOUND (404), UNSUPPORTED_SNAPSHOT_VERSION
   * (400), INVALID_SNAPSHOT_COLLECTIONS (400), INVALID_SNAPSHOT (400), or
   * UNAUTHORIZED (403). Returns { gameId }.
   */
  async restoreOverwrite(saveId: string, userId: string) {
    const { snapshot, targetGameState, sourceGameId } = await this.loadRestoreSnapshot(saveId, userId);

    console.log('[RESTORE] Starting overwrite mode for game:', sourceGameId);
    const existingGame = await this.storage.getGameState(sourceGameId);
    if (!existingGame || existingGame.userId !== userId) {
      throw codedError('UNAUTHORIZED', 'You do not have permission to restore this game');
    }

    console.log('[RESTORE] Beginning transaction...');
    await this.db.transaction(async (tx) => {
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
          userId: userId,
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

    return { gameId: sourceGameId };
  }

  /**
   * Restore a save into a NEW game (fork mode). Remaps every entity id to a
   * fresh UUID (keeping cross-references consistent) and inserts everything
   * under the new game owned by the user. Throws the same load-time coded
   * errors as overwrite (SAVE_NOT_FOUND / UNSUPPORTED_SNAPSHOT_VERSION /
   * INVALID_SNAPSHOT_COLLECTIONS / INVALID_SNAPSHOT). Returns { gameId }.
   */
  async restoreFork(saveId: string, userId: string) {
    const { snapshot, targetGameState, sourceGameId } = await this.loadRestoreSnapshot(saveId, userId);

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

    await this.db.transaction(async (tx) => {
      await tx.insert(gameStates).values({
        id: newGameId,
        userId: userId,
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

    return { gameId: newGameId };
  }

  /**
   * Delete a save owned by the user. Throws SAVE_NOT_FOUND (404) when no row
   * was deleted. Returns { deletedSaveId }.
   */
  async deleteSave(saveId: string, userId: string) {
    const deleted = await this.storage.deleteGameSave(saveId, userId);
    if (deleted === 0) {
      throw codedError(
        'SAVE_NOT_FOUND',
        'Save file not found or does not belong to this user',
      );
    }

    return { deletedSaveId: saveId };
  }
}

// Export singleton instance
export const saveService = new SaveService();
