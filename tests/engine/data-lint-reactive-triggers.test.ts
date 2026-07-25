import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { HAPPENING_TYPES } from '@shared/types/gameTypes';
import type { HappeningType, RelevanceTag } from '@shared/types/gameTypes';

/**
 * Tier 2 (PR-1) — THE REACTIVE-TRIGGER DATA-LINT GUARD.
 *
 * Sibling of data-lint-relevance-tags.test.ts (same load-the-JSON-directly,
 * no-DB pattern). Guards the `reactive_trigger` field on data/actions.json
 * weekly_actions:
 *
 *  1. Every `reactive_trigger` value is in the canonical HAPPENING_TYPES enum
 *     (shared/types/gameTypes.ts — the single source of truth both Zod
 *     surfaces derive from).
 *  2. (RELAXED 2026-07-20 — designer decision) Multiple meetings in one exec's
 *     pool MAY own the SAME (role_id, reactive_trigger) pair: when the trigger
 *     fires with >1 eligible owner, the injection stage picks ONE uniformly at
 *     random via its isolated seeded tie-break (shared/engine/meetingSelection.ts
 *     matchReactiveMeeting step 3). The old at-most-one-owner uniqueness lint
 *     is gone; the sanity test below pins the exact authored multiset instead.
 *  3. Reactive meetings' `requires` tags are consistent with their trigger.
 *     Chosen mapping (documented here, not derived — this is a lint policy):
 *       - mood_crater, recent_signing => must require 'artist_signed'
 *         (both triggers are impossible without a signed artist).
 *       - chart_debut => must require 'music_exists'
 *         (a charting song is necessarily a recorded song).
 *       - release_out => must require 'release_planned' OR 'music_exists'
 *         (a release going out implies either a planned release or existing
 *         music, depending on how the meeting frames it — both are honest
 *         minimums depending on authored copy).
 *
 * PR-2 authored the first 5 reactive meetings (one per exec — head_ar x
 * recent_signing, cmo x chart_debut, ceo x chart_debut, cco x mood_crater,
 * head_distribution x release_out), so these rules now do real work: the
 * canonical-enum, per-(role,trigger) uniqueness, and requires-consistency
 * checks all run over a non-empty reactive subset. Cross-exec duplication of
 * chart_debut (cmo + ceo) is intentional and permitted by rule 2, which keys
 * uniqueness on (role_id, trigger), not trigger alone.
 *
 * Spec: docs/01-planning/implementation-specs/[READY] tier2-reactive-meetings-and-side-events-plan.md §2.
 */

const CANONICAL_TYPES: ReadonlySet<string> = new Set(HAPPENING_TYPES);

function loadJson(rel: string): any {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), rel), 'utf-8'));
}

const actions = loadJson('data/actions.json');
const roleMeetings: Array<{
  id: string;
  role_id?: string;
  requires?: RelevanceTag[];
  reactive_trigger?: HappeningType;
}> = (actions.weekly_actions as any[]).filter(
  (a) => a.type === 'role_meeting' && !String(a.id).startsWith('TEST_')
);

const reactiveMeetings = roleMeetings.filter((m) => m.reactive_trigger !== undefined);

const REQUIRED_TAG_BY_TRIGGER: Record<HappeningType, RelevanceTag[]> = {
  mood_crater: ['artist_signed'],
  recent_signing: ['artist_signed'],
  chart_debut: ['music_exists'],
  release_out: ['release_planned', 'music_exists'], // OR semantics for this one rule
};

describe('Data lint — reactive triggers (Tier 2, PR-1, dark launch)', () => {
  it('every reactive_trigger value in data/actions.json is a canonical HappeningType', () => {
    const offenders: string[] = [];
    for (const meeting of roleMeetings) {
      if (meeting.reactive_trigger === undefined) continue;
      if (!CANONICAL_TYPES.has(meeting.reactive_trigger)) {
        offenders.push(`${meeting.id} :: reactive_trigger "${meeting.reactive_trigger}" is not canonical`);
      }
    }
    expect(
      offenders,
      offenders.length
        ? `Non-canonical reactive_trigger value(s):\n  ${offenders.join('\n  ')}\nCanonical types: ${Array.from(CANONICAL_TYPES).sort().join(', ')}`
        : undefined
    ).toEqual([]);
  });

  it('shared (role_id, reactive_trigger) ownership is permitted, but each owner is a DISTINCT meeting id', () => {
    // The old at-most-one-owner rule was relaxed (see file header): the
    // injection stage's seeded tie-break picks one owner at random when
    // several are eligible. What must still hold is that no meeting id is
    // authored twice into the reactive set (a literal duplicate entry would
    // silently double that meeting's tie-break odds).
    const seenIds = new Set<string>();
    const offenders: string[] = [];
    for (const meeting of reactiveMeetings) {
      if (seenIds.has(meeting.id)) {
        offenders.push(`meeting id "${meeting.id}" appears more than once in the reactive set`);
      }
      seenIds.add(meeting.id);
    }
    expect(
      offenders,
      offenders.length ? `Duplicate reactive meeting id(s):\n  ${offenders.join('\n  ')}` : undefined
    ).toEqual([]);
  });

  it('reactive meetings carry requires tags consistent with their trigger (see mapping in file header)', () => {
    const offenders: string[] = [];
    for (const meeting of reactiveMeetings) {
      const trigger = meeting.reactive_trigger!;
      const required = REQUIRED_TAG_BY_TRIGGER[trigger];
      const requires = meeting.requires ?? [];
      const satisfied = required.some((tag) => requires.includes(tag));
      if (!satisfied) {
        offenders.push(
          `${meeting.id} :: reactive_trigger "${trigger}" expects requires to include one of [${required.join(', ')}], got [${requires.join(', ')}]`
        );
      }
    }
    expect(
      offenders,
      offenders.length ? `Reactive meeting(s) with trigger/requires mismatch:\n  ${offenders.join('\n  ')}` : undefined
    ).toEqual([]);
  });

  it('sanity: the authored reactive set covers every exec (head_ar owns recent_signing TWICE — shared-trigger random ownership)', () => {
    // PR-2 dark-launched 5 reactive meetings (one per exec). The v3 Mac pool
    // adds head_ar × chart_debut (one_that_got_away_again) and the v3 Sam pool
    // swaps cmo × chart_debut to chart_debut_one_hour_window and adds
    // cmo × release_out (old_tweets_surface). 2026-07-20: demo_ethics_one was
    // restored to reactive on recent_signing alongside ar_recent_signing_plan
    // (shared ownership, random pick — see file header), so
    // head_ar:recent_signing appears TWICE in this multiset by design.
    const roleIds = Array.from(new Set(reactiveMeetings.map((m) => m.role_id)));
    expect(roleIds.sort()).toEqual(['ceo', 'cco', 'cmo', 'head_ar', 'head_distribution'].sort());
    const pairs = reactiveMeetings.map((m) => `${m.role_id}:${m.reactive_trigger}`).sort();
    expect(pairs).toEqual(
      [
        'ceo:chart_debut',
        'cco:mood_crater',
        'cmo:chart_debut',
        'cmo:release_out',
        'head_ar:chart_debut',
        'head_ar:recent_signing',
        'head_ar:recent_signing',
        'head_distribution:release_out',
      ].sort()
    );
  });
});
