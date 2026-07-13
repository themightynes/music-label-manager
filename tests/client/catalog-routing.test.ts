/**
 * Engine-verbs M1a/M1b — WeekSummary bucket routing for tangible-catalog entries.
 *
 * 'song_granted' and 'release_spawned' MUST land in the rendered catalogNotable
 * bucket, never in the never-rendered `other` bucket (this repo's recurring
 * swallow-bug — the awareness-arc invisible-event failure class).
 *
 * Pure-module test (no full WeekSummary mount) — routing lives in
 * categorizeWeekChanges (creative-capital-routing.test.ts precedent).
 */
import { describe, it, expect } from 'vitest';
import { categorizeWeekChanges } from '@/components/week-summary/categorizeChanges';
import type { GameChange } from '@shared/types/gameTypes';

const songGranted: GameChange = {
  type: 'song_granted',
  description: 'New recording in the vault: "Wall of Misses" — Nova Sterling',
};
const releaseSpawned: GameChange = {
  type: 'release_spawned',
  description: 'Surprise release: "Wall of Misses" — Nova Sterling heads straight to the airwaves',
};

describe('categorizeWeekChanges (tangible-catalog routing)', () => {
  it('routes song_granted and release_spawned into catalogNotable, NOT other', () => {
    const categories = categorizeWeekChanges([songGranted, releaseSpawned]);
    expect(categories.catalogNotable).toEqual([songGranted, releaseSpawned]);
    expect(categories.other).toEqual([]);
  });
});
