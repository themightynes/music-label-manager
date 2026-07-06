/**
 * Shared pure helpers for the admin content editors (ActionsViewer, SideEventsEditor).
 * Content-editor slice 4 (playtest feedback): creation dialogs need a slug generator
 * and a uniqueness check independent of any component state, so both editors — and
 * their tests — can share one implementation.
 */

/**
 * Converts free-text input into a lowercase, underscore-separated slug suitable for
 * use as an action/event id: non-alphanumeric runs become a single underscore,
 * and leading/trailing underscores are trimmed.
 *
 * Examples:
 *   "CMO: Viral Push" -> "cmo_viral_push"
 *   "  Multiple   Spaces  " -> "multiple_spaces"
 *   "Already_snake-case!" -> "already_snake_case"
 */
export function slugifyId(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * True when `id` is non-empty and not already present in `existingIds`.
 * Used by the creation dialogs to gate the Create button and show an inline
 * "id already taken" note.
 */
export function isIdAvailable(id: string, existingIds: ReadonlySet<string> | readonly string[]): boolean {
  if (id.length === 0) return false;
  const set = existingIds instanceof Set ? existingIds : new Set(existingIds);
  return !set.has(id);
}

/**
 * Orders items for display so newly-created items appear at the top of the list,
 * newest first, followed by the originals in their existing order. Pure display-order
 * helper (playtest feedback fix, slice 4) — the save handler composes its own array
 * independently and does not use this ordering.
 */
export function orderWithNewestFirst<T>(newItems: readonly T[], originalItems: readonly T[]): T[] {
  return [...[...newItems].reverse(), ...originalItems];
}
