import { Router } from 'express';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db';
import { storage } from '../storage';
import { requireClerkUser } from '../auth';
import { serverGameData } from '../data/gameData';
import { artists, gameStates, releases, releaseSongs, songs } from '@shared/schema';
import { GameEngine } from '@shared/engine/game-engine';
import { ChartService } from '@shared/engine/ChartService';

const router = Router();

  // Phase 1: Song and Release Management API Routes

  // Get songs for a game
  router.get("/api/game/:gameId/songs", requireClerkUser, async (req, res) => {
    try {
      const songs = await serverGameData.getSongsByGame(req.params.gameId);
      res.json(songs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch songs" });
    }
  });

  // Get songs for a specific artist
  router.get("/api/game/:gameId/artists/:artistId/songs", requireClerkUser, async (req, res) => {
    try {
      const { gameId, artistId } = req.params;

      // Validate parameters
      if (!gameId || !artistId) {
        return res.status(400).json({
          message: "Missing required parameters",
          error: "gameId and artistId are required"
        });
      }

      // Validate UUID format (basic check)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(gameId) || !uuidRegex.test(artistId)) {
        return res.status(400).json({
          message: "Invalid parameter format",
          error: "gameId and artistId must be valid UUIDs"
        });
      }

      console.log('[API] Fetching songs for artist:', artistId, 'game:', gameId);
      const rawSongs = await serverGameData.getSongsByArtist(artistId, gameId);
      console.log('[API] Found songs:', rawSongs?.length || 0);

      // Ensure we always return an array, even if no songs found
      const songsArray = Array.isArray(rawSongs) ? rawSongs : [];

      // Enhance songs with chart data
      try {
        // Create ChartService instance for this game
        const chartService = new ChartService(
          serverGameData,
          () => Math.random(), // Use simple RNG for API calls
          storage,
          gameId
        );

        // Batch fetch chart data for all songs to avoid N+1 queries
        const songIds = songsArray.map(song => song.id);
        const batchChartData = await chartService.getBatchChartData(songIds);

        // Enrich songs with chart data from batch
        const enrichedSongs = songsArray.map(rawSong => ({
          ...rawSong,
          currentChartPosition: batchChartData.get(rawSong.id)?.currentPosition || null,
          chartMovement: batchChartData.get(rawSong.id)?.movement || 0,
          weeksOnChart: batchChartData.get(rawSong.id)?.weeksOnChart || 0,
          peakPosition: batchChartData.get(rawSong.id)?.peakPosition || null,
          isChartDebut: batchChartData.get(rawSong.id)?.isDebut || false
        }));

        res.json(enrichedSongs);
        console.log('[API] Returned enriched songs with chart data:', enrichedSongs.length);

      } catch (chartError) {
        console.error('[API] Error enriching songs with chart data:', chartError);
        // Fallback to raw songs if chart enrichment fails
        res.json(songsArray);
      }

    } catch (error) {
      console.error('[API] Error fetching artist songs:', error);
      res.status(500).json({
        message: "Failed to fetch artist songs",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get releases for a game
  router.get("/api/game/:gameId/releases", requireClerkUser, async (req, res) => {
    try {
      const releases = await serverGameData.getReleasesByGame(req.params.gameId);
      res.json(releases);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch releases" });
    }
  });

  router.get("/api/game/:gameId/release-songs", requireClerkUser, async (req, res) => {
    try {
      const { gameId } = req.params;
      const gameState = await storage.getGameState(gameId);
      if (!gameState || gameState.userId !== req.userId) {
        return res.status(403).json({
          error: 'UNAUTHORIZED',
          message: 'You do not have permission to access this game'
        });
      }

      const releaseSongsRows = await storage.getReleaseSongsByGame(gameId);
      res.json(releaseSongsRows);
    } catch (error) {
      console.error('[API] Failed to fetch release songs:', error);
      res.status(500).json({ message: 'Failed to fetch release songs' });
    }
  });

  // Create a new release (Single/EP/Album)
  router.post("/api/game/:gameId/releases", requireClerkUser, async (req, res) => {
    try {
      const releaseData = {
        ...req.body,
        gameId: req.params.gameId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const release = await serverGameData.createRelease(releaseData);

      // If songs are provided, create the release-song relationships
      if (req.body.songIds && req.body.songIds.length > 0) {
        for (let i = 0; i < req.body.songIds.length; i++) {
          await serverGameData.createReleaseSong({
            releaseId: release.id,
            songId: req.body.songIds[i],
            trackNumber: i + 1
          });
        }
      }

      res.json(release);
    } catch (error) {
      console.error("Failed to create release:", error);
      res.status(500).json({ message: "Failed to create release" });
    }
  });

  // PLAN RELEASE ENDPOINTS

  // Get artists with ready songs for release planning
  router.get("/api/game/:gameId/artists/ready-for-release", requireClerkUser, async (req, res) => {
    try {
      const gameId = req.params.gameId;
      const minSongs = parseInt(req.query.minSongs as string) || 1;

      // Get all artists for this game with their song counts
      const artistsResult = await db
        .select({
          id: artists.id,
          name: artists.name,
          mood: artists.mood,
          energy: artists.energy,
          archetype: artists.archetype,
          signedWeek: artists.signedWeek,
          readySongsCount: sql<string>`COUNT(CASE WHEN ${songs.isRecorded} = true AND ${songs.isReleased} = false AND ${songs.releaseId} IS NULL THEN 1 END)`,
          totalSongsCount: sql<string>`COUNT(${songs.id})`
        })
        .from(artists)
        .leftJoin(songs, eq(songs.artistId, artists.id))
        .where(eq(artists.gameId, gameId))
        .groupBy(artists.id, artists.name, artists.mood, artists.energy, artists.archetype, artists.signedWeek)
        .having(sql`COUNT(CASE WHEN ${songs.isRecorded} = true AND ${songs.isReleased} = false AND ${songs.releaseId} IS NULL THEN 1 END) >= ${minSongs}`);

      const totalReadySongs = artistsResult.reduce((sum: number, artist: any) => sum + parseInt(artist.readySongsCount as string), 0);

      // Sort by readiness (ready songs count + mood)
      const sortedArtists = artistsResult.sort((a: any, b: any) => {
        const scoreA = parseInt(a.readySongsCount as string) * 10 + (a.mood || 50);
        const scoreB = parseInt(b.readySongsCount as string) * 10 + (b.mood || 50);
        return scoreB - scoreA;
      });

      res.json({
        success: true,
        artists: sortedArtists.map((artist: any) => ({
          id: artist.id,
          name: artist.name,
          genre: 'Pop', // Default genre since not stored in artists table
          mood: artist.mood || 50,
          energy: artist.energy || 50,
          readySongsCount: parseInt(artist.readySongsCount as string),
          totalSongsCount: parseInt(artist.totalSongsCount as string),
          lastProjectWeek: artist.signedWeek,
          archetype: artist.archetype
        })),
        metadata: {
          totalArtists: artistsResult.length,
          totalReadySongs,
          recommendedArtists: sortedArtists.slice(0, 3).map((a: any) => a.id)
        }
      });
    } catch (error) {
      console.error("Failed to fetch ready artists:", error);
      res.status(500).json({
        error: 'FETCH_ERROR',
        message: "Failed to fetch artists ready for release"
      });
    }
  });

  // Get ready songs for a specific artist
  router.get("/api/game/:gameId/artists/:artistId/songs/ready", requireClerkUser, async (req, res) => {
    try {
      const { gameId, artistId } = req.params;
      const includeDrafts = req.query.includeDrafts === 'true';
      const sortBy = req.query.sortBy as string || 'quality';
      const sortOrder = req.query.sortOrder as string || 'desc';

      // Get artist info
      const [artist] = await db
        .select()
        .from(artists)
        .where(and(eq(artists.id, artistId), eq(artists.gameId, gameId)));

      if (!artist) {
        return res.status(404).json({
          error: 'ARTIST_NOT_FOUND',
          message: 'Artist not found in this game',
          artistId,
          gameId
        });
      }

      // Get ready songs (recorded but not released, and not already scheduled for a release)
      let songQuery = db
        .select()
        .from(songs)
        .where(and(
          eq(songs.artistId, artistId),
          eq(songs.gameId, gameId),
          includeDrafts ? sql`true` : eq(songs.isRecorded, true),
          eq(songs.isReleased, false),
          sql`${songs.releaseId} IS NULL` // Only include songs not already scheduled for releases
        ));

      // Apply sorting
      const orderColumn = sortBy === 'quality' ? songs.quality :
                         sortBy === 'createdDate' ? songs.createdAt :
                         songs.totalRevenue;
      const orderDirection = sortOrder === 'asc' ? orderColumn : desc(orderColumn);
      const orderedQuery = songQuery.orderBy(orderDirection);

      const readySongs = await orderedQuery;

      // Calculate estimated metrics for each song (simplified version)
      const songsWithMetrics = readySongs.map(song => ({
        id: song.id,
        title: song.title,
        quality: song.quality,
        genre: song.genre || 'Pop',
        mood: song.mood || 'neutral',
        createdWeek: song.createdWeek || 1,
        isRecorded: song.isRecorded,
        isReleased: song.isReleased,
        projectId: null, // Not available in current schema
        producerTier: song.producerTier || 'local',
        timeInvestment: song.timeInvestment || 'standard',
        estimatedMetrics: {
          streams: song.weeklyStreams || 0, // Use actual streams if available, otherwise 0 (will be calculated properly in release preview)
          revenue: song.totalRevenue || 0, // Use actual revenue if available, otherwise 0
          chartPotential: Math.min(100, Math.max(0, song.quality + ((artist.mood || 50) - 50) / 2))
        },
        metadata: {
          recordingCost: 5000, // Default recording cost
          budgetPerSong: 5000, // Default budget per song
          artistMoodAtCreation: artist.mood || 50
        }
      }));

      const totalRevenuePotential = songsWithMetrics.reduce((sum, song) => sum + song.estimatedMetrics.revenue, 0);
      const averageQuality = songsWithMetrics.length > 0 ?
        songsWithMetrics.reduce((sum, song) => sum + song.quality, 0) / songsWithMetrics.length : 0;

      res.json({
        success: true,
        artist: {
          id: artist.id,
          name: artist.name,
          genre: 'Pop', // Default genre since not available in schema
          mood: artist.mood || 50,
          energy: artist.energy || 50
        },
        songs: songsWithMetrics,
        totalRevenuePotential,
        averageQuality: Math.round(averageQuality)
      });
    } catch (error) {
      console.error("Failed to fetch artist songs:", error);
      res.status(500).json({
        error: 'FETCH_ERROR',
        message: "Failed to fetch artist ready songs"
      });
    }
  });

  // Calculate release preview metrics
  router.post("/api/game/:gameId/releases/preview", requireClerkUser, async (req, res) => {
    try {
      const gameId = req.params.gameId;
      const {
        artistId,
        songIds,
        releaseType,
        leadSingleId,
        seasonalTiming,
        scheduledReleaseWeek,
        marketingBudget,
        leadSingleStrategy
      } = req.body;

      // Validate basic inputs
      if (!artistId || !songIds || songIds.length === 0 || !releaseType) {
        return res.status(400).json({
          error: 'INVALID_RELEASE_CONFIG',
          message: 'Invalid release configuration',
          details: [
            { field: 'artistId', issue: 'Required' },
            { field: 'songIds', issue: 'Must have at least one song' },
            { field: 'releaseType', issue: 'Required' }
          ]
        });
      }

      // Get songs and artist data
      const [artist] = await db.select().from(artists)
        .where(and(eq(artists.id, artistId), eq(artists.gameId, gameId)));

      const releaseSongs = await db.select().from(songs)
        .where(and(
          eq(songs.gameId, gameId),
          inArray(songs.id, songIds)
        ));

      if (!artist) {
        return res.status(404).json({
          error: 'ARTIST_NOT_FOUND',
          message: 'Artist not found',
          artistId
        });
      }

      if (releaseSongs.length !== songIds.length) {
        const foundIds = releaseSongs.map(s => s.id);
        const missingIds = songIds.filter((id: string) => !foundIds.includes(id));
        return res.status(404).json({
          error: 'SONGS_NOT_FOUND',
          message: 'One or more songs not found or not available',
          missingSongIds: missingIds,
          unavailableSongIds: []
        });
      }

      // Get current game state for GameEngine
      const [gameState] = await db.select().from(gameStates)
        .where(eq(gameStates.id, gameId));

      if (!gameState) {
        return res.status(404).json({
          error: 'GAME_NOT_FOUND',
          message: 'Game state not found'
        });
      }

      // Initialize GameEngine with sophisticated calculations
      console.log('[RELEASE PREVIEW] Initializing GameEngine for sophisticated calculations...');
      await serverGameData.initialize();
      const gameEngine = new GameEngine(gameState, serverGameData, storage);

      // Use GameEngine's sophisticated release preview calculation
      const releaseConfig = {
        releaseType: releaseType as 'single' | 'ep' | 'album',
        leadSingleId,
        seasonalTiming,
        scheduledReleaseWeek,
        marketingBudget: marketingBudget || {},
        leadSingleStrategy
      };

      console.log('[RELEASE PREVIEW] Calculating preview with GameEngine...', {
        songCount: releaseSongs.length,
        releaseType,
        totalMarketingBudget: Object.values(marketingBudget || {}).reduce((sum: number, budget) => sum + (budget as number), 0)
      });

      const previewResults = gameEngine.calculateReleasePreview(
        releaseSongs,
        artist,
        releaseConfig
      );

      console.log('[RELEASE PREVIEW] GameEngine calculation completed:', {
        estimatedStreams: previewResults.estimatedStreams,
        estimatedRevenue: previewResults.estimatedRevenue,
        totalMarketingCost: previewResults.totalMarketingCost,
        projectedROI: previewResults.projectedROI
      });

      res.json({
        success: true,
        preview: previewResults,
        validationWarnings: []
      });
    } catch (error) {
      console.error("Failed to calculate release preview:", error);
      console.error("Error stack:", (error as Error).stack);
      console.error("Error message:", (error as Error).message);
      console.error("Error name:", (error as Error).name);
      res.status(500).json({
        error: 'CALCULATION_ERROR',
        message: "Failed to calculate release preview",
        details: (error as Error).message,
        stack: (error as Error).stack
      });
    }
  });

  // Create planned release
  router.post("/api/game/:gameId/releases/plan", requireClerkUser, async (req, res) => {
    try {
      const gameId = req.params.gameId;
      const {
        artistId,
        title,
        type,
        songIds,
        leadSingleId,
        seasonalTiming,
        scheduledReleaseWeek,
        marketingBudget,
        leadSingleStrategy,
        metadata
      } = req.body;

      // Validate inputs
      if (!artistId || !title || !type || !songIds || songIds.length === 0) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Release validation failed',
          details: [
            { field: 'artistId', error: 'Required' },
            { field: 'title', error: 'Required' },
            { field: 'type', error: 'Required' },
            { field: 'songIds', error: 'Must have at least one song' }
          ]
        });
      }

      // Check if user has sufficient funds
      const [gameState] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
      if (!gameState) {
        return res.status(404).json({
          error: 'GAME_NOT_FOUND',
          message: 'Game session not found',
          gameId
        });
      }

      // Validate release week is in the future
      const currentWeek = gameState.currentWeek || 1;
      if (scheduledReleaseWeek && scheduledReleaseWeek <= currentWeek) {
        return res.status(400).json({
          error: 'INVALID_RELEASE_WEEK',
          message: 'Cannot plan releases for current or past weeks',
          currentWeek,
          scheduledReleaseWeek,
          details: [
            { field: 'scheduledReleaseWeek', error: `Must be greater than current week (${currentWeek})` }
          ]
        });
      }

      // Validate lead single week if provided
      if (leadSingleStrategy?.leadSingleReleaseWeek) {
        if (leadSingleStrategy.leadSingleReleaseWeek <= currentWeek) {
          return res.status(400).json({
            error: 'INVALID_LEAD_SINGLE_WEEK',
            message: 'Cannot plan lead single for current or past weeks',
            currentWeek,
            leadSingleReleaseWeek: leadSingleStrategy.leadSingleReleaseWeek,
            details: [
              { field: 'leadSingleReleaseWeek', error: `Must be greater than current week (${currentWeek})` }
            ]
          });
        }
      }

      const totalBudget = Object.values(marketingBudget || {}).reduce((sum: number, budget) => sum + (budget as number), 0) +
        (leadSingleStrategy ? Object.values(leadSingleStrategy.leadSingleBudget || {}).reduce((sum: number, budget) => sum + (budget as number), 0) : 0);

      // Check if user has sufficient creative capital
      const currentCreativeCapital = gameState.creativeCapital || 0;
      if (currentCreativeCapital < 1) {
        return res.status(402).json({
          error: 'INSUFFICIENT_CREATIVE_CAPITAL',
          message: 'Insufficient creative capital. You need 1 creative capital to plan a release.',
          required: 1,
          available: currentCreativeCapital
        });
      }

      if ((gameState.money || 0) < totalBudget) {
        return res.status(402).json({
          error: 'INSUFFICIENT_FUNDS',
          message: 'Not enough money for marketing budget',
          required: totalBudget,
          available: gameState.money || 0,
          suggestions: [
            { action: 'REDUCE_BUDGET', description: 'Reduce marketing allocation', potentialSavings: totalBudget - (gameState.money || 0) }
          ]
        });
      }

      // Check for song conflicts (songs already scheduled for release)
      const conflictingSongs = await db
        .select()
        .from(songs)
        .where(and(
          eq(songs.gameId, gameId),
          inArray(songs.id, songIds),
          sql`${songs.releaseId} IS NOT NULL`
        ));

      if (conflictingSongs.length > 0) {
        return res.status(409).json({
          error: 'SONG_ALREADY_SCHEDULED',
          message: 'Some songs are already part of a planned release',
          conflictingSongs: conflictingSongs.map(c => ({
            songId: c.id,
            songTitle: c.title,
            conflictingReleaseId: c.releaseId,
            conflictingReleaseTitle: 'Unknown Release'
          })),
          resolutionOptions: [
            { action: 'CHOOSE_DIFFERENT_SONGS', description: 'Select different songs for this release' }
          ]
        });
      }

      // Create the planned release in a transaction
      const result = await db.transaction(async (tx) => {
        // CRITICAL FIX: Single deduction of marketing budget and creative capital
        await tx.update(gameStates)
          .set({
            money: (gameState.money || 0) - totalBudget,
            creativeCapital: currentCreativeCapital - 1
          })
          .where(eq(gameStates.id, gameId));

        console.log(`[PLAN RELEASE] Deducted $${totalBudget} and 1 creative capital for release planning`);

        // Create release record
        const [newRelease] = await tx.insert(releases).values({
          gameId,
          artistId,
          title,
          type,
          releaseWeek: scheduledReleaseWeek,
          status: 'planned',
          marketingBudget: totalBudget,
          metadata: {
            ...metadata,
            seasonalTiming,
            scheduledReleaseWeek,
            marketingChannels: Object.keys(marketingBudget || {}),
            marketingBudgetBreakdown: marketingBudget || {}, // CRITICAL FIX: Store per-channel budgets for release execution
            leadSingleStrategy: leadSingleStrategy ? {
              ...leadSingleStrategy,
              leadSingleBudgetBreakdown: leadSingleStrategy.leadSingleBudget || {} // Store per-channel breakdown for lead single too
            } : null
          }
        }).returning();

        // Update songs to mark them as reserved for this release
        await tx.update(songs)
          .set({ releaseId: newRelease.id })
          .where(inArray(songs.id, songIds));

        // CRITICAL FIX: Also create entries in the junction table for proper song-release association
        // This ensures songs are properly linked when releases are executed
        const releaseSongEntries = songIds.map((songId: string, index: number) => ({
          id: crypto.randomUUID(),
          releaseId: newRelease.id,
          songId: songId,
          trackNumber: index + 1, // Track order based on selection order
          createdAt: new Date()
        }));

        await tx.insert(releaseSongs).values(releaseSongEntries);
        console.log(`[PLAN RELEASE] Created ${releaseSongEntries.length} junction table entries for release ${newRelease.id}`);

        return newRelease;
      });

      // Get updated game state and planned releases
      const [updatedGameState] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
      const plannedReleases = await db.select().from(releases)
        .where(and(eq(releases.gameId, gameId), eq(releases.status, 'planned')));

      res.status(201).json({
        success: true,
        release: {
          id: result.id,
          title: result.title,
          type: result.type,
          artistId: result.artistId,
          artistName: 'Artist Name', // Would need artist lookup
          songIds,
          leadSingleId,
          scheduledReleaseWeek,
          status: 'planned',
          estimatedMetrics: {
            streams: metadata?.estimatedStreams || 0,
            revenue: metadata?.estimatedRevenue || 0,
            roi: metadata?.projectedROI || 0,
            chartPotential: 50
          },
          createdAt: result.createdAt?.toISOString(),
          createdByWeek: updatedGameState.currentWeek
        },
        updatedGameState: {
          money: updatedGameState.money,
          plannedReleases: plannedReleases.map(r => ({
            id: r.id,
            title: r.title,
            artistName: 'Artist Name', // Would need artist lookup
            type: r.type,
            scheduledWeek: r.releaseWeek,
            status: r.status
          })),
          artistsAffected: [{
            artistId,
            songsReserved: songIds.length,
            moodImpact: 5 // Positive mood boost from planned release
          }]
        }
      });
    } catch (error) {
      console.error("Failed to create planned release:", error);
      console.error("Error stack:", (error as Error).stack);
      console.error("Error message:", (error as Error).message);
      console.error("Error name:", (error as Error).name);
      res.status(500).json({
        error: 'CREATION_ERROR',
        message: "Failed to create planned release",
        details: (error as Error).message,
        stack: (error as Error).stack
      });
    }
  });



  // Song conflict resolution endpoints
  router.get("/api/game/:gameId/songs/conflicts", requireClerkUser, async (req, res) => {
    try {
      const gameId = req.params.gameId;

      // Find all songs that are reserved for planned releases
      const reservedSongs = await db.select().from(songs)
        .where(and(
          eq(songs.gameId, gameId),
          sql`${songs.releaseId} IS NOT NULL`
        ));

      // Get the planned releases these songs are associated with
      const plannedReleases = await db.select().from(releases)
        .where(and(
          eq(releases.gameId, gameId),
          eq(releases.status, 'planned')
        ));

      // Group reserved songs by release
      const conflictsByRelease = plannedReleases.map(release => ({
        releaseId: release.id,
        releaseTitle: release.title,
        releaseType: release.type,
        scheduledWeek: release.releaseWeek,
        reservedSongs: reservedSongs.filter(s => s.releaseId === release.id).map(s => ({
          songId: s.id,
          songTitle: s.title,
          artistId: s.artistId
        }))
      }));

      res.json({
        success: true,
        conflicts: {
          totalReservedSongs: reservedSongs.length,
          plannedReleases: plannedReleases.length,
          conflictsByRelease
        }
      });
    } catch (error) {
      console.error("Failed to get song conflicts:", error);
      res.status(500).json({
        error: 'CONFLICT_CHECK_ERROR',
        message: "Failed to check song conflicts"
      });
    }
  });

  // Update song title
  router.patch("/api/songs/:songId", requireClerkUser, async (req, res) => {
    try {
      const { songId } = req.params;
      const { title } = req.body;
      const userId = req.userId;

      // Validate user ID exists
      if (!userId) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'User authentication required'
        });
      }

      // Validate title
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({
          error: 'INVALID_TITLE',
          message: 'Song title must be a non-empty string'
        });
      }

      // Validate title length
      if (title.length > 100) {
        return res.status(400).json({
          error: 'TITLE_TOO_LONG',
          message: 'Song title must be 100 characters or less'
        });
      }

      // First check if song exists and belongs to user's game
      const [song] = await db.select({
        songId: songs.id,
        gameId: songs.gameId,
        currentTitle: songs.title
      })
      .from(songs)
      .where(eq(songs.id, songId))
      .limit(1);

      if (!song) {
        return res.status(404).json({
          error: 'SONG_NOT_FOUND',
          message: 'Song not found'
        });
      }

      // Verify the game belongs to the user
      const [game] = await db.select()
        .from(gameStates)
        .where(and(
          eq(gameStates.id, song.gameId),
          eq(gameStates.userId, userId)
        ))
        .limit(1);

      if (!game) {
        return res.status(403).json({
          error: 'UNAUTHORIZED',
          message: 'You do not have permission to edit this song'
        });
      }

      // Update the song title
      const [updatedSong] = await db.update(songs)
        .set({
          title: title.trim()
        })
        .where(eq(songs.id, songId))
        .returning();

      res.json({
        success: true,
        song: {
          id: updatedSong.id,
          title: updatedSong.title,
          previousTitle: song.currentTitle
        }
      });

    } catch (error) {
      console.error("Failed to update song title:", error);
      res.status(500).json({
        error: 'UPDATE_FAILED',
        message: 'Failed to update song title'
      });
    }
  });

  // Clear all song reservations (for debugging/testing)
  router.post("/api/game/:gameId/songs/clear-reservations", requireClerkUser, async (req, res) => {
    try {
      const gameId = req.params.gameId;

      // Clear all song reservations
      const result = await db.update(songs)
        .set({ releaseId: null })
        .where(and(
          eq(songs.gameId, gameId),
          sql`${songs.releaseId} IS NOT NULL`
        ))
        .returning();

      res.json({
        success: true,
        message: `Cleared reservations for ${result.length} songs`,
        clearedSongs: result.map(s => ({
          songId: s.id,
          songTitle: s.title,
          artistId: s.artistId
        }))
      });
    } catch (error) {
      console.error("Failed to clear song reservations:", error);
      res.status(500).json({
        error: 'CLEAR_RESERVATIONS_ERROR',
        message: "Failed to clear song reservations"
      });
    }
  });


  // Delete a planned release and free up its songs
  router.delete("/api/game/:gameId/releases/:releaseId", requireClerkUser, async (req, res) => {
    try {
      const gameId = req.params.gameId;
      const releaseId = req.params.releaseId;

      // Get the release to return marketing budget
      const [release] = await db.select().from(releases)
        .where(and(eq(releases.id, releaseId), eq(releases.gameId, gameId)));

      if (!release) {
        return res.status(404).json({
          error: 'RELEASE_NOT_FOUND',
          message: 'Planned release not found'
        });
      }

      if (release.status !== 'planned') {
        return res.status(400).json({
          error: 'CANNOT_DELETE_RELEASED',
          message: 'Cannot delete a release that has already been executed'
        });
      }

      // Execute deletion in transaction
      const result = await db.transaction(async (tx) => {
        // Free up songs reserved for this release
        const freedSongs = await tx.update(songs)
          .set({ releaseId: null })
          .where(eq(songs.releaseId, releaseId))
          .returning();

        // Return marketing budget to player
        const [gameState] = await tx.select().from(gameStates)
          .where(eq(gameStates.id, gameId));

        if (gameState) {
          await tx.update(gameStates)
            .set({ money: (gameState.money || 0) + (release.marketingBudget || 0) })
            .where(eq(gameStates.id, gameId));
        }

        // Delete the planned release
        await tx.delete(releases).where(eq(releases.id, releaseId));

        return { freedSongs, refundedAmount: release.marketingBudget || 0 };
      });

      res.json({
        success: true,
        message: `Deleted planned release "${release.title}"`,
        freedSongs: result.freedSongs.map(s => ({
          songId: s.id,
          songTitle: s.title
        })),
        refundedAmount: result.refundedAmount
      });
    } catch (error) {
      console.error("Failed to delete planned release:", error);
      res.status(500).json({
        error: 'DELETE_RELEASE_ERROR',
        message: "Failed to delete planned release"
      });
    }
  });

export default router;
