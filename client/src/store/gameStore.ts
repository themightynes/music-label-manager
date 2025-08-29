import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameState, Artist, Project, Role, MonthlyAction } from '@shared/schema';
// Game engine moved to shared - client no longer calculates outcomes
import { apiRequest } from '@/lib/queryClient';

interface GameStore {
  // Game state
  gameState: GameState | null;
  artists: Artist[];
  projects: Project[];
  roles: Role[];
  monthlyActions: MonthlyAction[];
  songs: any[];
  releases: any[];
  
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
  selectAction: (actionId: string) => void;
  removeAction: (actionId: string) => void;
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
      selectedActions: [],
      isAdvancingMonth: false,
      currentDialogue: null,
      monthlyOutcome: null,
      campaignResults: null,

      // Load existing game
      loadGame: async (gameId: string) => {
        try {
          const [gameResponse, songsResponse, releasesResponse] = await Promise.all([
            apiRequest('GET', `/api/game/${gameId}`),
            apiRequest('GET', `/api/game/${gameId}/songs`),
            apiRequest('GET', `/api/game/${gameId}/releases`)
          ]);
          
          const data = await gameResponse.json();
          const songs = await songsResponse.json();
          const releases = await releasesResponse.json();
          
          console.log('GameStore loadGame debug:', {
            gameId,
            gameData: !!data,
            songsCount: songs?.length || 0,
            releasesCount: releases?.length || 0,
            releases: releases
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
            reputation: 0,
            creativeCapital: 0,
            focusSlots: 3,
            usedFocusSlots: 0,
            playlistAccess: 'None',
            pressAccess: 'None',
            venueAccess: 'None',
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
          
          // Clean up old games (keep only the new current game)
          try {
            await apiRequest('POST', '/api/cleanup-demo-games', { keepGameId: gameState.id });
            console.log('Cleaned up old games successfully');
          } catch (cleanupError) {
            console.warn('Failed to cleanup old games:', cleanupError);
            // Don't fail game creation if cleanup fails
          }
          
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
          const updatedState = await response.json();
          
          set({ gameState: updatedState });
        } catch (error) {
          console.error('Failed to update game state:', error);
          throw error;
        }
      },

      // Monthly action selection
      selectAction: (actionId: string) => {
        const { selectedActions, gameState } = get();
        const availableSlots = gameState?.focusSlots || 3;
        
        if (selectedActions.length < availableSlots && !selectedActions.includes(actionId)) {
          const newSelectedActions = [...selectedActions, actionId];
          set({ 
            selectedActions: newSelectedActions,
            gameState: gameState ? { ...gameState, usedFocusSlots: newSelectedActions.length } : gameState
          });
        }
      },

      removeAction: (actionId: string) => {
        const { selectedActions, gameState } = get();
        if (selectedActions.includes(actionId)) {
          const newSelectedActions = selectedActions.filter(id => id !== actionId);
          set({ 
            selectedActions: newSelectedActions,
            gameState: gameState ? { ...gameState, usedFocusSlots: newSelectedActions.length } : gameState
          });
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

        try {
          // Use the NEW API endpoint with campaign completion logic
          const advanceRequest = {
            gameId: gameState.id,
            selectedActions: selectedActions.map(actionId => ({
              actionType: 'role_meeting' as const,
              targetId: actionId,
              metadata: {}
            }))
          };

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
          
          // Reload game data to get updated projects, songs, AND releases
          // CRITICAL FIX: Explicitly fetch releases to ensure state synchronization
          const [gameResponse, songsResponse, releasesResponse] = await Promise.all([
            apiRequest('GET', `/api/game/${gameState.id}`),
            apiRequest('GET', `/api/game/${gameState.id}/songs`),
            apiRequest('GET', `/api/game/${gameState.id}/releases`) // Explicit releases fetch
          ]);
          const gameData = await gameResponse.json();
          const songs = await songsResponse.json();
          const releases = await releasesResponse.json();
          
          console.log('=== POST-ADVANCE MONTH STATE SYNC ===');
          console.log('Game data releases count:', (gameData.releases || []).length);
          console.log('Direct releases fetch count:', (releases || []).length);
          console.log('Release statuses:', releases.map((r: any) => ({ id: r.id, title: r.title, status: r.status })));
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
            monthlyOutcome: result.summary,
            campaignResults: result.campaignResults,
            selectedActions: [],
            isAdvancingMonth: false
          });
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
        const { gameState, currentDialogue } = get();
        if (!gameState || !currentDialogue) return;

        try {
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

          // Record the action
          await apiRequest('POST', `/api/game/${gameState.id}/actions`, {
            month: gameState.currentMonth,
            actionType: 'dialogue',
            // targetId and choiceId are optional UUIDs, but we have string IDs
            // Store the dialogue details in results instead
            results: {
              ...effects,
              roleType: currentDialogue.roleType,
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
