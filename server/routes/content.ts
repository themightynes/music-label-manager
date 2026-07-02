import { Router } from 'express';
import { serverGameData } from '../data/gameData';
import { storage } from '../storage';
import { requireClerkUser } from '../auth';

const router = Router();

// Get available artists for discovery
router.get("/api/artists/available", async (req, res) => {
    try {
      await serverGameData.initialize();
      const allArtists = await serverGameData.getAllArtists();
      res.json({ artists: allArtists || [] });
    } catch (error) {
      console.error('Failed to load available artists:', error);
      res.status(500).json({ error: 'Failed to load available artists' });
    }
  });

  // Get available weekly actions with enriched role data and categories
  router.get("/api/actions/weekly", requireClerkUser, async (req, res) => {
    try {
      await serverGameData.initialize();
      const actionsData = await serverGameData.getWeeklyActionsWithCategories();
      const roles = await serverGameData.getAllRoles();

      // Enrich actions with role meeting data
      const enrichedActions = actionsData.actions.map((action: any) => {
        if (action.type === 'role_meeting' && action.role_id) {
          const role = roles.find(r => r.id === action.role_id);
          if (role && role.meetings && role.meetings.length > 0) {
            return {
              ...action,
              firstMeetingId: role.meetings[0].id,
              availableMeetings: role.meetings.length
            };
          }
        }
        return action;
      });

      res.json({
        actions: enrichedActions || [],
        categories: actionsData.categories || []
      });
    } catch (error) {
      console.error('Failed to load weekly actions:', error);
      res.status(500).json({ error: 'Failed to load weekly actions' });
    }
  });

  // Get project types and configuration
  router.get("/api/project-types", requireClerkUser, async (req, res) => {
    try {
      await serverGameData.initialize();
      const projectTypes = await serverGameData.getProjectTypes();
      res.json({ projectTypes: projectTypes || {} });
    } catch (error) {
      console.error('Failed to load project types:', error);
      res.status(500).json({ error: 'Failed to load project types' });
    }
  });

  // Artist dialogue endpoints
  router.get("/api/artists/:archetype/dialogue", async (req, res) => {
    try {
      const dialogues = await serverGameData.getArtistDialogue(req.params.archetype);
      res.json(dialogues);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch artist dialogue" });
    }
  });

  // Game events
  router.get("/api/events", async (req, res) => {
    try {
      const events = await storage.getGameEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch game events" });
    }
  });

  // Balance data endpoint
  router.get('/api/game/:gameId/balance', requireClerkUser, async (req, res) => {
    try {
      const balance = await serverGameData.getBalanceConfig();
      res.json({ balance });
    } catch (error: any) {
      console.error('[BALANCE] Failed to load balance data:', error);
      res.status(500).json({
        error: 'BALANCE_LOAD_FAILED',
        message: error.message || 'Failed to load balance configuration'
      });
    }
  });

export default router;
