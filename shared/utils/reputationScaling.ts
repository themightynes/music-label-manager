/**
 * Reputation delta scaling — round-4 REDESIGN (2026-07-25).
 *
 * History: volatility-economy slice 3 added this helper as a positive-gain
 * DAMPER (0.7, then 0.5) because reputation maxed the old 0-100 scale by week
 * ~21 of 52. Round 4 replaced damping with stretched goalposts: reputation now
 * runs 0-700 (flagship playlists at 510), and this helper became an AMPLIFIER
 * (x3) applied to EVERY reputation delta — GAINS AND LOSSES ALIKE — so authored
 * content keeps its small readable values (+1..+6, -1..-8) while applied deltas
 * live on the new scale. The choice-badge preview renders through this same
 * helper, so the player is always shown exactly what will land.
 *
 * There is no single chokepoint where reputation deltas apply — call this
 * per-source: chart milestones (game-engine), press coverage + the flop sink
 * (ReleaseProcessor), PR-push / digital-ads marketing (ActionProcessor), and
 * meeting immediate + delayed effects incl. rep_swing (ActionProcessor).
 * Zero RNG — pure arithmetic, integer-safe (rounded).
 *
 * Config: progression.json reputation_system.reputation_gain_scaling (3).
 * DEFAULT_REPUTATION_GAIN_SCALING must stay in lockstep with the JSON value —
 * a tripwire test enforces it — because the client badge preview resolves the
 * factor from this constant when no config is at hand.
 */

export interface ReputationScalingConfig {
  reputation_gain_scaling?: number;
}

export const DEFAULT_REPUTATION_GAIN_SCALING = 3;

/**
 * Ceiling of the reputation scale (progression.json reputation_system.
 * max_reputation). Engine clamps read the config value and fall back to this
 * constant; keep the two in lockstep (tripwire-tested).
 */
export const MAX_REPUTATION_FALLBACK = 700;

/**
 * Scale a raw reputation delta onto the live scale.
 * @param rawDelta  the authored reputation change (either sign)
 * @param config    reputation_system config carrying reputation_gain_scaling
 * @returns the delta to actually apply — authored value x factor, rounded.
 */
export function scaleReputationGain(
  rawDelta: number,
  config?: ReputationScalingConfig | null,
): number {
  if (rawDelta === 0) return 0;
  const factor = config?.reputation_gain_scaling ?? DEFAULT_REPUTATION_GAIN_SCALING;
  return Math.round(rawDelta * factor);
}
