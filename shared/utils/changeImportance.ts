/**
 * Change-importance classification (Phase 4 PR-2).
 *
 * A PURE, DETERMINISTIC classifier that ranks each `GameChange` / `ChartUpdate`
 * emitted in a `WeekSummary` into one of three tiers:
 *
 *   - `hero`    — the moments worth fanfare: a No. 1 chart debut/climb, a first-ever
 *                 chart entry, a tier/access/focus-slot unlock, an artist breakthrough,
 *                 or campaign-completion-scale events.
 *   - `notable` — meaningful but not showstopping: a top-10 chart debut/movement,
 *                 a release executed, a project completed, a significant reputation gain.
 *   - `routine` — the ordinary weekly churn: mood/popularity drift, expenses, ongoing
 *                 revenue, small chart movements, marketing, meetings, awareness shifts.
 *
 * This drives the staged WeekSummary reveal (Phase 4 PR-3): hero moments get the
 * theater, routine changes stay quiet. Hierarchy is DATA, not vibes — one shared,
 * unit-tested classifier so the client never re-derives significance ad hoc.
 *
 * INVARIANTS (enforced by tests):
 *   - No RNG, no `Date`, no I/O — same input always yields the same output.
 *   - EVERY member of the `GameChange['type']` union maps deterministically
 *     (the `switch` is exhaustive; adding a new union member is a compile error
 *     via the `assertNever` default).
 */

import type { ChangeImportance, ChartUpdate, GameChange } from '../types/gameTypes';

export type { ChangeImportance } from '../types/gameTypes';

/**
 * Optional classification context. All fields are optional so the classifier is
 * usable at any call site; absent context simply means the context-dependent
 * escalations (campaign completion, thresholds) fall back to sensible defaults.
 */
export interface ChangeClassificationContext {
  /**
   * True when the week that produced this change also completed the campaign.
   * Campaign-completion-scale events (e.g. the final focus-slot unlock, or the
   * revenue/reputation lines on the final week) escalate to `hero`.
   */
  campaignCompleted?: boolean;
  /**
   * Minimum absolute reputation change to count as a "significant" (notable) gain.
   * Defaults to {@link REPUTATION_NOTABLE_THRESHOLD}.
   */
  reputationNotableThreshold?: number;
}

/** Positions 1..10 are the "top-10" gold tier (mirrors chartUtils tiers). */
export const TOP_10 = 10;

/**
 * Reputation changes at or above this magnitude read as a "significant" gain and
 * classify `notable`; smaller nudges stay `routine`. Reputation moves slowly in
 * this game (single-digit weekly deltas are common), so the bar is deliberately low.
 */
export const REPUTATION_NOTABLE_THRESHOLD = 5;

/** Compile-time exhaustiveness guard for the GameChange type union. */
function assertNever(value: never): never {
  throw new Error(`Unhandled GameChange type: ${String(value)}`);
}

/**
 * Classifies a single {@link GameChange}. Pure and deterministic.
 *
 * The `switch` is exhaustive over `GameChange['type']`; the `assertNever` default
 * turns any newly-added union member into a TypeScript compile error until it is
 * classified here on purpose.
 */
export function classifyChange(
  change: GameChange,
  context?: ChangeClassificationContext,
): ChangeImportance {
  const campaignCompleted = context?.campaignCompleted === true;
  const reputationThreshold =
    context?.reputationNotableThreshold ?? REPUTATION_NOTABLE_THRESHOLD;

  switch (change.type) {
    // --- HERO: unmissable milestones -------------------------------------
    // Tier/access/focus-slot unlocks are the missable-toast gap Phase 4 closes;
    // always surface them with hero weight.
    case 'unlock':
      return 'hero';
    // An artist breakthrough is a marquee career moment.
    case 'breakthrough':
      return 'hero';

    // --- NOTABLE: meaningful weekly beats --------------------------------
    // A release actually executing this week, a lead/song release going live,
    // and a project reaching completion are all headline-adjacent.
    case 'release':
    case 'song_release':
    case 'project_complete':
      // On the final week these can read as campaign-defining; escalate if so.
      return campaignCompleted ? 'hero' : 'notable';

    // Reputation is label-wide and summarized as one aggregated line per week
    // (C34). A significant swing is notable; a small nudge is routine.
    case 'reputation': {
      const magnitude = Math.abs(change.amount ?? 0);
      if (campaignCompleted && magnitude > 0) return 'hero';
      return magnitude >= reputationThreshold ? 'notable' : 'routine';
    }

    // Executive loyalty DECAY (the player ignored an exec for 3+ weeks) is a
    // warning worth surfacing above the routine churn — it is the first time
    // this feedback loop becomes visible to the player (case-file §2/§6d).
    // Discriminated via the explicit `loyaltyChange` field (ArtistStateProcessor),
    // not the description string: only the decay push sets it, and always < 0
    // (the "Met with X" interaction entry carries loyaltyBoost/newLoyalty instead,
    // always positive; the natural mood-drift entry carries neither field).
    case 'executive_interaction':
      return (change.loyaltyChange ?? 0) < 0 ? 'notable' : 'routine';

    // --- ROUTINE: ordinary weekly churn ----------------------------------
    case 'revenue':
    case 'ongoing_revenue':
    case 'expense':
    case 'expense_tracking':
    case 'marketing':
    case 'meeting':
    case 'delayed_effect':
    case 'mood':
    case 'popularity':
    case 'awareness_gain':
    case 'awareness_decay':
    case 'error':
      return 'routine';

    default:
      return assertNever(change.type);
  }
}

/**
 * Classifies a single {@link ChartUpdate}. Pure and deterministic.
 *
 * Ranking (player songs only — competitor rows are noise and always `routine`):
 *   - hero:    a No. 1 debut, or a climb to No. 1 (the marquee chart outcome).
 *   - notable: any other debut (a first-ever chart entry), or a meaningful upward
 *              movement inside the top 10.
 *   - routine: sub-top-10 held/declining positions, tiny/zero movements, chart
 *              exits (off chart), and all competitor rows.
 *
 * A No. 1 is `hero` whether reached by debut or by climbing. Every other debut is
 * `notable` (a first chart entry matters, but is not showstopping unless it lands
 * at the top). `movement` follows the chartUtils convention: positive = moved UP.
 */
export function classifyChartUpdate(update: ChartUpdate): ChangeImportance {
  // Competitor rows are ambient field data, never player-facing highlights.
  if (update.isCompetitorSong) return 'routine';

  const position = update.position;
  const movement = update.movement ?? 0;

  // Off-chart / exited entirely: not a highlight.
  if (position === null) return 'routine';

  // No. 1 — the marquee outcome, whether debuting there or climbing to it.
  if (position === 1) return 'hero';

  // A first-ever chart entry (debut) below No. 1 is a milestone worth noting.
  if (update.isDebut) return 'notable';

  // Established entries: significance tracks the top-10 tier and real upward
  // movement. A static or declining position — even inside the top 10 — is
  // present but not a "moment".
  if (position <= TOP_10 && movement > 0) return 'notable';

  return 'routine';
}
