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
   * 'awareness_decay'). Previously fell into `other`, which the Overview
   * never renders. Rendered as ONE aggregated ROUTINE-stage "Buzz" line
   * (fork B — never per-song lines, which would spam at catalog scale); see
   * {@link aggregateAwarenessBuzz} / {@link formatBuzzLine}.
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
  other: GameChange[];
}

export function categorizeWeekChanges(changes: GameChange[]): WeekChangeCategories {
  const categories: WeekChangeCategories = {
    revenue: [],
    expenses: [],
    achievements: [],
    mood: [],
    meetings: [],
    tourCities: [],
    tourPlanning: [],
    awareness: [],
    breakthroughs: [],
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
    } else if (change.type === 'unlock' || change.type === 'reputation') {
      categories.achievements.push(change);
    } else if (change.type === 'mood') {
      categories.mood.push(change);
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
// --- Awareness buzz aggregation (awareness slice 1, fork B) -----------------
// The engine's awareness change entries are DESCRIPTION-ONLY: `amount` is
// always 0 and there are no structured songId/delta fields (ReleaseProcessor
// ~671-783), so the numbers below are parsed from the description text with
// tolerant regexes. Exact engine formats:
//   gain:  `🎯 "Title" awareness gained +12.3 (45/100)`
//   decay: `📉 "Title" awareness decay 40/100 (-5)`
// A malformed/unparseable description still COUNTS the song (building/fading)
// but contributes 0 to the totals — never throws, never NaNs the line.

/**
 * Suppression threshold (spec §2.1): when the week's total absolute awareness
 * movement (gains + decays) is below this, the Buzz line is not rendered at
 * all — quiet weeks stay quiet.
 */
export const AWARENESS_BUZZ_SUPPRESS_BELOW = 3;

export interface AwarenessBuzzSummary {
  /** Count of 'awareness_gain' entries (songs in the building phase). */
  buildingCount: number;
  /** Count of 'awareness_decay' entries (songs in the decay phase). */
  fadingCount: number;
  /** Sum of parsed gain deltas (0 for entries that fail to parse). */
  totalGain: number;
  /** Sum of parsed decay magnitudes, as a POSITIVE number. */
  totalDecay: number;
  /** Quoted title of the largest single gain this week (null if none parse). */
  topMoverTitle: string | null;
  /** totalGain + totalDecay — the |Δ| the suppression threshold tests. */
  totalMovement: number;
}

const QUOTED_TITLE_RE = /"([^"]+)"/;
const GAIN_DELTA_RE = /\+(\d+(?:\.\d+)?)/;
const DECAY_DELTA_RE = /\(-(\d+(?:\.\d+)?)\)/;

/**
 * Aggregates the `awareness` bucket into one week-level summary. Pure —
 * unit-testable without mounting WeekSummary. Non-awareness entries are
 * ignored, so passing a raw changes array is safe (but the bucket is the
 * intended input).
 */
export function aggregateAwarenessBuzz(changes: GameChange[]): AwarenessBuzzSummary {
  let buildingCount = 0;
  let fadingCount = 0;
  let totalGain = 0;
  let totalDecay = 0;
  let topMoverTitle: string | null = null;
  let topMoverGain = -Infinity;

  for (const change of changes) {
    const description = change.description || '';
    if (change.type === 'awareness_gain') {
      buildingCount++;
      const delta = parseFloat(description.match(GAIN_DELTA_RE)?.[1] ?? '') || 0;
      totalGain += delta;
      const title = description.match(QUOTED_TITLE_RE)?.[1] ?? null;
      if (title && delta > topMoverGain) {
        topMoverGain = delta;
        topMoverTitle = title;
      }
    } else if (change.type === 'awareness_decay') {
      fadingCount++;
      totalDecay += parseFloat(description.match(DECAY_DELTA_RE)?.[1] ?? '') || 0;
    }
  }

  return {
    buildingCount,
    fadingCount,
    totalGain,
    totalDecay,
    topMoverTitle,
    totalMovement: totalGain + totalDecay,
  };
}

/**
 * Formats the aggregated ROUTINE-stage Buzz line, or returns null when the
 * line should not render (suppression threshold, or nothing to say).
 * Qualitative framing only — the awareness→streams multiplier is NEVER
 * shown (fork E). e.g. `🎯 Buzz: 3 songs building (+12) · 2 fading — led by "Neon Nights"`.
 */
export function formatBuzzLine(summary: AwarenessBuzzSummary): string | null {
  if (summary.totalMovement < AWARENESS_BUZZ_SUPPRESS_BELOW) return null;

  const parts: string[] = [];
  if (summary.buildingCount > 0) {
    const gain = Math.round(summary.totalGain);
    const plural = summary.buildingCount === 1 ? 'song' : 'songs';
    parts.push(`${summary.buildingCount} ${plural} building${gain > 0 ? ` (+${gain})` : ''}`);
  }
  if (summary.fadingCount > 0) {
    parts.push(`${summary.fadingCount} fading`);
  }
  if (parts.length === 0) return null;

  let line = `🎯 Buzz: ${parts.join(' · ')}`;
  if (summary.topMoverTitle) {
    line += ` — led by "${summary.topMoverTitle}"`;
  }
  return line;
}

export function findTourCompletion(
  changes: GameChange[],
  projectId: string | undefined
): GameChange | undefined {
  if (!projectId) return undefined;
  return changes.find(c => c.type === 'project_complete' && c.projectId === projectId);
}
