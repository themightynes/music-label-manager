/**
 * Exec-meetings-revival PR-6 (C4) — risk-averse AUTO-select heuristic.
 *
 * Replaces the old always-choices[0] pick with pickSafestChoice: a choice
 * containing variance_up/rep_swing anywhere in its effects is penalized so
 * heavily that a gamble-free alternative always wins when one exists in the
 * same meeting; ties resolve deterministically to the first matching choice.
 */
import { describe, it, expect } from 'vitest';
import type { DialogueChoice, RoleMeeting, Executive } from '@shared/types/gameTypes';
import {
  pickSafestChoice,
  prepareAutoSelectOptions,
} from '../../client/src/services/executiveAutoSelect';

function choice(id: string, overrides: Partial<DialogueChoice> = {}): DialogueChoice {
  return {
    id,
    label: id,
    effects_immediate: {},
    effects_delayed: {},
    ...overrides,
  } as DialogueChoice;
}

describe('pickSafestChoice', () => {
  it('prefers a gamble-free choice over one with variance_up', () => {
    const gambleFree = choice('safe', { effects_delayed: { quality_bonus: 2 } });
    const gamble = choice('risky', { effects_delayed: { variance_up: 2, quality_bonus: 4 } });

    const picked = pickSafestChoice([gamble, gambleFree]);
    expect(picked?.id).toBe('safe');
  });

  it('prefers a gamble-free choice over one with rep_swing', () => {
    const gambleFree = choice('safe', { effects_delayed: { reputation: 1 } });
    const gamble = choice('risky', { effects_delayed: { rep_swing: 3 } });

    const picked = pickSafestChoice([gamble, gambleFree]);
    expect(picked?.id).toBe('safe');
  });

  it('checks effects_immediate for gambles too, not just effects_delayed', () => {
    const gambleFree = choice('safe', { effects_immediate: { money: 100 } });
    const gambleImmediate = choice('risky', { effects_immediate: { rep_swing: 2 } });

    const picked = pickSafestChoice([gambleImmediate, gambleFree]);
    expect(picked?.id).toBe('safe');
  });

  it('when ALL choices gamble, picks the smallest-magnitude gamble (least bad)', () => {
    const bigGamble = choice('big', { effects_delayed: { variance_up: 5 } });
    const smallGamble = choice('small', { effects_delayed: { variance_up: 1 } });

    const picked = pickSafestChoice([bigGamble, smallGamble]);
    expect(picked?.id).toBe('small');
  });

  it('among gamble-free choices, rewards guaranteed net-positive value', () => {
    const costly = choice('costly', { effects_immediate: { money: -5000 } });
    const profitable = choice('profitable', { effects_immediate: { money: 5000, reputation: 2 } });
    const neutral = choice('neutral', {});

    const picked = pickSafestChoice([costly, neutral, profitable]);
    expect(picked?.id).toBe('profitable');
  });

  it('ties resolve deterministically to the first matching choice', () => {
    const a = choice('a', {});
    const b = choice('b', {});

    const picked1 = pickSafestChoice([a, b]);
    const picked2 = pickSafestChoice([a, b]);
    expect(picked1?.id).toBe('a');
    expect(picked2?.id).toBe('a');
  });

  it('returns the single choice when only one is available (even if it gambles)', () => {
    const onlyOption = choice('only', { effects_delayed: { variance_up: 3 } });
    const picked = pickSafestChoice([onlyOption]);
    expect(picked?.id).toBe('only');
  });

  it('returns undefined for an empty choices array', () => {
    expect(pickSafestChoice([])).toBeUndefined();
  });
});

describe('prepareAutoSelectOptions — AUTO never gambles when a safe alternative exists', () => {
  const executive: Executive = { id: 'exec-1', role: 'cmo', level: 1, mood: 50, loyalty: 50 };

  it('selects the gamble-free choice for the meeting', () => {
    const meeting: RoleMeeting = {
      id: 'cmo_pr_angle',
      prompt: 'Choose the story angle',
      target_scope: 'global',
      choices: [
        choice('spicy', { effects_delayed: { variance_up: 1, rep_swing: 1 } }),
        choice('safe', { effects_delayed: { press_momentum: 1 } }),
      ],
    };

    const options = prepareAutoSelectOptions([executive], { cmo: [meeting] });
    expect(options).toHaveLength(1);
    expect(options[0].choice.id).toBe('safe');
  });
});
