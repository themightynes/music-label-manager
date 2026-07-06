import { describe, it, expect } from 'vitest';
import { selectSideEvent, generateSideEventSeed, type SideEventSelectionConfig } from '@shared/engine/sideEventSelection';
import type { SideEvent } from '@shared/types/gameTypes';

/**
 * Tier 2 (PR-3) — pure side-event selection unit tests.
 *
 * Covers the ISOLATED-SEED weighted pick + cooldown filter (spec §3). The
 * WEEKLY ROLL (does anything fire?) lives in the engine's RNG stream and is not
 * exercised here — this suite is about WHICH event fires once the roll hits.
 */

function ev(id: string, category: SideEvent['category']): SideEvent {
  return {
    id,
    role_hint: 'test',
    category,
    prompt: `prompt ${id}`,
    choices: [{ id: 'a', label: 'A', effects_immediate: {}, effects_delayed: {} }],
  };
}

const CONFIG: SideEventSelectionConfig = {
  event_weights: {
    sync_licensing: 0.15,
    copyright_issues: 0.1,
    platform_opportunities: 0.2,
    industry_drama: 0.15,
    technical_problems: 0.1,
    business_opportunities: 0.15,
    artist_personal: 0.15,
  },
  event_cooldown: 2,
};

const POOL: SideEvent[] = [
  ev('sync_offer', 'sync_licensing'),
  ev('copyright_claim', 'copyright_issues'),
  ev('data_anomaly', 'platform_opportunities'),
  ev('wardrobe_malfunction', 'industry_drama'),
  ev('lighting_blackout', 'technical_problems'),
  ev('royalty_discrepancy', 'business_opportunities'),
];

describe('selectSideEvent — determinism', () => {
  it('same seed inputs twice → same event', () => {
    const a = selectSideEvent(POOL, CONFIG, {}, 10, 'game-1');
    const b = selectSideEvent(POOL, CONFIG, {}, 10, 'game-1');
    expect(a).not.toBeNull();
    expect(a!.id).toBe(b!.id);
  });

  it('generateSideEventSeed has the spec-pinned shape', () => {
    expect(generateSideEventSeed('game-1', 10)).toBe('game-1-week10-sideEvent');
  });

  it('different weeks / games can pick different events (seed varies)', () => {
    const picks = new Set<string>();
    for (let w = 1; w <= 40; w++) {
      const p = selectSideEvent(POOL, CONFIG, {}, w, 'game-1');
      if (p) picks.add(p.id);
    }
    // Over 40 distinct seeds we expect more than one distinct event.
    expect(picks.size).toBeGreaterThan(1);
  });
});

describe('selectSideEvent — weighting', () => {
  it('honors category weights in distribution over many seeds', () => {
    // Two events: one heavy, one light. The heavy one should win far more often.
    const pool: SideEvent[] = [
      ev('heavy', 'platform_opportunities'), // weight 0.20
      ev('light', 'copyright_issues'), // weight 0.10
    ];
    const counts: Record<string, number> = { heavy: 0, light: 0 };
    const N = 2000;
    for (let w = 0; w < N; w++) {
      const p = selectSideEvent(pool, CONFIG, {}, w, 'dist-game');
      if (p) counts[p.id] += 1;
    }
    // 2:1 authored ratio — heavy must clearly dominate (allow generous slack).
    expect(counts.heavy).toBeGreaterThan(counts.light);
    expect(counts.heavy / (counts.heavy + counts.light)).toBeGreaterThan(0.55);
  });
});

describe('selectSideEvent — cooldown', () => {
  it('excludes an event within its cooldown window', () => {
    // Single-event pool; fired at week 9, cooldown 2 → ineligible at week 10.
    const pool = [ev('only', 'platform_opportunities')];
    const picked = selectSideEvent(pool, CONFIG, { only: 9 }, 10, 'g');
    expect(picked).toBeNull(); // 10 - 9 = 1 < 2
  });

  it('re-includes an event once the cooldown has elapsed', () => {
    const pool = [ev('only', 'platform_opportunities')];
    const picked = selectSideEvent(pool, CONFIG, { only: 8 }, 10, 'g');
    expect(picked).not.toBeNull(); // 10 - 8 = 2 >= 2
    expect(picked!.id).toBe('only');
  });

  it('empty pool after cooldown filter → null (no fire)', () => {
    const pool = [ev('a', 'platform_opportunities'), ev('b', 'copyright_issues')];
    const history = { a: 10, b: 9 }; // both within cooldown 2 at week 10
    const picked = selectSideEvent(pool, CONFIG, history, 10, 'g');
    expect(picked).toBeNull();
  });

  it('picks only from the eligible subset when some are on cooldown', () => {
    const pool = [ev('cool', 'platform_opportunities'), ev('ready', 'copyright_issues')];
    // 'cool' fired week 10 (ineligible at 10), 'ready' never fired.
    for (let w = 10; w < 10; w++) void w;
    const picked = selectSideEvent(pool, CONFIG, { cool: 10 }, 10, 'g');
    expect(picked).not.toBeNull();
    expect(picked!.id).toBe('ready');
  });
});

describe('selectSideEvent — edge cases', () => {
  it('empty event list → null', () => {
    expect(selectSideEvent([], CONFIG, {}, 1, 'g')).toBeNull();
  });

  it('a category missing from the weight table contributes weight 0', () => {
    // Only 'covered' has a weight; 'uncovered' category weight is absent → 0.
    const cfg: SideEventSelectionConfig = { event_weights: { platform_opportunities: 1 }, event_cooldown: 0 };
    const pool = [ev('covered', 'platform_opportunities'), ev('uncovered', 'artist_personal')];
    for (let w = 0; w < 50; w++) {
      const p = selectSideEvent(pool, cfg, {}, w, 'g');
      expect(p!.id).toBe('covered');
    }
  });
});
