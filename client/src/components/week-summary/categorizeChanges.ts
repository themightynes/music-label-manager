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
