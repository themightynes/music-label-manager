import { describe, it, expect } from 'vitest';
import {
  applyStartingMoneyMultiplier,
  normalizeDifficulty,
  DIFFICULTY_LEVELS
} from '../../shared/utils/startingValues';
import progression from '../../data/balance/progression.json';
import economy from '../../data/balance/economy.json';

const modifiers = progression.difficulty_modifiers as Record<string, Record<string, number>>;
const baseMoney = economy.starting_money as number;

describe('applyStartingMoneyMultiplier', () => {
  it('applies the real progression.json multipliers to the real economy.json base', () => {
    expect(applyStartingMoneyMultiplier(baseMoney, modifiers, 'normal')).toBe(baseMoney);
    expect(applyStartingMoneyMultiplier(baseMoney, modifiers, 'easy')).toBe(
      Math.round(baseMoney * modifiers.easy.starting_money_multiplier)
    );
    expect(applyStartingMoneyMultiplier(baseMoney, modifiers, 'hard')).toBe(
      Math.round(baseMoney * modifiers.hard.starting_money_multiplier)
    );
  });

  it('matches the documented balance values (easy 1.5x, normal 1.0x, hard 0.7x of $500k)', () => {
    expect(applyStartingMoneyMultiplier(500000, modifiers, 'easy')).toBe(750000);
    expect(applyStartingMoneyMultiplier(500000, modifiers, 'normal')).toBe(500000);
    expect(applyStartingMoneyMultiplier(500000, modifiers, 'hard')).toBe(350000);
  });

  it('falls back to 1.0x for an unknown difficulty key', () => {
    expect(applyStartingMoneyMultiplier(baseMoney, modifiers, 'brutal')).toBe(baseMoney);
  });

  it('falls back to 1.0x when modifiers are missing entirely', () => {
    expect(applyStartingMoneyMultiplier(baseMoney, undefined, 'easy')).toBe(baseMoney);
    expect(applyStartingMoneyMultiplier(baseMoney, null, 'hard')).toBe(baseMoney);
  });

  it('falls back to 1.0x when the difficulty entry lacks starting_money_multiplier', () => {
    expect(applyStartingMoneyMultiplier(1000, { easy: {} }, 'easy')).toBe(1000);
  });

  it('rounds to a whole dollar amount', () => {
    expect(applyStartingMoneyMultiplier(1001, { hard: { starting_money_multiplier: 0.7 } }, 'hard')).toBe(701);
  });
});

describe('normalizeDifficulty', () => {
  it('accepts each valid difficulty level', () => {
    for (const level of DIFFICULTY_LEVELS) {
      expect(normalizeDifficulty(level)).toBe(level);
    }
  });

  it('is case-insensitive', () => {
    expect(normalizeDifficulty('HARD')).toBe('hard');
    expect(normalizeDifficulty('Easy')).toBe('easy');
  });

  it('defaults to normal for unknown or non-string input', () => {
    expect(normalizeDifficulty('brutal')).toBe('normal');
    expect(normalizeDifficulty(undefined)).toBe('normal');
    expect(normalizeDifficulty(null)).toBe('normal');
    expect(normalizeDifficulty(42)).toBe('normal');
    expect(normalizeDifficulty({})).toBe('normal');
  });
});
