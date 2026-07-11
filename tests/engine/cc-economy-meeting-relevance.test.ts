/**
 * Volatility-economy slice 4 — Creative Capital economy + meeting relevance.
 *
 * Pure tuning (no new engine mechanic), so these are value guards:
 *  - CC-granting choice amounts in data/actions.json raised ~50% (round up,
 *    min +1). The only two POSITIVE creative_capital grants are in the
 *    "creative_recording" meeting (quick_one 3→5, take_time 6→9). No other
 *    effect value touched.
 *  - weekly_meeting_selection.relevance_weight raised 2.0 → 3.0 (window unchanged).
 *
 * The data-lint (effect keys) + meeting-dominance suites are the real guards for
 * the actions.json edit; this file pins the intended NUMBERS so a future edit that
 * silently reverts the tuning trips a test.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const actions = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'actions.json'), 'utf-8'),
);
const progression = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'balance', 'progression.json'), 'utf-8'),
);

function findChoice(meetingId: string, choiceId: string): any {
  const action = actions.weekly_actions.find((a: any) => a.meeting_id === meetingId);
  return action?.choices?.find((c: any) => c.id === choiceId);
}

describe('slice 4 — creative capital grant amounts (actions.json)', () => {
  it('quick_one now grants 5 creative_capital (was 3, +~50% round up)', () => {
    const choice = findChoice('creative_recording', 'quick_one');
    expect(choice).toBeDefined();
    expect(choice.effects_delayed.creative_capital).toBe(5);
    // Sibling effects untouched.
    expect(choice.effects_immediate.artist_mood).toBe(10);
    expect(choice.effects_immediate.money).toBe(-3500);
  });

  it('take_time now grants 9 creative_capital (was 6, +~50%)', () => {
    const choice = findChoice('creative_recording', 'take_time');
    expect(choice).toBeDefined();
    expect(choice.effects_delayed.creative_capital).toBe(9);
    // Sibling effects untouched.
    expect(choice.effects_delayed.artist_mood).toBe(10);
    expect(choice.effects_immediate.money).toBe(-10000);
  });

  it('every POSITIVE creative_capital grant in actions.json was raised (none left at an un-tuned small value)', () => {
    const positives: number[] = [];
    const walk = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      for (const [k, v] of Object.entries(obj)) {
        if (k === 'creative_capital' && typeof v === 'number' && v > 0) positives.push(v);
        else if (typeof v === 'object') walk(v);
      }
    };
    walk(actions.weekly_actions);
    // Exactly the two tuned grants, at their new values.
    expect(positives.sort((a, b) => a - b)).toEqual([5, 9]);
  });
});

describe('slice 4 — meeting relevance weight (progression.json)', () => {
  it('relevance_weight raised to 3.0, recency window unchanged at 4', () => {
    expect(progression.weekly_meeting_selection.relevance_weight).toBe(3.0);
    expect(progression.weekly_meeting_selection.recency_window_weeks).toBe(4);
  });
});
