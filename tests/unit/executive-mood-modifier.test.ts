/**
 * Exec-meetings-revival PR-9 (C6/D) — shared executive-mood modifier util unit tests.
 *
 * The util (shared/utils/executiveMoodModifier.ts) is the SINGLE source of the mood
 * math; both the engine (ActionProcessor.processRoleMeeting) and the client Impact
 * Preview route through it, so these tests pin the mechanic once for both paths.
 *
 * Covers:
 *  - band boundaries (29/30/80/81/90/91) — strict thresholds
 *  - cost-only scaling (disgruntled/content) vs inspired (adds non-money scaling)
 *  - positive money (windfalls) is NEVER scaled; negative money (costs) is
 *  - sign preservation on non-money magnitude scaling
 *  - the rounding rule (money Math.round; magnitude sign*Math.round(|v|*mult))
 *  - executive_mood effect value is never scaled (no feedback loop)
 *  - neutral band is a genuine no-op
 */
import { describe, it, expect } from 'vitest';
import {
  getMoodBand,
  getMoodModifiers,
  applyMoodModifiersToEffects,
  isNeutral,
  DEFAULT_EXEC_MOOD_MODIFIER_CONFIG,
} from '@shared/utils/executiveMoodModifier';

describe('getMoodBand — strict boundaries', () => {
  it('mood 29 → disgruntled (< 30)', () => {
    expect(getMoodBand(29)).toBe('disgruntled');
  });
  it('mood 30 → neutral (not < 30)', () => {
    expect(getMoodBand(30)).toBe('neutral');
  });
  it('mood 80 → neutral (not > 80)', () => {
    expect(getMoodBand(80)).toBe('neutral');
  });
  it('mood 81 → content (> 80)', () => {
    expect(getMoodBand(81)).toBe('content');
  });
  it('mood 90 → content (not > 90)', () => {
    expect(getMoodBand(90)).toBe('content');
  });
  it('mood 91 → inspired (> 90)', () => {
    expect(getMoodBand(91)).toBe('inspired');
  });
  it('mid-range 50 → neutral', () => {
    expect(getMoodBand(50)).toBe('neutral');
  });
});

describe('getMoodModifiers — multipliers per band', () => {
  it('disgruntled: cost ×1.25, effect ×1 (no non-money scaling)', () => {
    const m = getMoodModifiers(10);
    expect(m).toEqual({ band: 'disgruntled', costMultiplier: 1.25, effectMultiplier: 1 });
  });
  it('neutral: both multipliers 1 (no-op)', () => {
    const m = getMoodModifiers(50);
    expect(m).toEqual({ band: 'neutral', costMultiplier: 1, effectMultiplier: 1 });
    expect(isNeutral(m)).toBe(true);
  });
  it('content: cost ×0.90, effect ×1', () => {
    const m = getMoodModifiers(85);
    expect(m).toEqual({ band: 'content', costMultiplier: 0.9, effectMultiplier: 1 });
  });
  it('inspired: INHERITS content cost break AND adds effect ×1.20', () => {
    const m = getMoodModifiers(95);
    expect(m).toEqual({ band: 'inspired', costMultiplier: 0.9, effectMultiplier: 1.2 });
  });
});

describe('applyMoodModifiersToEffects — money scaling', () => {
  it('scales NEGATIVE money (a cost) by costMultiplier and rounds', () => {
    const m = getMoodModifiers(10); // disgruntled ×1.25
    expect(applyMoodModifiersToEffects({ money: -1000 }, m)).toEqual({ money: -1250 });
  });
  it('content discounts a cost: -1000 ×0.90 → -900', () => {
    const m = getMoodModifiers(85);
    expect(applyMoodModifiersToEffects({ money: -1000 }, m)).toEqual({ money: -900 });
  });
  it('NEVER scales positive money (windfall) — even when disgruntled', () => {
    const m = getMoodModifiers(10);
    expect(applyMoodModifiersToEffects({ money: 5000 }, m)).toEqual({ money: 5000 });
  });
  it('NEVER scales positive money — even when content (no free discount to gains)', () => {
    const m = getMoodModifiers(85);
    expect(applyMoodModifiersToEffects({ money: 5000 }, m)).toEqual({ money: 5000 });
  });
  it('rounds money to nearest integer (Math.round rule)', () => {
    const m = getMoodModifiers(10); // ×1.25
    // -333 ×1.25 = -416.25 → Math.round → -416
    expect(applyMoodModifiersToEffects({ money: -333 }, m)).toEqual({ money: -416 });
  });
});

describe('applyMoodModifiersToEffects — non-money scaling (inspired only)', () => {
  it('inspired amplifies a positive point effect: +5 ×1.2 → +6', () => {
    const m = getMoodModifiers(95);
    expect(applyMoodModifiersToEffects({ reputation: 5 }, m)).toEqual({ reputation: 6 });
  });
  it('inspired preserves sign on a negative effect: -3 ×1.2 → -4 (|3.6|→4)', () => {
    const m = getMoodModifiers(95);
    expect(applyMoodModifiersToEffects({ artist_mood: -3 }, m)).toEqual({ artist_mood: -4 });
  });
  it('inspired: +1 ×1.2 → +1 (|1.2|→1, rounds down)', () => {
    const m = getMoodModifiers(95);
    expect(applyMoodModifiersToEffects({ creative_capital: 1 }, m)).toEqual({ creative_capital: 1 });
  });
  it('disgruntled does NOT scale non-money effects (effectMultiplier 1)', () => {
    const m = getMoodModifiers(10);
    expect(applyMoodModifiersToEffects({ reputation: 5, artist_mood: -3 }, m)).toEqual({
      reputation: 5,
      artist_mood: -3,
    });
  });
  it('content does NOT scale non-money effects (effectMultiplier 1)', () => {
    const m = getMoodModifiers(85);
    expect(applyMoodModifiersToEffects({ reputation: 5 }, m)).toEqual({ reputation: 5 });
  });
  it('inspired scales BOTH the cost AND the non-money magnitude in one record', () => {
    const m = getMoodModifiers(95);
    expect(applyMoodModifiersToEffects({ money: -1000, reputation: 5 }, m)).toEqual({
      money: -900, // cost ×0.90 (inspired inherits content break)
      reputation: 6, // magnitude ×1.20
    });
  });
});

describe('applyMoodModifiersToEffects — executive_mood is NEVER scaled', () => {
  it('inspired does not amplify executive_mood (no feedback loop)', () => {
    const m = getMoodModifiers(95);
    expect(applyMoodModifiersToEffects({ executive_mood: 3, reputation: 5 }, m)).toEqual({
      executive_mood: 3, // untouched
      reputation: 6, // scaled
    });
  });
});

describe('applyMoodModifiersToEffects — purity & non-numeric', () => {
  it('returns a NEW record, never mutates the input', () => {
    const m = getMoodModifiers(95);
    const input = { money: -1000, reputation: 5 };
    const out = applyMoodModifiersToEffects(input, m);
    expect(out).not.toBe(input);
    expect(input).toEqual({ money: -1000, reputation: 5 }); // unchanged
  });
  it('passes non-numeric values through untouched', () => {
    const m = getMoodModifiers(95);
    expect(applyMoodModifiersToEffects({ note: 'hi' as any, reputation: 5 }, m)).toEqual({
      note: 'hi',
      reputation: 6,
    });
  });
  it('neutral band is a full identity transform', () => {
    const m = getMoodModifiers(50);
    const input = { money: -1000, reputation: 5, executive_mood: 3 };
    expect(applyMoodModifiersToEffects(input, m)).toEqual(input);
  });
});

describe('DEFAULT_EXEC_MOOD_MODIFIER_CONFIG matches the locked plan values', () => {
  it('has the plan-specified band boundaries and multipliers', () => {
    expect(DEFAULT_EXEC_MOOD_MODIFIER_CONFIG).toEqual({
      disgruntled_below: 30,
      content_above: 80,
      inspired_above: 90,
      cost_multiplier_disgruntled: 1.25,
      cost_multiplier_content: 0.9,
      effect_multiplier_inspired: 1.2,
    });
  });
});

describe('balance JSON knobs stay in lockstep with the util defaults (preview-parity drift guard)', () => {
  it('progression.json exec_mood_modifiers === DEFAULT_EXEC_MOOD_MODIFIER_CONFIG', async () => {
    // The engine reads the JSON knobs (getExecMoodModifierConfigSync); the client
    // Impact Preview has no gameData handle and uses the util DEFAULTS. Parity is
    // only structural while these two stay identical — if you tune the JSON, you
    // MUST update DEFAULT_EXEC_MOOD_MODIFIER_CONFIG (or give the client a real
    // config path). This test is the tripwire.
    const fs = await import('fs');
    const path = await import('path');
    const progression = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'data/balance/progression.json'), 'utf8')
    );
    expect(progression.reputation_system.exec_mood_modifiers).toEqual(
      DEFAULT_EXEC_MOOD_MODIFIER_CONFIG
    );
  });
});
