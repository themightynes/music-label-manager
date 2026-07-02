import { Router } from 'express';
import { serverGameData } from '../data/gameData';
import { storage } from '../storage';
import { requireClerkUser } from '../auth';
import { seededRandomPick, generateMeetingSeed } from '@shared/utils/seededRandom';
import { gameDataLoader } from '@shared/utils/dataLoader';

const router = Router();

// Query params: gameId, week (optional) - for weekly meeting randomization
router.get("/api/roles/:roleId", requireClerkUser, async (req, res) => {
    try {
      // Use serverGameData to load data properly
      await serverGameData.initialize();
      const rolesData = await serverGameData.getAllRoles();
      const role = rolesData.find((r: any) => r.id === req.params.roleId);

      if (!role) {
        return res.status(404).json({ error: `Role ${req.params.roleId} not found` });
      }

      // Load actions using serverGameData
      const actionsData = await serverGameData.getWeeklyActionsWithCategories();
      let roleMeetings = actionsData.actions.filter((action: any) =>
        action.type === 'role_meeting' &&
        action.role_id === req.params.roleId
      );

      // Filter out test meetings from production randomization
      roleMeetings = roleMeetings.filter((meeting: any) =>
        !meeting.id.startsWith('TEST_')
      );

      console.log(`Found ${roleMeetings.length} meetings for role ${req.params.roleId}`);

      // Weekly meeting randomization: if gameId and week provided, select one meeting
      const { gameId, week } = req.query;
      console.log(`[MEETING API] Request for ${req.params.roleId} - gameId: ${gameId}, week: ${week}`);

      if (gameId && week && roleMeetings.length > 0) {
        const weekNum = parseInt(week as string);
        if (!isNaN(weekNum)) {
          const seed = generateMeetingSeed(gameId as string, weekNum, req.params.roleId);
          const selectedMeeting = seededRandomPick(roleMeetings, seed);
          console.log(`[MEETING API] ✅ Randomized to 1 meeting for ${req.params.roleId} week ${weekNum}:`, selectedMeeting?.id);
          roleMeetings = selectedMeeting ? [selectedMeeting] : roleMeetings;
        }
      } else {
        console.log(`[MEETING API] ❌ NO RANDOMIZATION - returning all ${roleMeetings.length} meetings for ${req.params.roleId}`);
      }

      res.json({
        ...role,
        meetings: roleMeetings
      });
    } catch (error: any) {
      console.error('Failed to load role:', error);
      res.status(500).json({
        error: 'Failed to load role data',
        details: error.message || 'Unknown error',
        roleId: req.params.roleId
      });
    }
  });

  // Get specific meeting data for a role
  // Following the rule: JSON = Content & Config, Database = State & Saves
  router.get("/api/roles/:roleId/meetings/:meetingId", requireClerkUser, async (req, res) => {
    try {
      // Use the same serverGameData methods that work elsewhere
      await serverGameData.initialize();
      const actionsData = await serverGameData.getWeeklyActionsWithCategories();

      // Find the meeting in actions (getWeeklyActionsWithCategories returns actions array)
      const meeting = actionsData.actions.find((action: any) =>
        action.type === 'role_meeting' &&
        action.role_id === req.params.roleId &&
        action.id === req.params.meetingId
      );

      console.log('Looking for meeting:', req.params.meetingId, 'for role:', req.params.roleId);
      console.log('Found meeting:', meeting ? 'Yes' : 'No');
      if (meeting) {
        console.log('Meeting data:', JSON.stringify(meeting, null, 2));
      }

      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }

      // Return the meeting data in the format DialogueModal expects
      res.json({
        id: meeting.id,
        prompt: meeting.prompt || '',
        choices: meeting.choices || []
      });
    } catch (error) {
      console.error('Failed to load meeting:', error);
      res.status(500).json({ error: 'Failed to load meeting data' });
    }
  });

  // Get executives for a game
  router.get("/api/game/:gameId/executives", requireClerkUser, async (req, res) => {
    try {
      const { gameId } = req.params;
      console.log('[ROUTES] Fetching executives for game:', gameId);

      const executives = await storage.getExecutivesByGame(gameId);
      console.log('[ROUTES] Found executives:', executives.length);

      res.json(executives);
    } catch (error) {
      console.error('[ROUTES] Error fetching executives:', error);
      res.status(500).json({ message: "Failed to fetch executives" });
    }
  });

  // Process executive action/decision (Week 2 Task)
  router.post("/api/game/:gameId/executive/:execId/action", requireClerkUser, async (req, res) => {
    try {
      const { gameId, execId } = req.params;
      const { actionId, meetingId, choiceId, metadata } = req.body;

      // Get the game state
      const gameState = await storage.getGameState(gameId);
      if (!gameState) {
        return res.status(404).json({ message: "Game not found" });
      }

      // Store the executive action as a selected action for the week
      const executiveAction = {
        actionType: 'role_meeting' as const,
        targetId: execId,
        metadata: {
          roleId: metadata?.roleId || 'unknown',
          actionId: actionId,
          choiceId: choiceId,
          executiveId: execId,
          ...metadata
        }
      };

      // Check if focus slots are available
      const usedSlots = gameState.usedFocusSlots || 0;
      const totalSlots = gameState.focusSlots || 3;

      if (usedSlots >= totalSlots) {
        return res.status(400).json({
          message: "No focus slots available",
          usedSlots,
          totalSlots
        });
      }

      // NOTE: Executive mood/loyalty processing now handled during week advancement
      // This ensures single source of truth and prevents duplicate processing

      // Update the used focus slots count
      gameState.usedFocusSlots = usedSlots + 1;

      // Save the updated game state
      await storage.updateGameState(gameId, {
        ...gameState,
        flags: gameState.flags as any, // Type assertion to handle unknown -> Json conversion
        weeklyStats: gameState.weeklyStats as any, // Type assertion to handle unknown -> Json conversion
        tierUnlockHistory: gameState.tierUnlockHistory as any // Type assertion to handle unknown -> Json conversion
      });

      // Return success response with updated state
      res.json({
        success: true,
        executiveId: execId,
        actionId: actionId,
        gameId: gameId,
        week: gameState.currentWeek,
        usedSlots: gameState.usedFocusSlots,
        totalSlots: totalSlots,
        message: "Executive action processed successfully"
      });
    } catch (error) {
      console.error('Failed to process executive action:', error);
      res.status(500).json({ message: "Failed to process executive action" });
    }
  });

  // Dialogue choices (legacy endpoint - kept for backwards compatibility)
  router.get("/api/dialogue/:roleType", async (req, res) => {
    try {
      const { sceneId } = req.query;
      const choices = await storage.getDialogueChoices(
        req.params.roleType,
        sceneId as string
      );
      res.json(choices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dialogue choices" });
    }
  });

  // Get all dialogue scenes for frontend random selection
  router.get("/api/dialogue-scenes", async (req, res) => {
    try {
      const dialogueData = await gameDataLoader.loadDialogueData();
      res.json({
        version: dialogueData.version,
        scenes: dialogueData.additional_scenes
      });
    } catch (error) {
      console.error('[API] Failed to load dialogue data:', error);
      res.status(500).json({
        message: "Failed to load dialogue data",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

export default router;
