/**
 * Volatility-economy slice 4 — Creative Capital economy + meeting relevance.
 * REVISED by the v2 stakes-revision content pass (2026-07-12): the designer rule
 * now caps positive CC grants at +1/+2 per choice, and the "creative_recording"
 * meeting ("Employee Effectiveness") was reworked into a trilemma:
 *   quick_one    → CC +1 (mood +4, money −2k)
 *   take_time    → CC +2 (mood +6, money −8k, quality +2)
 *   method_retreat (NEW, Dante's vice) → CC +2 (quality +3, variance +1, mood −2, money −12k)
 *
 * These are value guards:
 *  - The only THREE positive creative_capital grants in actions.json are the
 *    trilemma above, all within the +1/+2 designer cap.
 *  - weekly_meeting_selection.relevance_weight stays 3.0 (window unchanged).
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

describe('v2 stakes revision — creative capital grant amounts (actions.json)', () => {
  it('quick_one grants 1 creative_capital (designer cap: +1/+2 per choice)', () => {
    const choice = findChoice('creative_recording', 'quick_one');
    expect(choice).toBeDefined();
    expect(choice.effects_delayed.creative_capital).toBe(1);
    expect(choice.effects_immediate.artist_mood).toBe(4);
    expect(choice.effects_immediate.money).toBe(-2000);
  });

  it('take_time grants 2 creative_capital plus a quality bank', () => {
    const choice = findChoice('creative_recording', 'take_time');
    expect(choice).toBeDefined();
    expect(choice.effects_delayed.creative_capital).toBe(2);
    expect(choice.effects_delayed.quality_bonus).toBe(2);
    expect(choice.effects_immediate.artist_mood).toBe(6);
    expect(choice.effects_immediate.money).toBe(-8000);
  });

  it("method_retreat (Dante's vice, self_serving_hint) grants 2 creative_capital with variance and a mood cost", () => {
    const choice = findChoice('creative_recording', 'method_retreat');
    expect(choice).toBeDefined();
    expect(choice.self_serving_hint).toBe(true);
    expect(choice.effects_delayed.creative_capital).toBe(2);
    expect(choice.effects_delayed.quality_bonus).toBe(3);
    expect(choice.effects_delayed.variance_up).toBe(1);
    expect(choice.effects_immediate.artist_mood).toBe(-2);
    expect(choice.effects_immediate.money).toBe(-12000);
  });

  it('every POSITIVE creative_capital grant in actions.json respects the +1/+2 designer cap', () => {
    const positives: number[] = [];
    const walk = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      for (const [k, v] of Object.entries(obj)) {
        if (k === 'creative_capital' && typeof v === 'number' && v > 0) positives.push(v);
        else if (typeof v === 'object') walk(v);
      }
    };
    walk(actions.weekly_actions);
    // The three creative_recording trilemma grants (+1/+2/+2) plus the v3 Mac
    // pool's second_pair_of_ears keep_it_a_handshake (+1) — all within the cap.
    expect(positives.sort((a, b) => a - b)).toEqual([1, 1, 2, 2]);
    positives.forEach((v) => expect(v).toBeLessThanOrEqual(2));
  });
});

describe('slice 4 — meeting relevance weight (progression.json)', () => {
  it('relevance_weight raised to 3.0, recency window unchanged at 4', () => {
    expect(progression.weekly_meeting_selection.relevance_weight).toBe(3.0);
    expect(progression.weekly_meeting_selection.recency_window_weeks).toBe(4);
  });
});
