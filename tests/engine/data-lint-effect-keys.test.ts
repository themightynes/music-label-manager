import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { LIVE_EFFECT_KEYS } from '@shared/engine/processors/ActionProcessor';

/**
 * Exec-meetings-revival PR-8 — THE DATA-LINT GUARD (the forever-guard).
 *
 * Loads data/actions.json + data/events.json + data/dialogue.json and asserts that
 * EVERY key in EVERY effects_immediate / effects_delayed block is in
 * LIVE_EFFECT_KEYS ∪ {'executive_mood'}. 'executive_mood' is the one intentional
 * addition: it is consumed directly out of effects_immediate by
 * processExecutiveActions (outside applyEffects's switch), so LIVE_EFFECT_KEYS
 * deliberately excludes it — but it IS a canonical authored key.
 *
 * This test failing means someone authored a dead effect key that the engine will
 * silently drop (the PR-1 unknown-key warn). LIVE_EFFECT_KEYS is imported straight
 * from the engine so there is a single source of truth — the data can never drift
 * from what applyEffects actually implements without this test going red.
 */

const CANONICAL_KEYS: ReadonlySet<string> = new Set<string>(
  Array.from(LIVE_EFFECT_KEYS).concat('executive_mood')
);

const EFFECT_BLOCK_KEYS = ['effects_immediate', 'effects_delayed'] as const;

/** Recursively collect every (filePath, meetingId?, choiceId?, block, key) offender. */
function collectNonCanonicalKeys(
  node: unknown,
  filePath: string,
  offenders: string[],
  crumb: { id?: string; choiceId?: string } = {}
): void {
  if (Array.isArray(node)) {
    for (const item of node) collectNonCanonicalKeys(item, filePath, offenders, crumb);
    return;
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    // Track breadcrumbs so a failure message points to the exact choice.
    const nextCrumb = {
      id: typeof obj.id === 'string' && !('effects_immediate' in obj) && !('choiceId' in crumb) ? obj.id : crumb.id,
      choiceId: crumb.choiceId,
    };
    for (const block of EFFECT_BLOCK_KEYS) {
      const eff = obj[block];
      if (eff && typeof eff === 'object' && !Array.isArray(eff)) {
        for (const key of Object.keys(eff as Record<string, unknown>)) {
          if (!CANONICAL_KEYS.has(key)) {
            offenders.push(
              `${filePath} :: ${crumb.id ?? '?'} :: ${block}.${key} = ${JSON.stringify((eff as any)[key])}`
            );
          }
        }
      }
    }
    for (const [k, v] of Object.entries(obj)) {
      // Descend into everything except the effect blocks themselves (already scanned).
      if (!EFFECT_BLOCK_KEYS.includes(k as any)) {
        const childCrumb = k === 'choices' ? nextCrumb : { id: obj.id as string | undefined ?? crumb.id, choiceId: crumb.choiceId };
        collectNonCanonicalKeys(v, filePath, offenders, childCrumb);
      }
    }
  }
}

function loadJson(rel: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), rel), 'utf-8'));
}

describe('Data lint — every authored effect key is canonical (PR-8 forever-guard)', () => {
  const DATA_FILES = ['data/actions.json', 'data/events.json', 'data/dialogue.json'];

  for (const rel of DATA_FILES) {
    it(`${rel} contains ZERO non-canonical effect keys`, () => {
      const json = loadJson(rel);
      const offenders: string[] = [];
      collectNonCanonicalKeys(json, rel, offenders);
      expect(
        offenders,
        offenders.length
          ? `Non-canonical effect key(s) found — these are silently dropped by applyEffects:\n  ${offenders.join('\n  ')}\n` +
              `Canonical keys are: ${Array.from(CANONICAL_KEYS).sort().join(', ')}`
          : undefined
      ).toEqual([]);
    });
  }

  it('LIVE_EFFECT_KEYS is the single source of truth (executive_mood is the only extra canonical key)', () => {
    // Guard against the CANONICAL set drifting: it must be exactly LIVE_EFFECT_KEYS + executive_mood.
    expect(CANONICAL_KEYS.has('executive_mood')).toBe(true);
    expect(LIVE_EFFECT_KEYS.has('executive_mood')).toBe(false);
    Array.from(LIVE_EFFECT_KEYS).forEach((k) => expect(CANONICAL_KEYS.has(k)).toBe(true));
    expect(CANONICAL_KEYS.size).toBe(LIVE_EFFECT_KEYS.size + 1);
  });
});
