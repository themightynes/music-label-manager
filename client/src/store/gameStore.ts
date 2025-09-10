import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameState, Artist, Project, Role, MonthlyAction } from '@shared/schema';
// Game engine moved to shared - client no longer calculates outcomes
import { apiRequest, queryClient } from '@/lib/queryClient';

interface GameStore {
  // Game state
  gameState: GameState | null;
  artists: Artist[];
  projects: Project[];
  roles: Role[];
  monthlyActions: MonthlyAction[];
  songs: any[];
  releases: any[];
  executives: any[]; // Executive team members
  
  // UI state
  selectedActions: string[];
  isAdvancingMonth: boolean;
  currentDialogue: any | null;
  monthlyOutcome: any | null;
  campaignResults: any | null;
  
  // Actions
  loadGame: (gameId: string) => Promise<void>;
  loadGameFromSave: (saveId: string) => Promise<void>;
  createNewGame: (campaignType: string) => Promise<GameState>;
  updateGameState: (updates: Partial<GameState>) => Promise<void>;
  
  // Monthly actions
  selectAction: (actionId: string) => Promise<void>;
  removeAction: (actionId: string) => Promise<void>;
  reorderActions: (startIndex: number, endIndex: number) => void;
  clearActions: () => void;
  advanceMonth: () => Promise<void>;
  
  // Artist management
  signArtist: (artistData: any) => Promise<void>;
  updateArtist: (artistId: string, updates: any) => Promise<void>;
  
  // Project management
  createProject: (projectData: any) => Promise<void>;
  updateProject: (projectId: string, updates: any) => Promise<void>;
  
  // Dialogue
  openDialogue: (roleType: string, sceneId?: string) => Promise<void>;
  selectDialogueChoice: (choiceId: string, effects: any) => Promise<void>;
  closeDialogue: () => void;
  
  // Save management
  saveGame: (name: string) => Promise<void>;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // Initial state
      gameState: null,
      artists: [],
      projects: [],
      roles: [],
      monthlyActions: [],
      songs: [],
      releases: [],
      executives: [],
      selectedActions: [],
      isAdvancingMonth: false,
      currentDialogue: null,
      monthlyOutcome: null,
      campaignResults: null,

      // Load existing game
      loadGame: async (gameId: string) => {
        try {
          const [gameResponse, songsResponse, releasesResponse, executivesResponse] = await Promise.all([
            apiRequest('GET', `/api/game/${gameId}`),
            apiRequest('GET', `/api/game/${gameId}/songs`),
            apiRequest('GET', `/api/game/${gameId}/releases`),
            apiRequest('GET', `/api/game/${gameId}/executives`)
          ]);
          
          const data = await gameResponse.json();
          const songs = await songsResponse.json();
          const releases = await releasesResponse.json();
          const executives = await executivesResponse.json();
          
          console.log('GameStore loadGame debug:', {
            gameId,
            gameData: !!data,
            songsCount: songs?.length || 0,
            releasesCount: releases?.length || 0,
            releases: releases,
            executivesCount: executives?.length || 0,
            executives: executives
          });
          
          // Ensure usedFocusSlots is synced with selectedActions (should be 0 when loading)
          const syncedGameState = {
            ...data.gameState,
            usedFocusSlots: 0  // Reset to 0 since selectedActions is empty
          };
          
          set({
            gameState: syncedGameState,
            artists: data.artists,
            projects: data.projects,
            roles: data.roles,
            monthlyActions: data.monthlyActions,
            songs,
            releases,
            executives,
            selectedActions: []
          });
        } catch (error) {
          console.error('Failed to load game:', error);
          throw error;
        }
      },

      // Load game from save
      loadGameFromSave: async (saveId: string) => {
        try {
          // First, get the specific save data
          const response = await apiRequest('GET', `/api/saves`);
          const saves = await response.json();
          
          // Find the save by ID
          const save = saves.find((s: any) => s.id === saveId);
          if (!save) {
            throw new Error('Save not found');
          }
          
          // Extract the game state from the save
          const savedGameData = save.gameState;
          
          if (!savedGameData || !savedGameData.gameState) {
            throw new Error('Invalid save data format');
          }
          
          set({
            gameState: savedGameData.gameState,
            artists: savedGameData.artists || [],
            projects: savedGameData.projects || [],
            roles: savedGameData.roles || [],
            monthlyActions: [], // Reset monthly actions
            selectedActions: [],
            campaignResults: null,
            monthlyOutcome: null
          });
          
          // Update the game context with the loaded game's ID
          // Note: This might need to be done from the component using GameContext
        } catch (error) {
          console.error('Failed to load game from save:', error);
          throw error;
        }
      },

      // Create new game
      createNewGame: async (campaignType: string) => {
        try {
          const newGameData = {
            // userId will be set by the server from authentication
            currentMonth: 1,
            // money will be set by server from balance.json
            // reputation will be set by server from balance.json
            reputation: 0,
            creativeCapital: 0,
            focusSlots: 3,
            usedFocusSlots: 0,
            playlistAccess: 'none',
            pressAccess: 'none',
            venueAccess: 'none',
            campaignType,
            rngSeed: Math.random().toString(36),
            flags: {},
            monthlyStats: {},
            campaignCompleted: false
          };

          const response = await apiRequest('POST', '/api/game', newGameData);
          const gameState = await response.json();
          
          console.log('=== CREATE NEW GAME DEBUG ===');
          console.log('New game created:', gameState);
          console.log('Month should be 1, actual:', gameState.currentMonth);
          console.log('Game ID:', gameState.id);
          
          // CRITICAL: Clear all localStorage game data first
          localStorage.removeItem('music-label-manager-game');
          localStorage.setItem('currentGameId', gameState.id);
          console.log('Cleared localStorage and set new gameId');
          
          // Ensure new game starts with 0 used slots
          const syncedGameState = {
            ...gameState,
            usedFocusSlots: 0  // New game starts with no slots used
          };
          
          // Clear campaign results and set new state
          set({
            gameState: syncedGameState,
            artists: [],
            projects: [],
            roles: [],
            monthlyActions: [],
            songs: [],
            releases: [],
            executives: [],
            selectedActions: [],
            campaignResults: null,
            monthlyOutcome: null
          });

          // Return the new game state so the UI can update
          return gameState;
        } catch (error) {
          console.error('Failed to create game:', error);
          throw error;
        }
      },

      // Update game state
      updateGameState: async (updates: Partial<GameState>) => {
        const { gameState } = get();
        if (!gameState) return;

        try {
          const response = await apiRequest('PATCH', `/api/game/${gameState.id}`, updates);
          
          // Clone response to safely read the body
          const clonedResponse = response.clone();
          let responseText;
          try {
            responseText = await clonedResponse.text();
          } catch (e) {
            console.error('[updateGameState] Failed to read response text:', e);
            responseText = '';
          }
          
          // If response body is empty or not valid JSON, merge updates locally
          if (!responseText || responseText.trim() === '') {
            console.warn('[updateGameState] Empty response from server, applying updates locally');
            // Apply updates to local state
            const updatedState = { ...gameState, ...updates };
            set({ gameState: updatedState });
            
            // Try to sync with server in background
            setTimeout(async () => {
              try {
                const syncResponse = await apiRequest('GET', `/api/game/${gameState.id}`);
                const serverState = await syncResponse.json();
                set({ gameState: serverState });
                console.log('[updateGameState] Synced with server state');
              } catch (syncError) {
                console.error('[updateGameState] Failed to sync with server:', syncError);
              }
            }, 1000);
            
            return;
          }
          
          // Try to parse the response
          try {
            const updatedState = JSON.parse(responseText);
            set({ gameState: updatedState });
          } catch (parseError) {
            console.error('[updateGameState] Failed to parse response:', parseError);
            // Apply updates locally as fallback
            const updatedState = { ...gameState, ...updates };
            set({ gameState: updatedState });
          }
        } catch (error) {
          console.error('Failed to update game state:', error);
          // If it's a 404, the game doesn't exist in the database
          if (error.status === 404) {
            console.error('Game not found in database. You may need to create a new game.');
            // Don't throw - just apply updates locally
            const updatedState = { ...gameState, ...updates };
            set({ gameState: updatedState });
          } else {
            throw error;
          }
        }
      },

      // Monthly action selection
      selectAction: async (actionId: string) => {
        const { selectedActions, gameState } = get();
        const availableSlots = gameState?.focusSlots || 3;
        
        if (selectedActions.length < availableSlots && !selectedActions.includes(actionId) && gameState) {
          const newSelectedActions = [...selectedActions, actionId];
          const newUsedSlots = newSelectedActions.length;
          
          // Update local state
          set({ 
            selectedActions: newSelectedActions,
            gameState: { ...gameState, usedFocusSlots: newUsedSlots }
          });
          
          // Sync focus slots to server to prevent desync issues
          try {
            await apiRequest('PATCH', `/api/game/${gameState.id}`, {
              usedFocusSlots: newUsedSlots
            });
          } catch (error) {
            console.error('Failed to sync focus slots:', error);
            // Don't fail the whole operation if sync fails
          }
        }
      },

      removeAction: async (actionId: string) => {
        const { selectedActions, gameState } = get();
        if (selectedActions.includes(actionId) && gameState) {
          const newSelectedActions = selectedActions.filter(id => id !== actionId);
          const newUsedSlots = newSelectedActions.length;
          
          // Update local state
          set({ 
            selectedActions: newSelectedActions,
            gameState: { ...gameState, usedFocusSlots: newUsedSlots }
          });
          
          // Sync focus slots to server to prevent desync issues
          try {
            await apiRequest('PATCH', `/api/game/${gameState.id}`, {
              usedFocusSlots: newUsedSlots
            });
          } catch (error) {
            console.error('Failed to sync focus slots:', error);
            // Don't fail the whole operation if sync fails
          }
        }
      },

      reorderActions: (startIndex: number, endIndex: number) => {
        const { selectedActions } = get();
        const result = Array.from(selectedActions);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        set({ selectedActions: result });
      },

      clearActions: () => {
        const { gameState } = get();
        set({ 
          selectedActions: [],
          gameState: gameState ? { ...gameState, usedFocusSlots: 0 } : gameState
        });
      },

      // Advance month
      advanceMonth: async () => {
        const { gameState, selectedActions } = get();
        if (!gameState || selectedActions.length === 0) return;

        set({ isAdvancingMonth: true });

        // Fetch executives fresh from API to ensure we have latest data
        let executives = [];
        try {
          const execResponse = await apiRequest('GET', `/api/game/${gameState.id}/executives`);
          executives = await execResponse.json();
          console.log('[DEBUG CLIENT] Fetched fresh executives:', executives);
        } catch (error) {
          console.error('[DEBUG CLIENT] Failed to fetch executives:', error);
        }

        console.log('[DEBUG CLIENT] advanceMonth - executives length:', executives?.length || 0);

        try {
          // Map executive roles to their IDs for metadata
          const executivesByRole: Record<string, any> = {};
          executives.forEach(exec => {
            executivesByRole[exec.role] = exec;
          });
          
          // Use the NEW API endpoint with campaign completion logic
          // DEBUG: Log all executives before mapping
          console.log('[DEBUG CLIENT] All executives by role:', executivesByRole);
          console.log('[DEBUG CLIENT] Selected actions:', selectedActions);
          
          const advanceRequest = {
            gameId: gameState.id,
            selectedActions: selectedActions.map(actionStr => {
              // Parse the JSON string to get our structured data
              let actionData: any;
              try {
                actionData = JSON.parse(actionStr);
                console.log(`[DEBUG CLIENT] Parsed action data:`, actionData);
              } catch (e) {
                // Fallback for old format (shouldn't happen with new code)
                console.log(`[DEBUG CLIENT] Failed to parse, using legacy format for: ${actionStr}`);
                return {
                  actionType: 'role_meeting' as const,
                  targetId: actionStr,
                  metadata: {}
                };
              }
              
              const { roleId, actionId, choiceId } = actionData;
              
              // Build complete metadata
              const metadata: any = {
                roleId,
                actionId,
                choiceId
              };
              
              // Add executiveId if this is an executive role (not CEO)
              if (roleId && roleId !== 'ceo') {
                const executive = executivesByRole[roleId];
                if (executive) {
                  metadata.executiveId = executive.id;
                  console.log(`[DEBUG CLIENT] ✅ Added executiveId ${executive.id} for role ${roleId}`);
                } else {
                  console.log(`[DEBUG CLIENT] ❌ No executive found for role ${roleId}`);
                }
              }
              
              const result = {
                actionType: 'role_meeting' as const,
                targetId: actionId,  // Use the clean action ID
                metadata
              };
              
              console.log(`[DEBUG CLIENT] Final action object:`, result);
              
              return result;
            })
          };
          
          console.log('[DEBUG CLIENT] Complete advance request:', JSON.stringify(advanceRequest, null, 2));

          const response = await apiRequest('POST', '/api/advance-month', advanceRequest);
          const result = await response.json();
          
          // Log the debugging information from our server response
          console.log('=== ADVANCE MONTH DEBUG INFO ===');
          console.log('Server response result:', result);
          if (result.debugInfo) {
            console.log('Server debug info:', result.debugInfo);
            if (result.debugInfo.processingSteps) {
              console.log('Processing steps:', result.debugInfo.processingSteps);
            }
            if (result.debugInfo.projectStates) {
              console.log('Project states:', result.debugInfo.projectStates);
            }
            if (result.debugInfo.songStates) {
              console.log('Song states:', result.debugInfo.songStates);
            }
          }
          console.log('===============================');
          
          // Reload game data to get updated projects, songs, releases, AND executives
          // CRITICAL FIX: Explicitly fetch all data including executives to ensure state synchronization
          const [gameResponse, songsResponse, releasesResponse, executivesResponse] = await Promise.all([
            apiRequest('GET', `/api/game/${gameState.id}`),
            apiRequest('GET', `/api/game/${gameState.id}/songs`),
            apiRequest('GET', `/api/game/${gameState.id}/releases`), // Explicit releases fetch
            apiRequest('GET', `/api/game/${gameState.id}/executives`) // CRITICAL: Fetch updated executives
          ]);
          const gameData = await gameResponse.json();
          const songs = await songsResponse.json();
          const releases = await releasesResponse.json();
          const updatedExecutives = await executivesResponse.json();
          
          console.log('=== POST-ADVANCE MONTH STATE SYNC ===');
          console.log('Game data releases count:', (gameData.releases || []).length);
          console.log('Direct releases fetch count:', (releases || []).length);
          console.log('Release statuses:', releases.map((r: any) => ({ id: r.id, title: r.title, status: r.status })));
          console.log('Executives count:', (updatedExecutives || []).length);
          console.log('Executive states:', updatedExecutives.map((e: any) => ({ 
            id: e.id, 
            role: e.role, 
            mood: e.mood, 
            loyalty: e.loyalty 
          })));
          console.log('=====================================');
          
          // Ensure usedFocusSlots is reset to 0 for the new month
          const syncedGameState = {
            ...result.gameState,
            usedFocusSlots: 0  // Always 0 at start of new month
          };
          
          set({
            gameState: syncedGameState,
            artists: gameData.artists || [], // Update artists to reflect mood changes
            projects: gameData.projects || [], // Update projects with current state
            songs: songs || [], // Update songs to include newly recorded ones
            releases: releases || [], // FIXED: Use explicit releases fetch for accurate status
            executives: updatedExecutives || [], // CRITICAL: Update executives with new mood/loyalty values
            monthlyOutcome: result.summary,
            campaignResults: result.campaignResults,
            selectedActions: [],
            isAdvancingMonth: false
          });
          
          // Invalidate React Query caches to refresh UI components
          await queryClient.invalidateQueries({ queryKey: ['artist-roi'] });
          await queryClient.invalidateQueries({ queryKey: ['project-roi'] });
          await queryClient.invalidateQueries({ queryKey: ['portfolio-roi'] });
          await queryClient.invalidateQueries({ queryKey: ['release-roi'] });
        } catch (error) {
          console.error('=== ADVANCE MONTH ERROR ===');
          console.error('Error occurred during month advancement');
          console.error('Error type:', typeof error);
          console.error('Error constructor:', error?.constructor?.name);
          console.error('Error instanceof Error:', error instanceof Error);
          console.error('Error message:', error instanceof Error ? error.message : 'No message');
          console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
          
          // Try to extract additional error details
          if (error && typeof error === 'object') {
            console.error('Error properties:', Object.getOwnPropertyNames(error));
            console.error('Error status:', (error as any).status);
            console.error('Error statusText:', (error as any).statusText);
            console.error('Error url:', (error as any).url);
            console.error('Error details:', (error as any).details);
          }
          
          // Create a more descriptive error for the UI
          let displayError;
          if (error instanceof Error) {
            // Extract meaningful error information
            const status = (error as any).status;
            const statusText = (error as any).statusText;
            const details = (error as any).details;
            
            if (status && statusText) {
              displayError = new Error(`HTTP ${status}: ${statusText}. ${error.message}`);
            } else if (details && details.message) {
              displayError = new Error(`Server Error: ${details.message}`);
            } else {
              displayError = new Error(`Advance Month Failed: ${error.message}`);
            }
          } else {
            displayError = new Error(`Advance Month Failed: ${JSON.stringify(error)}`);
          }
          
          console.error('Final display error:', displayError.message);
          console.error('========================');
          
          set({ isAdvancingMonth: false });
          throw displayError;
        }
      },

      // Artist management
      signArtist: async (artistData: any) => {
        const { gameState, artists } = get();
        if (!gameState) return;

        try {
          const response = await apiRequest('POST', `/api/game/${gameState.id}/artists`, {
            ...artistData,
            signedMonth: gameState.currentMonth,
            isSigned: true
          });
          const newArtist = await response.json();
          
          // Update both artists and game state (to reflect money deduction)
          const signingCost = artistData.signingCost || 0;
          set({ 
            artists: [...artists, newArtist],
            gameState: {
              ...gameState,
              money: Math.max(0, (gameState.money || 0) - signingCost)
            }
          });
        } catch (error) {
          console.error('Failed to sign artist:', error);
          throw error;
        }
      },

      updateArtist: async (artistId: string, updates: any) => {
        const { artists } = get();

        try {
          const response = await apiRequest('PATCH', `/api/artists/${artistId}`, updates);
          const updatedArtist = await response.json();
          
          set({
            artists: artists.map(a => a.id === artistId ? updatedArtist : a)
          });
        } catch (error) {
          console.error('Failed to update artist:', error);
          throw error;
        }
      },

      // Project management
      createProject: async (projectData: any) => {
        const { gameState, projects } = get();
        if (!gameState) return;

        try {
          const response = await apiRequest('POST', `/api/game/${gameState.id}/projects`, {
            ...projectData,
            startMonth: gameState.currentMonth,
            stage: 'planning'
          });
          const newProject = await response.json();
          
          set({ projects: [...projects, newProject] });
        } catch (error) {
          console.error('Failed to create project:', error);
          throw error;
        }
      },

      updateProject: async (projectId: string, updates: any) => {
        const { projects } = get();

        try {
          const response = await apiRequest('PATCH', `/api/projects/${projectId}`, updates);
          const updatedProject = await response.json();
          
          set({
            projects: projects.map(p => p.id === projectId ? updatedProject : p)
          });
        } catch (error) {
          console.error('Failed to update project:', error);
          throw error;
        }
      },

      // Dialogue system
      openDialogue: async (roleId: string, meetingId?: string) => {
        try {
          // Set the dialogue state for the DialogueModal to pick up
          set({
            currentDialogue: {
              roleType: roleId,  // DialogueModal expects this field name
              sceneId: meetingId || 'monthly_check_in',
              choices: []  // Will be loaded by DialogueModal
            }
          });
        } catch (error) {
          console.error('Failed to load dialogue:', error);
          throw error;
        }
      },

      selectDialogueChoice: async (choiceId: string, effects: any) => {
        const { gameState, currentDialogue, selectedActions } = get();
        if (!gameState || !currentDialogue) return;

        try {
          // Check if this is an executive meeting
          const executiveRoles = ['ceo', 'head_ar', 'cmo', 'cco', 'head_distribution'];
          const isExecutiveMeeting = executiveRoles.includes(currentDialogue.roleType);

          // Apply immediate effects
          const stateUpdates: any = {};
          if (effects.money) stateUpdates.money = gameState.money + effects.money;
          if (effects.reputation) stateUpdates.reputation = Math.max(0, Math.min(100, gameState.reputation + effects.reputation));
          if (effects.creativeCapital) stateUpdates.creativeCapital = Math.max(0, Math.min(100, gameState.creativeCapital + effects.creativeCapital));

          if (Object.keys(stateUpdates).length > 0) {
            await get().updateGameState(stateUpdates);
          }

          // Store delayed effects in flags
          if (effects.delayed && Object.keys(effects.delayed).length > 0) {
            const flags = { ...gameState.flags as object, ...effects.delayed };
            await get().updateGameState({ flags });
          }

          // Store complete action data for the server
          const actionData = {
            roleId: currentDialogue.roleType,      // e.g., 'head_ar'
            actionId: currentDialogue.sceneId,     // e.g., 'ar_single_choice' 
            choiceId: choiceId,                    // e.g., 'lean_commercial'
            // We'll add executiveId when processing for month advancement
          };
          
          // Store as JSON string so we preserve all the data
          const actionJson = JSON.stringify(actionData);
          const newSelectedActions = [...selectedActions, actionJson];
          
          console.log('Storing complete action data:', actionData);
          console.log('New selectedActions:', newSelectedActions);
          
          // Update local state immediately for both types
          set({ 
            selectedActions: newSelectedActions,
            gameState: { ...gameState, usedFocusSlots: newSelectedActions.length }
          });
          
          // NOTE: Executive actions are now processed during month advancement
          // No need to call the executive action endpoint separately

          // Record the action
          await apiRequest('POST', `/api/game/${gameState.id}/actions`, {
            month: gameState.currentMonth,
            actionType: 'dialogue',
            // targetId and choiceId are optional UUIDs, but we have string IDs
            // Store the dialogue details in results instead
            results: {
              ...effects,
              roleType: currentDialogue.roleType,
              sceneId: currentDialogue.sceneId,
              choiceId: choiceId
            }
          });

          set({ currentDialogue: null });
        } catch (error) {
          console.error('Failed to process dialogue choice:', error);
          throw error;
        }
      },

      closeDialogue: () => {
        set({ currentDialogue: null });
      },

      // Save game
      saveGame: async (name: string) => {
        const { gameState, artists, projects, roles } = get();
        if (!gameState) return;

        try {
          const saveData = {
            // userId will be set by the server from authentication
            name,
            gameState: {
              gameState,
              artists,
              projects,
              roles
            },
            month: gameState.currentMonth,
            isAutosave: false
          };

          await apiRequest('POST', '/api/saves', saveData);
        } catch (error) {
          console.error('Failed to save game:', error);
          throw error;
        }
      }
    }),
    {
      name: 'music-label-manager-game',
      partialize: (state) => ({
        gameState: state.gameState,
        artists: state.artists,
        projects: state.projects,
        roles: state.roles,
        songs: state.songs,
        releases: state.releases,
        selectedActions: state.selectedActions
      })
    }
  )
);
