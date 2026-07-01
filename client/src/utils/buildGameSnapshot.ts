import { SNAPSHOT_VERSION } from '@shared/schema';
import type { GameSaveSnapshot, Artist, Project, Role, WeeklyAction } from '@shared/schema';
import type { GameState } from '@shared/types/gameTypes';
import type { EmailSnapshot } from '@/utils/emailSnapshot';

/**
 * Single source of truth for assembling a save snapshot.
 *
 * Both `gameStore.saveGame` (manual saves / autosaves) and
 * `SaveGameModal.handleExport` (JSON export) call this so the snapshot field
 * list — including the `emailMetadata` shape — lives in exactly one place.
 *
 * IMPORTANT (see project CLAUDE.md "Save/Load Snapshots"): `musicLabel` and all
 * collections are SIBLINGS of `gameState`, never nested inside it. This helper
 * strips `musicLabel` out of the incoming game state and places it at the top
 * level, mirroring the shape validated by `gameSaveSnapshotSchema`.
 */
export interface BuildGameSnapshotParams {
  /** Full game state as held in the store, including `musicLabel`. */
  gameState: GameState;
  /** Email snapshot (emails + metadata) fetched via `fetchSnapshotCollections`. */
  emailSnapshot: EmailSnapshot;
  artists: Artist[];
  projects: Project[];
  roles: Role[];
  songs: unknown[];
  releases: unknown[];
  /** Snapshot-fetched release songs; falls back to the store copy if null. */
  releaseSongs: unknown[];
  /** Snapshot-fetched executives; falls back to the store copy if null. */
  executives: unknown[];
  /** Snapshot-fetched mood events; falls back to the store copy if null. */
  moodEvents: unknown[];
  weeklyActions: WeeklyAction[];
  weeklyOutcome: unknown | null;
}

export function buildGameSnapshot(params: BuildGameSnapshotParams): GameSaveSnapshot {
  const {
    gameState,
    emailSnapshot,
    artists,
    projects,
    roles,
    songs,
    releases,
    releaseSongs,
    executives,
    moodEvents,
    weeklyActions,
    weeklyOutcome,
  } = params;

  // Strip musicLabel out of gameState and place it as a top-level sibling.
  const { musicLabel, ...gameStateWithoutLabel } = gameState;

  const snapshot = {
    snapshotVersion: SNAPSHOT_VERSION,
    gameState: gameStateWithoutLabel,
    musicLabel: musicLabel || null,
    artists,
    projects,
    roles,
    songs,
    releases,
    emails: emailSnapshot.emails,
    emailMetadata: {
      total: emailSnapshot.total,
      unreadCount: emailSnapshot.unreadCount,
      truncated: emailSnapshot.truncated,
    },
    releaseSongs,
    executives,
    moodEvents,
    weeklyActions,
    weeklyOutcome: weeklyOutcome ?? null,
  };

  return snapshot as unknown as GameSaveSnapshot;
}
