/**
 * Executive Delegation & Trust — shared config + band/risk classifiers
 * (Tier 1, Executive Delegation arc, spec §3–§4).
 *
 * This module is PURE (no engine/DB/client imports) — the config type + defaults
 * plus the two orthogonal classifiers the autonomous-resolution path reads:
 *   - LOYALTY BAND (§3.1) — selects WHICH choice policy an un-acted exec follows.
 *   - MOOD RISK APPETITE (§3.2) — biases the tie-break WITHIN that band.
 *
 * The knobs mirror data/balance/progression.json
 * reputation_system.executive_delegation. The gameData accessor
 * (getExecDelegationConfigSync) feeds the engine the balance-tuned values; a
 * tripwire test (mirroring the exec-mood-modifier tripwire) keeps the JSON and
 * DEFAULT_EXEC_DELEGATION_CONFIG in lockstep so any tuning that forgets one side
 * fails CI.
 */

/** Loyalty-band names (§3.1). */
export type LoyaltyBand = 'loyal' | 'committed' | 'disloyal';

/** Risk-appetite bias names (§3.2). */
export type RiskAppetiteBias = 'aggressive' | 'defensive' | 'balanced';

export interface LoyaltyBandsConfig {
  /** loyalty > this → loyal (picks the AUTO-safe choice). */
  loyal_above: number;
  /** loyalty < this → disloyal (picks the self-serving choice). Between → committed. */
  disloyal_below: number;
}

export interface AutonomousRiskAppetiteConfig {
  /** mood > inspired threshold → this bias (default 'aggressive'). */
  inspired_bias: RiskAppetiteBias;
  /** mood < disgruntled threshold → this bias (default 'defensive'). */
  disgruntled_bias: RiskAppetiteBias;
  /** otherwise → this bias (default 'balanced' = no risk bias). */
  neutral_bias: RiskAppetiteBias;
}

export interface ExecDelegationConfig {
  /** +loyalty granted on any attended (manual/AUTO-endorsed) meeting. */
  loyalty_on_use: number;
  /** −loyalty applied per week once idle beyond idle_weeks_before_decay. */
  loyalty_decay_per_week: number;
  /** Weeks of neglect before loyalty decay begins. */
  idle_weeks_before_decay: number;
  /** ±magnitude of the passive weekly exec-mood drift toward neutral (50). */
  mood_drift_per_week: number;
  /** Exec-mood self-effect when a meeting resolves without an authored executive_mood. */
  mood_default_delta: number;
  loyalty_bands: LoyaltyBandsConfig;
  autonomous_risk_appetite: AutonomousRiskAppetiteConfig;
  /** +loyalty on an AUTO-endorsed meeting (endorsement; currently == loyalty_on_use). */
  auto_endorse_loyalty_gain: number;
  /** +loyalty on a neglected (self-served) meeting — a self-serve is not endorsement. */
  neglect_loyalty_gain: number;
}

/**
 * Default knobs — mirror data/balance/progression.json
 * reputation_system.executive_delegation. Kept in sync by the gameData accessor
 * (getExecDelegationConfigSync) and pinned by the parity tripwire test.
 */
export const DEFAULT_EXEC_DELEGATION_CONFIG: ExecDelegationConfig = {
  loyalty_on_use: 5,
  loyalty_decay_per_week: 5,
  idle_weeks_before_decay: 3,
  mood_drift_per_week: 5,
  mood_default_delta: 5,
  loyalty_bands: {
    loyal_above: 70,
    disloyal_below: 30,
  },
  autonomous_risk_appetite: {
    inspired_bias: 'aggressive',
    disgruntled_bias: 'defensive',
    neutral_bias: 'balanced',
  },
  auto_endorse_loyalty_gain: 5,
  neglect_loyalty_gain: 0,
};

/**
 * Which loyalty band an executive is in (§3.1). Boundaries are inclusive of the
 * committed middle: loyalty > loyal_above → loyal; loyalty < disloyal_below →
 * disloyal; disloyal_below ≤ loyalty ≤ loyal_above → committed.
 */
export function getLoyaltyBand(
  loyalty: number,
  config: ExecDelegationConfig = DEFAULT_EXEC_DELEGATION_CONFIG,
): LoyaltyBand {
  const { loyal_above, disloyal_below } = config.loyalty_bands;
  if (loyalty > loyal_above) return 'loyal';
  if (loyalty < disloyal_below) return 'disloyal';
  return 'committed';
}

/**
 * The mood-driven risk-appetite bias for an autonomous pick's WITHIN-band
 * tie-break (§3.2). Reuses the shipped exec-mood band thresholds (inspired >
 * inspired_above, disgruntled < disgruntled_below) so mood volatility and mood
 * risk-appetite read the SAME boundaries. The middle (content/neutral) is
 * 'balanced' (no bias — the band's canonical pick stands).
 */
export function getRiskAppetiteBias(
  mood: number,
  appetite: AutonomousRiskAppetiteConfig,
  moodBands: { inspired_above: number; disgruntled_below: number },
): RiskAppetiteBias {
  if (mood > moodBands.inspired_above) return appetite.inspired_bias;
  if (mood < moodBands.disgruntled_below) return appetite.disgruntled_bias;
  return appetite.neutral_bias;
}
