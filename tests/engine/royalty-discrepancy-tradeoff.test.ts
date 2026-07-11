/**
 * C76 — royalty_discrepancy side event: audit vs negotiate must stay a REAL trade.
 *
 * Before this fix, 'negotiate' (+2000 money, nothing else) weakly dominated
 * 'audit' (−1000 money now, +500 back later — a strictly-worse pure-money play).
 * The fix re-authors 'audit' as cash-now vs standing: pay −500 immediately, gain
 * +2 reputation later. Neither choice may dominate the other.
 *
 * SCOPE (deliberate, per C76's documentation): 'ignore' remains structurally
 * dominated BY DESIGN — it is the "do nothing, eat the downside" beat, and the
 * events lint intentionally omits a dominance check (that omission is
 * load-bearing). This test polices ONLY the audit/negotiate pair; do NOT extend
 * it into a blanket events.json dominance sweep.
 *
 * Value model mirrors tests/engine/meeting-dominance.test.ts (PR-8): a choice's
 * value per key = effects_immediate[key] + effects_delayed[key]; weak dominance =
 * >= on every payoff axis and > on at least one.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

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

function weaklyDominates(a: Vec, b: Vec): boolean {
  let strictlyBetterSomewhere = false;
  for (const k of PAYOFF_KEYS) {
    const av = a[k] || 0;
    const bv = b[k] || 0;
    if (av < bv) return false;
    if (av > bv) strictlyBetterSomewhere = true;
  }
  return strictlyBetterSomewhere;
}

const events = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'events.json'), 'utf-8')
);
const event = (events.events || events.side_events || []).find(
  (e: any) => e.id === 'royalty_discrepancy'
);

describe('royalty_discrepancy — audit/negotiate non-dominance tripwire (C76)', () => {
  it('the event and both choices exist', () => {
    expect(event, 'royalty_discrepancy missing from events.json').toBeTruthy();
    expect(event.choices.find((c: any) => c.id === 'audit')).toBeTruthy();
    expect(event.choices.find((c: any) => c.id === 'negotiate')).toBeTruthy();
  });

  it('audit is authored as cash-now vs standing (negative money, positive reputation)', () => {
    const audit = choiceVector(event.choices.find((c: any) => c.id === 'audit'));
    expect(audit.money ?? 0).toBeLessThan(0);
    expect(audit.reputation ?? 0).toBeGreaterThan(0);
  });

  it('neither audit nor negotiate weakly dominates the other', () => {
    const audit = choiceVector(event.choices.find((c: any) => c.id === 'audit'));
    const negotiate = choiceVector(event.choices.find((c: any) => c.id === 'negotiate'));
    expect(weaklyDominates(negotiate, audit), 'negotiate must not dominate audit (the pre-C76 bug)').toBe(false);
    expect(weaklyDominates(audit, negotiate), 'audit must not dominate negotiate').toBe(false);
  });
});
