/**
 * Executive autonomous resolution — choice-pick characterization (Tier 1, §4.3/§10.4).
 *
 * pickAutonomousChoice is a PURE deterministic function of (choices, loyalty,
 * mood, config, seed). These tests pin:
 *   - loyalty-band pick determinism (loyal → AUTO-safe, committed → own call,
 *     disloyal → self-serving);
 *   - loyal-band pick == the client's AUTO-safe pick (single source of truth);
 *   - mood risk-appetite tie-break WITHIN a band;
 *   - self-serving pick is WELL-DEFINED (unique argmax) for every non-CEO exec's
 *     real actions.json pool (data-lint).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { DialogueChoice } from '../../shared/types/gameTypes';
import {
  pickAutonomousChoice,
  scoreSelfServing,
} from '../../shared/engine/executiveAutonomy';
import { DEFAULT_EXEC_DELEGATION_CONFIG } from '../../shared/utils/executiveDelegation';
import { pickSafestChoice } from '../../shared/utils/executiveAutoSelect';

const MOOD_BANDS = { inspired_above: 90, disgruntled_below: 30 };
const CFG = DEFAULT_EXEC_DELEGATION_CONFIG;

function pick(
  choices: DialogueChoice[],
  loyalty: number,
  mood: number,
  roleId = 'head_ar',
  seed = 'g-week1-head_ar-autonomous',
) {
  return pickAutonomousChoice({ choices, loyalty, mood, roleId, config: CFG, moodBands: MOOD_BANDS, seed });
}

// A head_ar meeting whose three choices split cleanly across the bands.
const AR_CHOICES: DialogueChoice[] = [
  { id: 'safe', label: 'Safe', effects_immediate: {}, effects_delayed: { reputation: 1 } } as any,
  { id: 'quality', label: 'Quality', effects_immediate: { creative_capital: -1 }, effects_delayed: { quality_bonus: 4 } } as any,
  { id: 'gamble', label: 'Gamble', effects_immediate: {}, effects_delayed: { variance_up: 2 } } as any,
];

describe('loyalty-band pick determinism (§3.1 / §4.3)', () => {
  it('loyal (>70) picks the AUTO-safe choice', () => {
    expect(pick(AR_CHOICES, 75, 50)?.id).toBe('safe');
  });
  it('committed (30..70) picks the own-call quality choice', () => {
    expect(pick(AR_CHOICES, 50, 50)?.id).toBe('quality');
  });
  it('disloyal (<30) picks the in-character self-serving (variance) choice', () => {
    expect(pick(AR_CHOICES, 20, 50)?.id).toBe('gamble');
  });
  it('is a pure function — repeated calls with identical inputs are identical', () => {
    const a = pick(AR_CHOICES, 20, 50)?.id;
    const b = pick(AR_CHOICES, 20, 50)?.id;
    expect(a).toBe(b);
  });
});

describe('loyal band == the client AUTO-safe pick (single source of truth)', () => {
  it('matches pickSafestChoice for the same choices', () => {
    expect(pick(AR_CHOICES, 90, 50)?.id).toBe(pickSafestChoice(AR_CHOICES)?.id);
  });
});

describe('mood risk-appetite tie-break within a band (§3.2)', () => {
  // Two gamble-free choices that TIE in the loyal (safety) band — money cost is
  // clamped in the safety score, so both score identically — but differ in risk
  // (money spend). Mood then decides.
  const TIE_CHOICES: DialogueChoice[] = [
    { id: 'cheap', label: 'Cheap', effects_immediate: { money: -3000 }, effects_delayed: {} } as any,
    { id: 'pricey', label: 'Pricey', effects_immediate: { money: -9000 }, effects_delayed: {} } as any,
  ];
  it('inspired (>90) swings big — picks the higher-risk (bigger spend) option', () => {
    expect(pick(TIE_CHOICES, 90, 95)?.id).toBe('pricey');
  });
  it('disgruntled (<30) plays defensive — picks the lower-risk (cheaper) option', () => {
    expect(pick(TIE_CHOICES, 90, 20)?.id).toBe('cheap');
  });
  it('neutral mood → balanced → deterministic seeded pick among the tie', () => {
    const a = pick(TIE_CHOICES, 90, 50, 'head_ar', 'seedX')?.id;
    const b = pick(TIE_CHOICES, 90, 50, 'head_ar', 'seedX')?.id;
    expect(a).toBe(b); // same seed → same pick
    expect(['cheap', 'pricey']).toContain(a);
  });
});

describe('self-serving pick is well-defined for every non-CEO exec pool (data-lint, §10.4)', () => {
  const actions = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'data/actions.json'), 'utf8'),
  );
  const roleMeetings = (actions.weekly_actions as any[]).filter(
    (a) => a.type === 'role_meeting' && !String(a.id).startsWith('TEST_') && a.role_id !== 'ceo',
  );

  it('covers all four core exec roles', () => {
    const roles = new Set(roleMeetings.map((m) => m.role_id));
    expect(roles).toEqual(new Set(['head_ar', 'cmo', 'cco', 'head_distribution']));
  });

  it.each(roleMeetings.map((m) => [m.role_id, m.id, m] as const))(
    'meeting %s/%s yields exactly one self-serving argmax',
    (roleId, _id, meeting) => {
      const choices = (meeting.choices ?? []) as DialogueChoice[];
      expect(choices.length).toBeGreaterThan(0);
      const scores = choices.map((c) => scoreSelfServing(c, roleId));
      const max = Math.max(...scores);
      const winners = scores.filter((s) => s === max);
      expect(winners.length).toBe(1); // unique argmax → deterministic without the seed
    },
  );
});
