/**
 * Database Health Monitoring Service
 * Provides API calls for admin database health dashboard (PRD-0006 Phase 3)
 */

import { apiRequest } from '@/lib/queryClient';

export interface DatabaseStats {
  orphanedGamesCount: number;
  totalGamesCount: number;
  orphanedPercentage: number;
  databaseSizeMB: number;
  recentDeletions: DeletionEvent[];
  topUsersOrphanedGames: TopUserOrphanedGames[];
}

export interface DeletionEvent {
  timestamp: string;
  gameId: string;
  gameWeek: number;
  reason: 'user_initiated_new_game' | 'manual_cleanup' | 'admin_action';
  totalRecords: number;
}

export interface TopUserOrphanedGames {
  userId: string;
  orphanedCount: number;
}

export interface CleanupResult {
  success: boolean;
  message: string;
  beforeMetrics: {
    totalGames: number;
    orphanedGames: number;
  };
  afterMetrics: {
    totalGames: number;
    deletedCount: number;
  };
  durationMs: number;
}

/**
 * Fetch database health statistics
 */
export async function fetchDatabaseStats(): Promise<DatabaseStats> {
  const response = await apiRequest('GET', '/api/admin/database-stats');

  if (!response.ok) {
    throw new Error('Failed to fetch database statistics');
  }

  return response.json();
}

/**
 * Trigger manual cleanup of orphaned games
 */
export async function cleanupOrphanedGames(): Promise<CleanupResult> {
  const response = await apiRequest('POST', '/api/admin/cleanup-orphaned-games');

  if (!response.ok) {
    throw new Error('Failed to cleanup orphaned games');
  }

  return response.json();
}
