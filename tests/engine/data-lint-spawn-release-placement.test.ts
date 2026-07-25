import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Data lint — spawn_release PLACEMENT (code-review finding F1, 2026-07-21).
 *
 * The engine's granted-song → spawn_release handoff lives in a LOCAL variable
 * scoped to a single applyEffects call (ActionProcessor.applyEffects:
 * `let grantedSong = null`, set by the 'grant_song' case, consumed by a sibling
 * 'spawn_release' with songs:'granted' later in the SAME effects block).
 * Delayed effects drain weeks later via processDelayedEffects → a FRESH
 * applyEffects call, so `grantedSong` is always null there and the spawn
 * warn-and-skips — while the outcome text still promises the player a release.
 * (This exact bug shipped in wall_of_misses/leak_the_heat.)
 *
 * Rules (verified against ActionProcessor.ts's 'spawn_release' case):
 *  1. spawn_release in effects_delayed is INVALID unless songs === 'latest_recorded'.
 *     'granted' (the engine default for any other value) can never resolve in a
 *     delayed pass; 'latest_recorded' is delayed-safe because it queries the DB
 *     for the targeted artist's newest recorded song, and delayed-effect flags
 *     preserve artistId. Timing intent belongs in defer_weeks, not the block.
 *  2. spawn_release with songs:'granted' in effects_immediate REQUIRES a
 *     grant_song sibling authored BEFORE it in the same block (applyEffects
 *     iterates Object.entries in insertion order, which JSON.parse preserves) —
 *     otherwise the same silent skip fires with no delayed block involved.
 */

const EFFECT_BLOCK_KEYS = ['effects_immediate', 'effects_delayed'] as const;
const DATA_FILES = ['data/actions.json', 'data/events.json', 'data/dialogue.json'];

function loadJson(rel: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), rel), 'utf-8'));
}

interface EffectBlockSite {
  /** e.g. "data/actions.json/wall_of_misses/leak_the_heat" */
  crumb: string;
  block: (typeof EFFECT_BLOCK_KEYS)[number];
  /** Keys in authored (insertion) order — order matters for rule 2. */
  keys: string[];
  effects: Record<string, unknown>;
}

/** Recursively collect every effects_immediate/effects_delayed block with a breadcrumb. */
function collectEffectBlocks(node: unknown, crumb: string, out: EffectBlockSite[]): void {
  if (Array.isArray(node)) {
    for (const item of node) collectEffectBlocks(item, crumb, out);
    return;
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    const nextCrumb = typeof obj.id === 'string' ? `${crumb}/${obj.id}` : crumb;
    for (const block of EFFECT_BLOCK_KEYS) {
      const eff = obj[block];
      if (eff && typeof eff === 'object' && !Array.isArray(eff)) {
        const effects = eff as Record<string, unknown>;
        out.push({ crumb: nextCrumb, block, keys: Object.keys(effects), effects });
      }
    }
    for (const [k, v] of Object.entries(obj)) {
      if (!EFFECT_BLOCK_KEYS.includes(k as any)) collectEffectBlocks(v, nextCrumb, out);
    }
  }
}

/** The lint rule itself — extracted so the self-test below can feed it fixtures. */
function lintSpawnReleasePlacement(sites: EffectBlockSite[]): string[] {
  const offenders: string[] = [];
  for (const site of sites) {
    if (!('spawn_release' in site.effects)) continue;
    const value = site.effects.spawn_release as Record<string, unknown> | undefined;
    const songsMode = value && typeof value === 'object' ? value.songs : undefined;
    // Rule 1: delayed spawn_release only works in 'latest_recorded' mode.
    if (site.block === 'effects_delayed' && songsMode !== 'latest_recorded') {
      offenders.push(
        `${site.crumb} :: effects_delayed.spawn_release (songs: ${JSON.stringify(songsMode)}) — ` +
        `'granted' mode consumes a grant_song from the SAME applyEffects pass; delayed blocks run in a fresh pass ` +
        `where grantedSong is always null, so the release silently never spawns. ` +
        `Move it to effects_immediate next to its grant_song (use defer_weeks for timing), or use songs: 'latest_recorded'.`
      );
      continue;
    }
    // Rule 2: immediate 'granted' mode needs a grant_song authored EARLIER in the block.
    if (site.block === 'effects_immediate' && songsMode !== 'latest_recorded') {
      const grantIdx = site.keys.indexOf('grant_song');
      const spawnIdx = site.keys.indexOf('spawn_release');
      if (grantIdx === -1) {
        offenders.push(
          `${site.crumb} :: effects_immediate.spawn_release (songs: 'granted') has NO grant_song sibling — ` +
          `there is no granted song to release, so the engine warn-and-skips.`
        );
      } else if (grantIdx > spawnIdx) {
        offenders.push(
          `${site.crumb} :: effects_immediate.spawn_release (songs: 'granted') is authored BEFORE its grant_song sibling — ` +
          `applyEffects processes keys in authored order, so the spawn runs while grantedSong is still null. Author grant_song first.`
        );
      }
    }
  }
  return offenders;
}

function sitesOf(rel: string): EffectBlockSite[] {
  const out: EffectBlockSite[] = [];
  collectEffectBlocks(loadJson(rel), rel, out);
  return out;
}

describe('Data lint — spawn_release placement (granted-song handoff is same-pass only)', () => {
  for (const rel of DATA_FILES) {
    it(`${rel}: no delayed 'granted'-mode spawn_release; immediate 'granted' spawns have an earlier grant_song sibling`, () => {
      const offenders = lintSpawnReleasePlacement(sitesOf(rel));
      expect(
        offenders,
        offenders.length ? `spawn_release placement failure(s):\n  ${offenders.join('\n  ')}` : undefined
      ).toEqual([]);
    });
  }

  it('the lint rule itself catches all offender shapes (rule self-test on synthetic fixtures)', () => {
    const site = (
      block: EffectBlockSite['block'],
      effects: Record<string, unknown>
    ): EffectBlockSite => ({ crumb: 'fixture/meeting/choice', block, keys: Object.keys(effects), effects });

    // Offender 1: the shipped F1 bug — 'granted' spawn in a delayed block.
    const delayedGranted = lintSpawnReleasePlacement([
      site('effects_delayed', { spawn_release: { songs: 'granted', type: 'single', defer_weeks: 2 } }),
    ]);
    expect(delayedGranted).toHaveLength(1);
    expect(delayedGranted[0]).toContain('fresh pass');

    // Offender 2: immediate 'granted' spawn with no grant_song at all.
    const orphanSpawn = lintSpawnReleasePlacement([
      site('effects_immediate', { spawn_release: { songs: 'granted', type: 'single' } }),
    ]);
    expect(orphanSpawn).toHaveLength(1);
    expect(orphanSpawn[0]).toContain('NO grant_song sibling');

    // Offender 3: grant_song authored AFTER the spawn (order matters in-pass).
    const wrongOrder = lintSpawnReleasePlacement([
      site('effects_immediate', {
        spawn_release: { songs: 'granted', type: 'single' },
        grant_song: { quality: 60, artist: 'targeted' },
      }),
    ]);
    expect(wrongOrder).toHaveLength(1);
    expect(wrongOrder[0]).toContain('BEFORE its grant_song sibling');

    // Happy path A: grant_song then 'granted' spawn in the same immediate block.
    expect(
      lintSpawnReleasePlacement([
        site('effects_immediate', {
          grant_song: { quality: 60, artist: 'targeted' },
          spawn_release: { songs: 'granted', type: 'single', defer_weeks: 2 },
        }),
      ])
    ).toEqual([]);

    // Happy path B: 'latest_recorded' is legal in BOTH blocks (no handoff, DB-resolved,
    // delayed flags preserve artistId).
    expect(
      lintSpawnReleasePlacement([
        site('effects_immediate', { spawn_release: { songs: 'latest_recorded', type: 'single' } }),
        site('effects_delayed', { spawn_release: { songs: 'latest_recorded', type: 'single' } }),
      ])
    ).toEqual([]);
  });
});
