import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Exec-meetings-revival PR-8 — NO-DOMINANT-CHOICE regression test.
 *
 * A choice "weakly dominates" another when it is at least as good on EVERY payoff
 * axis and strictly better on at least one — i.e. a rational player would never pick
 * the dominated one. Historically six meetings had a free-money trap choice that
 * strictly dominated (rush, release_as_is, skip_awards, spotify_exclusive,
 * apple_exclusive, digital_focus). PR-8's trap fixes restore real downsides so no
 * choice dominates within its meeting.
 *
 * VALUE MODEL (deliberately simple, per spec):
 *  - A choice's value on each key = sum of effects_immediate[key] + effects_delayed[key].
 *  - money is compared as-authored; every other payoff key on its own point scale.
 *  - PAYOFF axes (bigger = better for the player): money, reputation, creative_capital,
 *    artist_mood, artist_energy, artist_popularity, press_story_flag, press_momentum,
 *    quality_bonus, awareness_boost, award_chances, executive_mood.
 *  - variance_up and rep_swing are NEITHER payoff nor cost — they are EXCLUDED from the
 *    dominance axes. But a choice that differs from another ONLY by a variance axis is
 *    genuinely differentiated (a risk/no-risk fork), so it does NOT count as dominated.
 *
 * DOMINANCE RULE: choice A weakly-dominates B iff
 *   (1) A >= B on every payoff axis, AND
 *   (2) A > B on at least one payoff axis, AND
 *   (3) A and B are identical on every EXCLUDED (variance) axis
 *       — if they differ on a variance axis, the risk profile differentiates them.
 */

const PAYOFF_KEYS = [
  'money',
  'reputation',
  'creative_capital',
  'artist_mood',
  'artist_energy',
  'artist_popularity',
  'press_story_flag',
  'press_momentum',
  'quality_bonus',
  'awareness_boost',
  'award_chances',
  'executive_mood',
] as const;

const EXCLUDED_KEYS = ['variance_up', 'rep_swing'] as const;

type Vec = Record<string, number>;

function choiceVector(choice: any): Vec {
  const v: Vec = {};
  for (const block of ['effects_immediate', 'effects_delayed'] as const) {
    const eff = choice[block] || {};
    for (const [k, val] of Object.entries(eff)) {
      if (typeof val === 'number') v[k] = (v[k] || 0) + val;
    }
  }
  return v;
}

/** Does A weakly-dominate B under the model above? */
function weaklyDominates(a: Vec, b: Vec): boolean {
  // (3) differ on any excluded/variance axis => differentiated, not dominance.
  for (const k of EXCLUDED_KEYS) {
    if ((a[k] || 0) !== (b[k] || 0)) return false;
  }
  let strictlyBetterSomewhere = false;
  for (const k of PAYOFF_KEYS) {
    const av = a[k] || 0;
    const bv = b[k] || 0;
    if (av < bv) return false; // A worse on some payoff axis => not dominant
    if (av > bv) strictlyBetterSomewhere = true;
  }
  return strictlyBetterSomewhere;
}

const actions = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'actions.json'), 'utf-8')
);
const meetings: any[] = actions.weekly_actions;

function meeting(id: string): any {
  const m = meetings.find((x) => x.id === id);
  if (!m) throw new Error('no meeting ' + id);
  return m;
}

/** Returns list of "A dominates B" violation strings for a meeting. */
function dominanceViolations(m: any): string[] {
  const choices = (m.choices || []).map((c: any) => ({ id: c.id, vec: choiceVector(c) }));
  const out: string[] = [];
  for (const a of choices) {
    for (const b of choices) {
      if (a.id === b.id) continue;
      if (weaklyDominates(a.vec, b.vec)) {
        out.push(`${m.id}: '${a.id}' weakly dominates '${b.id}' (a=${JSON.stringify(a.vec)} b=${JSON.stringify(b.vec)})`);
      }
    }
  }
  return out;
}

describe('Meeting choice dominance — no choice weakly dominates a sibling (PR-8)', () => {
  it('NONE of the 20 meetings contain a weakly-dominant choice', () => {
    const violations: string[] = [];
    for (const m of meetings) violations.push(...dominanceViolations(m));
    expect(violations, violations.join('\n')).toEqual([]);
  });

  // The six historical free-money traps must specifically be non-dominant.
  const TRAP_MEETINGS: Record<string, string> = {
    cco_timeline: 'rush',
    cco_budget_crisis: 'release_as_is',
    cmo_awards: 'skip_awards',
    cmo_platform_exclusive: 'spotify_exclusive',
    // apple_exclusive lives in the same meeting as spotify_exclusive
    distribution_supply: 'digital_focus',
  };

  for (const [meetingId, trapChoiceId] of Object.entries(TRAP_MEETINGS)) {
    it(`trap '${trapChoiceId}' in ${meetingId} does not dominate any sibling`, () => {
      const m = meeting(meetingId);
      const trap = m.choices.find((c: any) => c.id === trapChoiceId);
      expect(trap, `missing trap choice ${trapChoiceId}`).toBeTruthy();
      const trapVec = choiceVector(trap);
      for (const other of m.choices) {
        if (other.id === trapChoiceId) continue;
        expect(
          weaklyDominates(trapVec, choiceVector(other)),
          `${trapChoiceId} should NOT dominate ${other.id}`
        ).toBe(false);
      }
    });
  }

  it('apple_exclusive (cmo_platform_exclusive) does not dominate any sibling', () => {
    const m = meeting('cmo_platform_exclusive');
    const apple = m.choices.find((c: any) => c.id === 'apple_exclusive');
    const appleVec = choiceVector(apple);
    for (const other of m.choices) {
      if (other.id === 'apple_exclusive') continue;
      expect(
        weaklyDominates(appleVec, choiceVector(other)),
        `apple_exclusive should NOT dominate ${other.id}`
      ).toBe(false);
    }
  });

  it("distribution_pitch's three choices are pairwise distinct (non-dominant)", () => {
    const m = meeting('distribution_pitch');
    expect(m.choices).toHaveLength(3);
    expect(dominanceViolations(m)).toEqual([]);
    // And prove they are genuinely different vectors (not identical no-ops).
    const vecs = m.choices.map((c: any) => JSON.stringify(choiceVector(c)));
    expect(new Set(vecs).size).toBe(3);
  });
});
