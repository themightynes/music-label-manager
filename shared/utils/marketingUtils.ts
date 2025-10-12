/**
 * Shared marketing calculation utilities
 * Single source of truth for all marketing logic across frontend and backend
 * Data sourced from data/balance/markets.json
 */

import React from 'react';
import { Music, Award, Star } from 'lucide-react';
import { getSeasonalMultiplierValue } from './seasonalCalculations';

/**
 * Universal marketing budget constraints applied to all channels
 * Design decision: All channels share same accessibility range
 */
export const MARKETING_BUDGET_LIMITS = {
  MIN: 500,
  MAX: 15000
} as const;

export interface MarketingChannel {
  id: string;
  name: string;
  description: string;
  minBudget: number;
  maxBudget: number;
  effectiveness: number;
  icon: string;
  targetAudience: string;
  synergies?: string[];
}

export interface ReleaseType {
  id: 'single' | 'ep' | 'album';
  name: string;
  minSongs: number;
  maxSongs: number;
  description: string;
  bonusType: string;
  bonusAmount: number;
  revenueMultiplier: number;
  icon: React.ComponentType; // Icon component for UI display
}

/**
 * REMOVED: Static marketing channels - now loaded dynamically from balance data
 * Dynamic marketing channels configuration from data/balance/markets.json
 */
export function getMarketingChannelsFromBalance(balanceData?: any): MarketingChannel[] {
  if (!balanceData?.market_formulas?.release_planning?.marketing_channels) {
    throw new Error('[MARKETING] CRITICAL: Balance data not available or invalid structure. Expected balanceData.market_formulas.release_planning.marketing_channels');
  }

  // CRITICAL FIX: Load marketing channels from balance data
  const channelsConfig = balanceData.market_formulas.release_planning.marketing_channels;

  return Object.entries(channelsConfig).map(([channelId, config]: [string, any]) => ({
    id: channelId,
    name: getChannelDisplayName(channelId),
    description: config.description || '',
    minBudget: MARKETING_BUDGET_LIMITS.MIN,
    maxBudget: MARKETING_BUDGET_LIMITS.MAX,
    effectiveness: config.effectiveness || 0.85,
    icon: getChannelIcon(channelId),
    targetAudience: getChannelAudience(channelId),
    synergies: config.synergies || []
  }));
}

// Helper functions for channel display data (until added to balance.json)
function getChannelDisplayName(channelId: string): string {
  const names = {
    radio: 'Radio Push',
    digital: 'Digital Ads',
    pr: 'PR Campaign',
    influencer: 'Influencer Marketing'
  };
  return names[channelId as keyof typeof names] || channelId;
}

function getChannelIcon(channelId: string): string {
  const icons = {
    radio: 'fas fa-radio',
    digital: 'fas fa-ad',
    pr: 'fas fa-newspaper',
    influencer: 'fas fa-users'
  };
  return icons[channelId as keyof typeof icons] || 'fas fa-bullhorn';
}

function getChannelAudience(channelId: string): string {
  const audiences = {
    radio: 'Mainstream',
    digital: 'Online',
    pr: 'Industry',
    influencer: 'Social'
  };
  return audiences[channelId as keyof typeof audiences] || 'General';
}

// Legacy export removed - will hard fail without balance data
// export const MARKETING_CHANNELS = getMarketingChannelsFromBalance();

/**
 * REMOVED: Static release types - now loaded dynamically from balance data
 * Dynamic release types configuration from data/balance/markets.json
 */
export function getReleaseTypesFromBalance(balanceData?: any): ReleaseType[] {
  if (!balanceData?.market_formulas?.release_planning?.release_type_bonuses) {
    throw new Error('[MARKETING] CRITICAL: Balance data not available or invalid structure. Expected balanceData.market_formulas.release_planning.release_type_bonuses');
  }

  // CRITICAL FIX: Load release types from balance data
  const releaseTypesConfig = balanceData.market_formulas.release_planning.release_type_bonuses;

  return Object.entries(releaseTypesConfig).map(([typeId, config]: [string, any]) => ({
    id: typeId as 'single' | 'ep' | 'album',
    name: getReleaseTypeDisplayName(typeId),
    minSongs: getReleaseTypeMinSongs(typeId),
    maxSongs: getReleaseTypeMaxSongs(typeId),
    description: getReleaseTypeDescription(typeId),
    bonusType: getReleaseTypeBonusType(typeId),
    bonusAmount: Math.round((config.revenue_multiplier - 1) * 100), // Convert multiplier to percentage
    revenueMultiplier: config.revenue_multiplier || 1.0,
    icon: getReleaseTypeIcon(typeId)
  }));
}

// Helper functions for release type display data (until added to balance.json)
function getReleaseTypeDisplayName(typeId: string): string {
  const names = { single: 'Single', ep: 'EP', album: 'Album' };
  return names[typeId as keyof typeof names] || typeId;
}

function getReleaseTypeMinSongs(typeId: string): number {
  const minSongs = { single: 1, ep: 3, album: 8 };
  return minSongs[typeId as keyof typeof minSongs] || 1;
}

function getReleaseTypeMaxSongs(typeId: string): number {
  const maxSongs = { single: 1, ep: 5, album: 12 };
  return maxSongs[typeId as keyof typeof maxSongs] || 1;
}

function getReleaseTypeDescription(typeId: string): string {
  const descriptions = {
    single: 'Quick release for maximum focus',
    ep: 'Extended play for sustained momentum',
    album: 'Complete artistic statement'
  };
  return descriptions[typeId as keyof typeof descriptions] || '';
}

function getReleaseTypeBonusType(typeId: string): string {
  const bonusTypes = {
    single: 'Focus Bonus',
    ep: 'Momentum Bonus',
    album: 'Cohesion Bonus'
  };
  return bonusTypes[typeId as keyof typeof bonusTypes] || 'Bonus';
}

function getReleaseTypeIcon(typeId: string): React.ComponentType {
  const icons = { single: Music, ep: Award, album: Star };
  return icons[typeId as keyof typeof icons] || Music;
}

// Legacy export removed - will hard fail without balance data
// export const RELEASE_TYPES = getReleaseTypesFromBalance();

/**
 * Calculate total marketing cost including seasonal multiplier
 * Single source of truth for cost calculations
 * CRITICAL FIX: Requires balance data for seasonal calculations
 */
export function calculateTotalMarketingCost(
  channelBudgets: Record<string, number>,
  releaseWeek: number,
  balanceData: any,
  leadSingleBudget?: Record<string, number>,
  leadSingleWeek?: number
): number {
  if (!balanceData) {
    throw new Error('[MARKETING] CRITICAL: Balance data is required for marketing cost calculations. No fallback allowed.');
  }

  const mainBudget = Object.values(channelBudgets).reduce((a, b) => a + b, 0);
  const mainCost = mainBudget * getSeasonalMultiplierValue(releaseWeek, balanceData);

  if (leadSingleBudget && leadSingleWeek) {
    const leadBudget = Object.values(leadSingleBudget).reduce((a, b) => a + b, 0);
    const leadCost = leadBudget * getSeasonalMultiplierValue(leadSingleWeek, balanceData);
    return mainCost + leadCost;
  }

  return mainCost;
}

/**
 * Calculate channel synergy bonus based on active channels
 * Matches data/balance/markets.json synergy system
 */
export function calculateChannelSynergies(channelBudgets: Record<string, number>): number {
  const activeChannels = Object.keys(channelBudgets).filter(id => (channelBudgets[id] || 0) > 0);
  const channelCount = activeChannels.length;

  if (channelCount < 2) return 1.0;

  // Check for specific synergy combinations
  const hasRadioDigital = activeChannels.includes('radio') && activeChannels.includes('digital');
  const hasPrInfluencer = activeChannels.includes('pr') && activeChannels.includes('influencer');
  const hasFullSpectrum = channelCount >= 4;

  let bonusMultiplier = 1.0;

  if (hasFullSpectrum) {
    bonusMultiplier += 0.10; // Full spectrum bonus
  } else if (hasRadioDigital) {
    bonusMultiplier += 0.15; // Radio-digital synergy
  } else if (hasPrInfluencer) {
    bonusMultiplier += 0.12; // PR-influencer synergy
  }

  // Diversity bonus per additional channel
  const diversityBonus = Math.min((channelCount - 1) * 0.08, 0.4); // Max 40% bonus
  bonusMultiplier += diversityBonus;

  return Math.min(bonusMultiplier, 1.4); // Cap at 140%
}

/**
 * Get marketing channel by ID
 * CRITICAL FIX: Requires balance data for dynamic channel loading
 */
export function getMarketingChannel(channelId: string, balanceData?: any): MarketingChannel | undefined {
  if (!balanceData) {
    throw new Error('[MARKETING] CRITICAL: Balance data is required to get marketing channel. No fallback allowed.');
  }

  const channels = getMarketingChannelsFromBalance(balanceData);
  return channels.find(channel => channel.id === channelId);
}

/**
 * Get release type by ID
 * CRITICAL FIX: Requires balance data for dynamic release type loading
 */
export function getReleaseType(typeId: string, balanceData?: any): ReleaseType | undefined {
  if (!balanceData) {
    throw new Error('[MARKETING] CRITICAL: Balance data is required to get release type. No fallback allowed.');
  }

  const types = getReleaseTypesFromBalance(balanceData);
  return types.find(type => type.id === typeId);
}

/**
 * Validate channel budget against min/max constraints
 * CRITICAL FIX: Requires balance data for dynamic channel validation
 */
export function validateChannelBudget(channelId: string, budget: number, balanceData?: any): boolean {
  if (!balanceData) {
    throw new Error('[MARKETING] CRITICAL: Balance data is required for channel budget validation. No fallback allowed.');
  }

  const channel = getMarketingChannel(channelId, balanceData);
  if (!channel) return false;

  return budget >= channel.minBudget && budget <= channel.maxBudget;
}

/**
 * Calculate weighted channel effectiveness for budget allocation
 * CRITICAL FIX: Requires balance data for dynamic channel effectiveness
 */
export function calculateChannelEffectiveness(channelBudgets: Record<string, number>, balanceData?: any): Record<string, number> {
  if (!balanceData) {
    throw new Error('[MARKETING] CRITICAL: Balance data is required for channel effectiveness calculations. No fallback allowed.');
  }

  const effectiveness: Record<string, number> = {};
  const synergyMultiplier = calculateChannelSynergies(channelBudgets);

  for (const [channelId, budget] of Object.entries(channelBudgets)) {
    if (budget > 0) {
      const channel = getMarketingChannel(channelId, balanceData);
      if (channel) {
        effectiveness[channelId] = channel.effectiveness * synergyMultiplier;
      }
    }
  }

  return effectiveness;
}