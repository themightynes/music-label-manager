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

    const choice = meeting.choices?.[0];
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
