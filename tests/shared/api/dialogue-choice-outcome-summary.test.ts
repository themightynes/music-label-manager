/**
 * C92 `outcome_summary` round-trip guard.
 *
 * The admin Content Editor validates the whole actions config against the
 * contracts DialogueChoiceSchema before POSTing — and that schema is NOT
 * passthrough, so any field it doesn't declare is silently STRIPPED from
 * data/actions.json on save. This test pins that `outcome_summary` survives
 * a parse round-trip (and stays absent when unauthored).
 */
import { describe, it, expect } from 'vitest';
import { DialogueChoiceSchema } from '@shared/api/contracts';

describe('DialogueChoiceSchema outcome_summary (C92)', () => {
  const baseChoice = {
    id: 'choice_a',
    label: 'Sign the deal',
    effects_immediate: { money: -1000 },
    effects_delayed: {},
  };

  it('preserves an authored outcome_summary through parse (strip-on-save guard)', () => {
    const parsed = DialogueChoiceSchema.parse({
      ...baseChoice,
      outcome_summary: 'Signed the deal despite the risk',
    });
    expect(parsed.outcome_summary).toBe('Signed the deal despite the risk');
  });

  it('leaves the key absent when unauthored', () => {
    const parsed = DialogueChoiceSchema.parse(baseChoice);
    expect('outcome_summary' in parsed).toBe(false);
  });

  it('rejects an empty string (min(1) — omit the key instead)', () => {
    expect(() =>
      DialogueChoiceSchema.parse({ ...baseChoice, outcome_summary: '' })
    ).toThrow();
  });
});
