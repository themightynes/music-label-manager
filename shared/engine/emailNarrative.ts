/**
 * Email Narrative helpers — Phase 1 of the Email Narrative feature.
 *
 * Implements the shared pieces used by EmailGenerator to give executive emails
 * personality: mood banding, deterministic variant selection, and deterministic
 * "narrative timestamp" derivation.
 *
 * See: docs/01-planning/implementation-specs/[FUTURE] Email Narrative Storytelling Guide.md
 *
 * DETERMINISM (CRITICAL — backlog C64): nothing here may consume the engine's
 * seeded RNG stream and nothing may call Math.random(). All variant/timestamp
 * selection is a pure function of (gameId, week, category, mood band). This keeps
 * the golden-master stable and email content byte-identical for identical inputs.
 */

/**
 * The guide's 5 mood bands, mapped from an executive's 0-100 mood score.
 *
 * Thresholds (documented, inclusive lower bound):
 *   Terrible:  0–19
 *   Poor:      20–39
 *   Neutral:   40–59
 *   Good:      60–79
 *   Excellent: 80–100
 *
 * 50 (the engine's neutral default / mood drift target) lands in Neutral.
 */
export type MoodBand = "terrible" | "poor" | "neutral" | "good" | "excellent";

export const MOOD_BAND_THRESHOLDS: { band: MoodBand; min: number }[] = [
  { band: "excellent", min: 80 },
  { band: "good", min: 60 },
  { band: "neutral", min: 40 },
  { band: "poor", min: 20 },
  { band: "terrible", min: 0 },
];

/**
 * Map a 0-100 mood score to one of the five bands. Out-of-range/undefined moods
 * clamp: undefined/null -> neutral (the engine's default), <0 -> terrible,
 * >100 -> excellent.
 */
export function moodToBand(mood: number | null | undefined): MoodBand {
  if (mood === null || mood === undefined || Number.isNaN(mood)) {
    return "neutral";
  }
  const clamped = Math.max(0, Math.min(100, mood));
  for (const { band, min } of MOOD_BAND_THRESHOLDS) {
    if (clamped >= min) {
      return band;
    }
  }
  return "terrible";
}

/**
 * Stable, non-cryptographic string hash (FNV-1a, 32-bit). Deterministic across
 * runs and platforms. Used to pick narrative variants without touching RNG.
 */
export function stableHash(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // 32-bit FNV prime multiply, kept in unsigned 32-bit range.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Deterministically pick one element of `variants` from a stable seed built out
 * of (gameId, week, category, discriminator). Same inputs -> same choice, every
 * time, on every machine.
 */
export function pickVariant<T>(
  variants: readonly T[],
  seed: { gameId: string; week: number; category: string; discriminator?: string },
): T {
  if (variants.length === 0) {
    throw new Error("pickVariant requires at least one variant");
  }
  const key = `${seed.gameId}|${seed.week}|${seed.category}|${seed.discriminator ?? ""}`;
  const index = stableHash(key) % variants.length;
  return variants[index];
}

/**
 * Deterministically decide a boolean quirk (e.g. "is this a late-night email?")
 * from the same seed space. `probabilityDenominator` controls rarity: a value of
 * 2 means ~50%, 3 means ~33%, etc. Purely a hash bucket — no RNG.
 */
export function pickFlag(
  seed: { gameId: string; week: number; category: string; discriminator?: string },
  probabilityDenominator = 2,
): boolean {
  const key = `${seed.gameId}|${seed.week}|${seed.category}|flag|${seed.discriminator ?? ""}`;
  return stableHash(key) % probabilityDenominator === 0;
}

/**
 * Derive a deterministic narrative timestamp string (NARRATIVE TEXT, not a real
 * timestamp) in each executive's characteristic style. The guide asks for:
 *   - Mac: late night / early morning when excited (2–4 AM)
 *   - Sam: business hours, "any time" during crisis
 *   - Dante: "cosmic timing" — 11:11, 3:33, etc.
 *   - Pat: precisely scheduled, on the hour or :15/:30/:45
 *
 * Deterministic from (gameId, week, category, role).
 */
export function narrativeTimestamp(
  role: "head_ar" | "cmo" | "cco" | "head_distribution",
  seed: { gameId: string; week: number; category: string },
): string {
  const h = stableHash(`${seed.gameId}|${seed.week}|${seed.category}|ts|${role}`);

  switch (role) {
    case "head_ar": {
      // 2:00–4:59 AM, minute deterministic.
      const hour = 2 + (h % 3); // 2, 3, or 4
      const minute = h % 60;
      return `Sent at ${hour}:${String(minute).padStart(2, "0")} AM`;
    }
    case "cmo": {
      // Business hours 9 AM – 6 PM.
      const hour = 9 + (h % 9); // 9..17
      const minute = (h >>> 3) % 60;
      const period = hour >= 12 ? "PM" : "AM";
      const display = hour > 12 ? hour - 12 : hour;
      return `Sent at ${display}:${String(minute).padStart(2, "0")} ${period}`;
    }
    case "cco": {
      // "Cosmic timing" — repeated-digit / mirror times.
      const cosmic = ["11:11 PM", "3:33 AM", "4:44 AM", "2:22 AM", "1:11 PM", "5:55 AM"];
      return `Sent at ${cosmic[h % cosmic.length]} (cosmic window)`;
    }
    case "head_distribution": {
      // Precisely scheduled — on the :00/:15/:30/:45.
      const hour = 8 + (h % 9); // 8..16
      const quarters = ["00", "15", "30", "45"];
      const minute = quarters[(h >>> 2) % 4];
      const period = hour >= 12 ? "PM" : "AM";
      const display = hour > 12 ? hour - 12 : hour;
      return `Logged ${display}:${minute} ${period} (scheduled)`;
    }
    default:
      return "";
  }
}
