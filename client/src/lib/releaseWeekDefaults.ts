/**
 * Default-week derivation for the Plan Release flow.
 *
 * Server-side validation (server/services/releasePlanningService.ts) rejects
 * any scheduledReleaseWeek <= currentWeek, so the earliest legally schedulable
 * release week is currentWeek + 1 — the same bound PlanReleasePage passes to
 * MusicCalendar as `minWeek`. Keep these helpers in sync with that rule.
 */

/** Minimum lead time (in weeks) enforced by release scheduling validation. */
export const MIN_RELEASE_LEAD_WEEKS = 1;

/**
 * Earliest legally schedulable release week for a given current week.
 * Falls back to week 1's default when the game state hasn't loaded yet
 * (PlanReleasePage re-syncs via effect once it does).
 */
export function getDefaultReleaseWeek(currentWeek: number | null | undefined): number {
  return (currentWeek ?? 1) + MIN_RELEASE_LEAD_WEEKS;
}

/**
 * Resolve the release-week picker value when the current week (re)loads or
 * advances:
 * - if the player hasn't touched the picker, snap to the earliest legal week;
 * - if the player picked a week that is no longer legal (<= currentWeek),
 *   clamp forward to the earliest legal week;
 * - otherwise keep the player's choice.
 */
export function resolveReleaseWeek(prev: number, currentWeek: number, touched: boolean): number {
  if (!touched || prev <= currentWeek) {
    return getDefaultReleaseWeek(currentWeek);
  }
  return prev;
}

/**
 * Default lead-single week: one week before the main release (mirrors the
 * old hardcoded 5-vs-6 pairing, but derived from the actual release week).
 */
export function getDefaultLeadSingleWeek(releaseWeek: number): number {
  return releaseWeek - 1;
}
