/**
 * Analytics API Routes
 * 
 * RESTful endpoints for ROI and investment analytics
 * All calculations happen server-side for performance
 */

import { Router } from 'express';
import { analyticsService } from '../services/AnalyticsService';
import { requireGameOwner } from '../middleware/requireGameOwner';

const router = Router();

// NOTE: this router is mounted in server/routes.ts with requireClerkUser at the
// mount point, so callers are already authenticated. requireGameOwner (added
// per-route below, resolving gameId from the ?gameId query param) closes the
// remaining cross-tenant read gap: previously any authenticated user could read
// another player's ROI by passing their gameId. Non-owner => 404 GAME_NOT_FOUND.

/**
 * Get ROI metrics for a specific artist
 */
router.get('/artist/:artistId/roi', requireGameOwner, async (req, res) => {
  try {
    const { artistId } = req.params;
    const { gameId } = req.query;
    
    if (!gameId || typeof gameId !== 'string') {
      return res.status(400).json({ 
        error: 'gameId query parameter is required' 
      });
    }
    
    const data = await analyticsService.getArtistROI(artistId, gameId);
    res.json(data);
  } catch (error) {
    console.error('Error fetching artist ROI:', error);
    res.status(500).json({ 
      error: 'Failed to fetch artist ROI metrics' 
    });
  }
});

/**
 * Get ROI metrics for a specific project
 */
router.get('/project/:projectId/roi', requireGameOwner, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { gameId } = req.query;
    
    if (!gameId || typeof gameId !== 'string') {
      return res.status(400).json({ 
        error: 'gameId query parameter is required' 
      });
    }
    
    const data = await analyticsService.getProjectROI(projectId, gameId);
    res.json(data);
  } catch (error) {
    console.error('Error fetching project ROI:', error);
    res.status(500).json({ 
      error: 'Failed to fetch project ROI metrics' 
    });
  }
});

/**
 * Get ROI metrics for a specific release
 */
router.get('/release/:releaseId/roi', requireGameOwner, async (req, res) => {
  try {
    const { releaseId } = req.params;
    const { gameId } = req.query;
    
    if (!gameId || typeof gameId !== 'string') {
      return res.status(400).json({ 
        error: 'gameId query parameter is required' 
      });
    }
    
    const data = await analyticsService.getReleaseROI(releaseId, gameId);
    res.json(data);
  } catch (error) {
    console.error('Error fetching release ROI:', error);
    res.status(500).json({ 
      error: 'Failed to fetch release ROI metrics' 
    });
  }
});

/**
 * Get portfolio-wide ROI metrics
 */
router.get('/portfolio/roi', requireGameOwner, async (req, res) => {
  try {
    const { gameId } = req.query;
    
    if (!gameId || typeof gameId !== 'string') {
      return res.status(400).json({ 
        error: 'gameId query parameter is required' 
      });
    }
    
    const data = await analyticsService.getPortfolioROI(gameId);
    res.json(data);
  } catch (error) {
    console.error('Error fetching portfolio ROI:', error);
    res.status(500).json({ 
      error: 'Failed to fetch portfolio ROI metrics' 
    });
  }
});

export default router;
