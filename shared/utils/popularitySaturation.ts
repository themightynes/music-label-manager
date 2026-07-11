/**
 * Shared popularity-saturation multiplier.
 *
 * Single source of truth for the diminishing-returns curve that scales
 * popularity GAINS down as an artist's current popularity climbs. Both the
 * streaming popularity bonus (ReleaseProcessor.calculateStreamingPopularityBonus)
 * and tour popularity reactions (TourProcessor.applyTourPerformanceImpacts,
 * balance-integrity slice 6) run their raw gains through this ONE curve so the
 * formula is never duplicated across processors.
 *
 * Curve:  satMult(pop) = dim_base + dim_range / (1 + (pop / satPoint)^exp)
 *
 * At pop = 0 the multiplier is (dim_base + dim_range) — with the defaults that is
 * 1.5 (a super-charger for unknowns). Streaming intentionally exploits the full
 * 1.5→0.2 range. TOURS do NOT: the tour reaction table was authored as the FULL
 * gain, so tour callers clamp with `Math.min(1, ...)` (see slice 6) — saturation
 * may only REDUCE a tour gain, never amplify it above the table value.
 *
 * Config comes from markets.json market_formulas.popularity_saturation (lifted in
 * balance-integrity slice 1). The fallback defaults here are byte-identical to the
 * original engine literals.
 */

export interface PopularitySaturationConfig {
  saturation_point?: number;
  saturation_exponent?: number;
  diminishing_multiplier_base?: number;
  diminishing_multiplier_range?: number;
}

/**
 * Diminishing-returns multiplier applied to a popularity gain, given the
 * artist's CURRENT popularity. Returns the full unclamped curve value (can
 * exceed 1.0 at low popularity — callers that require the source value to be a
 * ceiling must clamp with Math.min(1, ...) themselves).
 */
export function popularitySaturationMultiplier(
  currentPopularity: number,
  config?: PopularitySaturationConfig
): number {
  const cfg = config || {};
  const saturationPoint = cfg.saturation_point ?? 35;
  const saturationExponent = cfg.saturation_exponent ?? 4;
  const diminishingBase = cfg.diminishing_multiplier_base ?? 0.2;
  const diminishingRange = cfg.diminishing_multiplier_range ?? 1.3;

  const baseMultiplier = 1 / (1 + Math.pow(currentPopularity / saturationPoint, saturationExponent));
  return diminishingBase + baseMultiplier * diminishingRange; // Scales from 1.5x (pop 0) down to 0.2x
}
