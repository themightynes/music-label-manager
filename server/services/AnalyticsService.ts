/**
 * AnalyticsService.ts
 * 
 * Backend service for ROI and investment analytics
 * Leverages database-generated ROI columns for performance
 * Provides cached, pre-calculated metrics to frontend
 */

import { db } from '../db';
import { songs, projects, releases, releaseSongs, artists } from '../../shared/schema';
import { eq, and, sql, isNotNull } from 'drizzle-orm';
import type { InvestmentTracker } from '../../shared/engine/FinancialSystem';

interface CacheEntry {
  data: any;
  timestamp: number;
}

export class AnalyticsService {
  private cache: Map<string, CacheEntry> = new Map();
  private CACHE_TTL = 60000; // 1 minute cache
  private investmentTracker: InvestmentTracker | null = null;
  
  constructor(investmentTracker?: InvestmentTracker) {
    this.investmentTracker = investmentTracker || null;
  }
  
  /**
   * Cache management
   */
  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  /**
   * Get ROI metrics for a specific artist
   * Uses database auto-calculated ROI columns
   */
  async getArtistROI(artistId: string, gameId: string) {
    const cacheKey = `artist-${artistId}-${gameId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    // Get all songs for this artist with ROI data
    const artistSongs = await db.select({
      id: songs.id,
      title: songs.title,
      productionBudget: songs.productionBudget,
      marketingAllocation: songs.marketingAllocation,
      totalInvestment: songs.totalInvestment,
      totalRevenue: songs.totalRevenue,
      totalStreams: songs.totalStreams,
      roiPercentage: songs.roiPercentage,
      quality: songs.quality,
      isReleased: songs.isReleased
    })
    .from(songs)
    .where(and(
      eq(songs.artistId, artistId),
      eq(songs.gameId, gameId)
    ));
    
    // Calculate aggregate metrics
    const totalProductionInvestment = artistSongs.reduce((sum, s) => sum + (s.productionBudget || 0), 0);
    const totalMarketingInvestment = artistSongs.reduce((sum, s) => sum + (s.marketingAllocation || 0), 0);
    const totalInvestment = totalProductionInvestment + totalMarketingInvestment;
    const totalRevenue = artistSongs.reduce((sum, s) => sum + (s.totalRevenue || 0), 0);
    const totalStreams = artistSongs.reduce((sum, s) => sum + (s.totalStreams || 0), 0);
    
    const overallROI = totalInvestment > 0 
      ? ((totalRevenue - totalInvestment) / totalInvestment) * 100 
      : 0;
    
    // Get artist details
    const [artist] = await db.select({
      name: artists.name,
      popularity: artists.popularity
    })
    .from(artists)
    .where(eq(artists.id, artistId));
    
    const result = {
      artistId,
      artistName: artist?.name || 'Unknown',
      totalProductionInvestment,
      totalMarketingInvestment,
      totalInvestment,
      totalRevenue,
      totalStreams,
      overallROI,
      songCount: artistSongs.length,
      releasedSongCount: artistSongs.filter(s => s.isReleased).length,
      averageQuality: artistSongs.length > 0 
        ? artistSongs.reduce((sum, s) => sum + (s.quality || 0), 0) / artistSongs.length 
        : 0,
      bestPerformingSong: artistSongs
        .filter(s => s.roiPercentage !== null)
        .sort((a, b) => (b.roiPercentage || 0) - (a.roiPercentage || 0))[0] || null
    };
    
    this.setCache(cacheKey, result);
    return result;
  }
  
  /**
   * Get ROI metrics for a specific project
   */
  async getProjectROI(projectId: string, gameId: string) {
    const cacheKey = `project-${projectId}-${gameId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    // Get all songs for this project
    const projectSongs = await db.select({
      id: songs.id,
      title: songs.title,
      productionBudget: songs.productionBudget,
      marketingAllocation: songs.marketingAllocation,
      totalInvestment: songs.totalInvestment,
      totalRevenue: songs.totalRevenue,
      roiPercentage: songs.roiPercentage,
      quality: songs.quality
    })
    .from(songs)
    .where(and(
      eq(songs.projectId, projectId),
      eq(songs.gameId, gameId)
    ));
    
    const totalInvestment = projectSongs.reduce((sum, s) => sum + (s.totalInvestment || 0), 0);
    const totalRevenue = projectSongs.reduce((sum, s) => sum + (s.totalRevenue || 0), 0);
    
    const roi = totalInvestment > 0
      ? ((totalRevenue - totalInvestment) / totalInvestment) * 100
      : 0;
    
    // Get project details
    const [project] = await db.select({
      title: projects.title,
      type: projects.type,
      stage: projects.stage
    })
    .from(projects)
    .where(eq(projects.id, projectId));
    
    const result = {
      projectId,
      projectName: project?.title || 'Unknown',
      projectType: project?.type || 'unknown',
      projectStatus: project?.stage || 'unknown',
      totalInvestment,
      totalRevenue,
      roi,
      songCount: projectSongs.length,
      songs: projectSongs.map(s => ({
        id: s.id,
        title: s.title,
        roi: s.roiPercentage,
        investment: s.totalInvestment,
        revenue: s.totalRevenue
      })),
      averageROI: projectSongs.length > 0
        ? projectSongs.reduce((sum, s) => sum + (s.roiPercentage || 0), 0) / projectSongs.length
        : 0
    };
    
    this.setCache(cacheKey, result);
    return result;
  }
  
  /**
   * Get ROI metrics for a specific release
   */
  async getReleaseROI(releaseId: string, gameId: string) {
    const cacheKey = `release-${releaseId}-${gameId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    // Get all songs in this release
    const releaseSongData = await db.select({
      songId: releaseSongs.songId,
      isLeadSingle: releaseSongs.isSingle,
      trackNumber: releaseSongs.trackNumber,
      title: songs.title,
      productionBudget: songs.productionBudget,
      marketingAllocation: songs.marketingAllocation,
      totalInvestment: songs.totalInvestment,
      totalRevenue: songs.totalRevenue,
      roiPercentage: songs.roiPercentage
    })
    .from(releaseSongs)
    .innerJoin(songs, eq(songs.id, releaseSongs.songId))
    .where(eq(releaseSongs.releaseId, releaseId));
    
    const totalProductionInvestment = releaseSongData.reduce(
      (sum, rs) => sum + (rs.productionBudget || 0), 0
    );
    const totalMarketingInvestment = releaseSongData.reduce(
      (sum, rs) => sum + (rs.marketingAllocation || 0), 0
    );
    const totalRevenue = releaseSongData.reduce(
      (sum, rs) => sum + (rs.totalRevenue || 0), 0
    );
    const totalInvestment = totalProductionInvestment + totalMarketingInvestment;
    
    const roi = totalInvestment > 0
      ? ((totalRevenue - totalInvestment) / totalInvestment) * 100
      : 0;
    
    // Get release details
    const [release] = await db.select({
      title: releases.title,
      type: releases.type,
      status: releases.status,
      marketingBudget: releases.marketingBudget
    })
    .from(releases)
    .where(eq(releases.id, releaseId));
    
    // Calculate marketing effectiveness
    const marketingEffectiveness = totalMarketingInvestment > 0
      ? {
          costPerRevenue: totalMarketingInvestment / Math.max(1, totalRevenue),
          revenuePerMarketingDollar: totalRevenue / totalMarketingInvestment,
          effectiveness: totalRevenue > totalMarketingInvestment * 3 ? 'excellent' :
                        totalRevenue > totalMarketingInvestment * 2 ? 'good' :
                        totalRevenue > totalMarketingInvestment ? 'fair' : 'poor'
        }
      : null;
    
    const result = {
      releaseId,
      releaseTitle: release?.title || 'Unknown',
      releaseType: release?.type || 'unknown',
      releaseStatus: release?.status || 'unknown',
      totalProductionInvestment,
      totalMarketingInvestment,
      totalInvestment,
      totalRevenue,
      roi,
      marketingEffectiveness,
      songPerformance: releaseSongData.map(rs => ({
        title: rs.title,
        isLeadSingle: rs.isLeadSingle,
        roi: rs.roiPercentage,
        revenue: rs.totalRevenue,
        investment: rs.totalInvestment
      }))
    };
    
    this.setCache(cacheKey, result);
    return result;
  }
  
  /**
   * Get portfolio-wide ROI metrics
   */
  async getPortfolioROI(gameId: string) {
    const cacheKey = `portfolio-${gameId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    // Single optimized query for portfolio metrics
    const portfolioData = await db.select({
      totalSongs: sql<number>`COUNT(${songs.id})::int`,
      releasedSongs: sql<number>`COUNT(CASE WHEN ${songs.isReleased} THEN 1 END)::int`,
      totalInvestment: sql<number>`COALESCE(SUM(${songs.totalInvestment}), 0)::int`,
      totalRevenue: sql<number>`COALESCE(SUM(${songs.totalRevenue}), 0)::int`,
      avgROI: sql<number>`AVG(${songs.roiPercentage})`,
      profitableSongs: sql<number>`COUNT(CASE WHEN ${songs.roiPercentage} > 0 THEN 1 END)::int`,
      bestROI: sql<number>`MAX(${songs.roiPercentage})`,
      worstROI: sql<number>`MIN(${songs.roiPercentage})`
    })
    .from(songs)
    .where(and(
      eq(songs.gameId, gameId),
      isNotNull(songs.totalInvestment)
    ));
    
    const data = portfolioData[0];
    const overallROI = data.totalInvestment > 0 
      ? ((data.totalRevenue - data.totalInvestment) / data.totalInvestment) * 100
      : 0;
    
    const result = {
      totalSongs: data.totalSongs || 0,
      releasedSongs: data.releasedSongs || 0,
      totalInvestment: data.totalInvestment || 0,
      totalRevenue: data.totalRevenue || 0,
      overallROI,
      averageROI: data.avgROI || 0,
      successRate: data.totalSongs > 0 ? (data.profitableSongs / data.totalSongs) * 100 : 0,
      profitableSongs: data.profitableSongs || 0,
      bestROI: data.bestROI || 0,
      worstROI: data.worstROI || 0
    };
    
    this.setCache(cacheKey, result);
    return result;
  }
  
  /**
   * Clear cache (useful for testing or after major updates)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();