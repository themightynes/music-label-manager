import { Router } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { storage } from '../storage';
import { requireClerkUser } from '../auth';
import { serverGameData } from '../data/gameData';
import { gameStates } from '@shared/schema';
import { ChartService } from '@shared/engine/ChartService';

const router = Router();

  // Get Top 10 chart data for a game
  router.get("/api/game/:gameId/charts/top10", requireClerkUser, async (req, res) => {
    try {
      const { gameId } = req.params;
      const userId = req.userId!;

      // Verify user has access to this game
      const [gameOwnership] = await db.select()
        .from(gameStates)
        .where(and(
          eq(gameStates.id, gameId),
          eq(gameStates.userId, userId)
        ))
        .limit(1);

      if (!gameOwnership) {
        return res.status(403).json({
          error: 'UNAUTHORIZED',
          message: 'You do not have permission to access this game'
        });
      }

      // Get current game to determine chart week
      const game = await storage.getGameState(gameId);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      // Create ChartService instance
      const rng = () => Math.random(); // Simple RNG for chart generation
      const chartService = new ChartService(serverGameData, rng, storage, gameId);

      // Calculate current chart week from game week
      const currentChartWeek = ChartService.generateChartWeekFromGameWeek(game.currentWeek ?? 1);

      // Get Top 10 chart data
      const top10Data = await chartService.getTop10ChartData(currentChartWeek);

      console.log(`[API] Top 10 chart data fetched for game ${gameId}, week ${currentChartWeek}:`, {
        totalEntries: top10Data.length,
        playerSongs: top10Data.filter(entry => entry.isPlayerSong).length,
        competitorSongs: top10Data.filter(entry => entry.isCompetitorSong).length,
        debuts: top10Data.filter(entry => entry.isDebut).length
      });

      res.json({
        chartWeek: currentChartWeek,
        currentWeek: game.currentWeek,
        top10: top10Data
      });

    } catch (error) {
      console.error('[API] Error fetching Top 10 chart data:', error);
      res.status(500).json({
        message: "Failed to fetch Top 10 chart data",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get Top 100 chart data for a game
  router.get("/api/game/:gameId/charts/top100", requireClerkUser, async (req, res) => {
    try {
      const { gameId } = req.params;
      const userId = req.userId!;

      // Verify user has access to this game
      const [gameOwnership] = await db.select()
        .from(gameStates)
        .where(and(
          eq(gameStates.id, gameId),
          eq(gameStates.userId, userId)
        ))
        .limit(1);

      if (!gameOwnership) {
        return res.status(403).json({
          error: 'UNAUTHORIZED',
          message: 'You do not have permission to access this game'
        });
      }

      // Get current game to determine chart week
      const game = await storage.getGameState(gameId);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      // Create ChartService instance
      const rng = () => Math.random(); // Simple RNG for chart generation
      const chartService = new ChartService(serverGameData, rng, storage, gameId);

      // Calculate current chart week from game week
      const currentChartWeek = ChartService.generateChartWeekFromGameWeek(game.currentWeek ?? 1);

      // Get Top 100 chart data (all charting songs)
      const currentEntries = await chartService.getCurrentWeekChartEntries(currentChartWeek);
      const top100Entries = currentEntries
        .filter(entry => entry.position !== null && entry.position >= 1 && entry.position <= 100)
        .sort((a, b) => (a.position || 101) - (b.position || 101))
        .map(entry => ({
          position: entry.position!,
          songId: entry.songId || entry.competitorTitle || 'unknown',
          songTitle: entry.songTitle,
          artistName: entry.artistName,
          streams: entry.streams,
          movement: entry.movement ?? 0,
          weeksOnChart: entry.weeksOnChart,
          peakPosition: entry.peakPosition ?? (entry.position ?? null),
          lastWeekPosition: entry.lastWeekPosition ?? null,
          isPlayerSong: !entry.isCompetitorSong,
          isCompetitorSong: entry.isCompetitorSong ?? false,
          isDebut: entry.isDebut ?? false
        }));

      console.log(`[API] Top 100 chart data fetched for game ${gameId}, week ${currentChartWeek}:`, {
        totalEntries: top100Entries.length,
        playerSongs: top100Entries.filter(entry => entry.isPlayerSong).length,
        competitorSongs: top100Entries.filter(entry => !entry.isPlayerSong).length,
        debuts: top100Entries.filter(entry => entry.isDebut).length
      });

      // Debug: Log first few entries to check lastWeekPosition
      if (top100Entries.length > 0) {
        console.log('[API] First 3 entries with lastWeekPosition:', top100Entries.slice(0, 3).map(entry => ({
          position: entry.position,
          songTitle: entry.songTitle,
          lastWeekPosition: entry.lastWeekPosition,
          movement: entry.movement
        })));
      }

      res.json({
        chartWeek: currentChartWeek,
        currentWeek: game.currentWeek,
        top100: top100Entries
      });

    } catch (error) {
      console.error('[API] Error fetching Top 100 chart data:', error);
      res.status(500).json({
        message: "Failed to fetch Top 100 chart data",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

export default router;
