/**
 * AchievementsEngine
 *
 * Handles all campaign completion scoring, achievements, and results
 */

import type { GameState } from '../schema';

interface ScoreBreakdown {
  money: number;
  reputation: number;
  artistsSuccessful: number;
  projectsCompleted: number;
  accessTierBonus: number;
}

interface CampaignResults {
  campaignCompleted: boolean;
  finalScore: number;
  scoreBreakdown: ScoreBreakdown;
  victoryType: 'Commercial Success' | 'Critical Acclaim' | 'Balanced Growth' | 'Survival' | 'Failure';
  summary: string;
  achievements: string[];
}

export class AchievementsEngine {
  /**
   * Calculate complete campaign results including scores, achievements, and victory type
   */
  static calculateCampaignResults(gameState: GameState): CampaignResults {
    // Calculate score breakdown
    const scoreBreakdown: ScoreBreakdown = {
      money: Math.max(0, Math.floor((gameState.money || 0) / 1000)), // 1 point per $1k
      reputation: Math.max(0, Math.floor((gameState.reputation || 0) / 5)), // 1 point per 5 reputation
      artistsSuccessful: 0, // TODO: Calculate based on artist success metrics
      projectsCompleted: 0, // TODO: Calculate based on completed projects
      accessTierBonus: this.calculateAccessTierBonus(gameState)
    };

    const finalScore = Object.values(scoreBreakdown).reduce((total, score) => total + score, 0);
    const victoryType = this.determineVictoryType(finalScore, scoreBreakdown, gameState);
    const achievements = this.calculateAchievements(scoreBreakdown, gameState);
    const summary = this.generateCampaignSummary(victoryType, finalScore, scoreBreakdown, gameState);

    return {
      campaignCompleted: true,
      finalScore,
      scoreBreakdown,
      victoryType,
      summary,
      achievements
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
    if (gameState.playlistAccess === 'mid' && gameState.pressAccess === 'mid_tier') {
      achievements.push('🎵 Media Mogul - Maximum playlist and press access');
    }

    // Survival achievements
    if ((gameState.money || 0) >= 0 && achievements.length === 0) {
      achievements.push('🛡️ Survivor - Made it through 12 weeks');
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
        return `Your 12-week music label campaign has concluded with a final score of ${finalScore} points.`;
    }
  }
}