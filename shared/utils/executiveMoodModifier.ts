/**
 * Executive Mood Modifier — the ONE shared modifier util (Exec-meetings-revival PR-9, C6/D-slice).
 *
 * Executive mood mechanically modifies the outcome of that executive's meeting.
 * This module is PURE (no engine/DB/client imports) and is imported by BOTH:
 *   - the engine (ActionProcessor.processRoleMeeting) — the real, authoritative apply
 *   - the client Impact Preview (executiveMeetingMachine.calculateImpactPreview)
 * so the two paths can NEVER drift: they route the SAME inputs through the SAME
 * functions and produce byte-identical scaled effects.
 *
 * SEMANTICS (locked by the plan; balance knobs, not hardcoded — see
 * ExecMoodModifierConfig / data/balance/progression.json reputation_system.exec_mood_modifiers):
 *   - mood <  disgruntled_below (30)  → 'disgruntled': money COSTS ×cost_multiplier_disgruntled (1.25)
 *   - mood >  content_above    (80)  → 'content':     money costs ×cost_multiplier_content (0.90)
 *   - mood >  inspired_above   (90)  → 'inspired':    ADDITIONALLY all non-money effect
 *                                       magnitudes ×effect_multiplier_inspired (1.20)
 *   - 30..80 inclusive-of-neither-threshold → 'neutral': no modifier at all.
 *
 * 'Money cost' = a NEGATIVE `money` value. Positive money (windfalls) is NEVER scaled.
 * Non-money scaling (inspired only) applies to every OTHER live numeric effect's
 * magnitude, preserving sign, in BOTH effects_immediate and effects_delayed.
 *
 * The `executive_mood` effect itself is NEVER scaled (no feedback loop — an inspired
 * exec doesn't amplify its own mood gain).
 *
 * DEFERRED (out of scope, do NOT implement here): the <20 / <10 availability gates
 * (mechanical-framework lines 386-387) — those need meeting-filtering UI (follow-up).
 */

export type MoodBand = 'disgruntled' | 'neutral' | 'content' | 'inspired';

export interface ExecMoodModifierConfig {
  /** Strict lower bound: mood < this → disgruntled. */
  disgruntled_below: number;
  /** Strict upper bound: mood > this → content. */
  content_above: number;
  /** Strict upper bound: mood > this → inspired (additionally). */
  inspired_above: number;
  /** Money-cost multiplier when disgruntled (>1 = costs more). */
  cost_multiplier_disgruntled: number;
  /** Money-cost multiplier when content/inspired (<1 = costs less). */
  cost_multiplier_content: number;
  /** Non-money effect-magnitude multiplier when inspired. */
  effect_multiplier_inspired: number;
}

/**
 * Default knobs — mirror data/balance/progression.json
 * reputation_system.exec_mood_modifiers. Kept in sync by the gameData accessor
 * (getExecMoodModifierConfigSync) and the golden-master fixtures mirror.
 */
export const DEFAULT_EXEC_MOOD_MODIFIER_CONFIG: ExecMoodModifierConfig = {
  disgruntled_below: 30,
  content_above: 80,
  inspired_above: 90,
  cost_multiplier_disgruntled: 1.25,
  cost_multiplier_content: 0.9,
  effect_multiplier_inspired: 1.2,
};

export interface MoodModifiers {
  band: MoodBand;
  /** Multiplier applied to NEGATIVE money magnitudes (costs). 1 = no change. */
  costMultiplier: number;
  /** Multiplier applied to non-money effect magnitudes (inspired). 1 = no change. */
  effectMultiplier: number;
}

/**
 * Which mood band an executive is in. Boundaries are STRICT per the framework:
 *   29 → disgruntled, 30 → neutral, 80 → neutral, 81 → content, 90 → content,
 *   91 → inspired. inspired implies the content cost break too (see getMoodModifiers).
 */
export function getMoodBand(
  mood: number,
  config: ExecMoodModifierConfig = DEFAULT_EXEC_MOOD_MODIFIER_CONFIG,
): MoodBand {
  if (mood < config.disgruntled_below) return 'disgruntled';
  if (mood > config.inspired_above) return 'inspired';
  if (mood > config.content_above) return 'content';
  return 'neutral';
}

/**
 * The multipliers for a given mood. `inspired` inherits `content`'s cost break
 * (a >90 exec is also >80) AND adds the non-money amplification.
 */
export function getMoodModifiers(
  mood: number,
  config: ExecMoodModifierConfig = DEFAULT_EXEC_MOOD_MODIFIER_CONFIG,
): MoodModifiers {
  const band = getMoodBand(mood, config);
  switch (band) {
    case 'disgruntled':
      return { band, costMultiplier: config.cost_multiplier_disgruntled, effectMultiplier: 1 };
    case 'content':
      return { band, costMultiplier: config.cost_multiplier_content, effectMultiplier: 1 };
    case 'inspired':
      return {
        band,
        costMultiplier: config.cost_multiplier_content,
        effectMultiplier: config.effect_multiplier_inspired,
      };
    case 'neutral':
    default:
      return { band, costMultiplier: 1, effectMultiplier: 1 };
  }
}

/** True when the modifiers are a genuine no-op (neutral band). */
export function isNeutral(modifiers: MoodModifiers): boolean {
  return modifiers.band === 'neutral';
}

/**
 * The ONE rounding rule — used identically by engine and preview so parity is structural.
 *   - money: Math.round (nearest integer cents-free dollar).
 *   - integer point effects: sign * Math.round(|value| * multiplier) — preserves sign,
 *     rounds magnitude to nearest integer. e.g. +5 ×1.2 → +6, -3 ×1.2 → -4 (|3.6|→4),
 *     +1 ×1.2 → +1 (|1.2|→1).
 */
function roundMoney(value: number): number {
  return Math.round(value);
}

function scaleMagnitude(value: number, multiplier: number): number {
  if (value === 0) return 0;
  const sign = value < 0 ? -1 : 1;
  return sign * Math.round(Math.abs(value) * multiplier);
}

/**
 * Transform an effects record (effects_immediate OR effects_delayed) through the
 * given mood modifiers. Returns a NEW record — never mutates the input.
 *
 * Rules (locked):
 *   - `money`:
 *       * value < 0 (a cost)  → scaled by costMultiplier, then roundMoney.
 *       * value >= 0 (windfall) → NEVER scaled (passed through unchanged).
 *   - `executive_mood` → NEVER scaled (no feedback loop).
 *   - every OTHER numeric key → magnitude scaled by effectMultiplier (inspired only;
 *     neutral/content/disgruntled leave effectMultiplier at 1 → unchanged), sign preserved.
 *
 * Non-numeric values pass through untouched.
 */
export function applyMoodModifiersToEffects<T extends Record<string, any>>(
  effects: T,
  modifiers: MoodModifiers,
): T {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(effects)) {
    if (typeof value !== 'number') {
      out[key] = value;
      continue;
    }

    if (key === 'money') {
      // Only negative money (costs) is scaled; positive money (windfalls) is untouched.
      out[key] = value < 0 ? roundMoney(value * modifiers.costMultiplier) : value;
      continue;
    }

    if (key === 'executive_mood') {
      // Never scaled — no feedback loop.
      out[key] = value;
      continue;
    }

    // Every other live numeric effect: inspired amplifies magnitude, sign preserved.
    out[key] = scaleMagnitude(value, modifiers.effectMultiplier);
  }
  return out as T;
}
