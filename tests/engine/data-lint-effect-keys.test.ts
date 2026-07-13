import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { LIVE_EFFECT_KEYS } from '@shared/engine/processors/ActionProcessor';
import {
  EFFECT_TARGETING_DIRECTIVE_KEYS,
  EXEC_MOOD_TARGET_ROLE_IDS,
  EXEC_MOOD_TARGET_BROADCAST,
} from '@shared/types/gameTypes';

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

const TARGETING_DIRECTIVE_KEYS: ReadonlySet<string> = new Set<string>(EFFECT_TARGETING_DIRECTIVE_KEYS);

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
          // SLICE 5 (M13/M14): the string-valued targeting DIRECTIVE keys are
          // not effect channels — they are validated by the dedicated
          // targeting-lint suite below (placement, value, sibling rules).
          if (TARGETING_DIRECTIVE_KEYS.has(key)) continue;
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

  it('targeting directives are NOT effect channels (never in LIVE_EFFECT_KEYS/CANONICAL_KEYS)', () => {
    for (const key of EFFECT_TARGETING_DIRECTIVE_KEYS) {
      expect(LIVE_EFFECT_KEYS.has(key)).toBe(false);
      expect(CANONICAL_KEYS.has(key)).toBe(false);
    }
  });
});

/**
 * Engine-verbs SLICE 5 (M13) + M14 rider — TARGETING-DIRECTIVE lint.
 *
 * `target_executive` routes a sibling `executive_mood` to a named executive
 * (or 'all'); it is consumed by ActionProcessor.applyTargetedExecutiveMood
 * from exactly two surfaces: CEO meeting choices and side/escalation event
 * choices — and ONLY out of effects_immediate. `target_artist`
 * ('predetermined' | 'global') is an event-choice-only override of the
 * event-level `target` field, consumed by
 * game-engine.processPendingSideEventResolution (both blocks).
 *
 * These rules keep the directive grammar honest in BOTH directions:
 *   - an executive_mood a resolver can't route (CEO/event choice without
 *     target_executive) is a dead key → error;
 *   - a directive the engine ignores (role-meeting target_executive, delayed
 *     target_executive, dialogue directives, bad values) is dead → error.
 */
describe('Data lint — effect targeting directives (SLICE 5 M13 + M14)', () => {
  const VALID_EXEC_TARGET_LIST: readonly string[] = [...EXEC_MOOD_TARGET_ROLE_IDS, EXEC_MOOD_TARGET_BROADCAST];
  const VALID_EXEC_TARGETS = new Set<string>(VALID_EXEC_TARGET_LIST);
  const VALID_ARTIST_TARGETS = new Set<string>(['predetermined', 'global']);

  interface ChoiceSite {
    /** e.g. "data/actions.json :: ceo_strategy :: choice_a" */
    where: string;
    effects_immediate: Record<string, unknown>;
    effects_delayed: Record<string, unknown>;
  }

  function choiceSites(objs: any[], file: string): ChoiceSite[] {
    const sites: ChoiceSite[] = [];
    for (const obj of objs ?? []) {
      for (const choice of obj?.choices ?? []) {
        sites.push({
          where: `${file} :: ${obj.id} :: ${choice.id}`,
          effects_immediate: choice.effects_immediate ?? {},
          effects_delayed: choice.effects_delayed ?? {},
        });
      }
    }
    return sites;
  }

  const actionsJson = loadJson('data/actions.json') as any;
  const eventsJson = loadJson('data/events.json') as any;
  const dialogueJson = loadJson('data/dialogue.json') as any;

  const weeklyActions: any[] = actionsJson.weekly_actions ?? [];
  const ceoSites = choiceSites(weeklyActions.filter((a) => a.role_id === 'ceo'), 'data/actions.json');
  const roleSites = choiceSites(weeklyActions.filter((a) => a.role_id !== 'ceo'), 'data/actions.json');
  const eventSites = choiceSites(eventsJson.events ?? [], 'data/events.json');
  const dialogueSites = choiceSites(dialogueJson.additional_scenes ?? [], 'data/dialogue.json');

  /** Shared rule set for the surfaces where target_executive IS legal (CEO meetings + events). */
  function lintExecTargetingSurface(sites: ChoiceSite[]): string[] {
    const offenders: string[] = [];
    for (const site of sites) {
      const imm = site.effects_immediate;
      const del = site.effects_delayed;
      // executive_mood needs a route: a CEO-meeting/event choice has no implicit
      // executive, so the key REQUIRES a target_executive sibling.
      if ('executive_mood' in imm && !('target_executive' in imm)) {
        offenders.push(`${site.where} — effects_immediate.executive_mood has NO target_executive sibling (dead key on this surface: there is no implicit executive to receive it)`);
      }
      // target_executive needs a payload + a valid value, and is immediate-only.
      if ('target_executive' in imm) {
        if (!('executive_mood' in imm)) {
          offenders.push(`${site.where} — target_executive without an executive_mood sibling (directive routes nothing)`);
        }
        const v = imm.target_executive;
        if (typeof v !== 'string' || !VALID_EXEC_TARGETS.has(v)) {
          offenders.push(`${site.where} — target_executive value ${JSON.stringify(v)} invalid (must be one of: ${VALID_EXEC_TARGET_LIST.join(', ')})`);
        }
      }
      // Delayed executive_mood / target_executive are dead everywhere (no consumer).
      if ('executive_mood' in del) {
        offenders.push(`${site.where} — effects_delayed.executive_mood is a dead key (executive_mood only applies from effects_immediate)`);
      }
      if ('target_executive' in del) {
        offenders.push(`${site.where} — effects_delayed.target_executive is a dead directive (targeted exec mood is immediate-only)`);
      }
    }
    return offenders;
  }

  it('CEO meeting choices: executive_mood requires a target_executive sibling (and the directive is valid + immediate-only)', () => {
    expect(lintExecTargetingSurface(ceoSites)).toEqual([]);
  });

  it('event choices: executive_mood requires a target_executive sibling (and the directive is valid + immediate-only)', () => {
    expect(lintExecTargetingSurface(eventSites)).toEqual([]);
  });

  it('role-meeting (non-CEO) choices must NOT carry target_executive — their executive is implicit', () => {
    const offenders: string[] = [];
    for (const site of roleSites) {
      for (const [block, eff] of [['effects_immediate', site.effects_immediate], ['effects_delayed', site.effects_delayed]] as const) {
        if ('target_executive' in eff) {
          offenders.push(`${site.where} — ${block}.target_executive on a role meeting (the meeting's own executive is implicit via metadata.executiveId; the directive is ignored there)`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('target_artist is an EVENT-choice-only directive with value predetermined|global', () => {
    const offenders: string[] = [];
    // Valid values on the event surface.
    for (const site of eventSites) {
      for (const [block, eff] of [['effects_immediate', site.effects_immediate], ['effects_delayed', site.effects_delayed]] as const) {
        if ('target_artist' in eff) {
          const v = eff.target_artist;
          if (typeof v !== 'string' || !VALID_ARTIST_TARGETS.has(v)) {
            offenders.push(`${site.where} — ${block}.target_artist value ${JSON.stringify(v)} invalid (must be 'predetermined' or 'global')`);
          }
        }
      }
    }
    // Forbidden anywhere in actions.json (meetings target via target_scope) and dialogue.json.
    for (const site of [...ceoSites, ...roleSites, ...dialogueSites]) {
      for (const [block, eff] of [['effects_immediate', site.effects_immediate], ['effects_delayed', site.effects_delayed]] as const) {
        if ('target_artist' in eff) {
          offenders.push(`${site.where} — ${block}.target_artist outside events.json (meetings/dialogue target artists via target_scope, not this directive)`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('dialogue choices must NOT carry targeting directives (no resolver on that surface)', () => {
    const offenders: string[] = [];
    for (const site of dialogueSites) {
      for (const [block, eff] of [['effects_immediate', site.effects_immediate], ['effects_delayed', site.effects_delayed]] as const) {
        for (const key of Object.keys(eff)) {
          if (TARGETING_DIRECTIVE_KEYS.has(key) && key !== 'target_artist') {
            // target_artist offenders are already reported by the event-only rule above.
            offenders.push(`${site.where} — ${block}.${key} in dialogue.json (artist dialogue has no targeting resolver)`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the lint rules themselves catch offenders in both directions (rule self-test on synthetic fixtures)', () => {
    // Direction 1: executive_mood without a route on a CEO/event surface.
    const missingDirective = lintExecTargetingSurface([
      { where: 'fixture :: meeting :: choice', effects_immediate: { executive_mood: 5 }, effects_delayed: {} },
    ]);
    expect(missingDirective).toHaveLength(1);
    expect(missingDirective[0]).toContain('NO target_executive sibling');

    // Direction 2a: directive without a payload.
    const missingPayload = lintExecTargetingSurface([
      { where: 'fixture :: meeting :: choice', effects_immediate: { target_executive: 'cmo' }, effects_delayed: {} },
    ]);
    expect(missingPayload).toHaveLength(1);
    expect(missingPayload[0]).toContain('without an executive_mood sibling');

    // Direction 2b: invalid target value.
    const badValue = lintExecTargetingSurface([
      { where: 'fixture :: meeting :: choice', effects_immediate: { executive_mood: 5, target_executive: 'intern' }, effects_delayed: {} },
    ]);
    expect(badValue).toHaveLength(1);
    expect(badValue[0]).toContain('invalid');

    // Direction 2c: delayed placement is dead.
    const delayedPlacement = lintExecTargetingSurface([
      { where: 'fixture :: meeting :: choice', effects_immediate: {}, effects_delayed: { executive_mood: 5, target_executive: 'cmo' } },
    ]);
    expect(delayedPlacement).toHaveLength(2);

    // Happy path: correctly routed executive_mood produces no offenders.
    const happy = lintExecTargetingSurface([
      { where: 'fixture :: meeting :: choice', effects_immediate: { executive_mood: -5, target_executive: 'all' }, effects_delayed: {} },
    ]);
    expect(happy).toEqual([]);
  });
});
