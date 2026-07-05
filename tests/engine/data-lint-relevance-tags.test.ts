import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { RELEVANCE_TAGS } from '@shared/types/gameTypes';
import { deriveRelevanceState, filterEligible } from '@shared/engine/meetingSelection';
import type { RelevanceTag } from '@shared/types/gameTypes';

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

function loadJson(rel: string): any {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), rel), 'utf-8'));
}

const actions = loadJson('data/actions.json');
const roleMeetings: Array<{
  id: string;
  role_id?: string;
  target_scope?: string;
  requires?: RelevanceTag[];
}> = (actions.weekly_actions as any[]).filter(
  (a) => a.type === 'role_meeting' && !String(a.id).startsWith('TEST_')
);

/** FULL label state: every relevance predicate true. */
const FULL_STATE = deriveRelevanceState({
  artists: [{ id: 'a1' }],
  projects: [
    { type: 'Single', stage: 'production', startWeek: 1 },
    { type: 'Mini-Tour', stage: 'production', startWeek: 1, metadata: { cities: 3, tourStats: { cities: [{}] } } },
  ],
  releases: [{ status: 'planned' }, { status: 'released' }],
  songs: [{ isRecorded: true, isReleased: true }],
  currentWeek: 10,
});

describe('Data lint — meeting relevance tags (Tier 0, PR-1)', () => {
  it('every requires value in data/actions.json is a canonical relevance tag', () => {
    const offenders: string[] = [];
    for (const meeting of roleMeetings) {
      if (meeting.requires === undefined) continue;
      if (!Array.isArray(meeting.requires) || meeting.requires.length === 0) {
        offenders.push(`${meeting.id} :: requires must be a non-empty array when present (got ${JSON.stringify(meeting.requires)})`);
        continue;
      }
      for (const tag of meeting.requires) {
        if (!CANONICAL_TAGS.has(tag)) {
          offenders.push(`${meeting.id} :: requires contains non-canonical tag "${tag}"`);
        }
      }
    }
    expect(
      offenders,
      offenders.length
        ? `Non-canonical relevance tag(s) found:\n  ${offenders.join('\n  ')}\nCanonical tags are: ${Array.from(CANONICAL_TAGS).sort().join(', ')}`
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
