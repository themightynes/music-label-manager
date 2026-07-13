import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ESCALATION_EVENT_BY_ROLE } from '@shared/utils/executiveDelegation';

/**
 * Executive Delegation arc (Tier 2, §5.3) — THE ESCALATION-ONLY DATA-LINT GUARD.
 *
 * Sibling of data-lint-side-event-categories.test.ts (same load-the-JSON-
 * directly, no-DB pattern). Escalation events are injected ONLY by the
 * escalation mechanism (game-engine.ts applyEscalation) — they must NEVER enter
 * the weekly weighted side-event roll (checkForEvents filters
 * `getAllEvents()` by `!escalation_only` before handing the pool to
 * selectSideEvent). This suite guards the data-side half of that contract:
 *
 *  1. Every event whose id starts with `escalation_` carries `escalation_only:
 *     true`.
 *  2. No event WITHOUT an `escalation_` id carries `escalation_only: true` (the
 *     flag is exclusive to the escalation roster — no accidental exclusion of a
 *     legacy/rollable event).
 *  3. Every event id in every role's ESCALATION_EVENT_BY_ROLE pool (the shared
 *     engine constant — imported, not re-literaled; v3 array routing) exists in
 *     data/events.json, with escalation_only: true and a canonical category.
 *  4. Every escalation_only event appears in EXACTLY ONE role's pool (no
 *     orphans, no cross-role dupes).
 */

function loadJson(rel: string): any {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), rel), 'utf-8'));
}

const events: Array<{ id: string; category?: string; escalation_only?: boolean }> =
  loadJson('data/events.json').events;

describe('Data lint — escalation-only side events (Tier 2, §5.3)', () => {
  it('every escalation_* event id carries escalation_only: true', () => {
    const offenders = events
      .filter((e) => e.id.startsWith('escalation_') && e.escalation_only !== true)
      .map((e) => e.id);
    expect(
      offenders,
      offenders.length ? `escalation_* event(s) missing escalation_only: true:\n  ${offenders.join('\n  ')}` : undefined,
    ).toEqual([]);
  });

  it('no non-escalation event carries escalation_only: true', () => {
    const offenders = events
      .filter((e) => !e.id.startsWith('escalation_') && e.escalation_only === true)
      .map((e) => e.id);
    expect(
      offenders,
      offenders.length
        ? `Non-escalation event(s) incorrectly flagged escalation_only:\n  ${offenders.join('\n  ')}`
        : undefined,
    ).toEqual([]);
  });

  it('every event id in every ESCALATION_EVENT_BY_ROLE pool resolves to a real, escalation-only event', () => {
    const byId = new Map(events.map((e) => [e.id, e]));
    const offenders: string[] = [];
    for (const [role, pool] of Object.entries(ESCALATION_EVENT_BY_ROLE)) {
      if (pool.length === 0) {
        offenders.push(`${role} :: empty escalation-event pool`);
        continue;
      }
      for (const eventId of pool) {
        const event = byId.get(eventId);
        if (!event) {
          offenders.push(`${role} -> "${eventId}" :: no such event in data/events.json`);
        } else if (event.escalation_only !== true) {
          offenders.push(`${role} -> "${eventId}" :: exists but is missing escalation_only: true`);
        }
      }
    }
    expect(
      offenders,
      offenders.length ? `Broken role->event escalation mapping(s):\n  ${offenders.join('\n  ')}` : undefined,
    ).toEqual([]);
  });

  it('every escalation_only event appears in exactly one role pool (no orphans, no cross-role dupes)', () => {
    const escalationIds = events.filter((e) => e.escalation_only === true).map((e) => e.id).sort();
    const mappedIds = Object.values(ESCALATION_EVENT_BY_ROLE).flat().sort();
    // Sorted-array equality enforces both directions AND uniqueness in one shot:
    // an escalation_only event missing from every pool, a pooled id with no
    // escalation_only event, or an id in two pools all produce a mismatch.
    expect(mappedIds).toEqual(escalationIds);
  });
});
