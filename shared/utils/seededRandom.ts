/**
 * Seeded Random Utilities
 *
 * Provides deterministic random selection based on string seeds.
 * Used for weekly meeting randomization to ensure consistency
 * across multiple requests within the same game week.
 */

/**
 * Simple hash function to convert a string seed into a numeric hash
 * Based on Java's String.hashCode() algorithm
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Seeded random number generator
 * Returns a pseudo-random number between 0 (inclusive) and 1 (exclusive)
 *
 * @param seed - String seed for deterministic randomization
 * @returns Number between 0 and 1
 */
export function seededRandom(seed: string): number {
  const hash = hashString(seed);
  // Use a simple linear congruential generator formula
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

/**
 * Randomly select one item from an array using a seed
 *
 * @param array - Array to select from
 * @param seed - String seed for deterministic randomization
 * @returns Single item from the array, or undefined if array is empty
 */
export function seededRandomPick<T>(array: T[], seed: string): T | undefined {
  if (array.length === 0) return undefined;
  if (array.length === 1) return array[0];

  const randomValue = seededRandom(seed);
  const index = Math.floor(randomValue * array.length);
  return array[index];
}

/**
 * Generate a seed string for weekly meeting randomization
 *
 * @param gameId - Unique game identifier
 * @param week - Current week number
 * @param roleId - Executive role identifier
 * @returns Seed string for deterministic randomization
 */
export function generateMeetingSeed(gameId: string, week: number, roleId: string): string {
  return `${gameId}-week${week}-${roleId}`;
}
