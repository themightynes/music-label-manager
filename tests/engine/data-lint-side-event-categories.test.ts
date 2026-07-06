import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SIDE_EVENT_CATEGORIES } from '@shared/types/gameTypes';
import type { SideEventCategory } from '@shared/types/gameTypes';

/**
 * Tier 2 (PR-3) — THE SIDE-EVENT CATEGORY DATA-LINT GUARD.
 *
 * Sibling of data-lint-reactive-triggers.test.ts (same load-the-JSON-directly,
 * no-DB pattern). Guards the `category` field the PR added to every event in
 * data/events.json:
 *
 *  1. Every event's `category` is in the canonical SIDE_EVENT_CATEGORIES enum
 *     (shared/types/gameTypes.ts — the single source of truth the SideEvent Zod
 *     schema derives from).
 *  2. Every authored `category` has a corresponding entry in the
 *     `event_weights` table (data/balance/events.json). An authored category
 *     with no weight would be selected with weight 0 (effectively never), which
 *     is a silent authoring bug — this is a HARD assertion.
 *  3. Every `event_weights` key is a canonical category, and (warn-level, as a
 *     documented expectation rather than a hard failure) each weight key maps to
 *     ≥0 events — a weight key with zero authored events is permitted (e.g.
 *     `artist_personal` today), so this is asserted as coverage reporting, not a
 *     failure.
 *
 * Effect keys are already linted by data-lint-effect-keys.test.ts (which
 * explicitly includes data/events.json in its DATA_FILES), so this suite does
 * not re-check them.
 *
 * Spec: docs/01-planning/implementation-specs/[READY] tier2-reactive-meetings-and-side-events-plan.md §3.
 */

const CANONICAL_CATEGORIES: ReadonlySet<string> = new Set(SIDE_EVENT_CATEGORIES);

function loadJson(rel: string): any {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), rel), 'utf-8'));
}

const events: Array<{ id: string; category?: string }> = loadJson('data/events.json').events;
const eventWeights: Record<string, number> = loadJson('data/balance/events.json').side_events.event_weights;

describe('Data lint — side-event categories (Tier 2, PR-3)', () => {
  it('every event in data/events.json has a canonical category', () => {
    const offenders: string[] = [];
    for (const event of events) {
      if (event.category === undefined) {
        offenders.push(`${event.id} :: missing category`);
      } else if (!CANONICAL_CATEGORIES.has(event.category)) {
        offenders.push(`${event.id} :: category "${event.category}" is not canonical`);
      }
    }
    expect(
      offenders,
      offenders.length
        ? `Non-canonical / missing category on event(s):\n  ${offenders.join('\n  ')}\nCanonical: ${Array.from(CANONICAL_CATEGORIES).sort().join(', ')}`
        : undefined
    ).toEqual([]);
  });

  it('every authored category has an event_weights entry in data/balance/events.json', () => {
    const offenders: string[] = [];
    for (const event of events) {
      const cat = event.category as SideEventCategory | undefined;
      if (cat && !(cat in eventWeights)) {
        offenders.push(`${event.id} :: category "${cat}" has no weight in event_weights`);
      }
    }
    expect(
      offenders,
      offenders.length ? `Authored categories missing from event_weights:\n  ${offenders.join('\n  ')}` : undefined
    ).toEqual([]);
  });

  it('every event_weights key is a canonical category', () => {
    const offenders = Object.keys(eventWeights).filter((k) => !CANONICAL_CATEGORIES.has(k));
    expect(
      offenders,
      offenders.length ? `Non-canonical event_weights key(s): ${offenders.join(', ')}` : undefined
    ).toEqual([]);
  });

  it('coverage (warn-level): reports weight keys with zero authored events', () => {
    // Not a failure — a category can be authored in the weight table ahead of any
    // event using it (artist_personal today). This documents the coverage so a
    // reviewer sees which categories are dark.
    const counts: Record<string, number> = {};
    for (const key of Object.keys(eventWeights)) counts[key] = 0;
    for (const event of events) {
      if (event.category && event.category in counts) counts[event.category] += 1;
    }
    const dark = Object.entries(counts).filter(([, n]) => n === 0).map(([k]) => k);
    // Assert the shape holds (every category counted), not that dark is empty.
    expect(Object.keys(counts).sort()).toEqual(Array.from(CANONICAL_CATEGORIES).sort());
    if (dark.length > 0) {
      console.warn(`[side-event coverage] categories with zero authored events: ${dark.join(', ')}`);
    }
  });
});
