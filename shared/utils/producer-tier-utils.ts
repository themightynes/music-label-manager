/**
 * Producer Tier and Time Investment Utility Functions
 * Provides type-safe access to producer tier logic and validation
 */

export interface ProducerTierConfig {
  name: string;
  unlockReputation: number;
  qualityBonus: number;
  description: string;
  costMultiplier: number;
}

export interface TimeInvestmentConfig {
  name: string;
  qualityModifier: number;
  timeMultiplier: number;
  description: string;
}

/**
 * Producer tier configurations based on balance.json
 */
export const PRODUCER_TIERS: Record<string, ProducerTierConfig> = {
  local: {
    name: 'Local Producer',
    unlockReputation: 0,
    qualityBonus: 0,
    description: 'Basic local studio with standard equipment',
    costMultiplier: 1.0
  },
  regional: {
    name: 'Regional Producer',
    unlockReputation: 15,
    qualityBonus: 5,
    description: 'Experienced regional producer with better facilities',
    costMultiplier: 1.5
  },
  national: {
    name: 'National Producer',
    unlockReputation: 35,
    qualityBonus: 12,
    description: 'Renowned producer with top-tier equipment and connections',
    costMultiplier: 2.5
  },
  legendary: {
    name: 'Legendary Producer',
    unlockReputation: 60,
    qualityBonus: 20,
    description: 'Industry legend with Grammy wins and platinum records',
    costMultiplier: 4.0
  }
} as const;

/**
 * Time investment configurations based on balance.json
 */
export const TIME_INVESTMENTS: Record<string, TimeInvestmentConfig> = {
  rushed: {
    name: 'Rushed Session',
    qualityModifier: -10,
    timeMultiplier: 0.5,
    description: 'Quick session with basic takes - lower quality but faster'
  },
  standard: {
    name: 'Standard Session',
    qualityModifier: 0,
    timeMultiplier: 1.0,
    description: 'Normal recording process with good takes'
  },
  extended: {
    name: 'Extended Session',
    qualityModifier: 8,
    timeMultiplier: 1.5,
    description: 'Extra time for multiple takes and refinement'
  },
  perfectionist: {
    name: 'Perfectionist Session',
    qualityModifier: 15,
    timeMultiplier: 2.0,
    description: 'Meticulous attention to detail - highest quality possible'
  }
} as const;

/**
 * Type guards for producer tiers and time investments
 */
export const isValidProducerTier = (tier: string): tier is keyof typeof PRODUCER_TIERS => {
  return tier in PRODUCER_TIERS;
};

export const isValidTimeInvestment = (investment: string): investment is keyof typeof TIME_INVESTMENTS => {
  return investment in TIME_INVESTMENTS;
};

/**
 * Get available producer tiers based on current reputation
 */
export function getAvailableProducerTiers(reputation: number): string[] {
  return Object.entries(PRODUCER_TIERS)
    .filter(([_, config]) => reputation >= config.unlockReputation)
    .map(([tier, _]) => tier);
}

/**
 * Get available producer tier configs based on current reputation
 */
export function getAvailableProducerTierConfigs(reputation: number): Record<string, ProducerTierConfig> {
  const availableTiers = getAvailableProducerTiers(reputation);
  const configs: Record<string, ProducerTierConfig> = {};
  
  for (const tier of availableTiers) {
    configs[tier] = PRODUCER_TIERS[tier];
  }
  
  return configs;
}

/**
 * Check if a producer tier is unlocked for the given reputation
 */
export function isProducerTierUnlocked(tier: string, reputation: number): boolean {
  if (!isValidProducerTier(tier)) return false;
  return reputation >= PRODUCER_TIERS[tier].unlockReputation;
}

/**
 * Get the next producer tier to unlock
 */
export function getNextProducerTierToUnlock(reputation: number): { tier: string; reputationNeeded: number } | null {
  const lockedTiers = Object.entries(PRODUCER_TIERS)
    .filter(([_, config]) => reputation < config.unlockReputation)
    .sort((a, b) => a[1].unlockReputation - b[1].unlockReputation);

  if (lockedTiers.length === 0) return null;

  const [tier, config] = lockedTiers[0];
  return {
    tier,
    reputationNeeded: config.unlockReputation - reputation
  };
}

/**
 * Calculate final quality for a song based on producer tier and time investment
 */
export function calculateSongQuality(
  baseQuality: number,
  producerTier: string,
  timeInvestment: string,
  artistSynergyBonus: number = 0
): number {
  let finalQuality = baseQuality;

  // Apply producer tier bonus
  if (isValidProducerTier(producerTier)) {
    finalQuality += PRODUCER_TIERS[producerTier].qualityBonus;
  }

  // Apply time investment modifier
  if (isValidTimeInvestment(timeInvestment)) {
    finalQuality += TIME_INVESTMENTS[timeInvestment].qualityModifier;
  }

  // Apply artist synergy bonus
  finalQuality += artistSynergyBonus;

  // Ensure quality stays within bounds (20-100)
  return Math.max(20, Math.min(100, Math.round(finalQuality)));
}

/**
 * Calculate recording cost based on producer tier and time investment
 */
export function calculateRecordingCost(
  baseCost: number,
  producerTier: string,
  timeInvestment: string
): number {
  let cost = baseCost;

  // Apply producer tier cost multiplier
  if (isValidProducerTier(producerTier)) {
    cost *= PRODUCER_TIERS[producerTier].costMultiplier;
  }

  // Apply time investment cost multiplier
  if (isValidTimeInvestment(timeInvestment)) {
    cost *= TIME_INVESTMENTS[timeInvestment].timeMultiplier;
  }

  return Math.round(cost);
}

/**
 * Get producer tier display information
 */
export function getProducerTierDisplay(tier: string): {
  name: string;
  description: string;
  qualityBonus: string;
  unlockInfo: string;
} {
  if (!isValidProducerTier(tier)) {
    return {
      name: 'Unknown Producer',
      description: 'Invalid producer tier',
      qualityBonus: '+0',
      unlockInfo: 'Not available'
    };
  }

  const config = PRODUCER_TIERS[tier];
  return {
    name: config.name,
    description: config.description,
    qualityBonus: config.qualityBonus > 0 ? `+${config.qualityBonus}` : '0',
    unlockInfo: config.unlockReputation === 0 
      ? 'Available from start' 
      : `Requires ${config.unlockReputation} reputation`
  };
}

/**
 * Get time investment display information
 */
export function getTimeInvestmentDisplay(investment: string): {
  name: string;
  description: string;
  qualityModifier: string;
  timeImpact: string;
} {
  if (!isValidTimeInvestment(investment)) {
    return {
      name: 'Unknown Investment',
      description: 'Invalid time investment',
      qualityModifier: '0',
      timeImpact: 'No change'
    };
  }

  const config = TIME_INVESTMENTS[investment];
  return {
    name: config.name,
    description: config.description,
    qualityModifier: config.qualityModifier > 0 
      ? `+${config.qualityModifier}` 
      : config.qualityModifier < 0 
        ? `${config.qualityModifier}` 
        : '0',
    timeImpact: config.timeMultiplier < 1 
      ? 'Faster' 
      : config.timeMultiplier > 1 
        ? `${config.timeMultiplier}x longer` 
        : 'Standard'
  };
}

/**
 * Validate producer tier and time investment combination
 */
export function validateRecordingOptions(
  producerTier: string,
  timeInvestment: string,
  reputation: number
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate producer tier
  if (!isValidProducerTier(producerTier)) {
    errors.push(`Invalid producer tier: ${producerTier}`);
  } else if (!isProducerTierUnlocked(producerTier, reputation)) {
    errors.push(`Producer tier "${producerTier}" requires ${PRODUCER_TIERS[producerTier].unlockReputation} reputation (current: ${reputation})`);
  }

  // Validate time investment
  if (!isValidTimeInvestment(timeInvestment)) {
    errors.push(`Invalid time investment: ${timeInvestment}`);
  }

  // Add warnings for suboptimal combinations
  if (isValidProducerTier(producerTier) && isValidTimeInvestment(timeInvestment)) {
    if (producerTier === 'legendary' && timeInvestment === 'rushed') {
      warnings.push('Using rushed sessions with a legendary producer may not maximize potential');
    }
    
    if (producerTier === 'local' && timeInvestment === 'perfectionist') {
      warnings.push('Perfectionist sessions with local producers may have limited impact');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get optimal producer tier and time investment recommendations
 */
export function getOptimalRecordingRecommendations(
  reputation: number,
  budget: number,
  targetQuality: number,
  artistArchetype: string
): {
  recommendedProducerTier: string;
  recommendedTimeInvestment: string;
  reasoning: string;
  estimatedQuality: number;
  estimatedCost: number;
} {
  const availableTiers = getAvailableProducerTiers(reputation);
  const baseCost = 5000; // Base recording cost
  
  let bestTier = 'local';
  let bestInvestment = 'standard';
  let bestScore = 0;

  // Evaluate all combinations
  for (const tier of availableTiers) {
    for (const investment of Object.keys(TIME_INVESTMENTS)) {
      const cost = calculateRecordingCost(baseCost, tier, investment);
      
      if (cost <= budget) {
        const quality = calculateSongQuality(60, tier, investment); // Assume base 60 quality
        const qualityScore = quality / 100;
        const budgetEfficiency = (budget - cost) / budget; // Prefer leaving some budget
        const score = qualityScore * 0.7 + budgetEfficiency * 0.3;
        
        if (score > bestScore) {
          bestScore = score;
          bestTier = tier;
          bestInvestment = investment;
        }
      }
    }
  }

  const estimatedQuality = calculateSongQuality(60, bestTier, bestInvestment);
  const estimatedCost = calculateRecordingCost(baseCost, bestTier, bestInvestment);
  
  let reasoning = `Best balance of quality and cost efficiency`;
  if (estimatedQuality >= targetQuality) {
    reasoning += `. Meets target quality of ${targetQuality}`;
  } else {
    reasoning += `. Falls short of target quality (${targetQuality}) due to budget constraints`;
  }

  return {
    recommendedProducerTier: bestTier,
    recommendedTimeInvestment: bestInvestment,
    reasoning,
    estimatedQuality,
    estimatedCost
  };
}

/**
 * Export all producer tier names for type checking
 */
export type ProducerTierName = keyof typeof PRODUCER_TIERS;
export type TimeInvestmentName = keyof typeof TIME_INVESTMENTS;

/**
 * Export arrays for UI dropdowns
 */
export const PRODUCER_TIER_OPTIONS = Object.keys(PRODUCER_TIERS) as ProducerTierName[];
export const TIME_INVESTMENT_OPTIONS = Object.keys(TIME_INVESTMENTS) as TimeInvestmentName[];