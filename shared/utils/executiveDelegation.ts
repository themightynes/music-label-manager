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

import {
  DEFAULT_AUTO_SAFE_SCORING,
  type AutoSafeScoringConfig,
} from './executiveAutoSelect';
import { seededRandomPick } from './seededRandom';

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
  /**
   * Loyal-scorer fix (2026-07-12): tunables for the AUTO-safe / loyal-band
   * choice scorer (scoreChoiceSafety). Defined next to the scorer in
   * shared/utils/executiveAutoSelect.ts; carried on this config so the engine's
   * autonomous-resolution path reads the balance-JSON-tuned values.
   */
  auto_safe_scoring: AutoSafeScoringConfig;
}

/**
 * Role → escalation-event-id POOL mapping (spec §5.6, v3 array routing). A
 * shared constant rather than scattered literals — the engine reads it to
 * resolve WHICH escalation event to inject for a given exec's role, via
 * `pickEscalationEventId` (isolated seeded pick, never the engine's in-stream
 * RNG). The v3 content set authors TWO escalation events per archetype so a
 * repeat offender doesn't see the same crisis twice; the arrays ship as
 * SINGLETONS (behavior byte-identical to the previous single-id map) until the
 * second events land after designer review. `ceo` has no exec row and is never
 * a candidate for autonomous resolution (the CEO lane genuinely lapses, §2),
 * so it is intentionally absent here.
 *
 * Engine-verbs Slice 14 (M12b): the "don't repeat the last-seen escalation"
 * rule is now live — `flags.escalationHistory[roleId]` (stamped by
 * GameEngine.applyEscalation, mirroring flags.side_event_history) is passed to
 * `pickEscalationEventId` as `seen`, which filters the pool before the seeded
 * pick (never to empty — a fully-seen pool falls back to the whole pool).
 */
export const ESCALATION_EVENT_BY_ROLE: Readonly<Record<string, readonly string[]>> = {
  head_ar: ['escalation_ar_botched_signing'],
  cmo: ['escalation_cmo_narrative_lost'],
  cco: ['escalation_cco_artist_walkout'],
  head_distribution: ['escalation_dist_deal_collapsed'],
};

/**
 * Pick the escalation event id for a role from its pool (v3 array routing).
 * Deterministic — pure function of (roleId, seed, pool): a singleton pool
 * always returns its only element (seededRandomPick short-circuits before any
 * hash draw), and a multi-event pool resolves via the SAME isolated
 * seeded-pick primitive the autonomous tie-break uses (Ground Rule 4 /
 * isolated-seed rule, §10.3) — NEVER the engine's pinned ctx.getRandom stream.
 * The engine derives the seed from the already-in-scope meeting seed
 * (`${gameId}-week${week}-${roleId}`) plus an `-escalation-event` suffix so
 * the draw is namespaced away from the `-autonomous-choice` tie-break.
 *
 * Engine-verbs Slice 14 (M12b — escalation last-seen): `seen` (this role's
 * flags.escalationHistory entry) filters already-seen event ids OUT of the
 * pool before the seeded pick. NEVER-EMPTY RULE: if filtering would empty the
 * pool (every event seen — e.g. a singleton pool that already fired), the
 * pick falls back to the FULL pool, so an escalation always resolves to an
 * event. GameEngine.applyEscalation's saturation reset keeps the stored
 * history from pinning a fully-seen pool forever.
 *
 * @param roleId - Executive role id (core four; `ceo` never escalates)
 * @param seed - Isolated seed string (gameId/week/role-derived)
 * @param seen - Event ids this role has already escalated into (filtered out)
 * @param pools - Injectable for tests; defaults to ESCALATION_EVENT_BY_ROLE
 * @returns The picked event id, or undefined for an unknown role / empty pool
 */
export function pickEscalationEventId(
  roleId: string,
  seed: string,
  seen: readonly string[] = [],
  pools: Readonly<Record<string, readonly string[]>> = ESCALATION_EVENT_BY_ROLE,
): string | undefined {
  const pool = pools[roleId];
  if (!pool || pool.length === 0) return undefined;
  const unseen = pool.filter((id) => !seen.includes(id));
  const effectivePool = unseen.length > 0 ? unseen : pool;
  return seededRandomPick(effectivePool as string[], seed);
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
  neglect_mood_gain: 0,
  escalation: {
    loyalty_ceiling: 40,
    enabled: true,
  },
  auto_safe_scoring: DEFAULT_AUTO_SAFE_SCORING,
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
