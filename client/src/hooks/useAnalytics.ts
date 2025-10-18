/**
 * Analytics Hooks
 * 
 * React Query hooks for consuming backend ROI analytics
 * Provides caching, loading states, and error handling
 */

import { useQuery } from '@tanstack/react-query';
import { useGameStore } from '@/store/gameStore';
import { apiRequest } from '@/lib/queryClient';
import { apiPaths } from '@/lib/apiPaths';

/**
 * Helper function to make API requests with error handling
 */
async function fetchAnalytics(url: string) {
  const response = await apiRequest('GET', url, undefined, { retry: true });
  return response.json();
}

/**
 * Hook to fetch ROI metrics for a specific artist
 */
export function useArtistROI(artistId: string | undefined) {
  const gameState = useGameStore((state: any) => state.gameState);

  const queryKey = [
    'analytics:artist-roi',
    gameState?.id ?? null,
    artistId ?? null,
  ] as const;
  
  return useQuery({
    queryKey,
    queryFn: () => {
      if (!artistId || !gameState?.id) {
        throw new Error('Missing artist ID or game ID');
      }
      return fetchAnalytics(apiPaths.analytics.artistRoi(gameState.id, artistId));
    },
    enabled: !!artistId && !!gameState?.id,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes (formerly cacheTime)
    retry: 1,
  });
}

/**
 * Hook to fetch ROI metrics for a specific project
 */
export function useProjectROI(projectId: string | undefined) {
  const gameState = useGameStore((state: any) => state.gameState);

  const queryKey = [
    'analytics:project-roi',
    gameState?.id ?? null,
    projectId ?? null,
  ] as const;
  
  return useQuery({
    queryKey,
    queryFn: () => {
      if (!projectId || !gameState?.id) {
        throw new Error('Missing project ID or game ID');
      }
      return fetchAnalytics(apiPaths.analytics.projectRoi(gameState.id, projectId));
    },
    enabled: !!projectId && !!gameState?.id,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook to fetch ROI metrics for a specific release
 */
export function useReleaseROI(releaseId: string | undefined) {
  const gameState = useGameStore((state: any) => state.gameState);

  const queryKey = [
    'analytics:release-roi',
    gameState?.id ?? null,
    releaseId ?? null,
  ] as const;
  
  return useQuery({
    queryKey,
    queryFn: () => {
      if (!releaseId || !gameState?.id) {
        throw new Error('Missing release ID or game ID');
      }
      return fetchAnalytics(apiPaths.analytics.releaseRoi(gameState.id, releaseId));
    },
    enabled: !!releaseId && !!gameState?.id,
    staleTime: 120000, // 2 minutes
    gcTime: 300000, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook to fetch portfolio-wide ROI metrics
 */
export function usePortfolioROI() {
  const gameState = useGameStore((state: any) => state.gameState);

  const queryKey = ['analytics:portfolio-roi', gameState?.id ?? null] as const;
  
  return useQuery({
    queryKey,
    queryFn: () => {
      if (!gameState?.id) {
        throw new Error('Missing game ID');
      }
      return fetchAnalytics(apiPaths.analytics.portfolioRoi(gameState.id));
    },
    enabled: !!gameState?.id,
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
