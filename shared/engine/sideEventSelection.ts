/**
 * Tier 2 (PR-3) — pure side-event selection (isolated seed, weighted, cooldown).
 *
 * Sibling of meetingSelection.ts: storage-free so the engine, the ServerGameData
 * facade, and unit tests share ONE implementation. The WEEKLY ROLL that decides
 * whether ANY event fires stays in the engine's RNG stream
 * (game-engine.ts checkForEvents — fork D1, spec §0 constraint 2); this module
 * only runs AFTER that roll hits and picks WHICH event, on an isolated seed
 * (`${gameId}-week${week}-sideEvent`) via seededWeightedPick — closing ledger
 * C64 (the unseeded Math.random() in dataLoader.getRandomEvent).
 *
 * Weighting is by the event's `category` against `event_weights` in
 * data/balance/events.json. Cooldown excludes any event whose last-fired week
 * (from gameState.flags.side_event_history) is within `event_cooldown` weeks of
 * the current week. If the cooldown filter empties the pool, no event fires.
 *
 * Spec: docs/01-planning/implementation-specs/[READY] tier2-reactive-meetings-and-side-events-plan.md §3.
 */

import { seededWeightedPick } from '../utils/seededRandom';
import type { SideEvent, SideEventCategory } from '../types/gameTypes';

/** Deterministic seed for the on-hit event pick (isolated from the engine stream). */
export function generateSideEventSeed(gameId: string, week: number): string {
  return `${gameId}-week${week}-sideEvent`;
}

export interface SideEventSelectionConfig {
  /** Category → relative weight (data/balance/events.json event_weights). */
  event_weights: Partial<Record<SideEventCategory, number>>;
  /** Minimum weeks between re-firing the same event (data/balance/events.json event_cooldown). */
  event_cooldown: number;
}

/**
 * Filter the pool by cooldown, then pick one event by category weight on an
 * isolated seed. Pure and deterministic: same (events, config, history, week,
 * gameId) always returns the same event (or null when the pool is empty).
 *
 * @param events        all authored side events (each carries a `category`)
 * @param config        weights + cooldown from data/balance/events.json
 * @param history       flags.side_event_history — { [eventId]: lastFiredWeek }
 * @param currentWeek   the ARRIVAL week (post-increment; see game-engine.ts)
 * @param gameId        game id, for the isolated seed
 * @returns the selected SideEvent, or null if the cooldown filter empties the pool
 */
export function selectSideEvent(
  events: SideEvent[],
  config: SideEventSelectionConfig,
  history: Record<string, number>,
  currentWeek: number,
  gameId: string
): SideEvent | null {
  const cooldown = config.event_cooldown ?? 0;

  // Cooldown filter: exclude events fired within `cooldown` weeks of now.
  // lastFired at week W is eligible again once currentWeek - W >= cooldown.
  const eligible = events.filter((event) => {
    const lastFired = history[event.id];
    if (typeof lastFired !== 'number') return true;
    return currentWeek - lastFired >= cooldown;
  });

  if (eligible.length === 0) return null;

  const weights = eligible.map((event) => {
    const w = config.event_weights?.[event.category];
    // A category missing from the weight table contributes 0 (data-lint keeps
    // authored categories in the table, so this is a defensive fallback only).
    return typeof w === 'number' && w > 0 ? w : 0;
  });

  const seed = generateSideEventSeed(gameId, currentWeek);
  return seededWeightedPick(eligible, weights, seed) ?? null;
}
