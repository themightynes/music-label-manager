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
  selectTopOptions,
  appendCeoFillerOption,
  getChoiceCreativeCapitalCost,
  type AutoSelectOption,
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

  it('exec-meetings-revival PR-7 (C5): award_chances counts as a guaranteed-positive, not a gamble — AUTO prefers it over a neutral choice', () => {
    const neutral = choice('neutral', {});
    const prestige = choice('prestige', { effects_delayed: { award_chances: 2 } });

    const picked = pickSafestChoice([neutral, prestige]);
    expect(picked?.id).toBe('prestige');
  });

  it('award_chances is NOT penalized like a gamble key even at large magnitude', () => {
    const bigPrestige = choice('big-prestige', { effects_delayed: { award_chances: 5 } });
    const smallGamble = choice('small-gamble', { effects_delayed: { variance_up: 1 } });

    // A gamble of ANY magnitude must lose to a guaranteed prestige gain.
    const picked = pickSafestChoice([smallGamble, bigPrestige]);
    expect(picked?.id).toBe('big-prestige');
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

  it('exec-meetings-revival PR-7 (C5): a meeting with an award_chances choice and no gamble never routes AUTO into a gamble', () => {
    // Mirrors the real cmo_awards meeting shape post-normalization. This pins
    // that award_chances participates in scoring as ordinary guaranteed value
    // (money/reputation/creative_capital weighting is unchanged by this PR —
    // AUTO's cost-vs-prestige tradeoff logic is out of scope here), while
    // confirming none of these gamble-free choices are ever penalized as a risk.
    const meeting: RoleMeeting = {
      id: 'cmo_awards',
      prompt: 'Award season is coming.',
      target_scope: 'global',
      choices: [
        choice('full_campaign', { effects_immediate: { money: -20000 }, effects_delayed: { award_chances: 5 } }),
        choice('grassroots_push', {
          effects_immediate: { money: -5000, creative_capital: -1 },
          effects_delayed: { award_chances: 3 },
        }),
        choice('skip_awards', { effects_immediate: { money: 3000 }, effects_delayed: { commercial_focus: 1, award_chances: -1 } }),
      ],
    };

    const options = prepareAutoSelectOptions([executive], { cmo: [meeting] });
    expect(options).toHaveLength(1);
    // Whichever choice wins, it must be one of the three real (gamble-free) ids.
    expect(['full_campaign', 'grassroots_push', 'skip_awards']).toContain(options[0].choice.id);
  });
});

describe('prepareAutoSelectOptions — AR-busy exclusion (playtest bug: AUTO grabbed Marcus while the A&R office slot was in use)', () => {
  const arExec: Executive = { id: 'e-ar', role: 'head_ar', level: 1, mood: 50, loyalty: 50 };
  const cmoExec: Executive = { id: 'e-cmo', role: 'cmo', level: 1, mood: 50, loyalty: 50 };
  const meeting = (id: string, role: string): RoleMeeting => ({
    id,
    prompt: id,
    target_scope: 'global',
    role_id: role,
    choices: [choice(`${id}_c1`, { effects_immediate: { reputation: 1 } })],
  } as RoleMeeting);

  const meetingsByRole = {
    head_ar: [meeting('ar_meeting', 'head_ar')],
    cmo: [meeting('cmo_meeting', 'cmo')],
  };

  it('excludes head_ar when arOfficeSlotUsed=true', () => {
    const options = prepareAutoSelectOptions([arExec, cmoExec], meetingsByRole, {
      arOfficeSlotUsed: true,
    });
    expect(options.some((o) => o.executive.role === 'head_ar')).toBe(false);
    // Other execs are unaffected.
    expect(options.some((o) => o.executive.role === 'cmo')).toBe(true);
  });

  it('includes head_ar when arOfficeSlotUsed=false', () => {
    const options = prepareAutoSelectOptions([arExec, cmoExec], meetingsByRole, {
      arOfficeSlotUsed: false,
    });
    expect(options.some((o) => o.executive.role === 'head_ar')).toBe(true);
  });

  it('includes head_ar when the config is absent (default = current behavior, existing tests stay green)', () => {
    const options = prepareAutoSelectOptions([arExec, cmoExec], meetingsByRole);
    expect(options.some((o) => o.executive.role === 'head_ar')).toBe(true);
  });

  // Playtest round-1 (2026-07-05): Nes picked Marcus manually, hit AUTO for
  // the remaining slots, and AUTO proposed Marcus again — execs with a queued
  // action this week must never be re-proposed (mirrors the manual UI's
  // isExecutiveUsed disable).
  it('excludes execs already used this week via usedExecutiveRoles', () => {
    const options = prepareAutoSelectOptions([arExec, cmoExec], meetingsByRole, {
      usedExecutiveRoles: ['head_ar'],
    });
    expect(options.some((o) => o.executive.role === 'head_ar')).toBe(false);
    expect(options.some((o) => o.executive.role === 'cmo')).toBe(true);
  });

  it('empty usedExecutiveRoles excludes nobody', () => {
    const options = prepareAutoSelectOptions([arExec, cmoExec], meetingsByRole, {
      usedExecutiveRoles: [],
    });
    expect(options.some((o) => o.executive.role === 'head_ar')).toBe(true);
    expect(options.some((o) => o.executive.role === 'cmo')).toBe(true);
  });

  it('used-roles and AR-busy exclusions compose', () => {
    const options = prepareAutoSelectOptions([arExec, cmoExec], meetingsByRole, {
      arOfficeSlotUsed: true,
      usedExecutiveRoles: ['cmo'],
    });
    expect(options).toEqual([]);
  });
});

describe('getChoiceCreativeCapitalCost', () => {
  it('reports the spend magnitude of a CC-negative choice', () => {
    expect(getChoiceCreativeCapitalCost(choice('c', { effects_immediate: { creative_capital: -2 } }))).toBe(2);
  });

  it('sums creative_capital across immediate and delayed', () => {
    const c = choice('c', {
      effects_immediate: { creative_capital: -1 },
      effects_delayed: { creative_capital: -2 },
    });
    expect(getChoiceCreativeCapitalCost(c)).toBe(3);
  });

  it('a CC-granting choice costs 0', () => {
    expect(getChoiceCreativeCapitalCost(choice('c', { effects_immediate: { creative_capital: 3 } }))).toBe(0);
  });

  it('a choice with no creative_capital costs 0', () => {
    expect(getChoiceCreativeCapitalCost(choice('c', { effects_immediate: { money: -5000 } }))).toBe(0);
  });
});

describe('pickSafestChoice — budget awareness (playtest bug #11)', () => {
  it('excludes a choice that would overdraw the CC budget', () => {
    const cheap = choice('cheap', { effects_immediate: { creative_capital: -1 } });
    const expensive = choice('expensive', { effects_immediate: { creative_capital: -3, quality_bonus: 10 } });

    // budgetLeft = 1: only the -1 choice is affordable.
    const picked = pickSafestChoice([expensive, cheap], 1);
    expect(picked?.id).toBe('cheap');
  });

  it('falls back to the least-cost choice when NONE are affordable', () => {
    const bigCost = choice('big', { effects_immediate: { creative_capital: -5 } });
    const smallCost = choice('small', { effects_immediate: { creative_capital: -2 } });

    // budgetLeft = 0: neither is affordable → pick the least-cost (smallest spend).
    const picked = pickSafestChoice([bigCost, smallCost], 0);
    expect(picked?.id).toBe('small');
  });

  it('with an unlimited budget, behaves exactly like the unbudgeted risk-averse pick', () => {
    const gamble = choice('risky', { effects_delayed: { variance_up: 2 } });
    const safe = choice('safe', { effects_delayed: { press_momentum: 1 } });
    expect(pickSafestChoice([gamble, safe], Infinity)?.id).toBe('safe');
    expect(pickSafestChoice([gamble, safe])?.id).toBe('safe');
  });
});

describe('selectTopOptions — never overdraws Creative Capital (playtest bug #11)', () => {
  const exec = (role: string, mood = 50): Executive => ({ id: `exec-${role}`, role, level: 1, mood, loyalty: 50 });

  function meetingWith(id: string, role: string, choices: DialogueChoice[]): RoleMeeting {
    return { id, prompt: id, target_scope: 'global', role_id: role, choices } as RoleMeeting;
  }

  it('the committed set never spends more CC than the player has (budget = 1)', () => {
    // Two execs, each with a meeting whose safest choice costs 2 CC. With only
    // 1 CC of budget and 2 slots, the naive "safest each" set would spend 4 CC.
    const arMeeting = meetingWith('ar', 'head_ar', [
      choice('ar_free', { effects_immediate: { money: -1000 } }),
      choice('ar_costly', { effects_immediate: { creative_capital: -2, quality_bonus: 4 } }),
    ]);
    const cmoMeeting = meetingWith('cmo', 'cmo', [
      choice('cmo_costly', { effects_immediate: { creative_capital: -2 }, effects_delayed: { press_momentum: 2 } }),
    ]);

    const options = prepareAutoSelectOptions(
      [exec('head_ar'), exec('cmo')],
      { head_ar: [arMeeting], cmo: [cmoMeeting] },
    );

    const remainingCC = 1;
    const picked = selectTopOptions(options, 2, remainingCC);

    const totalCost = picked.reduce((sum, o) => sum + getChoiceCreativeCapitalCost(o.choice), 0);
    expect(totalCost).toBeLessThanOrEqual(remainingCC);
  });

  it('downgrades an expensive safest-choice to a cheaper affordable one instead of overdrawing', () => {
    // The safest overall choice costs 2 CC; a cheaper (free) safe alternative
    // exists. With budget 1, AUTO must pick the free one, not the 2-CC one.
    const meeting = meetingWith('ar', 'head_ar', [
      choice('costly_safe', { effects_immediate: { creative_capital: -2 }, effects_delayed: { quality_bonus: 5 } }),
      choice('free_safe', { effects_immediate: { money: -500 }, effects_delayed: { quality_bonus: 3 } }),
    ]);

    const options = prepareAutoSelectOptions([exec('head_ar')], { head_ar: [meeting] });
    const picked = selectTopOptions(options, 1, 1);

    expect(picked).toHaveLength(1);
    expect(picked[0].choice.id).toBe('free_safe');
    expect(getChoiceCreativeCapitalCost(picked[0].choice)).toBeLessThanOrEqual(1);
  });

  it('with a zero CC budget, only free choices are committed', () => {
    const freeMeeting = meetingWith('ar', 'head_ar', [
      choice('ar_free', { effects_delayed: { quality_bonus: 2 } }),
    ]);
    const paidMeeting = meetingWith('cmo', 'cmo', [
      choice('cmo_paid', { effects_immediate: { creative_capital: -1 } }),
    ]);

    const options = prepareAutoSelectOptions(
      [exec('head_ar'), exec('cmo')],
      { head_ar: [freeMeeting], cmo: [paidMeeting] },
    );

    const picked = selectTopOptions(options, 2, 0);
    const totalCost = picked.reduce((sum, o) => sum + getChoiceCreativeCapitalCost(o.choice), 0);
    expect(totalCost).toBe(0);
    // The free meeting's choice is still selected.
    expect(picked.some((o) => o.choice.id === 'ar_free')).toBe(true);
  });

  it('omitting the budget preserves the old score-then-slice behavior', () => {
    const m1 = meetingWith('ar', 'head_ar', [choice('a', { effects_immediate: { creative_capital: -5 } })]);
    const m2 = meetingWith('cmo', 'cmo', [choice('b', { effects_immediate: { creative_capital: -5 } })]);

    // No budget arg → both expensive choices are still selected (unbudgeted).
    const options = prepareAutoSelectOptions([exec('head_ar'), exec('cmo')], { head_ar: [m1], cmo: [m2] });
    const picked = selectTopOptions(options, 2);
    expect(picked).toHaveLength(2);
  });
});

describe('appendCeoFillerOption — AUTO fills the 4th slot from the CEO lane (playtest 2026-07-25)', () => {
  const exec = (role: string, mood = 50): Executive => ({ id: `exec-${role}`, role, level: 1, mood, loyalty: 50 });

  function meetingWith(id: string, role: string, choices: DialogueChoice[]): RoleMeeting {
    return { id, prompt: id, target_scope: 'global', role_id: role, choices } as RoleMeeting;
  }

  const ceoMeetings = [meetingWith('ceo_m', 'ceo', [choice('ceo_safe', { effects_immediate: { money: -500 } })])];

  function execOption(role: string): AutoSelectOption {
    const m = meetingWith(`${role}_m`, role, [choice(`${role}_safe`)]);
    return { executive: exec(role), meeting: m, choice: m.choices![0] as DialogueChoice, score: 100 };
  }

  it('appends a CEO option when scored picks leave a slot unfilled', () => {
    const selected = [execOption('head_ar'), execOption('cmo'), execOption('cco')];
    const result = appendCeoFillerOption(selected, 4, ceoMeetings);
    expect(result).toHaveLength(4);
    expect(result[3].executive.role).toBe('ceo');
    expect(result[3].meeting.id).toBe('ceo_m');
  });

  it('does nothing when all slots are already filled (CEO never competes)', () => {
    const selected = [execOption('head_ar'), execOption('cmo'), execOption('cco'), execOption('head_distribution')];
    const result = appendCeoFillerOption(selected, 4, ceoMeetings);
    expect(result).toHaveLength(4);
    expect(result.every((o) => o.executive.role !== 'ceo')).toBe(true);
  });

  it('skips the CEO when the ceo role already has a queued action', () => {
    const result = appendCeoFillerOption([execOption('cmo')], 2, ceoMeetings, Infinity, ['ceo']);
    expect(result).toHaveLength(1);
  });

  it('skips a user_selected-only CEO pool (needs the player, not AUTO)', () => {
    const userSelectedOnly = [{
      ...meetingWith('ceo_pick', 'ceo', [choice('c1')]),
      target_scope: 'user_selected',
    } as RoleMeeting];
    const result = appendCeoFillerOption([execOption('cmo')], 2, userSelectedOnly);
    expect(result).toHaveLength(1);
  });

  it('never overdraws the remaining Creative Capital budget', () => {
    const costlyCeo = [meetingWith('ceo_costly', 'ceo', [
      choice('ceo_cc', { effects_immediate: { creative_capital: -2 } }),
    ])];
    const spentTwo: AutoSelectOption = {
      ...execOption('cmo'),
      choice: choice('cmo_cc', { effects_immediate: { creative_capital: -2 } }),
    };
    // Budget 3, already spent 2 → only 1 left; the CEO's cheapest choice costs 2.
    const result = appendCeoFillerOption([spentTwo], 2, costlyCeo, 3);
    expect(result).toHaveLength(1);

    // Budget 4 → 2 left; now it fits.
    const result2 = appendCeoFillerOption([spentTwo], 2, costlyCeo, 4);
    expect(result2).toHaveLength(2);
    expect(result2[1].executive.role).toBe('ceo');
  });

  it('is idempotent: never appends a second CEO option', () => {
    const once = appendCeoFillerOption([execOption('cmo')], 3, ceoMeetings);
    const twice = appendCeoFillerOption(once, 3, ceoMeetings);
    expect(twice.filter((o) => o.executive.role === 'ceo')).toHaveLength(1);
  });
});

describe('C75 — AUTO budgets against REMAINING CC (raw CC minus already-queued commitments)', () => {
  // The seam contract: ExecutiveMeetings prices this week's queued choices via
  // getChoiceCreativeCapitalCost and passes `max(0, rawCC - committed)` as the
  // budget. These tests exercise that composed flow end-to-end so the module's
  // budget parameter is pinned to the remaining-CC notion, not the raw CC.
  const exec = (role: string): Executive => ({ id: `exec-${role}`, role, level: 1, mood: 50, loyalty: 50 });

  function meetingWith(id: string, role: string, choices: DialogueChoice[]): RoleMeeting {
    return { id, prompt: id, target_scope: 'global', role_id: role, choices } as RoleMeeting;
  }

  // The queued manual pick: a 2-CC choice already committed this week.
  const queuedChoice = choice('queued_cc2', { effects_immediate: { creative_capital: -2 } });

  function remainingBudget(rawCC: number): number {
    const committed = getChoiceCreativeCapitalCost(queuedChoice);
    return Math.max(0, rawCC - committed);
  }

  it('with 2 raw CC and a queued 2-CC choice, AUTO cannot commit another CC-costing choice', () => {
    // Pre-fix repro: raw CC (2) fed straight to AUTO let a second 2-CC pick
    // through; the engine's Math.max(0, …) clamp silently ate the overdraw.
    const cmoMeeting = meetingWith('cmo_m', 'cmo', [
      choice('cmo_cc2', { effects_immediate: { creative_capital: -2, money: -1000 } }),
    ]);
    const options = prepareAutoSelectOptions([exec('cmo')], { cmo: [cmoMeeting] });

    const picked = selectTopOptions(options, 2, remainingBudget(2));
    expect(picked).toHaveLength(0);
  });

  it('with remaining CC 0, AUTO still fills slots from free choices (downgrade, not overdraw)', () => {
    const cmoMeeting = meetingWith('cmo_m', 'cmo', [
      choice('cmo_cc2', { effects_immediate: { creative_capital: -2 } }),
      choice('cmo_free', { effects_immediate: { money: -800 } }),
    ]);
    const options = prepareAutoSelectOptions([exec('cmo')], { cmo: [cmoMeeting] });

    const picked = selectTopOptions(options, 2, remainingBudget(2));
    expect(picked).toHaveLength(1);
    expect(picked[0].choice.id).toBe('cmo_free');
  });

  it('the CEO filler also respects the remaining-CC budget net of queued commitments', () => {
    const ceoPool = [meetingWith('ceo_m', 'ceo', [
      choice('ceo_cc1', { effects_immediate: { creative_capital: -1 } }),
    ])];

    // Raw 3 CC, queued 2 → remaining 1: the 1-CC CEO filler just fits.
    const fits = appendCeoFillerOption([], 1, ceoPool, remainingBudget(3));
    expect(fits).toHaveLength(1);
    expect(fits[0].executive.role).toBe('ceo');

    // Raw 2 CC, queued 2 → remaining 0: the filler must NOT overdraw.
    const blocked = appendCeoFillerOption([], 1, ceoPool, remainingBudget(2));
    expect(blocked).toHaveLength(0);
  });

  it('remaining budget floors at 0 even when queued commitments exceed raw CC', () => {
    // Defensive: a stale queue larger than current CC must not go negative and
    // must still block any CC-costing pick.
    expect(remainingBudget(1)).toBe(0);
    const cmoMeeting = meetingWith('cmo_m', 'cmo', [
      choice('cmo_cc1', { effects_immediate: { creative_capital: -1 } }),
    ]);
    const options = prepareAutoSelectOptions([exec('cmo')], { cmo: [cmoMeeting] });
    expect(selectTopOptions(options, 1, remainingBudget(1))).toHaveLength(0);
  });
});
