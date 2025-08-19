/**
 * Database Performance Monitoring and Optimization Utilities
 * for Producer Tier and Time Investment Systems
 */

import { db } from './db';
import { sql } from 'drizzle-orm';

export interface QueryPerformanceMetrics {
  query_name: string;
  execution_time_ms: number;
  rows_examined: number;
  rows_returned: number;
  timestamp: Date;
  status: 'fast' | 'acceptable' | 'slow' | 'critical';
}

export interface ProducerTierPerformanceReport {
  reputation_lookup_avg_ms: number;
  portfolio_analysis_avg_ms: number;
  monthly_processing_avg_ms: number;
  tier_analytics_avg_ms: number;
  total_songs_analyzed: number;
  performance_score: number; // 0-100
  recommendations: string[];
}

/**
 * Performance monitoring class for Producer Tier queries
 */
export class DatabasePerformanceMonitor {
  private metrics: QueryPerformanceMetrics[] = [];
  private performanceThresholds = {
    reputation_lookup: 50,      // Producer availability check
    portfolio_analysis: 200,    // Song catalog loading
    monthly_processing: 300,    // Quality calculations
    tier_analytics: 500         // Portfolio analytics
  };

  /**
   * Monitor a query execution and record performance metrics
   */
  async monitorQuery<T>(
    queryName: string,
    queryPromise: Promise<T>,
    targetThreshold: number
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await queryPromise;
      const executionTime = Date.now() - startTime;
      
      const status = this.categorizePerformance(executionTime, targetThreshold);
      
      this.recordMetric({
        query_name: queryName,
        execution_time_ms: executionTime,
        rows_examined: Array.isArray(result) ? result.length : 1,
        rows_returned: Array.isArray(result) ? result.length : 1,
        timestamp: new Date(),
        status
      });

      if (status === 'slow' || status === 'critical') {
        console.warn(`Slow query detected: ${queryName} took ${executionTime}ms (threshold: ${targetThreshold}ms)`);
      }

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.recordMetric({
        query_name: queryName,
        execution_time_ms: executionTime,
        rows_examined: 0,
        rows_returned: 0,
        timestamp: new Date(),
        status: 'critical'
      });
      throw error;
    }
  }

  /**
   * Test producer tier availability query performance
   */
  async testProducerAvailabilityQuery(gameId: string): Promise<QueryPerformanceMetrics> {
    const query = db
      .select({ reputation: sql`reputation` })
      .from(sql`game_states`)
      .where(sql`id = ${gameId}`);

    const result = await this.monitorQuery(
      'producer_availability_check',
      query,
      this.performanceThresholds.reputation_lookup
    );

    return this.getLastMetric();
  }

  /**
   * Test portfolio analysis query performance
   */
  async testPortfolioAnalysisQuery(gameId: string): Promise<QueryPerformanceMetrics> {
    const query = db.execute(sql`
      SELECT producer_tier, time_investment, AVG(quality), COUNT(*)
      FROM songs 
      WHERE game_id = ${gameId} AND is_recorded = true 
      GROUP BY producer_tier, time_investment
    `);

    await this.monitorQuery(
      'portfolio_analysis',
      query,
      this.performanceThresholds.portfolio_analysis
    );

    return this.getLastMetric();
  }

  /**
   * Test monthly processing query performance
   */
  async testMonthlyProcessingQuery(gameId: string, month: number): Promise<QueryPerformanceMetrics> {
    const query = db.execute(sql`
      SELECT s.*, a.mood 
      FROM songs s 
      JOIN artists a ON s.artist_id = a.id 
      WHERE s.game_id = ${gameId} AND s.created_month = ${month}
    `);

    await this.monitorQuery(
      'monthly_processing',
      query,
      this.performanceThresholds.monthly_processing
    );

    return this.getLastMetric();
  }

  /**
   * Test tier performance analytics query
   */
  async testTierAnalyticsQuery(gameId: string): Promise<QueryPerformanceMetrics> {
    const query = db.execute(sql`
      SELECT producer_tier, AVG(total_revenue), AVG(total_streams)
      FROM songs 
      WHERE game_id = ${gameId} AND is_released = true 
      GROUP BY producer_tier
    `);

    await this.monitorQuery(
      'tier_analytics',
      query,
      this.performanceThresholds.tier_analytics
    );

    return this.getLastMetric();
  }

  /**
   * Run comprehensive performance test suite
   */
  async runPerformanceTestSuite(gameId: string, currentMonth: number): Promise<ProducerTierPerformanceReport> {
    console.log('Starting Producer Tier performance test suite...');

    const tests = await Promise.all([
      this.testProducerAvailabilityQuery(gameId),
      this.testPortfolioAnalysisQuery(gameId),
      this.testMonthlyProcessingQuery(gameId, currentMonth),
      this.testTierAnalyticsQuery(gameId)
    ]);

    const avgTimes = {
      reputation_lookup_avg_ms: tests[0].execution_time_ms,
      portfolio_analysis_avg_ms: tests[1].execution_time_ms,
      monthly_processing_avg_ms: tests[2].execution_time_ms,
      tier_analytics_avg_ms: tests[3].execution_time_ms
    };

    const totalSongs = tests[1].rows_returned;
    const performanceScore = this.calculatePerformanceScore(avgTimes);
    const recommendations = this.generateRecommendations(avgTimes, totalSongs);

    return {
      ...avgTimes,
      total_songs_analyzed: totalSongs,
      performance_score: performanceScore,
      recommendations
    };
  }

  /**
   * Analyze index usage and suggest optimizations
   */
  async analyzeIndexUsage(): Promise<{ table: string; index: string; usage_count: number; last_used: Date }[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_tup_read as usage_count,
          now() as last_checked
        FROM pg_stat_user_indexes 
        WHERE schemaname = 'public'
        ORDER BY idx_tup_read DESC
      `);

      return result.rows.map(row => ({
        table: row.tablename as string,
        index: row.indexname as string,
        usage_count: Number(row.usage_count),
        last_used: new Date(row.last_checked as string)
      }));
    } catch (error) {
      console.warn('Could not analyze index usage (requires PostgreSQL permissions):', error);
      return [];
    }
  }

  /**
   * Get table size statistics for growth monitoring
   */
  async getTableSizeStats(): Promise<{ table: string; size_mb: number; row_count: number }[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          tablename as table,
          pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size_pretty,
          pg_total_relation_size(tablename::regclass) / 1024 / 1024 as size_mb,
          n_tup_ins + n_tup_upd + n_tup_del as row_count
        FROM pg_tables 
        JOIN pg_stat_user_tables ON pg_tables.tablename = pg_stat_user_tables.relname
        WHERE schemaname = 'public'
        ORDER BY size_mb DESC
      `);

      return result.rows.map(row => ({
        table: row.table as string,
        size_mb: Number(row.size_mb),
        row_count: Number(row.row_count)
      }));
    } catch (error) {
      console.warn('Could not get table size stats:', error);
      return [];
    }
  }

  /**
   * Check if indexes are being used effectively
   */
  async validateIndexEffectiveness(): Promise<{
    effective_indexes: string[];
    unused_indexes: string[];
    recommendations: string[];
  }> {
    const indexUsage = await this.analyzeIndexUsage();
    
    const effective = indexUsage.filter(idx => idx.usage_count > 100).map(idx => idx.index);
    const unused = indexUsage.filter(idx => idx.usage_count < 10).map(idx => idx.index);

    const recommendations = [];
    
    if (unused.length > 0) {
      recommendations.push(`Consider dropping unused indexes: ${unused.slice(0, 3).join(', ')}`);
    }
    
    if (effective.length < 5) {
      recommendations.push('Low index usage detected - verify query patterns are using expected indexes');
    }

    return {
      effective_indexes: effective,
      unused_indexes: unused,
      recommendations
    };
  }

  // Private helper methods
  private categorizePerformance(time: number, threshold: number): 'fast' | 'acceptable' | 'slow' | 'critical' {
    if (time <= threshold * 0.5) return 'fast';
    if (time <= threshold) return 'acceptable';
    if (time <= threshold * 2) return 'slow';
    return 'critical';
  }

  private recordMetric(metric: QueryPerformanceMetrics): void {
    this.metrics.push(metric);
    // Keep only last 100 metrics to prevent memory growth
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  private getLastMetric(): QueryPerformanceMetrics {
    return this.metrics[this.metrics.length - 1];
  }

  private calculatePerformanceScore(avgTimes: Record<string, number>): number {
    const thresholds = this.performanceThresholds;
    let score = 100;

    // Deduct points for queries exceeding thresholds
    if (avgTimes.reputation_lookup_avg_ms > thresholds.reputation_lookup) {
      score -= Math.min(30, (avgTimes.reputation_lookup_avg_ms / thresholds.reputation_lookup - 1) * 50);
    }
    
    if (avgTimes.portfolio_analysis_avg_ms > thresholds.portfolio_analysis) {
      score -= Math.min(25, (avgTimes.portfolio_analysis_avg_ms / thresholds.portfolio_analysis - 1) * 40);
    }
    
    if (avgTimes.monthly_processing_avg_ms > thresholds.monthly_processing) {
      score -= Math.min(25, (avgTimes.monthly_processing_avg_ms / thresholds.monthly_processing - 1) * 40);
    }
    
    if (avgTimes.tier_analytics_avg_ms > thresholds.tier_analytics) {
      score -= Math.min(20, (avgTimes.tier_analytics_avg_ms / thresholds.tier_analytics - 1) * 30);
    }

    return Math.max(0, Math.round(score));
  }

  private generateRecommendations(avgTimes: Record<string, number>, totalSongs: number): string[] {
    const recommendations = [];
    const thresholds = this.performanceThresholds;

    if (avgTimes.reputation_lookup_avg_ms > thresholds.reputation_lookup) {
      recommendations.push('Producer availability queries are slow - verify idx_game_states_reputation_lookup index');
    }

    if (avgTimes.portfolio_analysis_avg_ms > thresholds.portfolio_analysis) {
      recommendations.push('Portfolio analysis queries need optimization - check idx_songs_portfolio_analysis index');
    }

    if (avgTimes.monthly_processing_avg_ms > thresholds.monthly_processing) {
      recommendations.push('Monthly processing is slow - verify idx_songs_monthly_processing and artist join indexes');
    }

    if (avgTimes.tier_analytics_avg_ms > thresholds.tier_analytics) {
      recommendations.push('Tier analytics queries need optimization - check idx_songs_tier_performance index');
    }

    if (totalSongs > 500) {
      recommendations.push('Large song catalog detected - consider implementing query result caching');
    }

    if (totalSongs > 1000) {
      recommendations.push('Very large catalog - consider partitioning songs table by game_id');
    }

    if (recommendations.length === 0) {
      recommendations.push('All queries performing within target thresholds - excellent performance!');
    }

    return recommendations;
  }

  /**
   * Get performance metrics summary
   */
  getMetricsSummary(): {
    total_queries: number;
    avg_response_time: number;
    slow_queries: number;
    critical_queries: number;
  } {
    if (this.metrics.length === 0) {
      return { total_queries: 0, avg_response_time: 0, slow_queries: 0, critical_queries: 0 };
    }

    const totalQueries = this.metrics.length;
    const avgResponseTime = this.metrics.reduce((sum, m) => sum + m.execution_time_ms, 0) / totalQueries;
    const slowQueries = this.metrics.filter(m => m.status === 'slow').length;
    const criticalQueries = this.metrics.filter(m => m.status === 'critical').length;

    return {
      total_queries: totalQueries,
      avg_response_time: Math.round(avgResponseTime),
      slow_queries: slowQueries,
      critical_queries: criticalQueries
    };
  }
}

/**
 * Singleton instance for application-wide performance monitoring
 */
export const dbPerformanceMonitor = new DatabasePerformanceMonitor();

/**
 * Producer Tier specific query optimization utilities
 */
export class ProducerTierQueryOptimizer {
  /**
   * Get available producer tiers for current reputation (optimized)
   */
  static getAvailableProducerTiers(reputation: number): string[] {
    // From balance.json producer tier thresholds
    const tiers = [
      { name: 'local', threshold: 0 },
      { name: 'regional', threshold: 15 },
      { name: 'national', threshold: 35 },
      { name: 'legendary', threshold: 60 }
    ];

    return tiers
      .filter(tier => reputation >= tier.threshold)
      .map(tier => tier.name);
  }

  /**
   * Optimize portfolio analysis query with proper indexes
   */
  static async getPortfolioAnalysis(gameId: string) {
    return dbPerformanceMonitor.monitorQuery(
      'portfolio_analysis_optimized',
      db.execute(sql`
        SELECT 
          producer_tier,
          time_investment,
          COUNT(*) as track_count,
          AVG(quality) as avg_quality,
          AVG(total_revenue) as avg_revenue,
          AVG(total_streams) as avg_streams
        FROM songs 
        WHERE game_id = ${gameId} AND is_recorded = true 
        GROUP BY producer_tier, time_investment
        ORDER BY producer_tier, time_investment
      `),
      200
    );
  }

  /**
   * Optimize monthly quality calculation query
   */
  static async getMonthlyQualityData(gameId: string, month: number) {
    return dbPerformanceMonitor.monitorQuery(
      'monthly_quality_optimized',
      db.execute(sql`
        SELECT 
          s.id,
          s.quality,
          s.producer_tier,
          s.time_investment,
          a.mood,
          a.archetype
        FROM songs s 
        INNER JOIN artists a ON s.artist_id = a.id 
        WHERE s.game_id = ${gameId} 
          AND s.created_month = ${month}
          AND s.is_recorded = true
      `),
      300
    );
  }

  /**
   * Get tier performance analytics with caching hint
   */
  static async getTierPerformanceAnalytics(gameId: string) {
    return dbPerformanceMonitor.monitorQuery(
      'tier_performance_analytics',
      db.execute(sql`
        SELECT 
          producer_tier,
          COUNT(*) as total_tracks,
          AVG(total_revenue) as avg_revenue,
          AVG(total_streams) as avg_streams,
          MAX(total_revenue) as peak_revenue,
          SUM(total_revenue) as total_revenue
        FROM songs 
        WHERE game_id = ${gameId} 
          AND is_released = true 
          AND total_revenue > 0
        GROUP BY producer_tier
        ORDER BY avg_revenue DESC
      `),
      500
    );
  }
}

export { ProducerTierQueryOptimizer as QueryOptimizer };