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

import type { Executive, RoleMeeting, DialogueChoice, ChoiceEffect } from '@shared/types/gameTypes';

/**
 * Exec-meetings-revival PR-6 (C4) — gamble effect keys AUTO must never pick over
 * a gamble-free alternative in the same meeting. Kept local (not imported from
 * shared/engine) because the client bundle shouldn't pull in engine code just to
 * know which two keys represent risk from the player's point of view.
 */
const GAMBLE_EFFECT_KEYS = new Set(['variance_up', 'rep_swing']);

/**
 * Keys that count as "guaranteed" positive/negative value for the safety score.
 * Costs (money/creative_capital negative) get a small penalty; guaranteed
 * upside on these axes gets a small bonus. Gamble keys are handled separately.
 *
 * Exec-meetings-revival PR-7 (C5): award_chances is a guaranteed-positive
 * accumulating pool (no expiry, no roll at authoring time) — the opposite of a
 * gamble — so it belongs here, not in GAMBLE_EFFECT_KEYS. This keeps AUTO from
 * treating a real, banked prestige gain as a risk to avoid.
 */
const VALUE_EFFECT_KEYS = ['money', 'reputation', 'creative_capital', 'award_chances'] as const;

/**
 * Score a single choice's LIVE effects for risk-averseness. Higher = safer/better.
 *
 * - Any presence of a gamble key (variance_up / rep_swing) is a large penalty,
 *   in EITHER effects_immediate or effects_delayed — AUTO should never gamble on
 *   the player's behalf when a gamble-free choice exists in the same meeting.
 * - Guaranteed net-positive money/reputation/creative_capital nudges the score up;
 *   costs (negative values) nudge it down, but only a small amount — this is a
 *   tie-breaker among gamble-free choices, not the primary signal.
 */
function scoreChoiceSafety(choice: DialogueChoice): number {
  let score = 0;

  const effectSources: (ChoiceEffect | undefined)[] = [choice.effects_immediate, choice.effects_delayed];

  for (const effects of effectSources) {
    if (!effects) continue;
    for (const [key, value] of Object.entries(effects)) {
      if (typeof value !== 'number') continue;

      if (GAMBLE_EFFECT_KEYS.has(key)) {
        // A gamble anywhere in the choice is a strong penalty — proportional to
        // the magnitude so a bigger gamble is avoided even more readily.
        score -= 100 + Math.abs(value) * 10;
        continue;
      }

      if ((VALUE_EFFECT_KEYS as readonly string[]).includes(key)) {
        // Small guaranteed-value signal: reward net positives, lightly penalize costs.
        score += value > 0 ? Math.min(value, 5) : Math.max(value, -5) * 0.5;
      }
    }
  }

  return score;
}

/**
 * Pick the safest choice in a meeting: highest safety score wins; ties resolve
 * to the first matching choice (stable, deterministic).
 */
export function pickSafestChoice(choices: DialogueChoice[]): DialogueChoice | undefined {
  if (choices.length === 0) return undefined;
  if (choices.length === 1) return choices[0];

  let best = choices[0];
  let bestScore = scoreChoiceSafety(best);

  for (let i = 1; i < choices.length; i++) {
    const candidate = choices[i];
    const candidateScore = scoreChoiceSafety(candidate);
    if (candidateScore > bestScore) {
      best = candidate;
      bestScore = candidateScore;
    }
  }

  return best;
}

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
 * Prepare auto-selection options for all executives
 *
 * @param executives - List of executives
 * @param meetingsByRole - Meetings grouped by executive role
 * @returns Array of auto-selection options with scores
 */
export function prepareAutoSelectOptions(
  executives: Executive[],
  meetingsByRole: Record<string, RoleMeeting[]>
): AutoSelectOption[] {
  const options: AutoSelectOption[] = [];

  for (const executive of executives) {
    const meetings = meetingsByRole[executive.role] || [];
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
 * Select top options to fill available focus slots
 *
 * @param options - All available auto-selection options
 * @param availableSlots - Number of focus slots to fill
 * @returns Top-scored options, sorted by score (descending)
 */
export function selectTopOptions(
  options: AutoSelectOption[],
  availableSlots: number
): AutoSelectOption[] {
  return options
    .sort((a, b) => b.score - a.score)
    .slice(0, availableSlots);
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
