import { describe, it, expect } from 'vitest';
import {
  LIVE_EFFECT_KEYS,
  EFFECT_CHANNEL_DESCRIPTIONS,
} from '@shared/engine/processors/ActionProcessor';

/**
 * LEGIBILITY Slice A — the effect-description drift-guard (companion to the
 * data-lint forever-guard in data-lint-effect-keys.test.ts).
 *
 * EFFECT_CHANNEL_DESCRIPTIONS is the single home for the player-facing
 * explanation of every effect channel, and it is co-located with LIVE_EFFECT_KEYS
 * so the two cannot silently drift. This test enforces that co-location:
 *   - EVERY canonical key (LIVE_EFFECT_KEYS ∪ {executive_mood}) has a description,
 *     so no live badge can ever surface a channel with no explanation;
 *   - NO description exists for a non-canonical key, so the map can't accrete
 *     copy for a dead/unauthored channel (which would violate the badge whitelist
 *     the moment such a key were rendered).
 *
 * Mirrors the CANONICAL_KEYS construction of the data-lint test verbatim.
 */
const CANONICAL_KEYS: ReadonlySet<string> = new Set<string>(
  Array.from(LIVE_EFFECT_KEYS).concat('executive_mood')
);

describe('Effect-channel descriptions — every canonical key is described, no extras (Slice A drift-guard)', () => {
  it('every canonical key (LIVE_EFFECT_KEYS ∪ {executive_mood}) has a description entry', () => {
    const missing = Array.from(CANONICAL_KEYS).filter(
      (key) => !(key in EFFECT_CHANNEL_DESCRIPTIONS)
    );
    expect(
      missing,
      missing.length
        ? `Canonical effect key(s) missing a player-facing description:\n  ${missing.join('\n  ')}\n` +
            `Add an entry to EFFECT_CHANNEL_DESCRIPTIONS (co-located with LIVE_EFFECT_KEYS).`
        : undefined
    ).toEqual([]);
  });

  it('no description exists for a non-canonical key', () => {
    const extra = Object.keys(EFFECT_CHANNEL_DESCRIPTIONS).filter(
      (key) => !CANONICAL_KEYS.has(key)
    );
    expect(
      extra,
      extra.length
        ? `EFFECT_CHANNEL_DESCRIPTIONS describes non-canonical key(s) — these would violate the badge whitelist:\n  ${extra.join('\n  ')}\n` +
            `Canonical keys are: ${Array.from(CANONICAL_KEYS).sort().join(', ')}`
        : undefined
    ).toEqual([]);
  });

  it('the description set is EXACTLY the canonical set (size parity)', () => {
    expect(Object.keys(EFFECT_CHANNEL_DESCRIPTIONS).length).toBe(CANONICAL_KEYS.size);
  });

  it('every description has a non-empty title and text', () => {
    for (const [key, desc] of Object.entries(EFFECT_CHANNEL_DESCRIPTIONS)) {
      expect(desc.title.trim().length, `${key} title is empty`).toBeGreaterThan(0);
      expect(desc.text.trim().length, `${key} text is empty`).toBeGreaterThan(0);
    }
  });
});
