/**
 * Single source of truth for the autosave display-name format: `"{label} - Week {n}"`.
 *
 * Used by:
 *  - client/src/store/gameStore.ts (autosave write)
 *  - server/storage.ts getGameSaves (legacy-name migration)
 *  - tests/features/save-load-snapshot-integrity.test.ts
 *
 * Keep this the ONE place the format string lives so the three call sites can
 * never drift.
 */
export function formatAutosaveName(labelName: string, week: number): string {
  return `${labelName} - Week ${week}`;
}
