import { Router } from 'express';
import { storage } from '../storage';
import { requireClerkUser } from '../auth';
import { serverGameData } from '../data/gameData';
import { FinancialSystem, VenueCapacityManager } from '@shared/engine/FinancialSystem';

const router = Router();

  // Tour estimation endpoint - Phase 3: API Bridge
  router.post('/api/tour/estimate', requireClerkUser, async (req, res) => {
    try {
      const { artistId, cities, budgetPerCity, gameId, venueCapacity } = req.body;

      // VALIDATE INPUTS - CRASH IF INVALID
      if (!artistId || !cities || budgetPerCity === undefined || !gameId) {
        return res.status(400).json({
          error: 'Missing required parameters: artistId, cities, budgetPerCity, gameId'
        });
      }

      // ENHANCED: Validate venueCapacity if provided
      if (venueCapacity !== undefined) {
        if (typeof venueCapacity !== 'number' || venueCapacity < 50) {
          return res.status(400).json({
            error: 'venueCapacity must be a number >= 50'
          });
        }
      }

      // Get game state - CRASH IF MISSING
      const gameState = await storage.getGameState(gameId);
      if (!gameState) {
        return res.status(404).json({ error: `Game not found: ${gameId}` });
      }

      // Get artist - CRASH IF MISSING
      const artist = await storage.getArtist(artistId);
      if (!artist) {
        return res.status(404).json({ error: `Artist not found: ${artistId}` });
      }

      // Get venue access - CRASH IF MISSING
      const venueAccess = gameState.venueAccess;
      if (!venueAccess || venueAccess === 'none') {
        return res.status(400).json({ error: `Invalid venue access: ${venueAccess}` });
      }

      // Initialize serverGameData before creating financial system
      await serverGameData.initialize();

      // Initialize financial system for validation and calculations
      const financialSystem = new FinancialSystem(serverGameData, () => Math.random());

      // ENHANCED: Validate venueCapacity using VenueCapacityManager
      if (venueCapacity !== undefined) {
        try {
          VenueCapacityManager.validateCapacity(venueCapacity, venueAccess, serverGameData);
        } catch (error) {
          return res.status(400).json({
            error: `Venue capacity validation failed: ${(error as Error).message}`
          });
        }
      }

      // Get base costs to determine marketing budget
      const baseCosts = financialSystem.calculateTourCosts(venueAccess, cities, 0);
      const totalMarketingBudget = budgetPerCity * cities;
      const totalBudget = baseCosts.totalCosts + totalMarketingBudget;

      // ENHANCED: Calculate detailed breakdown with specific capacity or tier fallback
      const detailedBreakdown = financialSystem.calculateDetailedTourBreakdown({
        venueCapacity: venueCapacity || 0, // Use provided capacity or fallback to tier
        venueTier: venueAccess, // Keep for backward compatibility and fallback
        artistPopularity: artist.popularity || 0,
        localReputation: gameState.reputation || 0,
        cities,
        marketingBudget: totalMarketingBudget
      });

      // Get tier range for response using VenueCapacityManager
      const tierRange = VenueCapacityManager.getCapacityRangeFromTier(venueAccess, serverGameData);

      // Calculate price per ticket from first city (all cities have same pricing)
      const firstCity = detailedBreakdown.cities[0];
      const pricePerTicket = firstCity
        ? Math.round((firstCity.ticketRevenue / (firstCity.venueCapacity * firstCity.sellThroughRate)) || 0)
        : 0;

      // Get venue categorization using VenueCapacityManager
      console.log('[TOUR ESTIMATE] Getting venue categorization for capacity:', venueCapacity || 500);
      const venueCategory = VenueCapacityManager.categorizeVenue(venueCapacity || 500, serverGameData);
      console.log('[TOUR ESTIMATE] Venue category result:', venueCategory);

      // Create enhanced response with detailed breakdown
      const response = {
        estimatedRevenue: detailedBreakdown.totalRevenue,
        totalCosts: detailedBreakdown.totalCosts,
        estimatedProfit: detailedBreakdown.netProfit,
        roi: detailedBreakdown.totalCosts > 0 ? (detailedBreakdown.netProfit / detailedBreakdown.totalCosts) * 100 : 0,
        canAfford: totalBudget <= (gameState.money || 0),
        totalBudget,
        breakdown: detailedBreakdown.costBreakdown,
        sellThroughRate: detailedBreakdown.sellThroughAnalysis.finalRate,
        // ENHANCED: Include detailed city-by-city breakdown
        cities: detailedBreakdown.cities,
        sellThroughAnalysis: detailedBreakdown.sellThroughAnalysis,
        venueCapacity: detailedBreakdown.cities[0]?.venueCapacity || 0,
        // PHASE 2 ENHANCEMENTS: New fields for capacity selection
        selectedCapacity: detailedBreakdown.cities[0]?.venueCapacity || 0,
        tierRange,
        pricePerTicket,
        playerTier: venueAccess,
        venueCategory // NEW: Configuration-driven venue categorization
      };

      res.json(response);

    } catch (error) {
      // LOG ERROR BUT DON'T HIDE IT
      console.error('[TOUR ESTIMATE ERROR]', (error as Error).message);
      res.status(500).json({
        error: 'Tour estimation failed',
        details: (error as Error).message
      });
    }
  });

export default router;
