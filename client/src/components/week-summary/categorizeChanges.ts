/**
 * WeekSummary change categorization (extracted for tour-tier1 slice 2).
 *
 * Pure module so bucket routing is unit-testable without mounting the full
 * WeekSummary (which drags in motion, audio, store, and query-cache deps).
 * Display-only: the modal's financial figures (net income hero, revenue /
 * expenses cards, breakdown bar) are computed from summary.revenue and
 * summary.expenses directly — never from these buckets — so moving an entry
 * between buckets can never change a total.
 */
import type { GameChange } from '@shared/types/gameTypes';

export interface WeekChangeCategories {
  revenue: GameChange[];
  expenses: GameChange[];
  achievements: GameChange[];
  mood: GameChange[];
  /** Exec-meetings-revival PR-2: meeting/executive-interaction/delayed-effect. */
  meetings: GameChange[];
  /**
   * Executive Delegation & Trust arc (spec §4.6): 'meeting' entries the engine
   * resolved autonomously (`autonomous: true` — no focus slot spent). Split
   * OUT of `meetings` into their own bucket so the WeekSummary meetings card
   * can render player decisions first, then a separate "While you were out"
   * grouped digest — collapsed by default (fork c DECIDED: quiet digest, not
   * its own staged beat). Never routed to `other` (this repo's recurring
   * swallow-bug class).
   */
  autonomousMeetings: GameChange[];
  /**
   * Tour-tier1 slice 2: per-city tour performance results (type 'revenue',
   * source 'tour_performance'). Pulled OUT of the generic revenue bucket so
   * each city renders as a dedicated card in the NOTABLE stage instead of a
   * flat revenue line — and is NOT double-listed in Revenue Sources.
   */
  tourCities: GameChange[];
  /**
   * Tour-tier1 slice 2: 'tour_planning' foreshadow entries (planning →
   * production). Previously fell into `other`, which the Overview never
   * renders — now surfaced as simple ROUTINE-stage line items.
   */
  tourPlanning: GameChange[];
  /**
   * Awareness slice 1: weekly awareness movement ('awareness_gain' /
   * 'awareness_decay'). Kept as a dedicated bucket so these entries never
   * fall back into `other` (which the Overview never renders). NOT rendered
   * by WeekSummary anymore — the weekly aggregated "Buzz" line was replaced
   * by the persistent core-status Buzz stat in MetricsDashboard
   * (BuzzStatusStat / summarizeCatalogBuzz in lib/releaseBuzz.ts), computed
   * live from the songs cache (playtest feedback July 6).
   */
  awareness: GameChange[];
  /**
   * Awareness slice 1: 'breakthrough' moments — rare, quality-gated 🔥
   * explosions. Kept as a SEPARATE bucket from gain/decay because each one
   * renders individually inside the "Milestone Moments" hero card (playtest
   * decision July 6, reversing fork A's notable-line placement), never
   * aggregated away.
   */
  breakthroughs: GameChange[];
  /**
   * Buzz-v2 (Hype & Pre-Marketing) slice 1: banked-hype lifecycle entries that
   * pay off or expire ('hype_applied' / 'hype_expired'). Rendered as simple
   * notable-stage lines so the player sees banked hype seeding a release (or
   * fading unused) instead of it happening invisibly. Kept OUT of `other`
   * (never rendered — this repo's recurring swallow-bug).
   */
  hypeNotable: GameChange[];
  /**
   * Buzz-v2 slice 1: banking hype ('hype_banked') — routine-stage line, the
   * ordinary "a meeting choice topped up the pool" beat. Buzz-v2 slice 3 also
   * routes 'pre_campaign' (pre-release anticipation build) here: same
   * routine-stage line treatment, and it must stay OUT of `other` (never
   * rendered — this repo's recurring swallow-bug).
   */
  hypeRoutine: GameChange[];
  other: GameChange[];
}

export function categorizeWeekChanges(changes: GameChange[]): WeekChangeCategories {
  const categories: WeekChangeCategories = {
    revenue: [],
    expenses: [],
    achievements: [],
    mood: [],
    meetings: [],
    autonomousMeetings: [],
    tourCities: [],
    tourPlanning: [],
    awareness: [],
    breakthroughs: [],
    hypeNotable: [],
    hypeRoutine: [],
    other: [],
  };

  changes.forEach(change => {
    if (change.type === 'revenue' && change.source === 'tour_performance') {
      categories.tourCities.push(change);
    } else if (change.type === 'tour_planning') {
      categories.tourPlanning.push(change);
    } else if (change.type === 'revenue' || change.type === 'ongoing_revenue' || change.type === 'release') {
      categories.revenue.push(change);
    } else if (change.type === 'expense') {
      categories.expenses.push(change);
    } else if (change.type === 'unlock' || change.type === 'reputation' || change.type === 'flop') {
      // Balance-integrity slice 2: a 'flop' is a reputation SINK event — a released
      // record underperformed its investment and cost the label standing. Routed to
      // the rendered Achievements card (the reputation home) alongside the aggregated
      // ⭐ line, so the flop cause is visible and never falls into the never-rendered
      // `other` bucket (the awareness-arc invisible-event failure class).
      categories.achievements.push(change);
    } else if (change.type === 'mood' || change.type === 'energy') {
      // C87: tour energy drain entries ride the mood bucket (the artist-state
      // home) so they actually render — `other` is never rendered (this repo's
      // recurring swallow-bug class).
      categories.mood.push(change);
    } else if (change.type === 'meeting' && change.autonomous === true) {
      categories.autonomousMeetings.push(change);
    } else if (
      change.type === 'meeting' ||
      change.type === 'executive_interaction' ||
      change.type === 'delayed_effect'
    ) {
      categories.meetings.push(change);
    } else if (change.type === 'awareness_gain' || change.type === 'awareness_decay') {
      categories.awareness.push(change);
    } else if (change.type === 'breakthrough') {
      categories.breakthroughs.push(change);
    } else if (change.type === 'hype_applied' || change.type === 'hype_expired') {
      categories.hypeNotable.push(change);
    } else if (change.type === 'hype_banked' || change.type === 'pre_campaign') {
      categories.hypeRoutine.push(change);
    } else if (change.type === 'project_complete') {
      // Projects go to other category, will be shown in Projects tab
      categories.other.push(change);
    } else {
      categories.other.push(change);
    }
  });

  return categories;
}

/**
 * Tours complete on their final city's week (slice 1), so a matching
 * 'project_complete' entry can arrive in the SAME week's changes as the last
 * city's tour_performance entry. Used to append the "Tour complete" footer
 * to that city's card.
 */
export function findTourCompletion(
  changes: GameChange[],
  projectId: string | undefined
): GameChange | undefined {
  if (!projectId) return undefined;
  return changes.find(c => c.type === 'project_complete' && c.projectId === projectId);
}
