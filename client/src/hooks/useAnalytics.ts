/**
 * Analytics Hooks
 * 
 * React Query hooks for consuming backend ROI analytics
 * Provides caching, loading states, and error handling
 */

import { useQuery } from '@tanstack/react-query';
import { useGameStore } from '@/store/gameStore';
import { apiPaths } from '@/lib/apiPaths';

/**
 * Hook to fetch ROI metrics for a specific artist
 */
export function useArtistROI(artistId: string | undefined) {
  const gameState = useGameStore((state) => state.gameState);
  const gameId = gameState?.id ?? null;
  const url = gameId && artistId
    ? apiPaths.analytics.artistRoi(gameId, artistId)
    : null;

  return useQuery<ArtistROIMetrics>({
    queryKey: url
      ? [url, 'analytics:artist-roi', { gameId, artistId }] as const
      : ['analytics:artist-roi', 'disabled', { gameId, artistId }] as const,
    enabled: !!url,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes (formerly cacheTime)
    retry: 1,
  });
}

/**
 * Hook to fetch ROI metrics for a specific project
 */
export function useProjectROI(projectId: string | undefined) {
  const gameState = useGameStore((state) => state.gameState);
  const gameId = gameState?.id ?? null;
  const url = gameId && projectId
    ? apiPaths.analytics.projectRoi(gameId, projectId)
    : null;

  return useQuery<ProjectROIMetrics>({
    queryKey: url
      ? [url, 'analytics:project-roi', { gameId, projectId }] as const
      : ['analytics:project-roi', 'disabled', { gameId, projectId }] as const,
    enabled: !!url,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook to fetch ROI metrics for a specific release
 */
export function useReleaseROI(releaseId: string | undefined) {
  const gameState = useGameStore((state) => state.gameState);
  const gameId = gameState?.id ?? null;
  const url = gameId && releaseId
    ? apiPaths.analytics.releaseRoi(gameId, releaseId)
    : null;

  return useQuery<ReleaseROIMetrics>({
    queryKey: url
      ? [url, 'analytics:release-roi', { gameId, releaseId }] as const
      : ['analytics:release-roi', 'disabled', { gameId, releaseId }] as const,
    enabled: !!url,
    staleTime: 120000, // 2 minutes
    gcTime: 300000, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook to fetch portfolio-wide ROI metrics
 */
export function usePortfolioROI() {
  const gameState = useGameStore((state) => state.gameState);
  const gameId = gameState?.id ?? null;
  const url = gameId ? apiPaths.analytics.portfolioRoi(gameId) : null;

  return useQuery<PortfolioROIMetrics>({
    queryKey: url
      ? [url, 'analytics:portfolio-roi', { gameId }] as const
      : ['analytics:portfolio-roi', 'disabled', { gameId }] as const,
    enabled: !!url,
    staleTime: 30000, // 30 seconds for dashboard
    gcTime: 180000, // 3 minutes
    retry: 2,
  });
}

/**
 * Type definitions for API responses
 */
export interface ArtistROIMetrics {
  artistId: string;
  artistName: string;
  totalProductionInvestment: number;
  totalMarketingInvestment: number;
  totalInvestment: number;
  totalRevenue: number;
  overallROI: number;
  songCount: number;
  releasedSongCount: number;
  averageQuality: number;
  bestPerformingSong?: {
    id: string;
    title: string;
    roiPercentage: number;
    totalRevenue: number;
  };
}

export interface ProjectROIMetrics {
  projectId: string;
  projectName: string;
  projectType: string;
  projectStatus: string;
  totalInvestment: number;
  totalRevenue: number;
  roi: number;
  songCount: number;
  averageROI: number;
  songs: Array<{
    id: string;
    title: string;
    roi: number | null;
    investment: number;
    revenue: number;
  }>;
}

export interface ReleaseROIMetrics {
  releaseId: string;
  releaseTitle: string;
  releaseType: string;
  releaseStatus: string;
  totalProductionInvestment: number;
  totalMarketingInvestment: number;
  totalInvestment: number;
  totalRevenue: number;
  roi: number;
  marketingEffectiveness?: {
    costPerRevenue: number;
    revenuePerMarketingDollar: number;
    effectiveness: 'excellent' | 'good' | 'fair' | 'poor';
  };
  songPerformance: Array<{
    title: string;
    isLeadSingle: boolean;
    roi: number | null;
    revenue: number;
    investment: number;
  }>;
}

export interface PortfolioROIMetrics {
  totalSongs: number;
  releasedSongs: number;
  totalInvestment: number;
  totalRevenue: number;
  overallROI: number;
  averageROI: number;
  successRate: number;
  profitableSongs: number;
  bestROI: number;
  worstROI: number;
}
