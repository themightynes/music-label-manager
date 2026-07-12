/**
 * Shared executive auto-selection logic
 *
 * Used by:
 * - GameSidebar (auto-select button)
 * - executiveMeetingMachine (AUTO_SELECT event)
 *
 * Algorithm:
 * 1. Fetch executives and their available meetings
 * 2. Score each executive based on mood, loyalty, and role importance
 * 3. Filter out meetings with 'user_selected' scope (require manual artist choice)
 * 4. Select top-scored executives to fill available focus slots
 */

import type { Executive, RoleMeeting } from '@shared/types/gameTypes';
import {
  scoreChoiceSafety,
  pickSafestChoice,
  getChoiceCreativeCapitalCost,
} from '@shared/utils/executiveAutoSelect';

// Executive Delegation arc (Tier 1): the pure safety-scoring core moved to
// shared/utils/executiveAutoSelect so the engine's autonomous-resolution path
// scores choices through the SAME functions (single source of truth — the loyal
// band's "AUTO-safe" pick is exactly what this button would pick). Re-exported
// here so existing client callers/tests keep importing them from this module.
export { scoreChoiceSafety, pickSafestChoice, getChoiceCreativeCapitalCost };

export interface AutoSelectOption {
  executive: Executive;
  meeting: RoleMeeting;
  choice: any; // First choice from the meeting
  score: number;
}

export interface AutoSelectActionData {
  roleId: string;
  actionId: string;
  choiceId: string;
  executiveId?: string; // Not needed for CEO
}

/**
 * Role priority scores for tie-breaking
 * Higher score = higher priority when mood/loyalty are equal
 */
const ROLE_PRIORITY_SCORES: Record<string, number> = {
  ceo: 50,
  head_ar: 40,
  cmo: 30,
  cco: 20,
  head_distribution: 10,
};

/**
 * Calculate priority score for an executive
 *
 * Formula: (100 - mood) + (100 - loyalty) + role_priority
 *
 * Logic:
 * - Lower mood = higher score (needs attention)
 * - Lower loyalty = higher score (needs attention)
 * - Role priority provides tie-breaking
 */
export function calculateExecutiveScore(executive: Executive): number {
  const moodFactor = 100 - (executive.mood ?? 50);
  const loyaltyFactor = 100 - (executive.loyalty ?? 50);
  const rolePriority = ROLE_PRIORITY_SCORES[executive.role] ?? 0;

  return moodFactor + loyaltyFactor + rolePriority;
}

/**
 * Find the first eligible meeting for an executive
 *
 * Eligibility criteria:
 * - Must not have 'user_selected' target scope (requires manual artist selection)
 * - Must have at least one choice available
 */
export function findEligibleMeeting(meetings: RoleMeeting[]): RoleMeeting | null {
  return meetings.find((meeting) => {
    const scope = meeting.target_scope ?? 'global';
    const hasChoices = (meeting.choices?.length ?? 0) > 0;
    return scope !== 'user_selected' && hasChoices;
  }) ?? null;
}

/**
 * Options controlling which executives AUTO may propose.
 *
 * `arOfficeSlotUsed` — when true, the A&R head (`head_ar`, Marcus) is occupied
 * running an A&R office operation, so AUTO must NOT propose him. This mirrors the
 * manual UI, which already blocks the A&R card while the office slot is in use
 * (`isArBusy` in ExecutiveCard.tsx). Absent/false = current behavior (Marcus is
 * proposable), which keeps existing callers/tests green. Slot MATH is unaffected —
 * `usedFocusSlots` already counts the A&R slot; this only fixes the exclusion so
 * an already-busy exec is never re-proposed.
 */
export interface PrepareAutoSelectOptionsConfig {
  arOfficeSlotUsed?: boolean;
  /**
   * Roles that already have a queued action this week (manual picks or prior
   * AUTO confirms) — AUTO must NOT re-propose them. Playtest round-1 bug
   * (2026-07-05): Nes picked Marcus manually, hit AUTO for the remaining
   * slots, and AUTO proposed Marcus again. Mirrors the manual UI's
   * `isExecutiveUsed` disable. Absent/empty = no exclusions (existing
   * callers/tests unchanged).
   */
  usedExecutiveRoles?: readonly string[];
}

/**
 * Prepare auto-selection options for all executives
 *
 * @param executives - List of executives
 * @param meetingsByRole - Meetings grouped by executive role
 * @param config - Optional exclusion config (e.g. skip head_ar while the A&R
 *   office slot is in use). Omit for the default (no extra exclusions).
 * @returns Array of auto-selection options with scores
 */
export function prepareAutoSelectOptions(
  executives: Executive[],
  meetingsByRole: Record<string, RoleMeeting[]>,
  config: PrepareAutoSelectOptionsConfig = {}
): AutoSelectOption[] {
  const options: AutoSelectOption[] = [];

  for (const executive of executives) {
    // AR-busy exclusion: the A&R head is occupied running an office operation, so
    // AUTO must not propose him (manual UI already blocks him). Playtest bug: AUTO
    // grabbed Marcus while the A&R office slot was in use.
    if (config.arOfficeSlotUsed && executive.role === 'head_ar') continue;

    // Already-used exclusion: an exec with a queued action this week can't
    // meet twice — never re-propose them (manual UI already disables the card).
    if (config.usedExecutiveRoles?.includes(executive.role)) continue;

    const meetings = meetingsByRole[executive.role] || [];
    // Meeting-relevance Tier 0 (PR-1): an exec whose eligible pool is empty
    // (server answered meetings: [] — the sit-out rule) is skipped by AUTO here.
    if (meetings.length === 0) continue;

    const meeting = findEligibleMeeting(meetings);
    if (!meeting) continue;

    // Exec-meetings-revival PR-6 (C4): risk-averse pick instead of always
    // choices[0] — AUTO must never gamble (variance_up/rep_swing) on the
    // player's behalf when a gamble-free choice exists in this meeting.
    const choice = pickSafestChoice(meeting.choices ?? []);
    if (!choice) continue;

    const score = calculateExecutiveScore(executive);

    options.push({
      executive,
      meeting,
      choice,
      score,
    });
  }

  return options;
}

/**
 * Select top options to fill available focus slots, respecting the Creative
 * Capital budget so AUTO can never assemble a set that overdraws CC.
 *
 * Executives are considered in priority (score-descending) order. For each one,
 * within the CC still remaining, we re-pick the safest AFFORDABLE choice in that
 * meeting (`pickSafestChoice(choices, budgetLeft)`) and deduct its CC cost from
 * the running budget. The safest-overall choice from `prepareAutoSelectOptions`
 * may cost CC we no longer have; here we downgrade it to a cheaper safe choice
 * rather than overdraw. If a meeting has no affordable choice at all, that
 * executive is skipped (its slot goes unused rather than forcing CC negative).
 *
 * When `creativeCapitalBudget` is omitted (or Infinity), behaviour is the old
 * pure score-then-slice: no budget filtering, safest choice per exec preserved.
 *
 * Playtest bug #11.
 *
 * @param options - All available auto-selection options
 * @param availableSlots - Number of focus slots to fill
 * @param creativeCapitalBudget - Remaining CC AUTO may spend (default: unlimited)
 * @returns Top-scored, budget-affordable options, sorted by score (descending)
 */
export function selectTopOptions(
  options: AutoSelectOption[],
  availableSlots: number,
  creativeCapitalBudget: number = Infinity
): AutoSelectOption[] {
  const ranked = [...options].sort((a, b) => b.score - a.score);

  const selected: AutoSelectOption[] = [];
  let budgetLeft = creativeCapitalBudget;

  for (const option of ranked) {
    if (selected.length >= availableSlots) break;

    const choices = option.meeting.choices ?? [];
    // Re-pick the safest choice that fits the CC still remaining. This may
    // differ from option.choice, which was chosen without a budget in mind.
    const affordableChoice = pickSafestChoice(choices, budgetLeft);
    if (!affordableChoice) continue;

    const cost = getChoiceCreativeCapitalCost(affordableChoice);
    // Never commit a choice that would push CC below zero. If even the
    // cheapest choice overdraws (cost > budgetLeft), skip this executive.
    if (cost > budgetLeft) continue;

    budgetLeft -= cost;
    selected.push(
      affordableChoice === option.choice
        ? option
        : { ...option, choice: affordableChoice }
    );
  }

  return selected;
}

/**
 * Convert an auto-select option to action data format
 *
 * @param option - Auto-selection option
 * @returns Action data ready for submission
 */
export function optionToActionData(option: AutoSelectOption): AutoSelectActionData {
  const actionData: AutoSelectActionData = {
    roleId: option.executive.role,
    actionId: option.meeting.id,
    choiceId: option.choice.id,
  };

  // CEO doesn't need executiveId (single role)
  if (option.executive.role !== 'ceo') {
    actionData.executiveId = option.executive.id;
  }

  return actionData;
}
