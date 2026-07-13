import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { LIVE_EFFECT_KEYS, STRUCTURED_EFFECT_KEYS } from '@shared/engine/processors/ActionProcessor';

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

/**
 * Engine-verbs arc — VALUE-SHAPE validation. Canonical keys are no longer all
 * numeric: STRUCTURED_EFFECT_KEYS carry a string/object value, and each shape is
 * pinned here so authored content can't ship a value the engine case would
 * warn-and-drop. Every OTHER canonical key must still be a plain number.
 */
const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

const STRUCTURED_VALUE_VALIDATORS: Record<string, { shape: string; validate: (v: unknown) => boolean }> = {
  story_flag: {
    shape: 'string key, or { key: string, value?: boolean }',
    validate: (v) =>
      (typeof v === 'string' && v.trim().length > 0) ||
      (isPlainObject(v) &&
        typeof v.key === 'string' && (v.key as string).trim().length > 0 &&
        (v.value === undefined || typeof v.value === 'boolean')),
  },
  spawn_prospect: {
    shape: '{ name?: string, archetype?: string, quality_hint?: number, popularity_hint?: number, source?: string }',
    validate: (v) =>
      isPlainObject(v) &&
      (['name', 'archetype', 'source'] as const).every((k) => v[k] === undefined || typeof v[k] === 'string') &&
      (['quality_hint', 'popularity_hint'] as const).every((k) => v[k] === undefined || typeof v[k] === 'number'),
  },
  set_exec_absence: {
    shape: '{ role: string, weeks: number > 0 }',
    validate: (v) =>
      isPlainObject(v) &&
      typeof v.role === 'string' && (v.role as string).trim().length > 0 &&
      typeof v.weeks === 'number' && (v.weeks as number) > 0,
  },
  distribution_efficiency: {
    shape: '{ amount: number != 0, weeks: number > 0 }',
    validate: (v) =>
      isPlainObject(v) &&
      typeof v.amount === 'number' && (v.amount as number) !== 0 &&
      typeof v.weeks === 'number' && (v.weeks as number) > 0,
  },
};

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
            continue;
          }
          // Value-shape check (engine-verbs arc): structured keys must match
          // their pinned shape; every other canonical key must be a number.
          const val = (eff as any)[key];
          const structured = STRUCTURED_VALUE_VALIDATORS[key];
          if (structured) {
            if (!structured.validate(val)) {
              offenders.push(
                `${filePath} :: ${crumb.id ?? '?'} :: ${block}.${key} = ${JSON.stringify(val)} — INVALID SHAPE (expected ${structured.shape})`
              );
            }
          } else if (typeof val !== 'number') {
            offenders.push(
              `${filePath} :: ${crumb.id ?? '?'} :: ${block}.${key} = ${JSON.stringify(val)} — INVALID SHAPE (expected a number)`
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

  it('every STRUCTURED_EFFECT_KEYS entry is canonical and has a value-shape validator (engine-verbs arc)', () => {
    // The structured set must stay a subset of the live set (a structured key
    // that isn't live would be dead), and this lint must know its shape.
    Array.from(STRUCTURED_EFFECT_KEYS).forEach((k) => {
      expect(LIVE_EFFECT_KEYS.has(k), `${k} is in STRUCTURED_EFFECT_KEYS but not LIVE_EFFECT_KEYS`).toBe(true);
      expect(k in STRUCTURED_VALUE_VALIDATORS, `${k} has no value-shape validator in this lint`).toBe(true);
    });
    // And the validator map can't describe keys the engine doesn't treat as structured.
    Object.keys(STRUCTURED_VALUE_VALIDATORS).forEach((k) => {
      expect(STRUCTURED_EFFECT_KEYS.has(k), `${k} has a validator but is not in STRUCTURED_EFFECT_KEYS`).toBe(true);
    });
  });

  it('the structured value validators accept the documented shapes and reject malformed ones', () => {
    const v = STRUCTURED_VALUE_VALIDATORS;
    // story_flag
    expect(v.story_flag.validate('mac_warned_once')).toBe(true);
    expect(v.story_flag.validate({ key: 'mac_warned_once' })).toBe(true);
    expect(v.story_flag.validate({ key: 'mac_warned_once', value: false })).toBe(true);
    expect(v.story_flag.validate('')).toBe(false);
    expect(v.story_flag.validate(1)).toBe(false);
    expect(v.story_flag.validate({ value: true })).toBe(false);
    // spawn_prospect
    expect(v.spawn_prospect.validate({ source: 'mac_meeting' })).toBe(true);
    expect(v.spawn_prospect.validate({ archetype: 'Visionary', quality_hint: 70, source: 'event' })).toBe(true);
    expect(v.spawn_prospect.validate({})).toBe(true); // all fields optional
    expect(v.spawn_prospect.validate({ quality_hint: 'high' })).toBe(false);
    expect(v.spawn_prospect.validate('someone')).toBe(false);
    // set_exec_absence
    expect(v.set_exec_absence.validate({ role: 'cmo', weeks: 3 })).toBe(true);
    expect(v.set_exec_absence.validate({ role: 'cmo', weeks: 0 })).toBe(false);
    expect(v.set_exec_absence.validate({ weeks: 3 })).toBe(false);
    // distribution_efficiency
    expect(v.distribution_efficiency.validate({ amount: 0.1, weeks: 6 })).toBe(true);
    expect(v.distribution_efficiency.validate({ amount: -0.1, weeks: 6 })).toBe(true);
    expect(v.distribution_efficiency.validate({ amount: 0, weeks: 6 })).toBe(false);
    expect(v.distribution_efficiency.validate({ amount: 0.1 })).toBe(false);
  });
});
