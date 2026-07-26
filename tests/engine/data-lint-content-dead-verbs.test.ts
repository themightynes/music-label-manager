import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * C104 (safe slice) — content-dead engine-verb SOFT lint.
 *
 * The engine implements 13 "engine verbs" (mechanism effect keys in
 * LIVE_EFFECT_KEYS beyond the plain stat channels). Some are implemented but
 * referenced by NO authored content in data/actions.json / data/events.json —
 * they are "content-dead": live code paths with zero gameplay exposure.
 *
 * This is a SOFT lint by design:
 *  - The test PASSES while the actual dead list matches the pinned expectation
 *    below, and console.warns the dead list on every run (visibility without
 *    noise-failure).
 *  - It FAILS only when the pin drifts — a verb newly gains content (remove it
 *    from the pin, consciously) or content is removed and a verb goes dead
 *    (add it to the pin, consciously). Either way the pin update is a
 *    deliberate act, reviewed in the diff.
 *
 * ⚠️ C104 rule — grant_inventory: content using grant_inventory MUST NOT ship
 * until the physical_inventory knobs are retuned. The knobs live at
 * data/balance/markets.json → market_formulas.physical_inventory; at the
 * current tuning (0.12 × 12 weeks) sell-through is a GUARANTEED 144% — a free
 * money printer. If you are removing grant_inventory from
 * EXPECTED_CONTENT_DEAD_VERBS, retune those knobs first.
 */

// The 13 engine verbs (mechanism subset of LIVE_EFFECT_KEYS — see
// shared/engine/processors/ActionProcessor.ts).
const ENGINE_VERBS = [
  'schedule_event',
  'story_flag',
  'spawn_prospect',
  'set_exec_absence',
  'distribution_efficiency',
  'press_scrutiny_flag',
  'grant_song',
  'spawn_release',
  'promote_release',
  'catalog_damage',
  'cancel_project',
  'grant_inventory',
  'transfer_revenue_stream',
] as const;

/**
 * THE PIN. Update this list ONLY as a conscious act (see header). Sorted.
 */
const EXPECTED_CONTENT_DEAD_VERBS = [
  'cancel_project',
  'catalog_damage',
  'distribution_efficiency',
  'grant_inventory',
  'press_scrutiny_flag',
  'set_exec_absence',
  'transfer_revenue_stream',
] as const;

const EFFECT_BLOCK_KEYS = new Set(['effects_immediate', 'effects_delayed']);

/** Recursively collect every key used inside an effects_immediate/effects_delayed block. */
function collectEffectKeys(node: unknown, out: Map<string, number>): void {
  if (Array.isArray(node)) {
    for (const item of node) collectEffectKeys(item, out);
    return;
  }
  if (!node || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (EFFECT_BLOCK_KEYS.has(key) && value && typeof value === 'object' && !Array.isArray(value)) {
      for (const effectKey of Object.keys(value as Record<string, unknown>)) {
        out.set(effectKey, (out.get(effectKey) ?? 0) + 1);
      }
    }
    collectEffectKeys(value, out);
  }
}

function loadUsageCounts(): Map<string, number> {
  const usage = new Map<string, number>();
  for (const file of ['actions.json', 'events.json']) {
    const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', file), 'utf-8'));
    collectEffectKeys(raw, usage);
  }
  return usage;
}

describe('data-lint: content-dead engine verbs (C104 soft lint)', () => {
  const usage = loadUsageCounts();
  const dead = ENGINE_VERBS.filter((verb) => !(usage.get(verb) ?? 0)).sort();
  const live = ENGINE_VERBS.filter((verb) => (usage.get(verb) ?? 0) > 0).sort();

  it('matches the pinned content-dead list (update the pin CONSCIOUSLY — see header)', () => {
    // Soft-lint visibility: always report the current state.
    console.warn(
      `[C104 soft lint] content-dead engine verbs (${dead.length}/${ENGINE_VERBS.length}): ` +
        `${dead.join(', ') || '(none)'}`
    );
    console.warn(
      `[C104 soft lint] content-live engine verbs: ` +
        live.map((v) => `${v}(${usage.get(v)})`).join(', ')
    );

    expect(dead).toEqual([...EXPECTED_CONTENT_DEAD_VERBS]);
  });

  it('pin sanity: every pinned verb is a real engine verb, sorted, no duplicates', () => {
    const pin = [...EXPECTED_CONTENT_DEAD_VERBS];
    expect(pin).toEqual([...pin].sort());
    expect(new Set(pin).size).toBe(pin.length);
    for (const verb of pin) {
      expect(ENGINE_VERBS).toContain(verb);
    }
  });
});
