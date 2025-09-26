import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameState, Artist, Project, Role, WeeklyAction, MusicLabel } from '@shared/schema';
import type { LabelData } from '@shared/types/gameTypes';
// Game engine moved to shared - client no longer calculates outcomes
import { apiRequest, queryClient } from '@/lib/queryClient';

interface GameStore {
  // Game state
  gameState: GameState | null;
  artists: Artist[];
  projects: Project[];
  roles: Role[];
  weeklyActions: WeeklyAction[];
  songs: any[];
  releases: any[];

  // UI state
  selectedActions: string[];
  isAdvancingWeek: boolean;
  weeklyOutcome: any | null;
  campaignResults: any | null;
  
  // Actions
  loadGame: (gameId: string) => Promise<void>;
  loadGameFromSave: (saveId: string) => Promise<void>;
  createNewGame: (campaignType: string, labelData?: LabelData) => Promise<GameState>;
  updateGameState: (updates: Partial<GameState>) => Promise<void>;
  
  // Weekly actions
  selectAction: (actionId: string) => Promise<void>;
  removeAction: (actionId: string) => Promise<void>;
  reorderActions: (startIndex: number, endIndex: number) => void;
  clearActions: () => void;
  advanceWeek: () => Promise<void>;
  
  // Artist management
  signArtist: (artistData: any) => Promise<void>;
  updateArtist: (artistId: string, updates: any) => Promise<void>;
  
  // Project management
  createProject: (projectData: any) => Promise<void>;
  updateProject: (projectId: string, updates: any) => Promise<void>;
  cancelProject: (projectId: string, cancellationData: { refundAmount: number }) => Promise<void>;
  
  // Release management
  planRelease: (releaseData: any) => Promise<void>;
  
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
      weeklyActions: [],
      songs: [],
      releases: [],
      selectedActions: [],
      isAdvancingWeek: false,
      weeklyOutcome: null,
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
          
          // Include musicLabel in the gameState object
          const gameStateWithLabel = {
            ...syncedGameState,
            musicLabel: data.musicLabel || null
          };

          set({
            gameState: gameStateWithLabel,
            artists: data.artists,
            projects: data.projects,
            roles: data.roles,
            weeklyActions: data.weeklyActions,
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
          
          // Include musicLabel in the gameState object
          const gameStateWithLabel = {
            ...savedGameData.gameState,
            musicLabel: savedGameData.musicLabel || null
          };

          set({
            gameState: gameStateWithLabel,
            artists: savedGameData.artists || [],
            projects: savedGameData.projects || [],
            roles: savedGameData.roles || [],
            weeklyActions: [], // Reset weekly actions
            selectedActions: [],
            campaignResults: null,
            weeklyOutcome: null
          });
          
          // Update the game context with the loaded game's ID
          // Note: This might need to be done from the component using GameContext
        } catch (error) {
          console.error('Failed to load game from save:', error);
          throw error;
        }
      },

      // Create new game
      createNewGame: async (campaignType: string, labelData?: LabelData) => {
        try {
          const newGameData = {
            // userId will be set by the server from authentication
            currentWeek: 1,
            // money will be set by server from balance.json
            // reputation will be set by server from balance.json
            // reputation and creativeCapital will be set by server from balance.json
            reputation: 0,
            focusSlots: 3,
            usedFocusSlots: 0,
            playlistAccess: 'none',
            pressAccess: 'none',
            venueAccess: 'none',
            campaignType,
            rngSeed: Math.random().toString(36),
            flags: {},
            weeklyStats: {},
            campaignCompleted: false,
            ...(labelData && { labelData })
          };

          const response = await apiRequest('POST', '/api/game', newGameData);
          const gameState = await response.json();

          console.log('=== CREATE NEW GAME DEBUG ===');
          console.log('New game created:', gameState);
          console.log('Week should be 1, actual:', gameState.currentWeek);
          console.log('Game ID:', gameState.id);

          // Follow-up GET request to ensure we have complete data including musicLabel
          const completeGameResponse = await apiRequest('GET', `/api/game/${gameState.id}`);
          const completeGameData = await completeGameResponse.json();

          // CRITICAL: Clear all localStorage game data first
          localStorage.removeItem('music-label-manager-game');
          localStorage.setItem('currentGameId', gameState.id);
          console.log('Cleared localStorage and set new gameId');

          // Ensure new game starts with 0 used slots and include musicLabel
          const syncedGameState = {
            ...completeGameData.gameState,
            usedFocusSlots: 0,  // New game starts with no slots used
            musicLabel: completeGameData.musicLabel || null
          };

          // Clear campaign results and set new state
          set({
            gameState: syncedGameState,
            artists: [],
            projects: [],
            roles: [],
            weeklyActions: [],
            songs: [],
            releases: [],
            selectedActions: [],
            campaignResults: null,
            weeklyOutcome: null
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
          if ((error as any).status === 404) {
            console.error('Game not found in database. You may need to create a new game.');
            // Don't throw - just apply updates locally
            const updatedState = { ...gameState, ...updates };
            set({ gameState: updatedState });
          } else {
            throw error;
          }
        }
      },

      // Weekly action selection
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

      // Advance week
      advanceWeek: async () => {
        const { gameState, selectedActions } = get();
        if (!gameState || selectedActions.length === 0) return;

        set({ isAdvancingWeek: true });

        try {
          // Use the NEW API endpoint with campaign completion logic
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
              
              const { roleId, actionId, choiceId, executiveId } = actionData;

              // Build complete metadata
              const metadata: any = {
                roleId,
                actionId,
                choiceId
              };

              if (executiveId) {
                metadata.executiveId = executiveId;
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

          const response = await apiRequest('POST', '/api/advance-week', advanceRequest);
          const result = await response.json();
          
          // Log the debugging information from our server response
          console.log('=== ADVANCE WEEK DEBUG INFO ===');
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
          
          // Reload game data to get updated projects, songs, and releases after processing
          const [gameResponse, songsResponse, releasesResponse] = await Promise.all([
            apiRequest('GET', `/api/game/${gameState.id}`),
            apiRequest('GET', `/api/game/${gameState.id}/songs`),
            apiRequest('GET', `/api/game/${gameState.id}/releases`) // Explicit releases fetch
          ]);
          const gameData = await gameResponse.json();
          const songs = await songsResponse.json();
          const releases = await releasesResponse.json();

          console.log('=== POST-ADVANCE WEEK STATE SYNC ===');
          console.log('Game data releases count:', (gameData.releases || []).length);
          console.log('Direct releases fetch count:', (releases || []).length);
          console.log('Release statuses:', releases.map((r: any) => ({ id: r.id, title: r.title, status: r.status })));
          console.log('=====================================');

          // Ensure usedFocusSlots is reset to 0 for the new week and preserve musicLabel
          const syncedGameState = {
            ...result.gameState,
            usedFocusSlots: 0,  // Always 0 at start of new week
            musicLabel: (gameState as any).musicLabel  // Preserve existing music label
          };

          set({
            gameState: syncedGameState,
            artists: gameData.artists || [], // Update artists to reflect mood changes
            projects: gameData.projects || [], // Update projects with current state
            songs: songs || [], // Update songs to include newly recorded ones
            releases: releases || [], // FIXED: Use explicit releases fetch for accurate status
            weeklyOutcome: result.summary,
            campaignResults: result.campaignResults,
            selectedActions: [],
            isAdvancingWeek: false
          });
          
          // Invalidate React Query caches to refresh UI components
          await queryClient.invalidateQueries({ queryKey: ['artist-roi'] });
          await queryClient.invalidateQueries({ queryKey: ['project-roi'] });
          await queryClient.invalidateQueries({ queryKey: ['portfolio-roi'] });
          await queryClient.invalidateQueries({ queryKey: ['release-roi'] });
          // CRITICAL: Invalidate executives cache to refresh mood/loyalty after meetings
          await queryClient.invalidateQueries({ queryKey: ['executives'] });
        } catch (error) {
          console.error('=== ADVANCE WEEK ERROR ===');
          console.error('Error occurred during week advancement');
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
              displayError = new Error(`Advance Week Failed: ${error.message}`);
            }
          } else {
            displayError = new Error(`Advance Week Failed: ${JSON.stringify(error)}`);
          }
          
          console.error('Final display error:', displayError.message);
          console.error('========================');
          
          set({ isAdvancingWeek: false });
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
            signedWeek: gameState.currentWeek,
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
            startWeek: gameState.currentWeek,
            stage: 'planning'
          });
          const newProject = await response.json();

          // Update projects array
          set({ projects: [...projects, newProject] });

          // CRITICAL: Immediately update gameState to reflect cost and creative capital deduction
          // The server has already deducted both the project cost and creative capital, so we need to sync our local state
          const projectCost = projectData.totalCost || projectData.budgetPerSong || 0;
          const currentCreativeCapital = gameState.creativeCapital || 0;
          
          const updatedGameState = {
            ...gameState,
            money: (gameState.money ?? 0) - projectCost,
            creativeCapital: currentCreativeCapital - 1  // Deduct 1 creative capital
          };
          set({ gameState: updatedGameState });
          
          if (projectCost > 0) {
            console.log(`[FRONTEND] Synced money deduction: -$${projectCost}, new balance: $${updatedGameState.money}`);
          }
          console.log(`[FRONTEND] Synced creative capital deduction: -1, new balance: ${updatedGameState.creativeCapital}`);
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

      // Cancel project with refund calculation
      cancelProject: async (projectId: string, cancellationData: { refundAmount: number }) => {
        const { projects, gameState } = get();
        if (!gameState) return;

        try {
          console.log('[CANCEL PROJECT] Sending cancellation request:', { projectId, cancellationData });
          
          // Call the real API endpoint
          const response = await apiRequest('DELETE', `/api/projects/${projectId}/cancel`, cancellationData);
          const result = await response.json();
          
          console.log('[CANCEL PROJECT] API response:', result);
          
          // Remove project from local state
          const updatedProjects = projects.filter(p => p.id !== projectId);
          
          // Update game state with new balance from server
          const updatedGameState = {
            ...gameState,
            money: result.newBalance
          };
          
          set({
            projects: updatedProjects,
            gameState: updatedGameState
          });
          
          console.log(`[CANCEL PROJECT] Project cancelled. Refund: $${result.refundAmount}, New balance: $${result.newBalance}`);
        } catch (error) {
          console.error('Failed to cancel project:', error);
          throw error;
        }
      },

      // Release management
      planRelease: async (releaseData: any) => {
        const { gameState } = get();
        if (!gameState) return;

        try {
          const response = await apiRequest('POST', `/api/game/${gameState.id}/releases/plan`, releaseData);
          const result = await response.json();

          // Update game state to reflect marketing budget and creative capital deduction
          const totalMarketingCost = releaseData.metadata?.totalInvestment || 0;
          const currentCreativeCapital = gameState.creativeCapital || 0;
          
          const updatedGameState = {
            ...gameState,
            money: (gameState.money ?? 0) - totalMarketingCost,
            creativeCapital: currentCreativeCapital - 1
          };
          
          set({ gameState: updatedGameState });
          
          console.log(`[FRONTEND] Synced release planning: -$${totalMarketingCost}, -1 creative capital, new balances: $${updatedGameState.money}, ${updatedGameState.creativeCapital} creative capital`);
          
          return result;
        } catch (error) {
          console.error('Failed to plan release:', error);
          throw error;
        }
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
              musicLabel: (gameState as any).musicLabel,
              artists,
              projects,
              roles
            },
            week: gameState.currentWeek,
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
