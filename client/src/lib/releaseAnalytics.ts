/**
 * Helper functions for enhanced release details and analytics
 * Uses existing data from useGameStore without requiring backend changes
 */

export interface CampaignData {
  hasLeadSingle: boolean;
  leadSingleBudget: number;
  leadSingleWeek?: number;
  mainBudget: number;
  totalInvestment: number;
  totalProductionCost?: number;
  campaignDuration: number;
  strategy: 'lead_single' | 'direct_release';
}

export interface PerformanceMetrics {
  totalROI: number;
  costPerStream: number;
  campaignEffectiveness: 'excellent' | 'strong' | 'good' | 'fair' | 'poor';
  leadSingleContribution: number;
  averageRevenuePerTrack: number;
  streamDistribution: 'balanced' | 'single_dominant' | 'track_focused';
}

export interface TrackBreakdown {
  leadSingle?: {
    song: any;
    streams: number;
    revenue: number;
    contributionPercentage: number;
  };
  mainTracks: Array<{
    song: any;
    streams: number;
    revenue: number;
    contributionPercentage: number;
    rank: number;
  }>;
  bestPerformer: any;
  worstPerformer: any;
  totalTracks: number;
}

export interface CampaignOutcome {
  tier: 'breakthrough' | 'strong_success' | 'modest_success' | 'underperformed' | 'failed';
  description: string;
  color: string;
  icon: string;
}

/**
 * Extract campaign information from release metadata
 */
export function extractCampaignData(release: any): CampaignData {
  const metadata = release.metadata as any;
  const leadSingleStrategy = metadata?.leadSingleStrategy;
  
  const hasLeadSingle = !!(leadSingleStrategy && release.type !== 'single');
  const leadSingleBudget = leadSingleStrategy?.totalLeadSingleBudget || 0;

  // CRITICAL FIX: Use actual charged amount (including seasonal adjustments) from metadata
  const totalInvestment = metadata?.totalInvestment ||
    // Fallback: calculate from raw budgets (for legacy releases)
    (leadSingleBudget + (release.marketingBudget || metadata?.marketingBudget ||
      (typeof metadata?.marketingBudget === 'object' ?
        Object.values(metadata.marketingBudget).reduce((a: number, b: any) => a + (b || 0), 0) : 0)));

  // For display purposes, separate out the components
  const mainBudget = totalInvestment - leadSingleBudget;
  
  let campaignDuration = 1; // Default for single week releases
  if (hasLeadSingle && leadSingleStrategy.leadSingleReleaseWeek) {
    campaignDuration = (release.releaseWeek || 0) - leadSingleStrategy.leadSingleReleaseWeek + 1;
  }
  
  return {
    hasLeadSingle,
    leadSingleBudget,
    leadSingleWeek: leadSingleStrategy?.leadSingleReleaseWeek,
    mainBudget,
    totalInvestment,
    campaignDuration: Math.max(1, campaignDuration),
    strategy: hasLeadSingle ? 'lead_single' : 'direct_release'
  };
}

/**
 * Get songs associated with a specific release
 */
export function getReleaseSongs(releaseId: string, allSongs: any[]): any[] {
  // For demo/testing: if no songs are linked to release but release has revenue,
  // create mock song data based on release type
  const linkedSongs = allSongs.filter(song => 
    song.releaseId === releaseId || 
    song.release_id === releaseId
  );
  
  if (linkedSongs.length > 0) {
    return linkedSongs;
  }
  
  // No linked songs found - return empty for now
  // In a real scenario, this would mean songs need to be properly linked to releases
  console.log(`No songs linked to release ${releaseId}. Songs may need to be associated with releases.`);
  return [];
}

/**
 * Identify the lead single from release songs
 */
export function identifyLeadSingle(releaseSongs: any[], release: any): any | null {
  const metadata = release.metadata as any;
  const leadSingleStrategy = metadata?.leadSingleStrategy;
  
  if (!leadSingleStrategy) return null;
  
  // Try to find the lead single by release week or first released song
  const leadSingleWeek = leadSingleStrategy.leadSingleReleaseWeek;
  
  // First, look for songs released in the lead single week
  if (leadSingleWeek) {
    const leadSong = releaseSongs.find(song => song.releaseWeek === leadSingleWeek);
    if (leadSong) return leadSong;
  }
  
  // Fallback: return the highest quality song or first song
  return releaseSongs.sort((a, b) => (b.quality || 0) - (a.quality || 0))[0] || null;
}

/**
 * Calculate comprehensive performance metrics
 */
export function calculatePerformanceMetrics(release: any, releaseSongs: any[], campaignData: CampaignData): PerformanceMetrics {
  const totalRevenue = release.revenueGenerated || 0;
  const totalStreams = release.streamsGenerated || 0;
  
  // Calculate total production costs from all songs in the release
  const totalProductionCost = releaseSongs.reduce((sum, song) => 
    sum + (song.productionBudget || 0), 0
  );
  
  // Total investment includes both production and marketing costs
  const totalInvestmentWithProduction = campaignData.totalInvestment + totalProductionCost;
  
  // Calculate ROI with full costs
  const totalROI = totalInvestmentWithProduction > 0 ? (totalRevenue - totalInvestmentWithProduction) / totalInvestmentWithProduction : 0;
  
  // Calculate cost per stream with full investment
  const costPerStream = totalStreams > 0 ? totalInvestmentWithProduction / totalStreams : 0;
  
  // Determine campaign effectiveness based on ROI
  let campaignEffectiveness: PerformanceMetrics['campaignEffectiveness'] = 'poor';
  if (totalROI >= 2.0) campaignEffectiveness = 'excellent';
  else if (totalROI >= 1.0) campaignEffectiveness = 'strong';
  else if (totalROI >= 0.5) campaignEffectiveness = 'good';
  else if (totalROI >= 0) campaignEffectiveness = 'fair';
  
  // Calculate lead single contribution
  const leadSingle = identifyLeadSingle(releaseSongs, release);
  const leadSingleRevenue = leadSingle?.totalRevenue || 0;
  const leadSingleContribution = totalRevenue > 0 ? (leadSingleRevenue / totalRevenue) * 100 : 0;
  
  // Calculate average revenue per track
  const trackCount = releaseSongs.length || 1;
  const averageRevenuePerTrack = totalRevenue / trackCount;
  
  // Determine stream distribution pattern
  let streamDistribution: PerformanceMetrics['streamDistribution'] = 'balanced';
  if (releaseSongs.length > 1) {
    const songStreams = releaseSongs.map(s => s.totalStreams || 0);
    const maxStreams = Math.max(...songStreams);
    const avgStreams = songStreams.reduce((a, b) => a + b, 0) / songStreams.length;
    
    if (maxStreams > avgStreams * 2) {
      streamDistribution = leadSingleContribution > 60 ? 'single_dominant' : 'track_focused';
    }
  }
  
  return {
    totalROI,
    costPerStream,
    campaignEffectiveness,
    leadSingleContribution,
    averageRevenuePerTrack,
    streamDistribution
  };
}

/**
 * Create detailed track breakdown analysis
 */
export function analyzeTrackBreakdown(release: any, releaseSongs: any[]): TrackBreakdown {
  const totalRevenue = release.revenueGenerated || 0;
  const leadSingle = identifyLeadSingle(releaseSongs, release);
  
  // Sort songs by performance (streams + revenue combined score)
  const rankedSongs = releaseSongs
    .map(song => ({
      song,
      streams: song.totalStreams || 0,
      revenue: song.totalRevenue || 0,
      score: (song.totalStreams || 0) + (song.totalRevenue || 0) * 10 // Weight revenue higher
    }))
    .sort((a, b) => b.score - a.score);
  
  // Calculate contribution percentages
  const songsWithContribution = rankedSongs.map((item, index) => ({
    ...item,
    contributionPercentage: totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0,
    rank: index + 1
  }));
  
  // Separate lead single from main tracks
  const mainTracks = songsWithContribution.filter(item => item.song.id !== leadSingle?.id);
  
  const leadSingleData = leadSingle ? songsWithContribution.find(item => item.song.id === leadSingle.id) : undefined;
  
  return {
    leadSingle: leadSingleData ? {
      song: leadSingleData.song,
      streams: leadSingleData.streams,
      revenue: leadSingleData.revenue,
      contributionPercentage: leadSingleData.contributionPercentage
    } : undefined,
    mainTracks: mainTracks.map(({ song, streams, revenue, contributionPercentage, rank }) => ({
      song,
      streams,
      revenue,
      contributionPercentage,
      rank
    })),
    bestPerformer: rankedSongs[0]?.song,
    worstPerformer: rankedSongs[rankedSongs.length - 1]?.song,
    totalTracks: releaseSongs.length
  };
}

/**
 * Assess overall campaign outcome
 */
export function assessCampaignOutcome(metrics: PerformanceMetrics, campaignData: CampaignData): CampaignOutcome {
  const { totalROI, campaignEffectiveness } = metrics;
  const { totalInvestment } = campaignData;
  
  if (totalROI >= 3.0 || campaignEffectiveness === 'excellent') {
    return {
      tier: 'breakthrough',
      description: 'Exceptional performance exceeded all expectations',
      color: 'text-[#791014] bg-[#791014]/10',
      icon: '🚀'
    };
  } else if (totalROI >= 1.5 || campaignEffectiveness === 'strong') {
    return {
      tier: 'strong_success',
      description: 'Strong performance with excellent ROI',
      color: 'text-green-600 bg-green-100',
      icon: '⭐'
    };
  } else if (totalROI >= 0.5 || campaignEffectiveness === 'good') {
    return {
      tier: 'modest_success',
      description: 'Solid performance meeting expectations',
      color: 'text-blue-600 bg-blue-100',
      icon: '✅'
    };
  } else if (totalROI >= -0.25 || campaignEffectiveness === 'fair') {
    return {
      tier: 'underperformed',
      description: 'Below expectations but not a total loss',
      color: 'text-yellow-600 bg-yellow-100',
      icon: '⚠️'
    };
  } else {
    return {
      tier: 'failed',
      description: 'Significant underperformance requires review',
      color: 'text-red-600 bg-red-100',
      icon: '❌'
    };
  }
}

/**
 * Format currency values for display
 */
export function formatCurrency(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

/**
 * Format stream counts for display
 */
export function formatStreams(streams: number): string {
  if (streams >= 1000000) {
    return `${(streams / 1000000).toFixed(1)}M`;
  } else if (streams >= 1000) {
    return `${(streams / 1000).toFixed(0)}K`;
  }
  return streams.toLocaleString();
}

/**
 * Get effectiveness color and badge styling
 */
export function getEffectivenessStyle(effectiveness: PerformanceMetrics['campaignEffectiveness']) {
  switch (effectiveness) {
    case 'excellent':
      return { color: 'text-[#791014] bg-[#791014]/10', label: 'Excellent' };
    case 'strong':
      return { color: 'text-green-600 bg-green-100', label: 'Strong' };
    case 'good':
      return { color: 'text-blue-600 bg-blue-100', label: 'Good' };
    case 'fair':
      return { color: 'text-yellow-600 bg-yellow-100', label: 'Fair' };
    case 'poor':
      return { color: 'text-red-600 bg-red-100', label: 'Poor' };
    default:
      return { color: 'text-white/70 bg-[#65557c]/20', label: 'Unknown' };
  }
}