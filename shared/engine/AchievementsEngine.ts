/**
 * AchievementsEngine
 *
 * Handles all campaign completion scoring, achievements, and results
 */

import type { GameState } from '../schema';
import { seededRandom } from '../utils/seededRandom';

interface ScoreBreakdown {
  money: number;
  reputation: number;
  artistsSuccessful: number;
  projectsCompleted: number;
  accessTierBonus: number;
  // Exec-meetings-revival PR-7 (C5) — campaign-end award-roll bonus. 0 when no
  // award was won (near-miss/no pool), award_score_bonus (balance knob,
  // data/balance/progression.json reputation_system.award_score_bonus) on a win.
  awardBonus: number;
}

/**
 * Exec-meetings-revival PR-7 (C5) — award-track knobs consumed by the
 * campaign-end award roll. Optional: callers that don't pass it (e.g. existing
 * direct unit tests) get the same defaults `ServerGameData.getAwardConfigSync`
 * falls back to, so calculateCampaignResults stays backward compatible.
 */
export interface AwardConfig {
  award_chance_per_point: number;
  award_chance_cap: number;
  award_score_bonus: number;
  award_nominee_pool_threshold: number;
}

const DEFAULT_AWARD_CONFIG: AwardConfig = {
  award_chance_per_point: 0.08,
  award_chance_cap: 0.8,
  award_score_bonus: 2000,
  award_nominee_pool_threshold: 5
};

interface CampaignResults {
  campaignCompleted: boolean;
  finalScore: number;
  scoreBreakdown: ScoreBreakdown;
  victoryType: 'Commercial Success' | 'Critical Acclaim' | 'Balanced Growth' | 'Survival' | 'Failure';
  summary: string;
  achievements: string[];
  // Exec-meetings-revival PR-7 (C5) — true when the campaign-end award roll hit.
  industryAward?: boolean;
}

export class AchievementsEngine {
  /**
   * Calculate complete campaign results including scores, achievements, and victory type
   */
  static calculateCampaignResults(gameState: GameState, awardConfig: AwardConfig = DEFAULT_AWARD_CONFIG): CampaignResults {
    // Exec-meetings-revival PR-7 (C5) — campaign-end award roll. Consumes
    // flags.awardChances (an accumulating, never-expiring pool — see
    // ActionProcessor's award_chances case) via an ISOLATED seeded roll (shared/
    // utils/seededRandom.ts, NOT ctx.getRandom — the engine's pinned RNG stream/
    // draw count are completely undisturbed by this end-of-campaign, one-shot
    // resolution). Chance = pool * award_chance_per_point, capped at
    // award_chance_cap. A pool of 0 always has a 0% chance (no free rolls).
    const flags = (gameState.flags || {}) as Record<string, any>;
    const awardPool = typeof flags.awardChances === 'number' ? flags.awardChances : 0;
    const awardChance = awardPool > 0
      ? Math.min(awardConfig.award_chance_cap, awardPool * awardConfig.award_chance_per_point)
      : 0;
    const awardSeed = `${gameState.id || 'unknown-game'}-awardseason`;
    const awardRoll = seededRandom(awardSeed);
    const industryAward = awardPool > 0 && awardRoll < awardChance;
    const awardBonus = industryAward ? awardConfig.award_score_bonus : 0;

    // Calculate score breakdown
    const scoreBreakdown: ScoreBreakdown = {
      money: Math.max(0, Math.floor((gameState.money || 0) / 1000)), // 1 point per $1k
      reputation: Math.max(0, Math.floor((gameState.reputation || 0) / 5)), // 1 point per 5 reputation
      // TODO (C62): still hardcoded 0. No doc (ACHIEVEMENTS_DEPENDENCY_CHART.md,
      // ACHIEVEMENTS_KNOWLEDGE_CHART.md, technical-debt-backlog.md) defines what
      // "successful artist" or "completed project" means for campaign scoring,
      // and this function only receives `gameState` (the scalar game_states row)
      // — no `artists[]`/`projects[]` arrays, which live in separate tables and
      // aren't passed in by the sole call site (ProgressionProcessor.
      // checkCampaignCompletion). Computing this needs both a design decision on
      // the semantics AND a signature change to thread artist/project data in.
      // Left as-is per C62 scope (do not invent semantics).
      artistsSuccessful: 0,
      projectsCompleted: 0,
      accessTierBonus: this.calculateAccessTierBonus(gameState),
      awardBonus
    };

    const finalScore = Object.values(scoreBreakdown).reduce((total, score) => total + score, 0);
    const victoryType = this.determineVictoryType(finalScore, scoreBreakdown, gameState);
    const achievements = this.calculateAchievements(scoreBreakdown, gameState);
    // Exec-meetings-revival PR-7 (C5): award/near-miss achievement entries. A win
    // takes priority; a near-miss (pool >= award_nominee_pool_threshold but no
    // win, or pool > 0 but chance capped/rolled against) gets a consolation entry
    // so an unconsumed pool is never silently invisible at campaign end.
    if (industryAward) {
      achievements.push('🏆 Industry Award Winner');
    } else if (awardPool >= awardConfig.award_nominee_pool_threshold) {
      achievements.push('🎗 Award Nominee');
    }
    const summary = this.generateCampaignSummary(victoryType, finalScore, scoreBreakdown, gameState);

    return {
      campaignCompleted: true,
      finalScore,
      scoreBreakdown,
      victoryType,
      summary,
      achievements,
      industryAward
    };
  }

  /**
   * Calculate access tier bonus points
   */
  private static calculateAccessTierBonus(gameState: GameState): number {
    let bonus = 0;

    // Playlist access bonus (progressive tiers)
    if (gameState.playlistAccess === 'flagship') bonus += 30;
    else if (gameState.playlistAccess === 'mid') bonus += 20;
    else if (gameState.playlistAccess === 'niche') bonus += 10;

    // Press access bonus (progressive tiers)
    if (gameState.pressAccess === 'national') bonus += 30;
    else if (gameState.pressAccess === 'mid_tier') bonus += 20;
    else if (gameState.pressAccess === 'blogs') bonus += 10;

    // Venue access bonus (progressive tiers)
    if (gameState.venueAccess === 'arenas') bonus += 30;
    else if (gameState.venueAccess === 'theaters') bonus += 20;
    else if (gameState.venueAccess === 'clubs') bonus += 10;

    return bonus;
  }

  /**
   * Determine victory type based on performance
   */
  private static determineVictoryType(
    finalScore: number,
    scoreBreakdown: ScoreBreakdown,
    gameState: GameState
  ): CampaignResults['victoryType'] {
    // Check for failure conditions
    if ((gameState.money || 0) < 0 || finalScore < 50) {
      return 'Failure';
    }

    // Survival if barely making it
    if (finalScore < 100) {
      return 'Survival';
    }

    // Determine primary victory type based on strongest area
    const moneyScore = scoreBreakdown.money;
    const reputationScore = scoreBreakdown.reputation;
    const balanceThreshold = 0.7;

    if (moneyScore > reputationScore * 1.5) {
      return 'Commercial Success';
    } else if (reputationScore > moneyScore * 1.5) {
      return 'Critical Acclaim';
    } else if (Math.min(moneyScore, reputationScore) / Math.max(moneyScore, reputationScore) >= balanceThreshold) {
      return 'Balanced Growth';
    } else {
      return 'Commercial Success'; // Default to commercial
    }
  }

  /**
   * Calculate achievements based on performance
   */
  private static calculateAchievements(scoreBreakdown: ScoreBreakdown, gameState: GameState): string[] {
    const achievements: string[] = [];

    // Money achievements
    if (scoreBreakdown.money >= 1000) achievements.push('💎 Millionaire - Ended with $1M+');
    else if (scoreBreakdown.money >= 100) achievements.push('💰 Big Money - Ended with $100k+');
    else if (scoreBreakdown.money >= 50) achievements.push('💵 Profitable - Ended with $50k+');

    // Reputation achievements
    if (scoreBreakdown.reputation >= 40) achievements.push('⭐ Industry Legend - 200+ Reputation');
    else if (scoreBreakdown.reputation >= 20) achievements.push('🌟 Well Known - 100+ Reputation');

    // Access tier achievements
    // C62: was `=== 'mid'` / `=== 'mid_tier'`, the MIDDLE tiers — a player at the
    // true maxima (playlist 'flagship', press 'national', see
    // data/balance/progression.json access_tier_system) could never earn this.
    if (gameState.playlistAccess === 'flagship' && gameState.pressAccess === 'national') {
      achievements.push('🎵 Media Mogul - Maximum playlist and press access');
    }

    // Survival achievements
    // HARDCODED: campaign length (52 weeks, data/balance/projects.json
    // campaign_length_weeks) — AchievementsEngine only receives `gameState`
    // (the scalar game_states row), not the balance config, so it can't read
    // this dynamically without a signature change (C62).
    if ((gameState.money || 0) >= 0 && achievements.length === 0) {
      achievements.push('🛡️ Survivor - Made it through 52 weeks');
    }

    return achievements;
  }

  /**
   * Generate campaign narrative summary
   */
  private static generateCampaignSummary(
    victoryType: CampaignResults['victoryType'],
    finalScore: number,
    scoreBreakdown: ScoreBreakdown,
    gameState: GameState
  ): string {
    const money = gameState.money || 0;
    const reputation = gameState.reputation || 0;

    switch (victoryType) {
      case 'Commercial Success':
        return `Your label became a commercial powerhouse! With $${(money/1000).toFixed(0)}k in the bank and ${reputation} reputation, you've proven that great music and smart business can go hand in hand.`;

      case 'Critical Acclaim':
        return `Your label earned critical acclaim throughout the industry! With ${reputation} reputation points, you've built a respected brand that artists dream of joining, even if the bank account shows $${(money/1000).toFixed(0)}k.`;

      case 'Balanced Growth':
        return `Your label achieved the perfect balance of commercial success and critical acclaim! With $${(money/1000).toFixed(0)}k and ${reputation} reputation, you've built a sustainable music empire.`;

      case 'Survival':
        return `You survived the challenging music industry! While it was tough with $${(money/1000).toFixed(0)}k and ${reputation} reputation, you've laid the groundwork for future success.`;

      case 'Failure':
        return `The music industry proved too challenging this time. With $${(money/1000).toFixed(0)}k and ${reputation} reputation, consider this a learning experience for your next venture.`;

      default:
        // HARDCODED: campaign length (52 weeks) — see Survivor achievement note above (C62).
        return `Your 52-week music label campaign has concluded with a final score of ${finalScore} points.`;
    }
  }
}