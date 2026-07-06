/**
 * Unit tests for the client-side lint mirror (content-editor slice 2, spec §2.1/§2.2f).
 *
 * These are the substance of the slice's test plan: each hard-block class must fire,
 * a clean fixture must return [], and the canonical effect-key list must be a drift
 * guard against the old hardcoded-6-key bug.
 */
import { describe, it, expect } from 'vitest';
import { LIVE_EFFECT_KEYS } from '@shared/engine/processors/ActionProcessor';
import type { WeeklyAction } from '@shared/api/contracts';
import { CANONICAL_EFFECT_KEYS, lintMeetings } from '@/admin/contentLint';

function baseAction(overrides: Partial<WeeklyAction> = {}): WeeklyAction {
  return {
    id: 'action_1',
    name: 'Test Action',
    type: 'role_meeting',
    icon: 'fas fa-circle',
    description: 'desc',
    role_id: 'ceo',
    meeting_id: 'meeting_1',
    category: 'business',
    target_scope: 'global',
    prompt: 'prompt',
    choices: [
      {
        id: 'choice_1',
        label: 'Choice 1',
        effects_immediate: { money: 100 },
        effects_delayed: {},
      },
    ],
    details: {} as any,
    recommendations: {} as any,
    ...overrides,
  } as WeeklyAction;
}

describe('contentLint — CANONICAL_EFFECT_KEYS', () => {
  it('equals LIVE_EFFECT_KEYS union executive_mood (drift guard)', () => {
    const expected = new Set([...Array.from(LIVE_EFFECT_KEYS), 'executive_mood']);
    expect(new Set(CANONICAL_EFFECT_KEYS)).toEqual(expected);
  });
});

describe('lintMeetings — clean fixture', () => {
  it('returns [] for a valid single action/choice', () => {
    const issues = lintMeetings([baseAction()]);
    expect(issues).toEqual([]);
  });

  it('returns [] for a valid action with requires and reactive_trigger set', () => {
    const action = baseAction({
      requires: ['artist_signed', 'music_exists'] as any,
      reactive_trigger: 'chart_debut' as any,
    });
    expect(lintMeetings([action])).toEqual([]);
  });
});

describe('lintMeetings — hard-block classes', () => {
  it('flags a non-canonical effect key', () => {
    const action = baseAction({
      choices: [
        {
          id: 'choice_1',
          label: 'Choice 1',
          effects_immediate: { totally_made_up_key: 5 } as any,
          effects_delayed: {},
        },
      ],
    });
    const issues = lintMeetings([action]);
    expect(issues.some((i) => i.message.includes('totally_made_up_key'))).toBe(true);
  });

  it('flags a requires entry not in RELEVANCE_TAGS', () => {
    const action = baseAction({ requires: ['not_a_real_tag'] as any });
    const issues = lintMeetings([action]);
    expect(issues.some((i) => i.message.includes('not_a_real_tag'))).toBe(true);
  });

  it('flags a reactive_trigger not in HAPPENING_TYPES', () => {
    const action = baseAction({ reactive_trigger: 'not_a_real_trigger' as any });
    const issues = lintMeetings([action]);
    expect(issues.some((i) => i.message.includes('not_a_real_trigger'))).toBe(true);
  });

  it('flags an empty choices array', () => {
    const action = baseAction({ choices: [] });
    const issues = lintMeetings([action]);
    expect(issues.some((i) => i.message.includes('no choices'))).toBe(true);
  });

  it('flags duplicate action ids', () => {
    const a1 = baseAction({ id: 'dup_id' });
    const a2 = baseAction({ id: 'dup_id' });
    const issues = lintMeetings([a1, a2]);
    expect(issues.some((i) => i.message.includes('Duplicate action id'))).toBe(true);
  });

  it('flags duplicate choice ids within an action', () => {
    const action = baseAction({
      choices: [
        { id: 'same', label: 'A', effects_immediate: {}, effects_delayed: {} },
        { id: 'same', label: 'B', effects_immediate: {}, effects_delayed: {} },
      ],
    });
    const issues = lintMeetings([action]);
    expect(issues.some((i) => i.message.includes('Duplicate choice id'))).toBe(true);
  });

  it('flags a weakly-dominant choice (naming both choices)', () => {
    const action = baseAction({
      choices: [
        {
          id: 'good',
          label: 'Good Choice',
          effects_immediate: { money: 100, reputation: 5 },
          effects_delayed: {},
        },
        {
          id: 'bad',
          label: 'Bad Choice',
          effects_immediate: { money: 50, reputation: 5 },
          effects_delayed: {},
        },
      ],
    });
    const issues = lintMeetings([action]);
    const dominanceIssue = issues.find((i) => i.message.includes('never worth picking'));
    expect(dominanceIssue).toBeTruthy();
    expect(dominanceIssue!.message).toContain('Good Choice');
    expect(dominanceIssue!.message).toContain('Bad Choice');
  });

  it('does NOT flag a pair that differs only on the variance/excluded axes', () => {
    const action = baseAction({
      choices: [
        {
          id: 'safe',
          label: 'Safe Choice',
          effects_immediate: { money: 100, variance_up: 0 },
          effects_delayed: {},
        },
        {
          id: 'risky',
          label: 'Risky Choice',
          effects_immediate: { money: 100, variance_up: 10 },
          effects_delayed: {},
        },
      ],
    });
    const issues = lintMeetings([action]);
    expect(issues.filter((i) => i.message.includes('never worth picking'))).toEqual([]);
  });
});
