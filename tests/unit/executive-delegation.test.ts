/**
 * Executive Delegation & Trust — config + band-classifier unit tests (Tier 1).
 *
 * Mirrors the exec-mood-modifier tripwire: the engine reads the JSON knobs
 * (getExecDelegationConfigSync); the shared default DEFAULT_EXEC_DELEGATION_CONFIG
 * is the code-side mirror. Parity is only structural while these stay identical —
 * tuning the JSON without updating the default fails CI here.
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_EXEC_DELEGATION_CONFIG,
  getLoyaltyBand,
  getRiskAppetiteBias,
} from '../../shared/utils/executiveDelegation';

describe('DEFAULT_EXEC_DELEGATION_CONFIG matches the locked plan values (§3.4)', () => {
  it('has the plan-specified knobs, bands, and risk appetites', () => {
    expect(DEFAULT_EXEC_DELEGATION_CONFIG).toEqual({
      loyalty_on_use: 5,
      loyalty_decay_per_week: 5,
      idle_weeks_before_decay: 3,
      mood_drift_per_week: 5,
      mood_default_delta: 5,
      loyalty_bands: { loyal_above: 70, disloyal_below: 30 },
      autonomous_risk_appetite: {
        inspired_bias: 'aggressive',
        disgruntled_bias: 'defensive',
        neutral_bias: 'balanced',
      },
      auto_endorse_loyalty_gain: 5,
      neglect_loyalty_gain: 0,
      escalation: { loyalty_ceiling: 40, enabled: true },
    });
  });
});

describe('balance JSON knobs stay in lockstep with the util defaults (drift tripwire)', () => {
  it('progression.json executive_delegation === DEFAULT_EXEC_DELEGATION_CONFIG', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const progression = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'data/balance/progression.json'), 'utf8'),
    );
    expect(progression.reputation_system.executive_delegation).toEqual(
      DEFAULT_EXEC_DELEGATION_CONFIG,
    );
  });
});

describe('getLoyaltyBand — strict band boundaries (§3.1)', () => {
  it('loyalty > loyal_above (70) → loyal; the boundary itself is committed', () => {
    expect(getLoyaltyBand(71)).toBe('loyal');
    expect(getLoyaltyBand(70)).toBe('committed'); // boundary inclusive of committed
    expect(getLoyaltyBand(100)).toBe('loyal');
  });
  it('loyalty < disloyal_below (30) → disloyal; the boundary itself is committed', () => {
    expect(getLoyaltyBand(29)).toBe('disloyal');
    expect(getLoyaltyBand(30)).toBe('committed'); // boundary inclusive of committed
    expect(getLoyaltyBand(0)).toBe('disloyal');
  });
  it('30..70 inclusive → committed', () => {
    expect(getLoyaltyBand(30)).toBe('committed');
    expect(getLoyaltyBand(50)).toBe('committed');
    expect(getLoyaltyBand(70)).toBe('committed');
  });
});

describe('getRiskAppetiteBias — reuses the exec-mood band thresholds (§3.2)', () => {
  const moodBands = { inspired_above: 90, disgruntled_below: 30 };
  const appetite = DEFAULT_EXEC_DELEGATION_CONFIG.autonomous_risk_appetite;

  it('mood > inspired_above → aggressive', () => {
    expect(getRiskAppetiteBias(91, appetite, moodBands)).toBe('aggressive');
    expect(getRiskAppetiteBias(90, appetite, moodBands)).toBe('balanced'); // strict
  });
  it('mood < disgruntled_below → defensive', () => {
    expect(getRiskAppetiteBias(29, appetite, moodBands)).toBe('defensive');
    expect(getRiskAppetiteBias(30, appetite, moodBands)).toBe('balanced'); // strict
  });
  it('the neutral/content middle → balanced (no bias)', () => {
    expect(getRiskAppetiteBias(50, appetite, moodBands)).toBe('balanced');
    expect(getRiskAppetiteBias(85, appetite, moodBands)).toBe('balanced');
  });
});
