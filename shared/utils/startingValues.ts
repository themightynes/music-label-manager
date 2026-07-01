/**
 * Starting-value helpers for game creation.
 *
 * `difficulty_modifiers` lives in data/balance/progression.json keyed by
 * easy/normal/hard. Only `starting_money_multiplier` is applied today;
 * the other modifiers (reputation_decay, market_variance,
 * goal_time_extension) are still unused.
 * TODO: apply the remaining difficulty modifiers when a difficulty feature ships.
 */

export const DIFFICULTY_LEVELS = ['easy', 'normal', 'hard'] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

/**
 * Coerces an untrusted value (e.g. from a request body) to a valid
 * difficulty level, defaulting to 'normal'.
 */
export function normalizeDifficulty(value: unknown): DifficultyLevel {
  if (typeof value === 'string') {
    const lowered = value.toLowerCase();
    if ((DIFFICULTY_LEVELS as readonly string[]).includes(lowered)) {
      return lowered as DifficultyLevel;
    }
  }
  return 'normal';
}

/**
 * Applies the difficulty's starting_money_multiplier to the base starting
 * money. Missing modifiers or an unknown difficulty fall back to 1.0x.
 */
export function applyStartingMoneyMultiplier(
  baseMoney: number,
  difficultyModifiers: Record<string, Record<string, number>> | undefined | null,
  difficulty: string
): number {
  const multiplier = difficultyModifiers?.[difficulty]?.starting_money_multiplier ?? 1.0;
  return Math.round(baseMoney * multiplier);
}
