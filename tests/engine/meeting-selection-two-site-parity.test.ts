/**
 * Engine-verbs M16 (requires-gates) — TWO-SITE PARITY GUARD.
 *
 * The weekly meeting a player is OFFERED is selected route-side
 * (server/routes/executives.ts GET /api/roles/:roleId), while an un-acted
 * exec's AUTONOMOUS resolution re-derives that same selection inside the
 * advance-week transaction (shared/engine/game-engine.ts
 * resolveAutonomousExecMeetings). If the two sites ever thread the selection
 * inputs differently, the autonomous resolution silently diverges from what
 * was offered.
 *
 * M16 added three new inputs (cash, story flags, per-artist-state thresholds)
 * and forced both sites through ONE lockstep helper — buildRelevanceInput
 * (shared/engine/meetingSelection.ts). This test reproduces each site's input
 * assembly EXACTLY as coded and proves that, for identical persisted state,
 * both sites produce:
 *   1. a deep-equal MeetingRelevanceState,
 *   2. an identical eligible pool under the FULL new grammar,
 *   3. the identical seeded pick.
 *
 * If a future change edits one call site's assembly without the other, update
 * the corresponding SIMULATION below in the same commit — that asymmetry is
 * exactly what this test exists to surface.
 */
import { describe, it, expect } from 'vitest';
import {
  buildRelevanceInput,
  deriveRelevanceState,
  filterEligible,
  selectWeeklyMeetingWithHappenings,
} from '@shared/engine/meetingSelection';
import type {
  RelevanceArtistInput,
  RelevanceProjectInput,
  RelevanceReleaseInput,
  RelevanceSongInput,
  ArtistStateThresholds,
  MeetingRelevanceState,
} from '@shared/engine/meetingSelection';
import { generateMeetingSeed } from '@shared/utils/seededRandom';
import type { RequiresEntry } from '@shared/types/gameTypes';

// --- Identical persisted state both sites read ------------------------------

const gameId = 'parity-game';
const week = 12;

const artists: RelevanceArtistInput[] = [
  { id: 'a1', signedWeek: 10, mood: 25, energy: 80, popularity: 15 },
  { id: 'a2', signedWeek: 2, mood: 70, energy: 20, popularity: 85 },
];
const projects: RelevanceProjectInput[] = [
  { type: 'Single', stage: 'production', startWeek: 11 },
];
const releases: RelevanceReleaseInput[] = [
  { status: 'planned', releaseWeek: 14 },
  { status: 'released', releaseWeek: 6 },
];
const songs: RelevanceSongInput[] = [
  { isRecorded: true, isReleased: true },
  { isRecorded: true, isReleased: false },
];
const gameStateRow = {
  money: 68_000,
  reputation: 31,
  flags: { story: { dante_deal_taken: true }, pending_side_event: null },
};
const tuning = {
  relevance_weight: 3.0,
  recency_window_weeks: 4,
  artist_state_thresholds: {
    low_mood_lt: 40,
    high_popularity_gte: 70,
    low_energy_lt: 30,
  } satisfies ArtistStateThresholds,
};

// A pool exercising EVERY grammar form (plain tags, all three stats, both
// flag polarities, all three artist-state tags), plus never-eligible controls.
const pool = [
  { id: 'plain_tags', category: 'business', requires: ['artist_signed', 'music_exists'] as RequiresEntry[] },
  { id: 'cash_gate_pass', category: 'business', requires: [{ stat: 'cash', gte: 50_000 }] as RequiresEntry[] },
  { id: 'cash_gate_fail', category: 'business', requires: [{ stat: 'cash', gte: 100_000 }] as RequiresEntry[] },
  { id: 'week_range', category: 'business', requires: [{ stat: 'week', gte: 10, lte: 20 }] as RequiresEntry[] },
  { id: 'rep_ceiling', category: 'business', requires: [{ stat: 'reputation', lte: 40 }] as RequiresEntry[] },
  { id: 'flag_set', category: 'business', requires: [{ flag: 'dante_deal_taken' }] as RequiresEntry[] },
  { id: 'flag_excl_fail', category: 'business', requires: [{ flag: 'dante_deal_taken', is: false }] as RequiresEntry[] },
  { id: 'flag_unwritten_fail', category: 'business', requires: [{ flag: 'never_written' }] as RequiresEntry[] },
  { id: 'low_mood', category: 'talent', requires: ['any_artist_low_mood'] as RequiresEntry[] },
  { id: 'high_pop', category: 'talent', requires: ['any_artist_high_popularity'] as RequiresEntry[] },
  { id: 'low_energy', category: 'live', requires: ['any_artist_low_energy'] as RequiresEntry[] },
  { id: 'mixed_all', category: 'business', requires: ['artist_signed', { stat: 'cash', gte: 1_000 }, { flag: 'dante_deal_taken' }, 'any_artist_low_mood'] as RequiresEntry[] },
  { id: 'unconditional', category: 'business' },
];

// --- SIMULATIONS of the two call sites' input assembly, verbatim ------------

/** server/routes/executives.ts GET /api/roles/:roleId (the offered meeting). */
function routeSiteState(): MeetingRelevanceState {
  const relevanceGameState = gameStateRow; // storage.getGameState(gameId)
  return deriveRelevanceState(buildRelevanceInput({
    artists,
    projects,
    releases,
    songs,
    currentWeek: week,
    gameState: relevanceGameState
      ? {
          money: relevanceGameState.money,
          reputation: relevanceGameState.reputation,
          flags: relevanceGameState.flags,
        }
      : null,
    recencyWindowWeeks: tuning.recency_window_weeks,
    artistStateThresholds: tuning.artist_state_thresholds,
  }));
}

/** shared/engine/game-engine.ts resolveAutonomousExecMeetings (the re-derivation). */
function engineSiteState(): MeetingRelevanceState {
  const offeredWeek = week; // (currentWeek was already incremented; engine passes currentWeek - 1)
  const gameState = gameStateRow; // this.gameState
  return deriveRelevanceState(buildRelevanceInput({
    artists,
    projects,
    releases,
    songs,
    currentWeek: offeredWeek,
    gameState: {
      money: gameState.money,
      reputation: gameState.reputation,
      flags: gameState.flags,
    },
    recencyWindowWeeks: tuning.recency_window_weeks,
    artistStateThresholds: tuning.artist_state_thresholds,
  }));
}

describe('M16 two-site parity — route offer vs engine autonomous re-derivation', () => {
  it('both sites derive a deep-equal relevance state from identical persisted state', () => {
    expect(engineSiteState()).toEqual(routeSiteState());
  });

  it('both sites produce the identical eligible pool under the full new grammar', () => {
    const routeEligible = filterEligible(pool, routeSiteState()).map((m) => m.id);
    const engineEligible = filterEligible(pool, engineSiteState()).map((m) => m.id);
    expect(engineEligible).toEqual(routeEligible);
    // Sanity: the grammar actually discriminated (not an all-pass/all-fail fluke).
    expect(routeEligible).toContain('cash_gate_pass');
    expect(routeEligible).toContain('flag_set');
    expect(routeEligible).toContain('low_mood');
    expect(routeEligible).toContain('mixed_all');
    expect(routeEligible).not.toContain('cash_gate_fail');
    expect(routeEligible).not.toContain('flag_excl_fail');
    expect(routeEligible).not.toContain('flag_unwritten_fail');
  });

  it('both sites make the identical seeded pick (same seed, same tuning, same happenings)', () => {
    const seed = generateMeetingSeed(gameId, week, 'head_ar');
    const routePick = selectWeeklyMeetingWithHappenings(pool, routeSiteState(), seed, [], {
      relevanceWeight: tuning.relevance_weight,
      recencyWindowWeeks: tuning.recency_window_weeks,
    });
    const enginePick = selectWeeklyMeetingWithHappenings(pool, engineSiteState(), seed, [], {
      relevanceWeight: tuning.relevance_weight,
      recencyWindowWeeks: tuning.recency_window_weeks,
    });
    expect(enginePick.meeting?.id).toBe(routePick.meeting?.id);
    expect(routePick.meeting).not.toBeNull();
  });
});
