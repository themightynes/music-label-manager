import { describe, it, expect } from 'vitest';
import {
  BANKED_HYPE_EXPIRY_WEEKS,
  BUZZ_BUILDING_WEEKS,
} from '../../client/src/lib/releaseBuzz';

describe('releaseBuzz display constants stay in lockstep with balance/engine knobs (C82 drift guard)', () => {
  it('markets.json pending_awareness_boost_expiry_weeks === BANKED_HYPE_EXPIRY_WEEKS', async () => {
    // The engine reads the JSON knob (market_formulas.awareness_system.
    // pending_awareness_boost_expiry_weeks) to expire unconsumed banked-hype
    // pools; the client's Banked-Hype chip renders its "fades wk W" countdown
    // synchronously from the DISPLAY-ONLY mirror BANKED_HYPE_EXPIRY_WEEKS in
    // client/src/lib/releaseBuzz.ts (no async balance fetch). Parity is only
    // structural while these two stay identical — if you tune the JSON knob,
    // you MUST update BANKED_HYPE_EXPIRY_WEEKS (or give the chip a real config
    // path). This test is the tripwire.
    const fs = await import('fs');
    const path = await import('path');
    const markets = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'data/balance/markets.json'), 'utf8')
    );
    expect(markets.market_formulas.awareness_system.pending_awareness_boost_expiry_weeks).toBe(
      BANKED_HYPE_EXPIRY_WEEKS
    );
  });

  it('documents why BUZZ_BUILDING_WEEKS cannot be pinned to a knob (inline engine literal)', () => {
    // BUZZ_BUILDING_WEEKS mirrors the engine's awareness BUILDING window, but
    // that window is an INLINE LITERAL, not a named constant or balance knob:
    // shared/engine/processors/ReleaseProcessor.ts:819
    //   `if (weeksSinceRelease >= 1 && weeksSinceRelease <= 4)` — building phase
    // There is nothing importable to compare against (markets.json's
    // awareness_impact_factors bands are keyed weeks_1_2 / weeks_3_6 /
    // weeks_7_plus — a different axis, not the 4-week building window). Until
    // the engine extracts that literal into a knob or exported constant, this
    // assertion just freezes the client value so any change to either side
    // forces a human to re-check the pair.
    expect(BUZZ_BUILDING_WEEKS).toBe(4);
  });
});
