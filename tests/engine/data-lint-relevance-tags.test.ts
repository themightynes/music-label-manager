import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { RELEVANCE_TAGS, REQUIRES_STAT_NAMES } from '@shared/types/gameTypes';
import { deriveRelevanceState, filterEligible } from '@shared/engine/meetingSelection';
import type { RequiresEntry } from '@shared/types/gameTypes';

/**
 * Meeting-relevance Tier 0 (PR-1) — THE RELEVANCE-TAG DATA-LINT GUARD.
 *
 * Sibling of data-lint-effect-keys.test.ts (same load-the-JSON-directly, no-DB
 * pattern). Guards the `requires` vocabulary on data/actions.json weekly_actions:
 *
 *  1. Every `requires` value is in the canonical RELEVANCE_TAGS enum
 *     (shared/types/gameTypes.ts — the single source of truth both Zod
 *     surfaces derive from).
 *  2. Every role retains ≥1 meeting eligible under the FULL label state —
 *     a tag typo can never brick an exec's pool permanently.
 *  3. Every `user_selected`/`predetermined` meeting carries `artist_signed` —
 *     Tier 0 formalizes target_scope's implicit signed-artist contract.
 *
 * Spec: docs/01-planning/implementation-specs/[READY] meeting-relevance-tier0-1-plan.md §1.
 */

const CANONICAL_TAGS: ReadonlySet<string> = new Set(RELEVANCE_TAGS);
const CANONICAL_STATS: ReadonlySet<string> = new Set(REQUIRES_STAT_NAMES);

function loadJson(rel: string): any {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), rel), 'utf-8'));
}

const actions = loadJson('data/actions.json');
const roleMeetings: Array<{
  id: string;
  role_id?: string;
  target_scope?: string;
  requires?: RequiresEntry[];
}> = (actions.weekly_actions as any[]).filter(
  (a) => a.type === 'role_meeting' && !String(a.id).startsWith('TEST_')
);

/**
 * FULL label state: every relevance predicate true. M16: cash/reputation are
 * maximal (so `gte` threshold gates pass), one artist trips every per-artist
 * state tag, and every authored story flag reads as set (see FULL_STORY_FLAGS
 * below). NOTE: an `lte`-bounded gate or `{flag, is: false}` exclusion gate is
 * by definition NOT satisfiable under a maximal state — so the no-brick rule
 * (test 2) effectively requires every role to keep >= 1 meeting reachable at a
 * rich, week-10, all-flags-set label. That is the design intent: a role whose
 * ENTIRE pool is inverted-gated would genuinely sit out forever late-game.
 */
const FULL_STORY_FLAGS: Record<string, boolean> = {};
for (const meeting of roleMeetings) {
  for (const entry of meeting.requires ?? []) {
    if (typeof entry === 'object' && entry !== null && 'flag' in entry) {
      FULL_STORY_FLAGS[(entry as { flag: string }).flag] = true;
    }
  }
}

const FULL_STATE = deriveRelevanceState({
  artists: [
    { id: 'a1' },
    // Trips all three per-artist-state tags under the authored thresholds.
    { id: 'a2', mood: 0, energy: 0, popularity: 100 },
  ],
  projects: [
    { type: 'Single', stage: 'production', startWeek: 1 },
    { type: 'Mini-Tour', stage: 'production', startWeek: 1, metadata: { cities: 3, tourStats: { cities: [{}] } } },
  ],
  releases: [{ status: 'planned' }, { status: 'released' }],
  songs: [{ isRecorded: true, isReleased: true }],
  currentWeek: 10,
  cash: 100_000_000,
  reputation: 100,
  flags: { story: FULL_STORY_FLAGS },
});

describe('Data lint — meeting relevance tags (Tier 0, PR-1)', () => {
  it('every requires entry in data/actions.json is grammar-valid (tag | {stat,gte/lte} | {flag,is?})', () => {
    const offenders: string[] = [];
    for (const meeting of roleMeetings) {
      if (meeting.requires === undefined) continue;
      if (!Array.isArray(meeting.requires) || meeting.requires.length === 0) {
        offenders.push(`${meeting.id} :: requires must be a non-empty array when present (got ${JSON.stringify(meeting.requires)})`);
        continue;
      }
      for (const entry of meeting.requires) {
        if (typeof entry === 'string') {
          if (!CANONICAL_TAGS.has(entry)) {
            offenders.push(`${meeting.id} :: requires contains non-canonical tag "${entry}" — canonical tags: ${Array.from(CANONICAL_TAGS).sort().join(', ')}`);
          }
          continue;
        }
        if (entry && typeof entry === 'object' && 'stat' in entry) {
          const { stat, gte, lte, ...rest } = entry as unknown as Record<string, unknown>;
          if (!CANONICAL_STATS.has(String(stat))) {
            offenders.push(`${meeting.id} :: requires threshold has unknown stat "${String(stat)}" — valid stats: ${Array.from(CANONICAL_STATS).sort().join(', ')}`);
          }
          if (gte === undefined && lte === undefined) {
            offenders.push(`${meeting.id} :: requires threshold on "${String(stat)}" has no bound — provide gte and/or lte`);
          }
          if (gte !== undefined && typeof gte !== 'number') {
            offenders.push(`${meeting.id} :: requires threshold gte must be a number (got ${JSON.stringify(gte)})`);
          }
          if (lte !== undefined && typeof lte !== 'number') {
            offenders.push(`${meeting.id} :: requires threshold lte must be a number (got ${JSON.stringify(lte)})`);
          }
          const extraKeys = Object.keys(rest);
          if (extraKeys.length > 0) {
            offenders.push(`${meeting.id} :: requires threshold has unknown key(s) ${extraKeys.join(', ')} — only stat/gte/lte are allowed`);
          }
          continue;
        }
        if (entry && typeof entry === 'object' && 'flag' in entry) {
          const { flag, is, ...rest } = entry as unknown as Record<string, unknown>;
          if (typeof flag !== 'string' || !/^[a-z][a-z0-9_]*$/.test(flag)) {
            offenders.push(`${meeting.id} :: requires flag gate has invalid key ${JSON.stringify(flag)} — story-flag keys must be snake_case identifiers`);
          }
          if (is !== undefined && typeof is !== 'boolean') {
            offenders.push(`${meeting.id} :: requires flag gate "is" must be a boolean (got ${JSON.stringify(is)})`);
          }
          const extraKeys = Object.keys(rest);
          if (extraKeys.length > 0) {
            offenders.push(`${meeting.id} :: requires flag gate has unknown key(s) ${extraKeys.join(', ')} — only flag/is are allowed`);
          }
          continue;
        }
        offenders.push(`${meeting.id} :: unrecognized requires entry ${JSON.stringify(entry)} — must be a relevance tag string, {stat, gte/lte} or {flag, is?}`);
      }
    }
    expect(
      offenders,
      offenders.length
        ? `Invalid requires entr(ies) found:\n  ${offenders.join('\n  ')}`
        : undefined
    ).toEqual([]);
  });

  it('every role has at least one meeting eligible under FULL label state (a tag typo cannot brick a pool)', () => {
    const byRole = new Map<string, typeof roleMeetings>();
    for (const meeting of roleMeetings) {
      const role = meeting.role_id ?? '?';
      if (!byRole.has(role)) byRole.set(role, []);
      byRole.get(role)!.push(meeting);
    }

    const brickedRoles: string[] = [];
    byRole.forEach((pool, role) => {
      const eligible = filterEligible(pool, FULL_STATE);
      if (eligible.length === 0) {
        brickedRoles.push(`${role} (pool: ${pool.map((m: { id: string }) => m.id).join(', ')})`);
      }
    });
    expect(
      brickedRoles,
      brickedRoles.length
        ? `Role(s) with ZERO eligible meetings even under full label state:\n  ${brickedRoles.join('\n  ')}`
        : undefined
    ).toEqual([]);
  });

  it('every user_selected/predetermined meeting carries artist_signed (the formalized target_scope contract)', () => {
    const offenders: string[] = [];
    for (const meeting of roleMeetings) {
      const scope = meeting.target_scope ?? 'global';
      if (scope !== 'user_selected' && scope !== 'predetermined') continue;
      if (!(meeting.requires ?? []).includes('artist_signed')) {
        offenders.push(`${meeting.id} (target_scope: ${scope})`);
      }
    }
    expect(
      offenders,
      offenders.length
        ? `Meeting(s) that resolve/prompt for an artist but do not require artist_signed:\n  ${offenders.join('\n  ')}`
        : undefined
    ).toEqual([]);
  });
});
