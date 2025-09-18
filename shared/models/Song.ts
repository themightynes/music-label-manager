/**
 * Song Model
 *
 * Wraps database Song type and provides chart-related methods
 * Uses dependency injection to receive ChartService instance
 */

import type { Song as DbSong, ChartEntry as DbChartEntry } from '../schema';
import type { ChartService } from '../engine/ChartService';

export interface SongChartData {
  currentPosition: number | null;
  movement: number;
  weeksOnChart: number;
  peakPosition: number | null;
  isDebut: boolean;
  chartHistory: DbChartEntry[];
}

export class Song {
  private dbSong: DbSong;
  private chartService: ChartService;
  private chartDataCache?: SongChartData;

  constructor(dbSong: DbSong, chartService: ChartService) {
    this.dbSong = dbSong;
    this.chartService = chartService;
  }

  // Expose all database song properties
  get id(): string { return this.dbSong.id; }
  get title(): string { return this.dbSong.title; }
  get artistId(): string { return this.dbSong.artistId; }
  get gameId(): string { return this.dbSong.gameId; }
  get quality(): number { return this.dbSong.quality; }
  get genre(): string | null { return this.dbSong.genre; }
  get mood(): string | null { return this.dbSong.mood; }
  get createdMonth(): number | null { return this.dbSong.createdMonth; }
  get producerTier(): string { return this.dbSong.producerTier || 'local'; }
  get timeInvestment(): string { return this.dbSong.timeInvestment || 'standard'; }
  get isRecorded(): boolean { return this.dbSong.isRecorded || false; }
  get isReleased(): boolean { return this.dbSong.isReleased || false; }
  get releaseId(): string | null { return this.dbSong.releaseId; }
  get recordedAt(): Date | null { return this.dbSong.recordedAt; }
  get releasedAt(): Date | null { return this.dbSong.releasedAt; }
  get initialStreams(): number { return this.dbSong.initialStreams || 0; }
  get totalStreams(): number { return this.dbSong.totalStreams || 0; }
  get totalRevenue(): number { return this.dbSong.totalRevenue || 0; }
  get monthlyStreams(): number { return this.dbSong.monthlyStreams || 0; }
  get lastMonthRevenue(): number { return this.dbSong.lastMonthRevenue || 0; }
  get releaseMonth(): number | null { return this.dbSong.releaseMonth; }
  get projectId(): string | null { return this.dbSong.projectId; }
  get productionBudget(): number { return this.dbSong.productionBudget || 0; }
  get marketingAllocation(): number { return this.dbSong.marketingAllocation || 0; }
  get totalInvestment(): number | null { return this.dbSong.totalInvestment; }
  get roiPercentage(): number | null { return this.dbSong.roiPercentage; }
  get metadata(): any { return this.dbSong.metadata; }
  get createdAt(): Date | null { return this.dbSong.createdAt; }

  /**
   * Gets current chart position for the song
   */
  async getCurrentChartPosition(): Promise<number | null> {
    try {
      await this.ensureChartDataLoaded();
      return this.chartDataCache?.currentPosition ?? null;
    } catch (error) {
      console.error('[SONG MODEL] Error getting current chart position:', error);
      return null;
    }
  }

  /**
   * Calculates chart movement from previous week
   */
  async getChartMovement(): Promise<number> {
    try {
      await this.ensureChartDataLoaded();
      return this.chartDataCache?.movement || 0;
    } catch (error) {
      console.error('[SONG MODEL] Error getting chart movement:', error);
      return 0;
    }
  }

  /**
   * Counts total weeks the song has been charting
   */
  async getWeeksOnChart(): Promise<number> {
    try {
      await this.ensureChartDataLoaded();
      return this.chartDataCache?.weeksOnChart || 0;
    } catch (error) {
      console.error('[SONG MODEL] Error getting weeks on chart:', error);
      return 0;
    }
  }

  /**
   * Returns the highest chart position achieved
   */
  async getPeakPosition(): Promise<number | null> {
    try {
      await this.ensureChartDataLoaded();
      return this.chartDataCache?.peakPosition || null;
    } catch (error) {
      console.error('[SONG MODEL] Error getting peak position:', error);
      return null;
    }
  }

  /**
   * Checks if the song is debuting on charts this week
   */
  async isChartDebut(): Promise<boolean> {
    try {
      await this.ensureChartDataLoaded();
      return this.chartDataCache?.isDebut || false;
    } catch (error) {
      console.error('[SONG MODEL] Error checking chart debut:', error);
      return false;
    }
  }

  /**
   * Gets complete chart history for the song
   */
  async getChartHistory(): Promise<DbChartEntry[]> {
    try {
      await this.ensureChartDataLoaded();
      return this.chartDataCache?.chartHistory || [];
    } catch (error) {
      console.error('[SONG MODEL] Error getting chart history:', error);
      return [];
    }
  }

  /**
   * Ensures chart data is loaded and cached
   */
  private async ensureChartDataLoaded(): Promise<void> {
    if (this.chartDataCache) {
      return;
    }

    try {
      const rawChartHistory = await this.chartService.getSongChartHistory(this.id);

      // Explicitly sort chart history by chartWeek descending (most recent first)
      const chartHistory = rawChartHistory.sort((a, b) =>
        new Date(b.chartWeek).getTime() - new Date(a.chartWeek).getTime()
      );

      // Calculate current position (most recent entry)
      const currentEntry = chartHistory.length > 0 ? chartHistory[0] : null;
      const currentPosition = currentEntry?.position || null;

      // Calculate movement (difference from previous week)
      let movement = 0;
      if (chartHistory.length >= 2) {
        const current = chartHistory[0];
        const previous = chartHistory[1];
        if (current.position && previous.position) {
          movement = previous.position - current.position; // Positive = moved up
        }
      }

      // Calculate weeks on chart (entries with position !== null)
      const weeksOnChart = chartHistory.filter(entry => entry.position !== null).length;

      // Calculate peak position (lowest number = highest position)
      const chartingEntries = chartHistory.filter(entry => entry.position !== null);
      const peakPosition = chartingEntries.length > 0
        ? Math.min(...chartingEntries.map(entry => entry.position!))
        : null;

      // Check if this is a debut (first entry has isDebut flag)
      const isDebut = currentEntry?.isDebut || false;

      this.chartDataCache = {
        currentPosition,
        movement,
        weeksOnChart,
        peakPosition,
        isDebut,
        chartHistory
      };

    } catch (error) {
      console.error('[SONG MODEL] Error loading chart data:', error);
      // Set empty cache to avoid repeated failures
      this.chartDataCache = {
        currentPosition: null,
        movement: 0,
        weeksOnChart: 0,
        peakPosition: null,
        isDebut: false,
        chartHistory: []
      };
    }
  }

  /**
   * Converts the Song model to a plain object for API responses
   */
  async toJSON(): Promise<DbSong & {
    currentChartPosition?: number | null;
    chartMovement?: number;
    weeksOnChart?: number;
    peakPosition?: number | null;
    isChartDebut?: boolean;
  }> {
    await this.ensureChartDataLoaded();

    return {
      ...this.dbSong,
      currentChartPosition: this.chartDataCache?.currentPosition || null,
      chartMovement: this.chartDataCache?.movement || 0,
      weeksOnChart: this.chartDataCache?.weeksOnChart || 0,
      peakPosition: this.chartDataCache?.peakPosition || null,
      isChartDebut: this.chartDataCache?.isDebut || false
    };
  }
}