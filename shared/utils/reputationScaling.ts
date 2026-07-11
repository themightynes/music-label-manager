/**
 * Volatility-economy slice 3 — global reputation-GAIN scaling.
 *
 * The first structured playtest found reputation earned far too fast (rep 100 by
 * week ~21 of 52). There is no single chokepoint where positive reputation deltas
 * are applied — they land at several sites (chart milestones, release press
 * coverage, PR-push / digital-ads marketing, meeting immediate + delayed effects)
 * — so this shared helper is called per-source to damp every POSITIVE gain by a
 * single configured factor.
 *
 * LOSSES ARE NEVER SCALED: a non-positive delta (the flop penalty, a negative
 * meeting outcome, a losing rep-swing) is returned unchanged so sinks bite at full
 * magnitude while gains are throttled. Zero RNG — pure arithmetic, integer-safe
 * (positive gains are rounded).
 *
 * Config: progression.json reputation_system.reputation_gain_scaling (default 0.7;
 * 1.0 disables damping). Fallback default keeps a missing knob = 0.7.
 */

export interface ReputationScalingConfig {
  reputation_gain_scaling?: number;
}

export const DEFAULT_REPUTATION_GAIN_SCALING = 0.7;

/**
 * Scale a raw reputation delta.
 * @param rawDelta  the un-scaled reputation change (may be negative)
 * @param config    reputation_system config carrying reputation_gain_scaling
 * @returns the delta to actually apply — positive gains scaled + rounded,
 *          non-positive deltas returned unchanged.
 */
export function scaleReputationGain(
  rawDelta: number,
  config?: ReputationScalingConfig | null,
): number {
  // Losses and zero pass through untouched — only gains are throttled.
  if (rawDelta <= 0) return rawDelta;
  const factor = config?.reputation_gain_scaling ?? DEFAULT_REPUTATION_GAIN_SCALING;
  return Math.round(rawDelta * factor);
}
