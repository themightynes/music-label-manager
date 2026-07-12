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

/**
 * Escalation config (Tier 2, spec §5.1, fork a → a1: loyalty-gated single strike).
 * An urgent (reactive) meeting self-resolved by an executive whose PRE-UPDATE
 * loyalty is below `loyalty_ceiling` escalates into a mandatory crisis side event
 * (`flags.pending_side_event`) for the FOLLOWING week — the exec let the crisis
 * blow up instead of handling it.
 */
export interface EscalationConfig {
  /** Urgent meeting self-resolved below this loyalty => escalates. */
  loyalty_ceiling: number;
  /** Kill-switch, mirrors mandatory_side_events.enabled. */
  enabled: boolean;
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
  /**
   * Exec-mood self-effect on a NEGLECTED (autonomous self-served) meeting
   * (default 0). Playtest-revision (2026-07-12 round 3): the authored
   * executive_mood / mood_default_delta do NOT apply to the exec on autonomous
   * resolution — a self-served meeting is not engagement. At 0, sustained
   * neglect lets mood drift toward 50 instead of ratcheting to the cap.
   */
  neglect_mood_gain: number;
  /** Tier 2 (§5.1): urgent-meeting-ignored escalation into a mandatory crisis. */
  escalation: EscalationConfig;
}

/**
 * Role → escalation-event-id mapping (spec §5.6). A shared constant rather than
 * scattered literals — the engine reads it to resolve WHICH escalation event to
 * inject for a given exec's role. One event per core-four archetype; `ceo` has
 * no exec row and is never a candidate for autonomous resolution (the CEO lane
 * genuinely lapses, §2), so it is intentionally absent here.
 */
export const ESCALATION_EVENT_BY_ROLE: Readonly<Record<string, string>> = {
  head_ar: 'escalation_ar_botched_signing',
  cmo: 'escalation_cmo_narrative_lost',
  cco: 'escalation_cco_artist_walkout',
  head_distribution: 'escalation_dist_deal_collapsed',
};

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
  neglect_mood_gain: 0,
  escalation: {
    loyalty_ceiling: 40,
    enabled: true,
  },
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
