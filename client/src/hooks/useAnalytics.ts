/**
 * Analytics Hooks
 * 
 * React Query hooks for consuming backend ROI analytics
 * Provides caching, loading states, and error handling
 */

import { useQuery } from '@tanstack/react-query';
import { useGameStore } from '@/store/gameStore';

// Base API URL - adjust if needed for your environment
const API_BASE = '';

/**
 * Helper function to make API requests with error handling
 */
async function apiRequest(url: string) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Hook to fetch ROI metrics for a specific artist
 */
export function useArtistROI(artistId: string | undefined) {
  const gameState = useGameStore((state: any) => state.gameState);
  
  return useQuery({
    queryKey: ['artist-roi', artistId, gameState?.id],
    queryFn: () => {
      if (!artistId || !gameState?.id) {
        throw new Error('Missing artist ID or game ID');
      }
      return apiRequest(`${API_BASE}/api/analytics/artist/${artistId}/roi?gameId=${gameState.id}`);
    },
    enabled: !!artistId && !!gameState?.id,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes (formerly cacheTime)
  });
}

/**
 * Hook to fetch ROI metrics for a specific project
 */
export function useProjectROI(projectId: string | undefined) {
  const gameState = useGameStore((state: any) => state.gameState);
  
  return useQuery({
    queryKey: ['project-roi', projectId, gameState?.id],
    queryFn: () => {
      if (!projectId || !gameState?.id) {
        throw new Error('Missing project ID or game ID');
      }
      return apiRequest(`${API_BASE}/api/analytics/project/${projectId}/roi?gameId=${gameState.id}`);
    },
    enabled: !!projectId && !!gameState?.id,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
  });
}

/**
 * Hook to fetch ROI metrics for a specific release
 */
export function useReleaseROI(releaseId: string | undefined) {
  const gameState = useGameStore((state: any) => state.gameState);
  
  return useQuery({
    queryKey: ['release-roi', releaseId, gameState?.id],
    queryFn: () => {
      if (!releaseId || !gameState?.id) {
        throw new Error('Missing release ID or game ID');
      }
      return apiRequest(`${API_BASE}/api/analytics/release/${releaseId}/roi?gameId=${gameState.id}`);
    },
    enabled: !!releaseId && !!gameState?.id,
    staleTime: 120000, // 2 minutes
    gcTime: 300000, // 5 minutes
  });
}

/**
 * Hook to fetch portfolio-wide ROI metrics
 */
export function usePortfolioROI() {
  const gameState = useGameStore((state: any) => state.gameState);
  
  return useQuery({
    queryKey: ['portfolio-roi', gameState?.id],
    queryFn: () => {
      if (!gameState?.id) {
        throw new Error('Missing game ID');
      }
      return apiRequest(`${API_BASE}/api/analytics/portfolio/roi?gameId=${gameState.id}`);
    },
    enabled: !!gameState?.id,
    staleTime: 30000, // 30 seconds for dashboard
    gcTime: 180000, // 3 minutes
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