/**
 * Executive autonomous choice selection (Executive Delegation arc, Tier 1, §4.3).
 *
 * PURE + deterministic. Given a re-derived meeting plus an exec's loyalty/mood,
 * decides WHICH choice an un-acted executive makes when they resolve their
 * meeting autonomously:
 *
 *   1. LOYALTY BAND (§3.1) picks the candidate policy:
 *        loyal     → the AUTO-safe choice (reuse scoreChoiceSafety — exactly what
 *                    the player's AUTO button would pick; serves the CEO).
 *        committed → the exec's own reasonable call (a competent, quality-first
 *                    professional judgment that is not self-serving).
 *        disloyal  → the in-character self-serving choice (§4.3.1 archetype table).
 *   2. MOOD RISK APPETITE (§3.2) tie-breaks WITHIN the band's top-scoring set:
 *        inspired → aggressive (prefer higher risk); disgruntled → defensive
 *        (prefer lower risk); otherwise balanced (no bias).
 *   3. Any residual tie resolves via an ISOLATED seeded pick — NEVER the engine's
 *      pinned ctx.getRandom stream (Ground Rule 4 / isolated-seed rule, §10.3).
 *
 * The self-serving heuristic scores authored choices against each archetype's
 * "signature vice" (no new content) and is guarded by a data-lint test that every
 * non-CEO exec's meeting pool yields exactly one well-defined self-serving pick.
 * An optional `self_serving_hint: true` on a choice (additive) forces that choice
 * as the self-serving pick — the escape hatch when the heuristic would tie.
 */

import type { DialogueChoice } from '../types/gameTypes';
import { scoreChoiceSafety } from '../utils/executiveAutoSelect';
import {
  getLoyaltyBand,
  getRiskAppetiteBias,
  type ExecDelegationConfig,
} from '../utils/executiveDelegation';
import { seededRandomPick } from '../utils/seededRandom';

const EPSILON = 1e-9;

/** Sum a numeric effect key across a choice's immediate + delayed bags. */
function sumEffect(choice: DialogueChoice, key: string): number {
  let total = 0;
  for (const bag of [choice.effects_immediate, choice.effects_delayed]) {
    if (!bag) continue;
    const v = (bag as Record<string, unknown>)[key];
    if (typeof v === 'number') total += v;
  }
  return total;
}

/** Total gamble magnitude in a choice (variance_up + rep_swing). */
function gambleMagnitude(choice: DialogueChoice): number {
  return sumEffect(choice, 'variance_up') + sumEffect(choice, 'rep_swing');
}

/** Money the choice SPENDS, as a non-negative number (0 for a windfall/free choice). */
function moneySpend(choice: DialogueChoice): number {
  const net = sumEffect(choice, 'money');
  return net < 0 ? -net : 0;
}

/** Creative-capital the choice SPENDS, as a non-negative number. */
function creativeCapitalSpend(choice: DialogueChoice): number {
  const net = sumEffect(choice, 'creative_capital');
  return net < 0 ? -net : 0;
}

/**
 * Risk score for the mood tie-break (§3.2): "presence/magnitude of
 * variance_up/rep_swing + absolute money spend." Higher = riskier/bigger swing.
 */
export function riskScore(choice: DialogueChoice): number {
  return gambleMagnitude(choice) * 10 + moneySpend(choice) / 1000;
}

/**
 * In-character self-serving score (§4.3.1). Higher = more self-serving for that
 * archetype. An explicit `self_serving_hint: true` overrides everything.
 */
export function scoreSelfServing(choice: DialogueChoice, roleId: string): number {
  if ((choice as any).self_serving_hint === true) return Number.POSITIVE_INFINITY;

  const V = gambleMagnitude(choice);
  const Q = sumEffect(choice, 'quality_bonus');
  const A = sumEffect(choice, 'awareness_boost');
  const spend = moneySpend(choice);
  const ccSpend = creativeCapitalSpend(choice);
  const netMoney = sumEffect(choice, 'money');

  switch (roleId) {
    // Mac / head_ar — "chases the wild-card to prove his ear": creative/variance bets.
    case 'head_ar':
      return 10 * V + 3 * Q + ccSpend;
    // Dante / cco — "indulgent experimental creative": quality/variance regardless of budget.
    case 'cco':
      return 6 * Q + 6 * V + spend / 1000;
    // Sam / cmo — "flashy overspend that makes her the story": biggest press/awareness spend.
    case 'cmo':
      return 10 * spend + A;
    // Pat / head_distribution — "conservative, upside-capping, guaranteed value":
    // avoid variance hard, prefer the guaranteed-money / low-spend option.
    case 'head_distribution':
      return (V > 0 ? -1000 : 0) + netMoney / 1000 + A;
    default:
      // No archetype heuristic (should not happen for the core four) — fall back
      // to the least-safe choice so a self-serve is still well-defined.
      return -scoreChoiceSafety(choice);
  }
}

/**
 * Committed (mid-loyalty) "own reasonable call": a competent professional
 * judgment — invest in quality/value, avoid reckless gambles and self-serving
 * overspend. Deliberately distinct from the loyal band's pure-safety pick so the
 * three bands are observably different.
 */
export function scoreCommitted(choice: DialogueChoice): number {
  const V = gambleMagnitude(choice);
  const Q = sumEffect(choice, 'quality_bonus');
  const rep = sumEffect(choice, 'reputation');
  const A = sumEffect(choice, 'awareness_boost');
  const award = sumEffect(choice, 'award_chances');
  const netMoney = sumEffect(choice, 'money');
  const gain = netMoney > 0 ? netMoney : 0;
  const spend = netMoney < 0 ? -netMoney : 0;
  return 2 * Q + 2 * rep + A + award + gain / 1000 - 3 * V - spend / 4000;
}

export interface PickAutonomousChoiceInput {
  choices: DialogueChoice[];
  loyalty: number;
  mood: number;
  roleId: string;
  config: ExecDelegationConfig;
  /** Exec-mood band thresholds (from getExecMoodModifierConfigSync) — §3.2 reuses them. */
  moodBands: { inspired_above: number; disgruntled_below: number };
  /** Isolated tie-break seed: `${gameId}-week${week}-${roleId}-autonomous`. */
  seed: string;
}

/** Choices tied (within epsilon) at the maximum score. */
function topScoring(choices: DialogueChoice[], scoreFn: (c: DialogueChoice) => number): DialogueChoice[] {
  const scored = choices.map((c) => ({ c, s: scoreFn(c) }));
  let max = Number.NEGATIVE_INFINITY;
  for (const { s } of scored) {
    if (s > max) max = s;
  }
  return scored.filter(({ s }) => s === max || Math.abs(s - max) < EPSILON).map(({ c }) => c);
}

/**
 * Pick the choice an un-acted executive makes autonomously. Deterministic:
 * pure function of (choices, loyalty, mood, config, seed). Returns undefined only
 * for an empty choice list.
 */
export function pickAutonomousChoice(input: PickAutonomousChoiceInput): DialogueChoice | undefined {
  const { choices, loyalty, mood, roleId, config, moodBands, seed } = input;
  if (!choices || choices.length === 0) return undefined;
  if (choices.length === 1) return choices[0];

  const band = getLoyaltyBand(loyalty, config);
  const scoreFn: (c: DialogueChoice) => number =
    band === 'loyal'
      ? (c) => scoreChoiceSafety(c, config.auto_safe_scoring)
      : band === 'disloyal'
      ? (c) => scoreSelfServing(c, roleId)
      : scoreCommitted;

  let candidates = topScoring(choices, scoreFn);
  if (candidates.length === 1) return candidates[0];

  // Mood risk-appetite tie-break WITHIN the band's top set (§3.2).
  const bias = getRiskAppetiteBias(mood, config.autonomous_risk_appetite, moodBands);
  if (bias === 'aggressive') {
    candidates = topScoring(candidates, riskScore); // argmax risk
  } else if (bias === 'defensive') {
    candidates = topScoring(candidates, (c) => -riskScore(c)); // argmin risk
  }
  if (candidates.length === 1) return candidates[0];

  // Residual tie → isolated seeded pick (never ctx.getRandom).
  return seededRandomPick(candidates, `${seed}-choice`) ?? candidates[0];
}
