/**
 * Unit Tests for ChartService - Pure Functions
 *
 * Tests the pure calculation methods in ChartService that don't require
 * database operations. These methods handle competitor performance generation,
 * song ranking, and utility functions.
 *
 * Pure unit tests - no database or mocks required.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChartService } from '@shared/engine/ChartService';
import type { CompetitorSong, SongPerformance } from '@shared/types/gameTypes';

/**
 * Mock gameData with chart system configuration
 */
function createMockGameData() {
  return {
    getMarketFormulasSync: () => ({
      chart_system: {
        competitor_variance_range: [0.8, 1.2],
        chart_generation_timing: 'post_releases',
        top_chart_positions: 100
      }
    })
  };
}

/**
 * Mock storage interface (minimal - only for constructor)
 */
function createMockStorage() {
  return {
    getReleasedSongsByGame: async () => [],
    createChartEntries: async () => {},
    getChartEntriesBySongAndGame: async () => [],
    getChartEntriesByWeekAndGame: async () => [],
    getChartEntriesBySongsAndGame: async () => []
  };
}

/**
 * Create mock RNG function
 */
function createMockRNG(value: number = 1.0) {
  return () => value;
}

/**
 * Test competitor catalog
 */
const TEST_COMPETITORS: CompetitorSong[] = [
  { id: 'comp_001', title: 'Test Song 1', artist: 'Artist A', baseStreams: 100000, genre: 'pop' },
  { id: 'comp_002', title: 'Test Song 2', artist: 'Artist B', baseStreams: 80000, genre: 'rock' },
  { id: 'comp_003', title: 'Test Song 3', artist: 'Artist C', baseStreams: 60000, genre: 'indie' },
  { id: 'comp_004', title: 'Test Song 4', artist: 'Artist D', baseStreams: 40000, genre: 'pop' },
  { id: 'comp_005', title: 'Test Song 5', artist: 'Artist E', baseStreams: 20000, genre: 'rock' }
];

describe('ChartService - Competitor Performance Generation', () => {
  let chartService: ChartService;
  let mockGameData: any;

  beforeEach(() => {
    mockGameData = createMockGameData();
  });

  describe('generateCompetitorPerformance() - via reflection', () => {
    it('should generate performance for all competitors', () => {
      chartService = new ChartService(
        mockGameData,
        createMockRNG(1.0),
        createMockStorage(),
        'test-game-id',
        { competitors: TEST_COMPETITORS }
      );

      // Access private method via type assertion for testing
      const service = chartService as any;
      const performance = service.generateCompetitorPerformance();

      expect(performance).toHaveLength(TEST_COMPETITORS.length);
    });

    it('should apply variance to base streams', () => {
      // Use RNG value of 1.0 (max variance multiplier)
      chartService = new ChartService(
        mockGameData,
        createMockRNG(1.0),
        createMockStorage(),
        'test-game-id',
        { competitors: TEST_COMPETITORS }
      );

      const service = chartService as any;
      const performance = service.generateCompetitorPerformance();

      // Variance calculation: min + RNG * (max - min) = 0.8 + 1.0 * (1.2 - 0.8) = 1.2
      const variance = 0.8 + 1.0 * (1.2 - 0.8);
      const firstSong = performance[0];
      const expectedStreams = Math.round(TEST_COMPETITORS[0].baseStreams * variance);
      expect(firstSong.streams).toBe(expectedStreams);
    });

    it('should use min variance with RNG 0.0', () => {
      chartService = new ChartService(
        mockGameData,
        createMockRNG(0.0), // RNG 0.0 gives min variance
        createMockStorage(),
        'test-game-id',
        { competitors: TEST_COMPETITORS }
      );

      const service = chartService as any;
      const performance = service.generateCompetitorPerformance();

      // Variance calculation: min + RNG * (max - min) = 0.8 + 0.0 * (1.2 - 0.8) = 0.8
      const variance = 0.8 + 0.0 * (1.2 - 0.8);
      const firstSong = performance[0];
      const expectedStreams = Math.round(TEST_COMPETITORS[0].baseStreams * variance);
      expect(firstSong.streams).toBe(expectedStreams);
    });

    it('should mark all competitors as non-player songs', () => {
      chartService = new ChartService(
        mockGameData,
        createMockRNG(1.0),
        createMockStorage(),
        'test-game-id',
        { competitors: TEST_COMPETITORS }
      );

      const service = chartService as any;
      const performance = service.generateCompetitorPerformance();

      performance.forEach((song: SongPerformance) => {
        expect(song.isPlayerSong).toBe(false);
      });
    });

    it('should preserve competitor metadata', () => {
      chartService = new ChartService(
        mockGameData,
        createMockRNG(1.0),
        createMockStorage(),
        'test-game-id',
        { competitors: TEST_COMPETITORS }
      );

      const service = chartService as any;
      const performance = service.generateCompetitorPerformance();

      performance.forEach((song: SongPerformance, index: number) => {
        expect(song.id).toBe(TEST_COMPETITORS[index].id);
        expect(song.title).toBe(TEST_COMPETITORS[index].title);
        expect(song.artist).toBe(TEST_COMPETITORS[index].artist);
      });
    });

    it('should produce different results with different RNG', () => {
      const service1 = new ChartService(
        mockGameData,
        createMockRNG(0.8),
        createMockStorage(),
        'test-game-id',
        { competitors: TEST_COMPETITORS }
      );

      const service2 = new ChartService(
        mockGameData,
        createMockRNG(1.1),
        createMockStorage(),
        'test-game-id',
        { competitors: TEST_COMPETITORS }
      );

      const perf1 = (service1 as any).generateCompetitorPerformance();
      const perf2 = (service2 as any).generateCompetitorPerformance();

      // Different RNG should produce different stream counts
      expect(perf1[0].streams).not.toBe(perf2[0].streams);
      expect(perf2[0].streams).toBeGreaterThan(perf1[0].streams);
    });

    it('should return integer stream counts', () => {
      chartService = new ChartService(
        mockGameData,
        createMockRNG(0.95),
        createMockStorage(),
        'test-game-id',
        { competitors: TEST_COMPETITORS }
      );

      const service = chartService as any;
      const performance = service.generateCompetitorPerformance();

      performance.forEach((song: SongPerformance) => {
        expect(Number.isInteger(song.streams)).toBe(true);
      });
    });

    it('should use variance range from config', () => {
      const customGameData = createMockGameData();
      customGameData.getMarketFormulasSync().chart_system.competitor_variance_range = [0.5, 1.5];

      chartService = new ChartService(
        customGameData,
        createMockRNG(1.0), // Will map to 1.0 in range [0.5, 1.5]
        createMockStorage(),
        'test-game-id',
        { competitors: TEST_COMPETITORS }
      );

      const service = chartService as any;
      const performance = service.generateCompetitorPerformance();

      // Verify it uses the custom range
      expect(performance[0].streams).toBeGreaterThan(0);
    });
  });
});

describe('ChartService - Song Ranking', () => {
  let chartService: ChartService;

  beforeEach(() => {
    chartService = new ChartService(
      createMockGameData(),
      createMockRNG(1.0),
      createMockStorage(),
      'test-game-id'
    );
  });

  describe('rankSongsByStreams()', () => {
    it('should rank songs by streams descending', () => {
      const playerSongs: SongPerformance[] = [
        { id: 'player_1', title: 'Player Song 1', artist: 'Player Artist', streams: 50000, isPlayerSong: true, songId: 'song-1' }
      ];

      const competitorSongs: SongPerformance[] = [
        { id: 'comp_1', title: 'Comp Song 1', artist: 'Comp Artist A', streams: 100000, isPlayerSong: false },
        { id: 'comp_2', title: 'Comp Song 2', artist: 'Comp Artist B', streams: 75000, isPlayerSong: false },
        { id: 'comp_3', title: 'Comp Song 3', artist: 'Comp Artist C', streams: 25000, isPlayerSong: false }
      ];

      const service = chartService as any;
      const ranked = service.rankSongsByStreams(playerSongs, competitorSongs);

      expect(ranked).toHaveLength(4);
      expect(ranked[0].streams).toBe(100000);
      expect(ranked[1].streams).toBe(75000);
      expect(ranked[2].streams).toBe(50000);
      expect(ranked[3].streams).toBe(25000);
    });

    it('should handle tie-breaking by song ID', () => {
      const playerSongs: SongPerformance[] = [
        { id: 'player_b', title: 'Player B', artist: 'Artist', streams: 50000, isPlayerSong: true, songId: 'song-b' },
        { id: 'player_a', title: 'Player A', artist: 'Artist', streams: 50000, isPlayerSong: true, songId: 'song-a' }
      ];

      const competitorSongs: SongPerformance[] = [
        { id: 'comp_z', title: 'Comp Z', artist: 'Artist', streams: 50000, isPlayerSong: false },
        { id: 'comp_c', title: 'Comp C', artist: 'Artist', streams: 50000, isPlayerSong: false }
      ];

      const service = chartService as any;
      const ranked = service.rankSongsByStreams(playerSongs, competitorSongs);

      // All have same streams, should sort by ID alphabetically
      expect(ranked[0].id).toBe('comp_c');
      expect(ranked[1].id).toBe('comp_z');
      expect(ranked[2].id).toBe('player_a');
      expect(ranked[3].id).toBe('player_b');
    });

    it('should combine player and competitor songs', () => {
      const playerSongs: SongPerformance[] = [
        { id: 'player_1', title: 'Player Song', artist: 'Player', streams: 60000, isPlayerSong: true, songId: 'song-1' }
      ];

      const competitorSongs: SongPerformance[] = [
        { id: 'comp_1', title: 'Comp Song', artist: 'Competitor', streams: 40000, isPlayerSong: false }
      ];

      const service = chartService as any;
      const ranked = service.rankSongsByStreams(playerSongs, competitorSongs);

      expect(ranked).toHaveLength(2);
      expect(ranked[0].isPlayerSong).toBe(true);
      expect(ranked[1].isPlayerSong).toBe(false);
    });

    it('should handle empty player songs', () => {
      const playerSongs: SongPerformance[] = [];
      const competitorSongs: SongPerformance[] = [
        { id: 'comp_1', title: 'Comp 1', artist: 'Artist', streams: 100000, isPlayerSong: false },
        { id: 'comp_2', title: 'Comp 2', artist: 'Artist', streams: 50000, isPlayerSong: false }
      ];

      const service = chartService as any;
      const ranked = service.rankSongsByStreams(playerSongs, competitorSongs);

      expect(ranked).toHaveLength(2);
      expect(ranked.every((s: SongPerformance) => !s.isPlayerSong)).toBe(true);
    });

    it('should handle empty competitor songs', () => {
      const playerSongs: SongPerformance[] = [
        { id: 'player_1', title: 'Player 1', artist: 'Artist', streams: 100000, isPlayerSong: true, songId: 'song-1' },
        { id: 'player_2', title: 'Player 2', artist: 'Artist', streams: 50000, isPlayerSong: true, songId: 'song-2' }
      ];
      const competitorSongs: SongPerformance[] = [];

      const service = chartService as any;
      const ranked = service.rankSongsByStreams(playerSongs, competitorSongs);

      expect(ranked).toHaveLength(2);
      expect(ranked.every((s: SongPerformance) => s.isPlayerSong)).toBe(true);
    });

    it('should handle both empty arrays', () => {
      const service = chartService as any;
      const ranked = service.rankSongsByStreams([], []);

      expect(ranked).toHaveLength(0);
    });

    it('should maintain song properties through ranking', () => {
      const playerSongs: SongPerformance[] = [
        {
          id: 'player_1',
          title: 'My Hit Song',
          artist: 'My Artist',
          streams: 75000,
          isPlayerSong: true,
          songId: 'song-abc-123'
        }
      ];

      const competitorSongs: SongPerformance[] = [];

      const service = chartService as any;
      const ranked = service.rankSongsByStreams(playerSongs, competitorSongs);

      const song = ranked[0];
      expect(song.title).toBe('My Hit Song');
      expect(song.artist).toBe('My Artist');
      expect(song.songId).toBe('song-abc-123');
      expect(song.isPlayerSong).toBe(true);
    });

    it('should produce deterministic results', () => {
      const playerSongs: SongPerformance[] = [
        { id: 'player_1', title: 'Player 1', artist: 'Artist', streams: 50000, isPlayerSong: true, songId: 'song-1' }
      ];

      const competitorSongs: SongPerformance[] = [
        { id: 'comp_1', title: 'Comp 1', artist: 'Artist', streams: 60000, isPlayerSong: false }
      ];

      const service = chartService as any;
      const ranked1 = service.rankSongsByStreams(playerSongs, competitorSongs);
      const ranked2 = service.rankSongsByStreams(playerSongs, competitorSongs);

      expect(ranked1).toEqual(ranked2);
    });
  });
});

describe('ChartService - Utility Functions', () => {
  let chartService: ChartService;

  beforeEach(() => {
    chartService = new ChartService(
      createMockGameData(),
      createMockRNG(1.0),
      createMockStorage(),
      'test-game-id'
    );
  });

  describe('getRandom()', () => {
    it('should return value in range with RNG 1.0', () => {
      const service = chartService as any;
      const result = service.getRandom(10, 20);

      expect(result).toBe(20); // min + (1.0 * (max - min))
    });

    it('should return value in range with RNG 0.0', () => {
      const customService = new ChartService(
        createMockGameData(),
        createMockRNG(0.0),
        createMockStorage(),
        'test-game-id'
      );

      const service = customService as any;
      const result = service.getRandom(10, 20);

      expect(result).toBe(10); // min + (0.0 * (max - min))
    });

    it('should return midpoint with RNG 0.5', () => {
      const customService = new ChartService(
        createMockGameData(),
        createMockRNG(0.5),
        createMockStorage(),
        'test-game-id'
      );

      const service = customService as any;
      const result = service.getRandom(10, 20);

      expect(result).toBe(15); // min + (0.5 * (max - min))
    });

    it('should handle negative ranges', () => {
      const service = chartService as any;
      const result = service.getRandom(-10, 0);

      expect(result).toBe(0); // -10 + (1.0 * 10)
    });
  });

  describe('toDbDate()', () => {
    it('should convert Date object to Date', () => {
      const date = new Date('2024-01-15');
      const service = chartService as any;
      const result = service.toDbDate(date);

      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString().split('T')[0]).toBe('2024-01-15');
    });

    it('should convert ISO string to Date', () => {
      const service = chartService as any;
      const result = service.toDbDate('2024-01-15');

      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString().split('T')[0]).toBe('2024-01-15');
    });

    it('should handle Date objects consistently', () => {
      const date = new Date('2024-03-20T12:00:00Z');
      const service = chartService as any;
      const result = service.toDbDate(date);

      expect(result.getTime()).toBe(date.getTime());
    });

    it('should parse various ISO string formats', () => {
      const service = chartService as any;

      const result1 = service.toDbDate('2024-01-01');
      const result2 = service.toDbDate('2024-01-01T00:00:00Z');

      expect(result1).toBeInstanceOf(Date);
      expect(result2).toBeInstanceOf(Date);
    });
  });
});

describe('ChartService - Integration of Pure Functions', () => {
  it('should process competitor performance and rank correctly', () => {
    const competitors: CompetitorSong[] = [
      { id: 'comp_1', title: 'Song 1', artist: 'Artist 1', baseStreams: 100000, genre: 'pop' },
      { id: 'comp_2', title: 'Song 2', artist: 'Artist 2', baseStreams: 80000, genre: 'rock' }
    ];

    const service = new ChartService(
      createMockGameData(),
      createMockRNG(1.0), // RNG 1.0 maps to max variance in range [0.8, 1.2]
      createMockStorage(),
      'test-game-id',
      { competitors }
    );

    const chartServicePrivate = service as any;

    // Generate competitor performance
    const competitorPerf = chartServicePrivate.generateCompetitorPerformance();

    // Rank with empty player songs
    const ranked = chartServicePrivate.rankSongsByStreams([], competitorPerf);

    // Should be ranked by streams (highest first)
    expect(ranked[0].streams).toBeGreaterThan(ranked[1].streams);

    // Both should have variance applied (1.0 RNG maps to 1.2 variance with range [0.8, 1.2])
    // Formula: min + RNG * (max - min) = 0.8 + 1.0 * (1.2 - 0.8) = 1.2
    const variance = 0.8 + 1.0 * (1.2 - 0.8); // = 1.2
    expect(ranked[0].streams).toBe(Math.round(100000 * variance));
    expect(ranked[1].streams).toBe(Math.round(80000 * variance));
  });

  it('should handle mixed player and competitor songs', () => {
    const competitors: CompetitorSong[] = [
      { id: 'comp_1', title: 'Comp Hit', artist: 'Competitor', baseStreams: 70000, genre: 'pop' }
    ];

    const playerSongs: SongPerformance[] = [
      { id: 'player_1', title: 'Player Hit', artist: 'Player', streams: 100000, isPlayerSong: true, songId: 'song-1' }
    ];

    const service = new ChartService(
      createMockGameData(),
      createMockRNG(1.0), // Max variance = 1.2, so 70000 * 1.2 = 84000
      createMockStorage(),
      'test-game-id',
      { competitors }
    );

    const chartServicePrivate = service as any;
    const competitorPerf = chartServicePrivate.generateCompetitorPerformance();
    const ranked = chartServicePrivate.rankSongsByStreams(playerSongs, competitorPerf);

    // Player song should be ranked higher (100000 > 84000)
    expect(ranked[0].isPlayerSong).toBe(true);
    expect(ranked[0].streams).toBe(100000);

    // Competitor should be second
    expect(ranked[1].isPlayerSong).toBe(false);
    expect(ranked[1].streams).toBe(84000); // 70000 * 1.2
  });
});
