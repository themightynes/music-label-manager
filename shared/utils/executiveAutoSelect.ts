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
 * gamble), so it belongs here — not in GAMBLE_EFFECT_KEYS. `money` is scored
 * separately (per-$1000, wider cap) so spends of different magnitudes actually
 * differ — see AutoSafeScoringConfig.
 */
export const VALUE_EFFECT_KEYS = ['reputation', 'creative_capital', 'award_chances'] as const;

/**
 * Tunables for the AUTO-safe / loyal-band choice scorer (loyal-scorer fix,
 * 2026-07-12). Mirrors data/balance/progression.json
 * reputation_system.executive_delegation.auto_safe_scoring — kept in lockstep by
 * the delegation config-parity tripwire test. The pre-fix scorer was blind to
 * quality_bonus/artist_mood/awareness_boost/press_momentum and clamped money at
 * ±5 (so −$1,500 tied with −$20,000), producing in-fiction-perverse loyal picks
 * (rush the release for $1k, push a cratered artist through, copyright-strike a
 * viral moment because it was the only free choice).
 */
export interface AutoSafeScoringConfig {
  /** Flat penalty for ANY gamble key (variance_up/rep_swing) present. */
  gamble_base_penalty: number;
  /** Additional gamble penalty per point of magnitude. */
  gamble_per_point_penalty: number;
  /** Positive reputation/creative_capital/award_chances contribution cap. */
  value_gain_cap: number;
  /** Negative reputation/creative_capital/award_chances contribution cap (magnitude). */
  value_loss_cap: number;
  /** Multiplier applied to (capped) negative value contributions. */
  value_loss_dampener: number;
  /** Score points per $1,000 of money (both directions, before caps). */
  money_per_thousand: number;
  /** Cap on the positive money contribution (score points). */
  money_gain_cap: number;
  /** Cap on the negative money contribution's magnitude (score points ≙ $ cap / 1000). */
  money_spend_cap: number;
  /** Multiplier applied to the (capped) negative money contribution — loyal execs
   * are money-conservative but a spend is not as bad as a gamble. */
  money_spend_dampener: number;
  /** Per-key weights for label-positive soft stats the old scorer ignored. */
  soft_stat_weights: {
    quality_bonus: number;
    artist_mood: number;
    awareness_boost: number;
    press_momentum: number;
  };
}

/**
 * Default knobs — mirror data/balance/progression.json
 * reputation_system.executive_delegation.auto_safe_scoring (parity tripwire).
 * The client AUTO path scores with these defaults directly (it does not load the
 * balance JSON); the tripwire is what guarantees client AUTO == engine loyal band.
 */
export const DEFAULT_AUTO_SAFE_SCORING: AutoSafeScoringConfig = {
  gamble_base_penalty: 100,
  gamble_per_point_penalty: 10,
  value_gain_cap: 5,
  value_loss_cap: 5,
  value_loss_dampener: 0.5,
  money_per_thousand: 1,
  money_gain_cap: 5,
  money_spend_cap: 20,
  money_spend_dampener: 0.5,
  soft_stat_weights: {
    quality_bonus: 2,
    artist_mood: 2,
    awareness_boost: 1,
    press_momentum: 1,
  },
};

/**
 * Score a single choice's LIVE effects for risk-averseness. Higher = safer/better.
 * A gamble anywhere (either effect bag) is a large penalty; guaranteed
 * reputation/creative_capital/award_chances nudge the score; money is scored
 * per-$1000 with a wider cap (so spend magnitudes differ); label-positive soft
 * stats (quality_bonus/artist_mood/awareness_boost/press_momentum) count via
 * per-key weights so a loyal exec never trades them away for pocket change.
 */
export function scoreChoiceSafety(
  choice: DialogueChoice,
  scoring: AutoSafeScoringConfig = DEFAULT_AUTO_SAFE_SCORING,
): number {
  let score = 0;

  const effectSources: (ChoiceEffect | undefined)[] = [choice.effects_immediate, choice.effects_delayed];

  for (const effects of effectSources) {
    if (!effects) continue;
    for (const [key, value] of Object.entries(effects)) {
      if (typeof value !== 'number') continue;

      if (GAMBLE_EFFECT_KEYS.has(key)) {
        score -= scoring.gamble_base_penalty + Math.abs(value) * scoring.gamble_per_point_penalty;
        continue;
      }

      if (key === 'money') {
        const scaled = (value / 1000) * scoring.money_per_thousand;
        score +=
          value > 0
            ? Math.min(scaled, scoring.money_gain_cap)
            : Math.max(scaled, -scoring.money_spend_cap) * scoring.money_spend_dampener;
        continue;
      }

      const softWeight = (scoring.soft_stat_weights as Record<string, number | undefined>)[key];
      if (typeof softWeight === 'number') {
        score += value * softWeight;
        continue;
      }

      if ((VALUE_EFFECT_KEYS as readonly string[]).includes(key)) {
        score +=
          value > 0
            ? Math.min(value, scoring.value_gain_cap)
            : Math.max(value, -scoring.value_loss_cap) * scoring.value_loss_dampener;
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
export function pickHighestSafety(
  choices: DialogueChoice[],
  scoring: AutoSafeScoringConfig = DEFAULT_AUTO_SAFE_SCORING,
): DialogueChoice | undefined {
  if (choices.length === 0) return undefined;
  if (choices.length === 1) return choices[0];

  let best = choices[0];
  let bestScore = scoreChoiceSafety(best, scoring);

  for (let i = 1; i < choices.length; i++) {
    const candidate = choices[i];
    const candidateScore = scoreChoiceSafety(candidate, scoring);
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
  scoring: AutoSafeScoringConfig = DEFAULT_AUTO_SAFE_SCORING,
): DialogueChoice | undefined {
  if (choices.length === 0) return undefined;

  if (typeof budgetLeft === 'number') {
    const affordable = choices.filter((c) => getChoiceCreativeCapitalCost(c) <= budgetLeft);
    if (affordable.length > 0) {
      return pickHighestSafety(affordable, scoring);
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

  return pickHighestSafety(choices, scoring);
}
