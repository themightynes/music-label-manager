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
 *  (c) artistsSuccessful / projectsCompleted remain intentionally hardcoded
 *      to 0 — no design doc defines these semantics and the engine's sole
 *      input (`gameState`) carries no artist/project arrays. Pinned so a
 *      future change here is deliberate, not accidental.
 */
import { describe, it, expect } from 'vitest';
import { AchievementsEngine } from '@shared/engine/AchievementsEngine';
import { createTestGameState } from '../helpers/test-factories';

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
  it('artistsSuccessful and projectsCompleted remain hardcoded to 0 (no defined semantics; gameState carries no artist/project data)', () => {
    const gameState = createTestGameState({ money: 200000, reputation: 100 });
    const result = AchievementsEngine.calculateCampaignResults(gameState);

    expect(result.scoreBreakdown.artistsSuccessful).toBe(0);
    expect(result.scoreBreakdown.projectsCompleted).toBe(0);
  });
});
