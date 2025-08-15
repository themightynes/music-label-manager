import seedrandom from 'seedrandom';

export class GameEngine {
  private rng: () => number;

  constructor(seed?: string) {
    this.rng = seedrandom(seed || Math.random().toString());
  }

  // Seeded random number generation
  random(): number {
    return this.rng();
  }

  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  // Market outcome calculation
  calculateStreamingOutcome(quality: number, playlistAccess: string, reputation: number, adSpend: number): number {
    let baseStreams = quality * 100;
    
    // Playlist access multiplier
    const playlistMultiplier = {
      'None': 0.5,
      'Niche': 1.0,
      'Mid': 2.0,
      'Flagship': 4.0
    }[playlistAccess] || 0.5;

    // Reputation boost
    const reputationBoost = reputation / 100;
    
    // Ad spend impact
    const adBoost = Math.sqrt(adSpend) / 100;
    
    // RNG variance (0.9-1.1)
    const variance = 0.9 + (this.random() * 0.2);
    
    return Math.floor(baseStreams * playlistMultiplier * (1 + reputationBoost + adBoost) * variance);
  }

  calculatePressPickups(pressAccess: string, prPush: number, storyFlag: boolean): number {
    let basePickups = 0;
    
    const pressMultiplier = {
      'None': 0,
      'Blogs': 2,
      'Mid-Tier': 5,
      'Major': 10
    }[pressAccess] || 0;

    basePickups = pressMultiplier + Math.floor(prPush / 1000);
    
    if (storyFlag) {
      basePickups += 3;
    }

    const variance = 0.8 + (this.random() * 0.4);
    return Math.floor(basePickups * variance);
  }

  calculateTourOutcome(venueAccess: string, reputation: number, artistPopularity: number): number {
    let baseSellThrough = 50; // percentage
    
    const venueBonus = {
      'None': 0,
      'Clubs': 20,
      'Theaters': 40,
      'Arenas': 60
    }[venueAccess] || 0;

    baseSellThrough += venueBonus + (reputation / 5) + (artistPopularity / 3);
    
    const variance = 0.9 + (this.random() * 0.2);
    return Math.min(100, Math.floor(baseSellThrough * variance));
  }

  // Quality calculation for projects
  calculateProjectQuality(artistTalent: number, producerTier: number, timeInvested: number): number {
    const baseQuality = (artistTalent + producerTier) / 2;
    const timeBonus = Math.min(20, timeInvested * 5);
    const variance = 0.9 + (this.random() * 0.2);
    
    return Math.min(100, Math.floor((baseQuality + timeBonus) * variance));
  }

  // Access tier progression checks
  checkAccessProgression(currentTier: string, metric: number, thresholds: Record<string, number>): string {
    const tiers = Object.keys(thresholds).sort((a, b) => thresholds[a] - thresholds[b]);
    
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (metric >= thresholds[tiers[i]]) {
        return tiers[i];
      }
    }
    
    return currentTier;
  }

  // Monthly event generation
  shouldTriggerEvent(baseChance: number = 0.2): boolean {
    return this.random() < baseChance;
  }

  // Revenue calculation
  calculateRevenue(streams: number, tourSales: number, merchandise: number = 0): number {
    const streamRevenue = streams * 0.003; // $0.003 per stream
    const tourRevenue = tourSales;
    const merchRevenue = merchandise;
    
    return Math.floor(streamRevenue + tourRevenue + merchRevenue);
  }

  // Expense calculation
  calculateExpenses(projects: any[], marketing: number, overhead: number = 3000): number {
    const projectCosts = projects.reduce((sum, project) => sum + (project.budgetUsed || 0), 0);
    return projectCosts + marketing + overhead;
  }

  // Artist mood/loyalty updates
  updateArtistStats(currentMood: number, currentLoyalty: number, events: any[]): { mood: number, loyalty: number } {
    let moodChange = 0;
    let loyaltyChange = 0;

    events.forEach(event => {
      moodChange += event.moodEffect || 0;
      loyaltyChange += event.loyaltyEffect || 0;
    });

    // Natural decay/recovery
    if (currentMood > 50) {
      moodChange -= 1; // High mood naturally decays
    } else {
      moodChange += 1; // Low mood naturally recovers
    }

    return {
      mood: Math.max(0, Math.min(100, currentMood + moodChange)),
      loyalty: Math.max(0, Math.min(100, currentLoyalty + loyaltyChange))
    };
  }
}

export const gameEngine = new GameEngine();
