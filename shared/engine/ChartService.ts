/**
 * ChartService.ts
 *
 * Chart system for music industry simulation
 * Manages weekly/monthly chart generation combining player songs with competitor performance
 *
 * This service creates a realistic chart environment where player songs compete
 * against simulated industry competitors for chart positions 1-100 based on streaming data.
 *
 * CHART WEEK FORMAT STANDARD:
 * ChartWeek values can be provided as either Date objects or ISO date strings (YYYY-MM-DD).
 * All values are normalized to Date objects before database operations using toDbDate().
 * This provides flexibility while ensuring consistent database storage.
 */

import type { InsertChartEntry, ChartEntry as DbChartEntry } from '../schema';
import type { CompetitorSong, SongPerformance } from '../types/gameTypes';
import { calculateChartMovement } from '../utils/chartUtils';
import { DEFAULT_CHART_COMPETITORS } from './chartCompetitors';

// Song data interface for chart operations
export interface ReleasedSongData {
  id: string;
  title: string;
  artistName: string;
  totalStreams: number;
  monthlyStreams: number;
}

// Storage interface for chart operations
export interface IChartStorage {
  // Song-related operations
  getReleasedSongsByGame(gameId: string, dbTransaction?: any): Promise<ReleasedSongData[]>;

  // Chart entry operations
  // NOTE: Implementation should use upsert semantics (ON CONFLICT DO NOTHING)
  // to handle duplicate insertions gracefully with the unique index
  createChartEntries(entries: InsertChartEntry[], dbTransaction?: any): Promise<void>;
  getChartEntriesBySongAndGame(songId: string, gameId: string, dbTransaction?: any): Promise<DbChartEntry[]>;
  getChartEntriesByWeekAndGame(chartWeek: Date, gameId: string, dbTransaction?: any): Promise<DbChartEntry[]>; // chartWeek: Date object
  getChartEntriesBySongsAndGame(songIds: string[], gameId: string, dbTransaction?: any): Promise<DbChartEntry[]>;
}

interface ChartServiceOptions {
  competitors?: CompetitorSong[];
  debug?: boolean;
}

/**
 * ChartService - Manages music chart generation and tracking
 * Follows same architectural patterns as FinancialSystem.ts
 */
export class ChartService {
  private gameData: any;
  private rng: () => number;
  private storage: IChartStorage;
  private gameId: string;
  private competitorCatalog: CompetitorSong[];
  private debug: boolean;
  private songsCache: Map<string, ReleasedSongData> | null = null;
  constructor(
    gameData: any,
    rng: () => number,
    storage: IChartStorage,
    gameId: string,
    options: ChartServiceOptions = {}
  ) {
    this.gameData = gameData;
    this.rng = rng;
    this.storage = storage;
    this.gameId = gameId;
    this.competitorCatalog = options.competitors ?? DEFAULT_CHART_COMPETITORS;
    this.debug = options.debug ?? false;
  }

  /**
   * Main method to generate monthly chart combining player and competitor songs
   * @param chartWeek Date object or ISO date string (YYYY-MM-DD) representing the first day of the month
   * @param dbTransaction Optional database transaction
   */
  async generateMonthlyChart(chartWeek: Date | string, dbTransaction?: any): Promise<void> {
    try {
      // Get active player songs (released songs with streaming data)
      const playerSongs = await this.getActiveSongs(dbTransaction);

      // Generate competitor performance for this week
      const competitorPerformance = this.generateCompetitorPerformance();

      // Combine and rank all songs by streams
      const allSongs = this.rankSongsByStreams(playerSongs, competitorPerformance);

      // Create chart entries in database
      await this.createChartEntries(chartWeek, allSongs, dbTransaction);

    } catch (error) {
      console.error('[CHART SERVICE] Error generating monthly chart:', error);
      throw error;
    }
  }

  /**
   * Gets active player songs that are eligible for charting
   */
  private async getActiveSongs(dbTransaction?: any): Promise<SongPerformance[]> {
    try {
      // Get all released songs with streaming data for this game
      const releasedSongs = await this.storage.getReleasedSongsByGame(this.gameId, dbTransaction);
      this.refreshSongsCache(releasedSongs);

      return releasedSongs
        .filter((song: ReleasedSongData) => song.monthlyStreams > 0) // Only songs with monthly streams
        .map((song: ReleasedSongData): SongPerformance => ({
          id: `player_${song.id}`,
          title: song.title,
          artist: song.artistName || 'Unknown Artist',
          streams: song.monthlyStreams || 0, // Use current monthly streams for chart
          isPlayerSong: true,
          songId: song.id
        }));
    } catch (error) {
      console.error('[CHART SERVICE] Error fetching active songs:', error);
      return [];
    }
  }

  private refreshSongsCache(releasedSongs: ReleasedSongData[]): Map<string, ReleasedSongData> {
    const songsMap = new Map<string, ReleasedSongData>();
    releasedSongs.forEach(song => songsMap.set(song.id, song));
    this.songsCache = songsMap;
    return songsMap;
  }

  /**
   * Generates simulated competitor performance with RNG variance
   */
  private generateCompetitorPerformance(): SongPerformance[] {
    // Read competitor variance range from balance config
    const chartSystem = this.gameData.getMarketFormulasSync?.().chart_system || {};
    const [minVar, maxVar] = chartSystem.competitor_variance_range || [0.8, 1.2];

    return this.competitorCatalog.map((competitor): SongPerformance => {
      // Apply RNG variance to base streams using config values
      const variance = this.getRandom(minVar, maxVar);
      const streams = Math.round(competitor.baseStreams * variance);

      return {
        id: competitor.id,
        title: competitor.title,
        artist: competitor.artist,
        streams: streams,
        isPlayerSong: false
      };
    });
  }

  /**
   * Combines and ranks all songs by stream count
   */
  private rankSongsByStreams(
    playerSongs: SongPerformance[],
    competitorSongs: SongPerformance[]
  ): SongPerformance[] {
    const allSongs = [...playerSongs, ...competitorSongs];

    // Sort by streams descending (highest first), with deterministic tie-breaker
    return allSongs
      .sort((a, b) => {
        // Primary sort: streams descending
        if (b.streams !== a.streams) {
          return b.streams - a.streams;
        }
        // Secondary sort: song ID ascending for deterministic tie-breaking
        return a.id.localeCompare(b.id);
      });
      // Note: Don't slice here - we need the full ranking for position calculation
  }

  /**
   * Creates chart entries in database with position calculations
   * @param chartWeek Date object or ISO date string (YYYY-MM-DD) representing the first day of the month
   * @param dbTransaction Optional database transaction
   */
  private async createChartEntries(chartWeek: Date | string, rankedSongs: SongPerformance[], dbTransaction?: any): Promise<void> {
    // Normalize chart week to Date object for calculations, then convert to string for database
    const normalizedChartWeek = this.toDbDate(chartWeek);
    const chartWeekString = normalizedChartWeek.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Get existing chart entries for this week to determine which songs already have entries
    const existingEntries = await this.storage.getChartEntriesByWeekAndGame(normalizedChartWeek, this.gameId, dbTransaction);
    const existingSongIds = new Set(existingEntries.map(entry => entry.songId));

    // Create set of existing competitor keys to prevent duplicates
    const existingCompetitorKeys = new Set(
      existingEntries
        .filter(entry => entry.isCompetitorSong)
        .map(entry => `${entry.competitorTitle}::${entry.competitorArtist}`)
    );

    const chartEntries: InsertChartEntry[] = [];
    const currentWeekTime = normalizedChartWeek.getTime();

    // Build position map for O(1) position lookup
    const positionMap = new Map<string, number>();
    rankedSongs.forEach((song, index) => {
      positionMap.set(song.id, index + 1); // Chart positions start at 1
    });

    // Universal Song Tracking: Store ALL songs (player + competitor) for complete chart history
    // This enables Top 10, Bubbling Under, and complete historical analytics

    // Optimize by batch fetching chart history for all player songs
    const playerSongs = rankedSongs.filter(s => s.isPlayerSong && s.songId);
    const playerSongIds = playerSongs.map(s => s.songId).filter(Boolean) as string[];

    const batchChartHistory = playerSongIds.length > 0
      ? await this.storage.getChartEntriesBySongsAndGame(playerSongIds, this.gameId, dbTransaction)
      : [];

    // Group entries by songId for efficient lookup
    const chartHistoryMap = new Map<string, any[]>();
    batchChartHistory.forEach(entry => {
      if (!entry.songId) {
        return;
      }
      if (!chartHistoryMap.has(entry.songId)) {
        chartHistoryMap.set(entry.songId, []);
      }
      chartHistoryMap.get(entry.songId)!.push(entry);
    });

    // Pre-calculate weeks on chart for all player songs
    const weeksOnChartMap = new Map<string, number>();
    for (const songId of playerSongIds) {
      const songHistory = chartHistoryMap.get(songId) || [];
      const chartingWeeks = songHistory.filter(entry =>
        entry.position !== null &&
        new Date(entry.chartWeek) < normalizedChartWeek
      );
      weeksOnChartMap.set(songId, chartingWeeks.length);
    }

    for (let i = 0; i < rankedSongs.length; i++) {
      const song = rankedSongs[i];

      const overallPosition = positionMap.get(song.id) || 0;

      if (song.isPlayerSong && song.songId) {
        // Player song handling
        if (existingSongIds.has(song.songId)) {
          continue; // Skip existing player songs
        }

        // Get pre-calculated weeks on chart
        const weeksOnChart = weeksOnChartMap.get(song.songId) || 0;

        // Determine if song should chart or just be tracked
        const shouldChart = this.shouldRemainOnChart(song.streams, weeksOnChart, overallPosition);
        const chartPosition = shouldChart && overallPosition <= 100 ? overallPosition : null;

        if (this.debug && !shouldChart) {
          console.log(`[CHART SERVICE] Player song "${song.title}" by ${song.artist} tracked but not charting:`, {
            songId: song.songId,
            streams: song.streams,
            weeksOnChart,
            originalPosition: overallPosition,
            chartPosition: null
          });
        }

        // Only consider it a debut if the song is actually charting (position is not null)
        // Use pre-calculated chart history to determine debut status and previous position
        const songHistory = chartHistoryMap.get(song.songId) || [];
        let hasPriorChartingEntry = false;
        let previousPosition: number | null = null;
        let latestPreviousTime = -Infinity;

        for (const historyEntry of songHistory) {
          if (historyEntry.position === null) {
            continue;
          }

          const entryTime = new Date(historyEntry.chartWeek).getTime();
          if (entryTime >= currentWeekTime) {
            continue;
          }

          hasPriorChartingEntry = true;
          if (entryTime > latestPreviousTime) {
            latestPreviousTime = entryTime;
            previousPosition = historyEntry.position;
          }
        }

        const isDebut = chartPosition !== null ? !hasPriorChartingEntry : false;
        const movement = chartPosition !== null
          ? calculateChartMovement(chartPosition, previousPosition)
          : 0;

        // Always insert a row for player songs - use null position for non-charting songs
        chartEntries.push({
          songId: song.songId,
          gameId: this.gameId,
          chartWeek: chartWeekString,
          streams: song.streams,
          position: chartPosition, // null when not charting
          isDebut,
          movement,
          isCompetitorSong: false
        });

      } else {
        // Competitor song handling - store all competitors for complete chart data
        const competitorKey = `${song.title}::${song.artist}`;

        // Skip if this competitor already has an entry for this week
        if (existingCompetitorKeys.has(competitorKey)) {
          continue;
        }

        chartEntries.push({
          songId: null, // Competitor songs don't have real songId
          gameId: this.gameId,
          chartWeek: chartWeekString,
          streams: song.streams,
          position: overallPosition <= 100 ? overallPosition : null,
          isDebut: false, // Competitors don't have debut tracking
          movement: 0, // TODO: Calculate competitor movement
          isCompetitorSong: true,
          competitorTitle: song.title,
          competitorArtist: song.artist
        });
      }
    }

    // Log chart generation summary
    const totalRankedSongs = rankedSongs.length;
    const playerSongsForLogging = rankedSongs.filter(s => s.isPlayerSong);
    const competitorSongs = rankedSongs.filter(s => !s.isPlayerSong);
    const songsWithEntries = chartEntries.length;

    if (this.debug) {
      console.log(`[CHART SERVICE] Universal Song Tracking complete for ${normalizedChartWeek.toISOString().split('T')[0]}:`, {
        totalRankedSongs,
        playerSongs: playerSongsForLogging.length,
        competitorSongs: competitorSongs.length,
        existingEntries: existingSongIds.size,
        newEntriesCreated: songsWithEntries,
        universalTrackingEnabled: true
      });
    }

    // Insert only missing chart entries (rely on unique index for additional protection)
    if (chartEntries.length > 0) {
      await this.storage.createChartEntries(chartEntries, dbTransaction);
      if (this.debug) {
        console.log(`[CHART SERVICE] Successfully created ${chartEntries.length} new chart entries`);
      }
    }
  }

  /**
   * Checks if this is the first time a song is charting
   * @param currentChartWeek Date object or ISO date string (YYYY-MM-DD)
   * @param dbTransaction Optional database transaction
   */
  private async isFirstTimeCharting(songId: string, currentChartWeek: Date | string, dbTransaction?: any): Promise<boolean> {
    try {
      const previousEntries = await this.storage.getChartEntriesBySongAndGame(songId, this.gameId, dbTransaction);

      // Normalize current chart week for comparison
      const normalizedCurrentWeek = this.toDbDate(currentChartWeek);

      // Filter for prior charting entries (position !== null) that occurred before current week
      const priorChartingEntries = previousEntries.filter(entry =>
        entry.position !== null &&
        new Date(entry.chartWeek) < normalizedCurrentWeek
      );

      return priorChartingEntries.length === 0;
    } catch (error) {
      console.error('[CHART SERVICE] Error checking debut status:', error);
      return true; // Assume debut on error
    }
  }

  /**
   * Gets random number using seeded RNG (same pattern as FinancialSystem)
   */
  private getRandom(min: number, max: number): number {
    return min + (this.rng() * (max - min));
  }

  /**
   * Normalizes chart week input to Date object for database operations
   * @param chartWeek Date object or ISO date string (YYYY-MM-DD)
   * @returns Date object normalized to first day of month
   */
  private toDbDate(chartWeek: Date | string): Date {
    if (chartWeek instanceof Date) {
      return chartWeek;
    }
    // Parse ISO string and ensure it's the first day of the month
    const date = new Date(chartWeek);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  /**
   * Generates ISO date string for chart week from game month
   * @param gameMonth The current game month (1-36)
   * @param startYear The starting year of the campaign (default 2024)
   * @returns ISO date string (YYYY-MM-DD) for the first day of the month
   */
  static generateChartWeekFromGameMonth(gameMonth: number, startYear: number = 2024): string {
    const monthIndex = ((gameMonth - 1) % 12);
    const yearOffset = Math.floor((gameMonth - 1) / 12);
    const year = startYear + yearOffset;
    const month = monthIndex + 1;

    // Return first day of month in ISO format (YYYY-MM-DD)
    return `${year}-${month.toString().padStart(2, '0')}-01`;
  }

  /**
   * Gets chart data for a specific week (for UI display)
   * @param chartWeek Date object or ISO date string (YYYY-MM-DD) representing the first day of the month
   */
  async getChartForWeek(chartWeek: Date | string): Promise<DbChartEntry[]> {
    try {
      const normalizedChartWeek = this.toDbDate(chartWeek);
      return await this.storage.getChartEntriesByWeekAndGame(normalizedChartWeek, this.gameId);
    } catch (error) {
      console.error('[CHART SERVICE] Error fetching chart for week:', error);
      return [];
    }
  }

  /**
   * Gets chart history for a specific song (for tracking performance)
   */
  async getSongChartHistory(songId: string): Promise<DbChartEntry[]> {
    try {
      return await this.storage.getChartEntriesBySongAndGame(songId, this.gameId);
    } catch (error) {
      console.error('[CHART SERVICE] Error fetching song chart history:', error);
      return [];
    }
  }

  /**
   * Gets current chart position for a song (most recent week)
   */
  async getCurrentChartPosition(songId: string): Promise<number | null> {
    try {
      const history = await this.getSongChartHistory(songId);
      if (history.length === 0) return null;

      // Get most recent entry
      const latest = history.sort((a, b) =>
        new Date(b.chartWeek).getTime() - new Date(a.chartWeek).getTime()
      )[0];

      return latest.position;
    } catch (error) {
      console.error('[CHART SERVICE] Error getting current position:', error);
      return null;
    }
  }

  /**
   * Gets chart entries for the current week with song details for summary display
   * @param dbTransaction Optional database transaction
   */
  async getCurrentWeekChartEntries(chartWeek: Date | string, dbTransaction?: any): Promise<Array<DbChartEntry & {
    songTitle: string;
    artistName: string;
    weeksOnChart: number;
    peakPosition: number | null;
    lastWeekPosition: number | null;
    movement: number;
  }>> {
    try {
      const normalizedChartWeek = this.toDbDate(chartWeek);
      const currentEntries = await this.storage.getChartEntriesByWeekAndGame(normalizedChartWeek, this.gameId, dbTransaction);

      const playerSongIds = Array.from(new Set(
        currentEntries
          .filter(entry => !entry.isCompetitorSong && entry.songId)
          .map(entry => entry.songId as string)
      ));

      const songsMap = playerSongIds.length > 0
        ? await this.buildSongsMap(dbTransaction)
        : new Map<string, ReleasedSongData>();

      const batchData = await this.getBatchChartData(playerSongIds, dbTransaction);

      // Build result with song details and weeks on chart calculation
      const entriesWithDetails = currentEntries.map(entry => {
        let songTitle: string;
        let artistName: string;
        let weeksOnChart = 0;
        let peakPosition: number | null = null;
        let lastWeekPosition: number | null = null;
        let movement = entry.movement ?? 0;
        let isDebut = entry.isDebut ?? false;

        if (entry.isCompetitorSong) {
          // Competitor song - use stored title and artist
          songTitle = entry.competitorTitle || 'Unknown Song';
          artistName = entry.competitorArtist || 'Unknown Artist';
          weeksOnChart = entry.position !== null ? 1 : 0;
          peakPosition = entry.position ?? null;
          lastWeekPosition = null; // Competitors don't have historical tracking yet
        } else {
          // Player song - lookup from songs table
          const songData = entry.songId ? songsMap.get(entry.songId) : undefined;
          songTitle = songData?.title || 'Unknown Song';
          artistName = songData?.artistName || 'Unknown Artist';

          const chartStats = entry.songId ? batchData.get(entry.songId) : undefined;
          if (chartStats) {
            weeksOnChart = chartStats.weeksOnChart;
            peakPosition = chartStats.peakPosition;
            lastWeekPosition = chartStats.lastWeekPosition;
            movement = chartStats.movement;
            isDebut = chartStats.isDebut;
          } else {
            weeksOnChart = entry.position !== null ? 1 : 0;
            peakPosition = entry.position ?? null;
            lastWeekPosition = null;
          }
        }

        return {
          ...entry,
          songTitle,
          artistName,
          weeksOnChart,
          peakPosition,
          lastWeekPosition,
          movement,
          isDebut
        };
      });

      return entriesWithDetails;
    } catch (error) {
      console.error('[CHART SERVICE] Error getting current week chart entries:', error);
      return [];
    }
  }

  /**
   * Builds a map of songs for efficient lookup
   */
  private async buildSongsMap(dbTransaction?: any): Promise<Map<string, ReleasedSongData>> {
    if (this.songsCache) {
      return this.songsCache;
    }

    const songs = await this.storage.getReleasedSongsByGame(this.gameId, dbTransaction);
    return this.refreshSongsCache(songs);
  }

  /**
   * Calculates how many weeks a song has been on the charts before the current week
   */
  /**
   * Batch fetches chart data for multiple songs to optimize API performance
   */
  async getBatchChartData(songIds: string[], dbTransaction?: any): Promise<Map<string, {
    currentPosition: number | null;
    movement: number;
    weeksOnChart: number;
    peakPosition: number | null;
    lastWeekPosition: number | null;
    isDebut: boolean;
  }>> {
    try {
      if (songIds.length === 0) {
        return new Map();
      }

      // Fetch all chart entries for these songs in one query
      const allEntries = await this.storage.getChartEntriesBySongsAndGame(songIds, this.gameId, dbTransaction);

      // Group entries by song ID
      const entriesBySong = new Map<string, DbChartEntry[]>();
      allEntries.forEach(entry => {
        if (!entry.songId) {
          return;
        }
        if (!entriesBySong.has(entry.songId)) {
          entriesBySong.set(entry.songId, []);
        }
        entriesBySong.get(entry.songId)!.push(entry);
      });

      // Calculate chart data for each song
      const batchData = new Map<string, {
        currentPosition: number | null;
        movement: number;
        weeksOnChart: number;
        peakPosition: number | null;
        lastWeekPosition: number | null;
        isDebut: boolean;
      }>();

      for (const songId of songIds) {
        const songEntries = entriesBySong.get(songId) || [];

        // Sort entries by chart week descending (most recent first)
        const sortedEntries = songEntries.sort((a, b) =>
          new Date(b.chartWeek).getTime() - new Date(a.chartWeek).getTime()
        );

        // Calculate current position (most recent entry)
        const currentEntry = sortedEntries.length > 0 ? sortedEntries[0] : null;
        const currentPosition = currentEntry?.position || null;

        // Calculate movement (difference from previous week) and capture last week position
        let movement = 0;
        let lastWeekPosition: number | null = null;
        if (sortedEntries.length >= 2) {
          const current = sortedEntries[0];
          const previous = sortedEntries[1];
          lastWeekPosition = previous.position; // Capture last week position
          if (current.position && previous.position) {
            movement = previous.position - current.position; // Positive = moved up
          }
        }

        // Calculate weeks on chart (entries with position !== null)
        const weeksOnChart = sortedEntries.filter(entry => entry.position !== null).length;

        // Calculate peak position (lowest number = highest position)
        const chartingEntries = sortedEntries.filter(entry => entry.position !== null);
        const peakPosition = chartingEntries.length > 0
          ? Math.min(...chartingEntries.map(entry => entry.position!))
          : null;

        // Check if this is a debut (first entry has isDebut flag)
        const isDebut = currentEntry?.isDebut || false;

        batchData.set(songId, {
          currentPosition,
          movement,
          weeksOnChart,
          peakPosition,
          lastWeekPosition,
          isDebut
        });
      }

      return batchData;
    } catch (error) {
      console.error('[CHART SERVICE] Error fetching batch data:', error);
      return new Map();
    }
  }

  /**
   * Determines if a song should remain on the charts based on performance
   */
  shouldRemainOnChart(streamingPerformance: number, weeksOnChart: number, currentPosition: number): boolean {
    // Load chart exit thresholds from balance config
    const marketFormulas = this.gameData.getMarketFormulasSync?.();
    const chartExitConfig = marketFormulas?.chart_system?.chart_exit || {
      max_chart_position: 100,
      long_tenure_weeks: 30,
      long_tenure_position_threshold: 80,
      low_streams_threshold: 1000,
      low_streams_position_threshold: 90
    };

    // Songs exit if they drop below the configured maximum chart position
    if (currentPosition > chartExitConfig.max_chart_position) {
      return false;
    }

    // Songs with very long chart tenure and poor positioning should exit
    if (weeksOnChart > chartExitConfig.long_tenure_weeks && currentPosition > chartExitConfig.long_tenure_position_threshold) {
      return false;
    }

    // Songs with declining streaming performance should exit if positioned poorly
    if (streamingPerformance < chartExitConfig.low_streams_threshold && currentPosition > chartExitConfig.low_streams_position_threshold) {
      return false;
    }

    return true;
  }

  /**
   * Gets Top 10 chart data with enhanced details for UI display
   */
  async getTop10ChartData(chartWeek: Date | string, dbTransaction?: any): Promise<Array<{
    position: number;
    songId: string | null;
    songTitle: string;
    artistName: string;
    streams: number;
    movement: number;
    weeksOnChart: number;
    peakPosition: number | null;
    lastWeekPosition: number | null;
    isPlayerSong: boolean;
    isCompetitorSong: boolean;
    competitorTitle?: string;
    competitorArtist?: string;
    isDebut: boolean;
  }>> {
    try {
      const normalizedChartWeek = this.toDbDate(chartWeek);

      // Get current week chart entries with song details
      const entriesWithDetails = await this.getCurrentWeekChartEntries(normalizedChartWeek, dbTransaction);

      // Filter for Top 10 and sort by position
      const top10Entries = entriesWithDetails
        .filter(entry => entry.position !== null && entry.position >= 1 && entry.position <= 10)
        .sort((a, b) => (a.position || 101) - (b.position || 101));

      // Build enhanced Top 10 data with universal song tracking
      const top10Data = top10Entries.map(entry => {
        return {
          position: entry.position!,
          songId: entry.isCompetitorSong ? null : entry.songId, // null for competitors
          songTitle: entry.songTitle,
          artistName: entry.artistName,
          streams: entry.streams,
          movement: entry.movement ?? 0,
          weeksOnChart: entry.weeksOnChart,
          peakPosition: entry.peakPosition ?? (entry.position ?? null),
          lastWeekPosition: entry.lastWeekPosition ?? null,
          isPlayerSong: !entry.isCompetitorSong,
          isCompetitorSong: entry.isCompetitorSong ?? false,
          competitorTitle: entry.competitorTitle ?? undefined,
          competitorArtist: entry.competitorArtist ?? undefined,
          isDebut: entry.isDebut ?? false
        };
      });

      return top10Data;
    } catch (error) {
      console.error('[CHART SERVICE] Error getting Top 10 chart data:', error);
      return [];
    }
  }
}