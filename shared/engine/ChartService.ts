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

/**
 * ChartService - Manages music chart generation and tracking
 * Follows same architectural patterns as FinancialSystem.ts
 */
export class ChartService {
  private gameData: any;
  private rng: () => number;
  private storage: IChartStorage;
  private gameId: string;

  // Static competitor song dataset - 98 fake songs spanning various genres
  private static readonly CHART_COMPETITORS: CompetitorSong[] = [
    // Pop/Mainstream (25 songs) - High streams 800K-1M
    { id: 'comp_001', title: 'Electric Dreams', artist: 'Luna Rose', baseStreams: 950000, genre: 'pop' },
    { id: 'comp_002', title: 'Midnight City', artist: 'The Neon Lights', baseStreams: 920000, genre: 'pop' },
    { id: 'comp_003', title: 'Golden Hour', artist: 'Skylar Blue', baseStreams: 890000, genre: 'pop' },
    { id: 'comp_004', title: 'Dancing Shadows', artist: 'Crystal Dreams', baseStreams: 875000, genre: 'pop' },
    { id: 'comp_005', title: 'Fire in the Rain', artist: 'Phoenix Rising', baseStreams: 860000, genre: 'pop' },
    { id: 'comp_006', title: 'Starlight Boulevard', artist: 'Madison Vale', baseStreams: 845000, genre: 'pop' },
    { id: 'comp_007', title: 'Ocean Waves', artist: 'Coral Reef', baseStreams: 830000, genre: 'pop' },
    { id: 'comp_008', title: 'Neon Nights', artist: 'Electric Youth', baseStreams: 815000, genre: 'pop' },
    { id: 'comp_009', title: 'Sugar Rush', artist: 'Candy Hearts', baseStreams: 800000, genre: 'pop' },
    { id: 'comp_010', title: 'Velvet Sky', artist: 'Dream State', baseStreams: 885000, genre: 'pop' },
    { id: 'comp_011', title: 'Paper Planes', artist: 'Summer Storm', baseStreams: 870000, genre: 'pop' },
    { id: 'comp_012', title: 'Mirror Ball', artist: 'Disco Fever', baseStreams: 855000, genre: 'pop' },
    { id: 'comp_013', title: 'Wild Hearts', artist: 'Freedom Call', baseStreams: 840000, genre: 'pop' },
    { id: 'comp_014', title: 'Silver Lining', artist: 'Cloud Nine', baseStreams: 825000, genre: 'pop' },
    { id: 'comp_015', title: 'Diamond Eyes', artist: 'Precious Stone', baseStreams: 810000, genre: 'pop' },
    { id: 'comp_016', title: 'Thunder Storm', artist: 'Lightning Bolt', baseStreams: 895000, genre: 'pop' },
    { id: 'comp_017', title: 'Cosmic Love', artist: 'Galaxy Girl', baseStreams: 880000, genre: 'pop' },
    { id: 'comp_018', title: 'Sunset Drive', artist: 'Highway Dreams', baseStreams: 865000, genre: 'pop' },
    { id: 'comp_019', title: 'Purple Rain', artist: 'Violet Storm', baseStreams: 850000, genre: 'pop' },
    { id: 'comp_020', title: 'Angel Wings', artist: 'Heaven Sent', baseStreams: 835000, genre: 'pop' },
    { id: 'comp_021', title: 'Magic Moment', artist: 'Fairy Tale', baseStreams: 820000, genre: 'pop' },
    { id: 'comp_022', title: 'Shooting Star', artist: 'Meteor Shower', baseStreams: 905000, genre: 'pop' },
    { id: 'comp_023', title: 'Butterfly Effect', artist: 'Metamorphosis', baseStreams: 890000, genre: 'pop' },
    { id: 'comp_024', title: 'Crystal Clear', artist: 'Pure Light', baseStreams: 875000, genre: 'pop' },
    { id: 'comp_025', title: 'Endless Summer', artist: 'Beach Vibes', baseStreams: 860000, genre: 'pop' },

    // Hip-Hop/R&B (20 songs) - Medium-high streams 600K-800K
    { id: 'comp_026', title: 'City Streets', artist: 'Urban Legend', baseStreams: 750000, genre: 'hip-hop' },
    { id: 'comp_027', title: 'Gold Chains', artist: 'Money Mike', baseStreams: 720000, genre: 'hip-hop' },
    { id: 'comp_028', title: 'Midnight Hustle', artist: 'Street King', baseStreams: 690000, genre: 'hip-hop' },
    { id: 'comp_029', title: 'Diamond Grillz', artist: 'Ice Cold', baseStreams: 675000, genre: 'hip-hop' },
    { id: 'comp_030', title: 'Smooth Operator', artist: 'Silky Voice', baseStreams: 730000, genre: 'r&b' },
    { id: 'comp_031', title: 'Love Letters', artist: 'Soul Sister', baseStreams: 710000, genre: 'r&b' },
    { id: 'comp_032', title: 'Velvet Touch', artist: 'Smooth Moves', baseStreams: 685000, genre: 'r&b' },
    { id: 'comp_033', title: 'Bass Drop', artist: 'Heavy Beats', baseStreams: 665000, genre: 'hip-hop' },
    { id: 'comp_034', title: 'Rhythm Nation', artist: 'Beat Master', baseStreams: 645000, genre: 'hip-hop' },
    { id: 'comp_035', title: 'Soulful Eyes', artist: 'Heart Strings', baseStreams: 740000, genre: 'r&b' },
    { id: 'comp_036', title: 'Street Dreams', artist: 'Rising Star', baseStreams: 700000, genre: 'hip-hop' },
    { id: 'comp_037', title: 'Honey Voice', artist: 'Sweet Melody', baseStreams: 680000, genre: 'r&b' },
    { id: 'comp_038', title: 'Crown King', artist: 'Royal Blood', baseStreams: 660000, genre: 'hip-hop' },
    { id: 'comp_039', title: 'Midnight Soul', artist: 'Dark Velvet', baseStreams: 725000, genre: 'r&b' },
    { id: 'comp_040', title: 'Urban Jungle', artist: 'Concrete King', baseStreams: 695000, genre: 'hip-hop' },
    { id: 'comp_041', title: 'Liquid Gold', artist: 'Golden Voice', baseStreams: 715000, genre: 'r&b' },
    { id: 'comp_042', title: 'Fast Lane', artist: 'Speed Demon', baseStreams: 670000, genre: 'hip-hop' },
    { id: 'comp_043', title: 'Silk Sheets', artist: 'Luxury Life', baseStreams: 650000, genre: 'r&b' },
    { id: 'comp_044', title: 'Money Trees', artist: 'Cash Flow', baseStreams: 635000, genre: 'hip-hop' },
    { id: 'comp_045', title: 'Sweet Dreams', artist: 'Lullaby Queen', baseStreams: 755000, genre: 'r&b' },

    // Rock/Alternative (18 songs) - Medium streams 400K-600K
    { id: 'comp_046', title: 'Breaking Chains', artist: 'Steel Heart', baseStreams: 580000, genre: 'rock' },
    { id: 'comp_047', title: 'Electric Storm', artist: 'Thunder Gods', baseStreams: 550000, genre: 'rock' },
    { id: 'comp_048', title: 'Rebel Yell', artist: 'Wild Ones', baseStreams: 520000, genre: 'rock' },
    { id: 'comp_049', title: 'Dark Side', artist: 'Shadow Band', baseStreams: 490000, genre: 'alternative' },
    { id: 'comp_050', title: 'Neon Lights', artist: 'City Nights', baseStreams: 460000, genre: 'alternative' },
    { id: 'comp_051', title: 'Fire Storm', artist: 'Flame Throwers', baseStreams: 430000, genre: 'rock' },
    { id: 'comp_052', title: 'Lost Highway', artist: 'Road Warriors', baseStreams: 570000, genre: 'rock' },
    { id: 'comp_053', title: 'Broken Dreams', artist: 'Shattered Glass', baseStreams: 540000, genre: 'alternative' },
    { id: 'comp_054', title: 'Iron Will', artist: 'Metal Hearts', baseStreams: 510000, genre: 'rock' },
    { id: 'comp_055', title: 'Silent Storm', artist: 'Quiet Riot', baseStreams: 480000, genre: 'alternative' },
    { id: 'comp_056', title: 'Phoenix Rising', artist: 'Ash to Fire', baseStreams: 450000, genre: 'rock' },
    { id: 'comp_057', title: 'Midnight Run', artist: 'Night Riders', baseStreams: 420000, genre: 'rock' },
    { id: 'comp_058', title: 'Wild Spirit', artist: 'Free Birds', baseStreams: 560000, genre: 'alternative' },
    { id: 'comp_059', title: 'Stone Cold', artist: 'Granite Kings', baseStreams: 530000, genre: 'rock' },
    { id: 'comp_060', title: 'Electric Dreams', artist: 'Voltage', baseStreams: 500000, genre: 'alternative' },
    { id: 'comp_061', title: 'Crimson Tide', artist: 'Red Wave', baseStreams: 470000, genre: 'rock' },
    { id: 'comp_062', title: 'Velvet Underground', artist: 'Smooth Rebels', baseStreams: 440000, genre: 'alternative' },
    { id: 'comp_063', title: 'Steel Magnolia', artist: 'Southern Storm', baseStreams: 410000, genre: 'rock' },

    // Electronic/Dance (15 songs) - Variable streams 300K-700K
    { id: 'comp_064', title: 'Bass Line', artist: 'DJ Electric', baseStreams: 680000, genre: 'electronic' },
    { id: 'comp_065', title: 'Pulse Beat', artist: 'Rhythm Machine', baseStreams: 620000, genre: 'electronic' },
    { id: 'comp_066', title: 'Neon Nights', artist: 'Laser Show', baseStreams: 580000, genre: 'electronic' },
    { id: 'comp_067', title: 'Digital Dreams', artist: 'Cyber Soul', baseStreams: 540000, genre: 'electronic' },
    { id: 'comp_068', title: 'Electric Feel', artist: 'Voltage Drop', baseStreams: 500000, genre: 'electronic' },
    { id: 'comp_069', title: 'Synthetic Love', artist: 'Robot Hearts', baseStreams: 460000, genre: 'electronic' },
    { id: 'comp_070', title: 'Frequency', artist: 'Sound Wave', baseStreams: 420000, genre: 'electronic' },
    { id: 'comp_071', title: 'Matrix Code', artist: 'Digital Underground', baseStreams: 380000, genre: 'electronic' },
    { id: 'comp_072', title: 'Laser Beam', artist: 'Light Speed', baseStreams: 340000, genre: 'electronic' },
    { id: 'comp_073', title: 'Circuit Board', artist: 'Tech Noir', baseStreams: 300000, genre: 'electronic' },
    { id: 'comp_074', title: 'Bass Drop', artist: 'Sub Sonic', baseStreams: 650000, genre: 'electronic' },
    { id: 'comp_075', title: 'Electro Shock', artist: 'High Voltage', baseStreams: 590000, genre: 'electronic' },
    { id: 'comp_076', title: 'Cyber Punk', artist: 'Future Funk', baseStreams: 550000, genre: 'electronic' },
    { id: 'comp_077', title: 'Digital Rain', artist: 'Code Matrix', baseStreams: 510000, genre: 'electronic' },
    { id: 'comp_078', title: 'Neon Flash', artist: 'Glow Stick', baseStreams: 470000, genre: 'electronic' },

    // Indie/Folk/Country (20 songs) - Lower streams 50K-400K
    { id: 'comp_079', title: 'Country Roads', artist: 'Hometown Hero', baseStreams: 380000, genre: 'country' },
    { id: 'comp_080', title: 'Whiskey Nights', artist: 'Bourbon Blues', baseStreams: 350000, genre: 'country' },
    { id: 'comp_081', title: 'Mountain High', artist: 'Alpine Dreams', baseStreams: 320000, genre: 'folk' },
    { id: 'comp_082', title: 'River Song', artist: 'Creek Bend', baseStreams: 290000, genre: 'folk' },
    { id: 'comp_083', title: 'Prairie Wind', artist: 'Open Sky', baseStreams: 260000, genre: 'country' },
    { id: 'comp_084', title: 'Coffee Shop', artist: 'Indie Dreams', baseStreams: 230000, genre: 'indie' },
    { id: 'comp_085', title: 'Vintage Love', artist: 'Retro Hearts', baseStreams: 200000, genre: 'indie' },
    { id: 'comp_086', title: 'Acoustic Soul', artist: 'String Theory', baseStreams: 170000, genre: 'folk' },
    { id: 'comp_087', title: 'Small Town', artist: 'Main Street', baseStreams: 140000, genre: 'country' },
    { id: 'comp_088', title: 'Moonlight Drive', artist: 'Backyard Band', baseStreams: 110000, genre: 'indie' },
    { id: 'comp_089', title: 'Campfire Song', artist: 'Woods Walker', baseStreams: 80000, genre: 'folk' },
    { id: 'comp_090', title: 'Dusty Roads', artist: 'Desert Rose', baseStreams: 50000, genre: 'country' },
    { id: 'comp_091', title: 'Garden Party', artist: 'Flower Power', baseStreams: 190000, genre: 'indie' },
    { id: 'comp_092', title: 'Sunset Porch', artist: 'Sweet Tea', baseStreams: 220000, genre: 'country' },
    { id: 'comp_093', title: 'Forest Path', artist: 'Nature Child', baseStreams: 160000, genre: 'folk' },
    { id: 'comp_094', title: 'Vinyl Records', artist: 'Thrift Store', baseStreams: 130000, genre: 'indie' },
    { id: 'comp_095', title: 'Barn Dance', artist: 'Hay Fever', baseStreams: 100000, genre: 'country' },
    { id: 'comp_096', title: 'Autumn Leaves', artist: 'Seasonal Change', baseStreams: 70000, genre: 'folk' },
    { id: 'comp_097', title: 'Typewriter', artist: 'Poetry Club', baseStreams: 60000, genre: 'indie' },
    { id: 'comp_098', title: 'Firefly Night', artist: 'Summer Memories', baseStreams: 90000, genre: 'folk' }
  ];

  constructor(gameData: any, rng: () => number, storage: IChartStorage, gameId: string) {
    this.gameData = gameData;
    this.rng = rng;
    this.storage = storage;
    this.gameId = gameId;
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

  /**
   * Generates simulated competitor performance with RNG variance
   */
  private generateCompetitorPerformance(): SongPerformance[] {
    // Read competitor variance range from balance config
    const chartSystem = this.gameData.getMarketFormulasSync?.().chart_system || {};
    const [minVar, maxVar] = chartSystem.competitor_variance_range || [0.8, 1.2];

    return ChartService.CHART_COMPETITORS.map((competitor): SongPerformance => {
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
    // Normalize chart week to Date object for database operations
    const normalizedChartWeek = this.toDbDate(chartWeek);

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

    const batchChartHistory = await this.storage.getChartEntriesBySongsAndGame(playerSongIds, this.gameId, dbTransaction);

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

        if (!shouldChart) {
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
          chartWeek: normalizedChartWeek,
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
          chartWeek: normalizedChartWeek,
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

    console.log(`[CHART SERVICE] Universal Song Tracking complete for ${normalizedChartWeek.toISOString().split('T')[0]}:`, {
      totalRankedSongs,
      playerSongs: playerSongsForLogging.length,
      competitorSongs: competitorSongs.length,
      existingEntries: existingSongIds.size,
      newEntriesCreated: songsWithEntries,
      universalTrackingEnabled: true
    });

    // Insert only missing chart entries (rely on unique index for additional protection)
    if (chartEntries.length > 0) {
      await this.storage.createChartEntries(chartEntries, dbTransaction);
      console.log(`[CHART SERVICE] Successfully created ${chartEntries.length} new chart entries`);
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
    movement: number;
  }>> {
    try {
      const normalizedChartWeek = this.toDbDate(chartWeek);
      const currentEntries = await this.storage.getChartEntriesByWeekAndGame(normalizedChartWeek, this.gameId, dbTransaction);
      const songsMap = await this.buildSongsMap(dbTransaction);

      const playerSongIds = Array.from(new Set(
        currentEntries
          .filter(entry => !entry.isCompetitorSong && entry.songId)
          .map(entry => entry.songId as string)
      ));

      const batchData = await this.getBatchChartData(playerSongIds, dbTransaction);

      // Build result with song details and weeks on chart calculation
      const entriesWithDetails = currentEntries.map(entry => {
        let songTitle: string;
        let artistName: string;
        let weeksOnChart = 0;
        let peakPosition: number | null = null;
        let movement = entry.movement ?? 0;
        let isDebut = entry.isDebut ?? false;

        if (entry.isCompetitorSong) {
          // Competitor song - use stored title and artist
          songTitle = entry.competitorTitle || 'Unknown Song';
          artistName = entry.competitorArtist || 'Unknown Artist';
          weeksOnChart = entry.position !== null ? 1 : 0;
          peakPosition = entry.position ?? null;
        } else {
          // Player song - lookup from songs table
          const songData = entry.songId ? songsMap.get(entry.songId) : undefined;
          songTitle = songData?.title || 'Unknown Song';
          artistName = songData?.artistName || 'Unknown Artist';

          const chartStats = entry.songId ? batchData.get(entry.songId) : undefined;
          if (chartStats) {
            weeksOnChart = chartStats.weeksOnChart;
            peakPosition = chartStats.peakPosition;
            movement = chartStats.movement;
            isDebut = chartStats.isDebut;
          } else {
            weeksOnChart = entry.position !== null ? 1 : 0;
            peakPosition = entry.position ?? null;
          }
        }

        return {
          ...entry,
          songTitle,
          artistName,
          weeksOnChart,
          peakPosition,
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
    const songs = await this.storage.getReleasedSongsByGame(this.gameId, dbTransaction);
    const songsMap = new Map<string, ReleasedSongData>();
    songs.forEach(song => songsMap.set(song.id, song));
    return songsMap;
  }

  /**
   * Calculates how many weeks a song has been on the charts before the current week
   */
  private async calculateWeeksOnChart(songId: string, currentChartWeek: Date, dbTransaction?: any): Promise<number> {
    try {
      const history = await this.storage.getChartEntriesBySongAndGame(songId, this.gameId, dbTransaction);

      // Count entries with position !== null that occurred before current week
      const chartingWeeks = history.filter(entry =>
        entry.position !== null &&
        new Date(entry.chartWeek) < currentChartWeek
      );

      return chartingWeeks.length;
    } catch (error) {
      console.error('[CHART SERVICE] Error calculating weeks on chart:', error);
      return 0;
    }
  }

  /**
   * Batch fetches chart data for multiple songs to optimize API performance
   */
  async getBatchChartData(songIds: string[], dbTransaction?: any): Promise<Map<string, {
    currentPosition: number | null;
    movement: number;
    weeksOnChart: number;
    peakPosition: number | null;
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

        // Calculate movement (difference from previous week)
        let movement = 0;
        if (sortedEntries.length >= 2) {
          const current = sortedEntries[0];
          const previous = sortedEntries[1];
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
    movement: number;
    weeksOnChart: number;
    peakPosition: number | null;
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
          movement: entry.movement ?? 0,
          weeksOnChart: entry.weeksOnChart,
          peakPosition: entry.peakPosition ?? (entry.position ?? null),
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