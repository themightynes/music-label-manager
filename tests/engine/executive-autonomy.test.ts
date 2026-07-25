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
import { pickSafestChoice, scoreChoiceSafety } from '../../shared/utils/executiveAutoSelect';

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
// Loyal-scorer fix (2026-07-12): the safety scorer now values quality_bonus, so
// the quality choice must carry a REAL price tag (-$16k) for the loyal
// (money-conservative) band to stay on 'safe' while committed still judges the
// spend worth it — mirrors the golden-master AUTONOMOUS_MEETING_POOL.
const AR_CHOICES: DialogueChoice[] = [
  { id: 'safe', label: 'Safe', effects_immediate: {}, effects_delayed: { reputation: 1 } } as any,
  { id: 'quality', label: 'Quality', effects_immediate: { creative_capital: -1, money: -16000 }, effects_delayed: { quality_bonus: 4 } } as any,
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
  // Two gamble-free choices that TIE in the loyal (safety) band — both spends
  // sit beyond the money_spend_cap ($20k-worth of score) so they score
  // identically (loyal-scorer fix: smaller spends now differentiate) — but
  // differ in risk (raw money spend). Mood then decides.
  const TIE_CHOICES: DialogueChoice[] = [
    { id: 'cheap', label: 'Cheap', effects_immediate: { money: -25000 }, effects_delayed: {} } as any,
    { id: 'pricey', label: 'Pricey', effects_immediate: { money: -40000 }, effects_delayed: {} } as any,
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

describe('loyal-scorer fix (2026-07-12): loyal picks are no longer in-fiction perverse (real actions.json meetings)', () => {
  const actionsData = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'data/actions.json'), 'utf8'),
  );
  function meetingChoices(id: string): DialogueChoice[] {
    const meeting = (actionsData.weekly_actions as any[]).find((a) => a.id === id);
    expect(meeting, `meeting ${id} present in data/actions.json`).toBeTruthy();
    return meeting.choices as DialogueChoice[];
  }
  const loyalPick = (id: string, roleId: string) =>
    pick(meetingChoices(id), 75, 50, roleId, `g-week1-${roleId}-autonomous`)?.id;

  it('cco_timeline: loyal cco no longer rushes the release for $1k (quality -5) — picks standard', () => {
    const picked = loyalPick('cco_timeline', 'cco');
    expect(picked).not.toBe('rush'); // pre-fix perverse pick (money clamp + quality blindness)
    expect(picked).toBe('standard');
  });

  it('cco_mood_crater_intervention: loyal cco no longer pushes a cratered artist through (mood -3) — clears the schedule', () => {
    const picked = loyalPick('cco_mood_crater_intervention', 'cco');
    expect(picked).not.toBe('push_through'); // pre-fix perverse pick (artist_mood blindness)
    expect(picked).toBe('clear_the_schedule');
  });

  it('platform_exclusive_bidding: loyal cmo no longer grabs the $40k check just because it is free money — refuses the windows', () => {
    // v3 Sam-pool replacement for the removed cmo_viral case: take_the_check is a
    // +$40k windfall that a money-clamp scorer would over-value, but it guts
    // artist_mood (−6) and awareness (−4). The loyal-scorer fix correctly avoids
    // it and picks the reputation/artist-positive refuse_windows.
    const picked = loyalPick('platform_exclusive_bidding', 'cmo');
    expect(picked).not.toBe('take_the_check'); // free-money trap the pre-fix clamp would grab
    expect(picked).toBe('refuse_windows');
  });

  it('money de-degeneracy: a -$1,500 spend no longer scores identically to a -$20,000 spend', () => {
    const small = { id: 's', label: 's', effects_immediate: { money: -1500 }, effects_delayed: {} } as any;
    const big = { id: 'b', label: 'b', effects_immediate: { money: -20000 }, effects_delayed: {} } as any;
    expect(scoreChoiceSafety(small)).toBeGreaterThan(scoreChoiceSafety(big));
  });

  it('soft stats count: quality_bonus / artist_mood / awareness_boost / press_momentum move the safety score', () => {
    const base = { id: 'n', label: 'n', effects_immediate: {}, effects_delayed: {} } as any;
    for (const key of ['quality_bonus', 'artist_mood', 'awareness_boost', 'press_momentum']) {
      const up = { ...base, effects_delayed: { [key]: 2 } };
      const down = { ...base, effects_delayed: { [key]: -2 } };
      expect(scoreChoiceSafety(up), `${key} +`).toBeGreaterThan(scoreChoiceSafety(base));
      expect(scoreChoiceSafety(down), `${key} -`).toBeLessThan(scoreChoiceSafety(base));
    }
  });

  it('gamble aversion is intact: a variance_up choice still loses to any gamble-free alternative', () => {
    const gamble = { id: 'g', label: 'g', effects_immediate: {}, effects_delayed: { variance_up: 1, quality_bonus: 10 } } as any;
    const dull = { id: 'd', label: 'd', effects_immediate: { money: -5000 }, effects_delayed: {} } as any;
    expect(pick([gamble, dull], 75, 50)?.id).toBe('d');
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
