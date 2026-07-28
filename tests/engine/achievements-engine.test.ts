/**
 * AchievementsEngine — C62 regression tests.
 *
 * Covers:
 *  (a) Media Mogul achievement requires the TRUE max tiers (playlist
 *      'flagship', press 'national' — data/balance/progression.json
 *      access_tier_system), not the middle tiers ('mid'/'mid_tier') the
 *      original `===` check accidentally required.
 *  (b) Summary/achievement copy says "52-week" (data/balance/projects.json
 *      campaign_length_weeks), not the stale "12-week" text.
 *  (c) artistsSuccessful defaults to 0 when no artists are threaded in.
 *      projectsCompleted was REMOVED from scoring entirely (2026-07); the
 *      non-scoring "By the Numbers" careerStats readout replaces it.
 */
import { describe, it, expect } from 'vitest';
import { AchievementsEngine } from '@shared/engine/AchievementsEngine';
import { createTestGameState, createTestDBArtist } from '../helpers/test-factories';

describe('AchievementsEngine.calculateCampaignResults — Media Mogul (C62)', () => {
  it('is earned at the true max tiers (playlist flagship + press national)', () => {
    const gameState = createTestGameState({
      playlistAccess: 'flagship',
      pressAccess: 'national',
    });

    const result = AchievementsEngine.calculateCampaignResults(gameState);

    expect(result.achievements).toContain('🎵 Media Mogul - Maximum playlist and press access');
  });

  it('is NOT earned at the middle tiers (mid / mid_tier) — the old buggy condition', () => {
    const gameState = createTestGameState({
      playlistAccess: 'mid',
      pressAccess: 'mid_tier',
    });

    const result = AchievementsEngine.calculateCampaignResults(gameState);

    expect(result.achievements).not.toContain('🎵 Media Mogul - Maximum playlist and press access');
  });

  it('is NOT earned when only one axis is at max', () => {
    const playlistOnly = AchievementsEngine.calculateCampaignResults(
      createTestGameState({ playlistAccess: 'flagship', pressAccess: 'mid_tier' }),
    );
    const pressOnly = AchievementsEngine.calculateCampaignResults(
      createTestGameState({ playlistAccess: 'mid', pressAccess: 'national' }),
    );

    expect(playlistOnly.achievements).not.toContain('🎵 Media Mogul - Maximum playlist and press access');
    expect(pressOnly.achievements).not.toContain('🎵 Media Mogul - Maximum playlist and press access');
  });
});

describe('AchievementsEngine.calculateCampaignResults — week-copy fix (C62)', () => {
  it('Survivor achievement references 52 weeks, not 12', () => {
    // Money >= 0 and no other achievements earned (low money/reputation/tiers)
    // so the Survivor fallback fires.
    const gameState = createTestGameState({
      money: 0,
      reputation: 0,
      playlistAccess: 'none',
      pressAccess: 'none',
      venueAccess: 'none',
    });

    const result = AchievementsEngine.calculateCampaignResults(gameState);

    expect(result.achievements).toContain('🛡️ Survivor - Made it through 52 weeks');
    expect(result.achievements.join(' ')).not.toContain('12 weeks');
  });

  it('default-branch summary text references a 52-week campaign, not 12', () => {
    // determineVictoryType's default branch is unreachable via the public
    // victoryType union, so we assert the general "no stale 12-week copy"
    // invariant across all reachable summaries instead.
    const scenarios = [
      createTestGameState({ money: -100, reputation: 0 }), // Failure
      createTestGameState({ money: 10000, reputation: 5 }), // Survival (low score)
      createTestGameState({ money: 500000, reputation: 10 }), // Commercial Success
      createTestGameState({ money: 10000, reputation: 400 }), // Critical Acclaim
    ];

    for (const gameState of scenarios) {
      const result = AchievementsEngine.calculateCampaignResults(gameState);
      expect(result.summary).not.toContain('12-week');
    }
  });
});

describe('AchievementsEngine.calculateCampaignResults — zeroed score components (C62)', () => {
  it('artistsSuccessful defaults to 0 when no artists are threaded in (backward compat)', () => {
    // Existing direct-call sites (and the other unit tests here) invoke the
    // scorer WITHOUT the optional artists param — it must still yield 0, exactly
    // as before the C62 change.
    const gameState = createTestGameState({ money: 200000, reputation: 100 });
    const result = AchievementsEngine.calculateCampaignResults(gameState);

    expect(result.scoreBreakdown.artistsSuccessful).toBe(0);
    // projectsCompleted was removed from scoring entirely (2026-07) — the key must
    // no longer exist in the breakdown, and finalScore must be the sum of the
    // remaining components only.
    expect('projectsCompleted' in result.scoreBreakdown).toBe(false);
    const expectedFinal = Object.values(result.scoreBreakdown).reduce((t, s) => t + s, 0);
    expect(result.finalScore).toBe(expectedFinal);
  });
});

describe('AchievementsEngine.calculateCampaignResults — By the Numbers career readout (non-scoring)', () => {
  // A "successful artist" = popularity >= 70; each adds 5 points (see above). The
  // careerStats counts below must NEVER change finalScore — they are a sibling of
  // scoreBreakdown, not a component of it.
  const releasedSingle = { type: 'single', status: 'released' } as any;
  const releasedEp = { type: 'ep', status: 'catalog' } as any;
  const releasedAlbum = { type: 'album', status: 'released' } as any;
  const plannedSingle = { type: 'single', status: 'planned' } as any; // excluded
  const compilation = { type: 'compilation', status: 'released' } as any; // ignored type

  const singleShow = { type: 'Mini-Tour', stage: 'production', metadata: { cities: 1 } } as any;
  const tour = { type: 'Mini-Tour', stage: 'released', metadata: { cities: 3 } } as any;
  const cancelledTour = { type: 'Mini-Tour', stage: 'cancelled', metadata: { cities: 4 } } as any; // excluded
  const recordingSingle = { type: 'Single', stage: 'production', metadata: {} } as any; // not Mini-Tour

  it('defaults to all-zero careerStats when no releases/projects are threaded in', () => {
    const gameState = createTestGameState({ money: 0, reputation: 0 });
    const result = AchievementsEngine.calculateCampaignResults(gameState);

    expect(result.careerStats).toEqual({
      singlesReleased: 0,
      epsReleased: 0,
      albumsReleased: 0,
      singleShows: 0,
      tours: 0,
    });
  });

  it('counts released singles/EPs/albums and single shows vs tours; excludes planned/cancelled/recording; ignores compilations', () => {
    const gameState = createTestGameState({ money: 0, reputation: 0 });
    const releases = [releasedSingle, releasedEp, releasedAlbum, plannedSingle, compilation];
    const projects = [singleShow, tour, cancelledTour, recordingSingle];

    const result = AchievementsEngine.calculateCampaignResults(
      gameState,
      undefined,
      [],
      undefined,
      releases,
      projects,
    );

    expect(result.careerStats).toEqual({
      singlesReleased: 1,
      epsReleased: 1,
      albumsReleased: 1,
      singleShows: 1,
      tours: 1,
    });

    // Non-scoring guarantee: careerStats is not in scoreBreakdown, and finalScore
    // (money=0/rep=0/no tiers/no artists) stays 0 despite a full catalog.
    expect(result.finalScore).toBe(0);
  });

  it('treats a Mini-Tour with missing metadata.cities as a single show (defaults to 1)', () => {
    const gameState = createTestGameState({ money: 0, reputation: 0 });
    const projects = [{ type: 'Mini-Tour', stage: 'production', metadata: {} } as any];

    const result = AchievementsEngine.calculateCampaignResults(
      gameState,
      undefined,
      [],
      undefined,
      [],
      projects,
    );

    expect(result.careerStats.singleShows).toBe(1);
    expect(result.careerStats.tours).toBe(0);
  });
});

describe('AchievementsEngine.calculateCampaignResults — successful-artist scoring (C62)', () => {
  // Designer ruling (Nes, 2026-07-26): a "successful artist" = popularity >= 70;
  // each adds 5 points (both knobs live in data/balance/progression.json
  // campaign_scoring; the scorer defaults to 70/5 when no scoringConfig is passed).
  it('scores popularity>=70 artists at 5 points each and folds it into finalScore', () => {
    const gameState = createTestGameState({ money: 0, reputation: 0 });
    const artists = [
      createTestDBArtist({ id: 'a', popularity: 80 }), // successful
      createTestDBArtist({ id: 'b', popularity: 70 }), // successful (boundary — inclusive)
      createTestDBArtist({ id: 'c', popularity: 69 }), // NOT successful (below threshold)
      createTestDBArtist({ id: 'd', popularity: 40 }), // NOT successful
    ];

    const result = AchievementsEngine.calculateCampaignResults(gameState, undefined, artists);

    // 2 successful × 5 points = 10
    expect(result.scoreBreakdown.artistsSuccessful).toBe(10);

    // With money=0/reputation=0 and no tiers, the artistsSuccessful component is
    // the only nonzero score, so it must show up in the summed finalScore.
    const expectedFinal = Object.values(result.scoreBreakdown).reduce((t, s) => t + s, 0);
    expect(result.finalScore).toBe(expectedFinal);
    expect(result.finalScore).toBe(10);
  });

  it('respects a custom scoringConfig (threshold + points come from config, not hardcoded)', () => {
    const gameState = createTestGameState({ money: 0, reputation: 0 });
    const artists = [
      createTestDBArtist({ id: 'a', popularity: 60 }),
      createTestDBArtist({ id: 'b', popularity: 50 }),
      createTestDBArtist({ id: 'c', popularity: 49 }),
    ];

    const result = AchievementsEngine.calculateCampaignResults(gameState, undefined, artists, {
      artist_success_popularity_threshold: 50,
      points_per_successful_artist: 3,
    });

    // 2 artists at popularity >= 50, × 3 points = 6
    expect(result.scoreBreakdown.artistsSuccessful).toBe(6);
  });

  it('treats a null/undefined popularity as 0 (never successful)', () => {
    const gameState = createTestGameState({ money: 0, reputation: 0 });
    const artists = [
      createTestDBArtist({ id: 'a', popularity: null as unknown as number }),
    ];

    const result = AchievementsEngine.calculateCampaignResults(gameState, undefined, artists);

    expect(result.scoreBreakdown.artistsSuccessful).toBe(0);
  });
});
