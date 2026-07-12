/**
 * Shared executive choice-safety scoring — the PURE core of AUTO-select.
 *
 * Extracted from client/src/services/executiveAutoSelect.ts (Executive
 * Delegation arc, Tier 1) so BOTH the client AUTO path AND the engine's
 * autonomous-resolution path (shared/engine/executiveAutonomy.ts) score choices
 * through the SAME functions — the loyal band's "AUTO-safe" pick is, by
 * definition, exactly what the client's AUTO button would pick. The client
 * service re-exports these names so its callers/tests are unchanged.
 *
 * PURE — types only, no engine/DB/client imports.
 */

import type { DialogueChoice, ChoiceEffect } from '../types/gameTypes';

/**
 * Gamble effect keys AUTO must never pick over a gamble-free alternative in the
 * same meeting (variance/rep swing = risk from the player's point of view).
 */
export const GAMBLE_EFFECT_KEYS = new Set(['variance_up', 'rep_swing']);

/**
 * Keys that count as "guaranteed" positive/negative value for the safety score.
 * award_chances is a guaranteed-positive accumulating pool (the opposite of a
 * gamble), so it belongs here — not in GAMBLE_EFFECT_KEYS.
 */
export const VALUE_EFFECT_KEYS = ['money', 'reputation', 'creative_capital', 'award_chances'] as const;

/**
 * Score a single choice's LIVE effects for risk-averseness. Higher = safer/better.
 * A gamble anywhere (either effect bag) is a large penalty; guaranteed
 * money/reputation/creative_capital/award_chances nudge the score as a tie-break.
 */
export function scoreChoiceSafety(choice: DialogueChoice): number {
  let score = 0;

  const effectSources: (ChoiceEffect | undefined)[] = [choice.effects_immediate, choice.effects_delayed];

  for (const effects of effectSources) {
    if (!effects) continue;
    for (const [key, value] of Object.entries(effects)) {
      if (typeof value !== 'number') continue;

      if (GAMBLE_EFFECT_KEYS.has(key)) {
        score -= 100 + Math.abs(value) * 10;
        continue;
      }

      if ((VALUE_EFFECT_KEYS as readonly string[]).includes(key)) {
        score += value > 0 ? Math.min(value, 5) : Math.max(value, -5) * 0.5;
      }
    }
  }

  return score;
}

/**
 * Creative Capital cost of a choice: the total CC it SPENDS, as a non-negative
 * number (0 = free or CC-positive). Reads `creative_capital` from BOTH
 * effects_immediate and effects_delayed, summing only the negative components.
 */
export function getChoiceCreativeCapitalCost(choice: DialogueChoice): number {
  let net = 0;
  const sources: (ChoiceEffect | undefined)[] = [choice.effects_immediate, choice.effects_delayed];
  for (const effects of sources) {
    if (!effects) continue;
    const value = (effects as Record<string, unknown>).creative_capital;
    if (typeof value === 'number') net += value;
  }
  return net < 0 ? -net : 0;
}

/**
 * Highest safety score wins; ties resolve to the first matching choice
 * (stable, deterministic).
 */
export function pickHighestSafety(choices: DialogueChoice[]): DialogueChoice | undefined {
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

/**
 * Pick the safest choice in a meeting: highest safety score wins; ties resolve
 * to the first matching choice (stable, deterministic).
 *
 * @param budgetLeft optional remaining Creative Capital budget. When provided,
 *   choices whose CC cost would overdraw the budget are excluded; if EVERY
 *   choice would overdraw, the least-cost choice is returned so AUTO drives CC as
 *   little negative as possible.
 */
export function pickSafestChoice(
  choices: DialogueChoice[],
  budgetLeft?: number,
): DialogueChoice | undefined {
  if (choices.length === 0) return undefined;

  if (typeof budgetLeft === 'number') {
    const affordable = choices.filter((c) => getChoiceCreativeCapitalCost(c) <= budgetLeft);
    if (affordable.length > 0) {
      return pickHighestSafety(affordable);
    }
    let leastCost = choices[0];
    let leastCostValue = getChoiceCreativeCapitalCost(leastCost);
    for (let i = 1; i < choices.length; i++) {
      const cost = getChoiceCreativeCapitalCost(choices[i]);
      if (cost < leastCostValue) {
        leastCost = choices[i];
        leastCostValue = cost;
      }
    }
    return leastCost;
  }

  return pickHighestSafety(choices);
}
