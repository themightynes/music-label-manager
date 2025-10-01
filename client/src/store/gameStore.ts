import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Artist, Project, Role, WeeklyAction, MusicLabel } from '@shared/schema';
import type { GameState, LabelData, SourcingTypeString } from '@shared/types/gameTypes';
// Game engine moved to shared - client no longer calculates outcomes
import { apiRequest, queryClient } from '@/lib/queryClient';

// Internal helper to sync focus slots and A&R operation status to the server
async function syncSlotsPatch(
  gameId: string,
  payload: {
    usedFocusSlots: number;
    arOfficeSlotUsed: boolean;
    arOfficeSourcingType: SourcingTypeString | null;
  }
) {
  try {
    await apiRequest('PATCH', `/api/game/${gameId}`, payload);
  } catch (error) {
    console.error('Failed to sync focus slots:', error);
  }
}

interface GameStore {
  // Game state
  gameState: GameState | null;
  artists: Artist[];
  projects: Project[];
  roles: Role[];
  weeklyActions: WeeklyAction[];
  songs: any[];
  releases: any[];

  // Discovered A&R artists (persisted client-side)
  discoveredArtists: Artist[];
  loadingDiscoveredArtists?: boolean;

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
  
  // A&R Office operations
  consumeAROfficeSlot: (sourcingType: SourcingTypeString) => Promise<void>;
  releaseAROfficeSlot: () => Promise<void>;
  getAROfficeStatus: () => {
    arOfficeSlotUsed: boolean;
    arOfficeSourcingType: SourcingTypeString | null;
    arOfficeOperationStart: number | null;
  };
  startAROfficeOperation: (sourcingType: SourcingTypeString, primaryGenre?: string, secondaryGenre?: string) => Promise<void>;
  cancelAROfficeOperation: () => Promise<void>;

  // Discovered artists lifecycle
  loadDiscoveredArtists: () => Promise<void>;
  clearDiscoveredArtists: () => void;
  removeDiscoveredArtist: (artistId: string) => void;
  
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
      discoveredArtists: [],
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
          
          // Preserve A&R status and sync usedFocusSlots with selectedActions + A&R usage
          const arOfficeSlotUsed = !!(data.gameState?.arOfficeSlotUsed);
          const arOfficeSourcingType = (data.gameState?.arOfficeSourcingType ?? null);
          const syncedGameState = {
            ...data.gameState,
            arOfficeSlotUsed,
            arOfficeSourcingType,
            // selectedActions will be set to [], so usedFocusSlots reflects only A&R usage here
            usedFocusSlots: (arOfficeSlotUsed ? 1 : 0)
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

          // After loading game, try to load discovered artists if no active operation
          if (!arOfficeSlotUsed) {
            await get().loadDiscoveredArtists();
          }
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
          
          // Preserve A&R status and include musicLabel
          const arOfficeSlotUsed = !!(savedGameData.gameState?.arOfficeSlotUsed);
          const arOfficeSourcingType = (savedGameData.gameState?.arOfficeSourcingType ?? null);
          const gameStateWithLabel = {
            ...savedGameData.gameState,
            arOfficeSlotUsed,
            arOfficeSourcingType,
            musicLabel: savedGameData.musicLabel || null,
            // selectedActions will be reset to [], so usedFocusSlots is A&R-only here
            usedFocusSlots: (arOfficeSlotUsed ? 1 : 0)
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
        
        if (
          gameState &&
          selectedActions.length < ((gameState.focusSlots || 0) - ((gameState.arOfficeSlotUsed) ? 1 : 0)) &&
          !selectedActions.includes(actionId)
        ) {
          const newSelectedActions = [...selectedActions, actionId];
          const arUsed = gameState.arOfficeSlotUsed ? 1 : 0;
          const newUsedSlots = newSelectedActions.length + arUsed;
          
          // Update local state
          set({
            selectedActions: newSelectedActions,
            gameState: { ...gameState, usedFocusSlots: newUsedSlots }
          });

          await syncSlotsPatch(gameState.id, {
            usedFocusSlots: newUsedSlots,
            arOfficeSlotUsed: !!gameState.arOfficeSlotUsed,
            arOfficeSourcingType: gameState.arOfficeSourcingType ?? null,
          });
        }
      },

      removeAction: async (actionId: string) => {
        const { selectedActions, gameState } = get();
        if (selectedActions.includes(actionId) && gameState) {
          const newSelectedActions = selectedActions.filter(id => id !== actionId);
          const arUsed = gameState.arOfficeSlotUsed ? 1 : 0;
          const newUsedSlots = newSelectedActions.length + arUsed;
          
          // Update local state
          set({
            selectedActions: newSelectedActions,
            gameState: { ...gameState, usedFocusSlots: newUsedSlots }
          });

          // Sync focus slots and A&R status to server to prevent desync issues
          await syncSlotsPatch(gameState.id, {
            usedFocusSlots: newUsedSlots,
            arOfficeSlotUsed: !!gameState.arOfficeSlotUsed,
            arOfficeSourcingType: gameState.arOfficeSourcingType ?? null,
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
        const arUsed = gameState?.arOfficeSlotUsed ? 1 : 0;
        set({ 
          selectedActions: [],
          gameState: gameState ? { ...gameState, usedFocusSlots: arUsed } : gameState
        });
      },

      // Advance week
      advanceWeek: async () => {
        const { gameState, selectedActions } = get();
        // Allow advancing the week if either there are selected actions OR an A&R operation is consuming a slot
        if (!gameState || (selectedActions.length === 0 && !gameState.arOfficeSlotUsed)) return;

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

          // Preserve A&R fields and recompute usedFocusSlots based on A&R usage after advancing week
          const arOfficeSlotUsed = !!(result.gameState?.arOfficeSlotUsed ?? gameState.arOfficeSlotUsed);
          const arOfficeSourcingType = result.gameState?.arOfficeSourcingType ?? gameState.arOfficeSourcingType ?? null;
          const syncedGameState = {
            ...result.gameState,
            arOfficeSlotUsed,
            arOfficeSourcingType,
            usedFocusSlots: arOfficeSlotUsed ? 1 : 0,
            musicLabel: gameState.musicLabel  // Preserve existing music label
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

          // Always attempt to load discovered artists after week advancement if there was an active A&R operation
          const hadActiveAROperation = result?.summary?.arOffice?.completed;
          if (hadActiveAROperation) {
            console.log('[A&R] A&R operation completed, attempting to load discovered artists');

            // Enhanced retry logic with exponential backoff
            const loadWithRetry = async (attempt = 1): Promise<void> => {
              try {
                await get().loadDiscoveredArtists();
                console.log(`[A&R] Successfully loaded discovered artists (attempt ${attempt})`);
              } catch (error) {
                console.error(`[A&R] Failed to load discovered artists (attempt ${attempt}):`, error);

                if (attempt < 3) {
                  const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
                  console.log(`[A&R] Retrying in ${delay}ms...`);
                  await new Promise(resolve => setTimeout(resolve, delay));
                  return loadWithRetry(attempt + 1);
                } else {
                  console.error('[A&R] All retry attempts failed, discovered artists may not be available');
                  throw error;
                }
              }
            };

            try {
              await loadWithRetry();
            } catch (finalError) {
              console.warn('[A&R] Failed to load discovered artists after all retries:', finalError);
              // Don't throw - this is not critical enough to fail the entire week advancement
            }
          }
          
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
        const { gameState, artists, removeDiscoveredArtist } = get();
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

          // If this artist was in discovered list, remove using the discovered (content) ID or name
          if (artistData?.id) {
            removeDiscoveredArtist(artistData.id);
          } else if (artistData?.name) {
            // Fallback: remove by name match if ID is unavailable
            const current = get().discoveredArtists;
            const toRemove = current.find(a => (a as any).name?.toLowerCase() === String(artistData.name).toLowerCase());
            if (toRemove?.id) removeDiscoveredArtist(toRemove.id);
          }
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

      // A&R Office operations
      consumeAROfficeSlot: async (sourcingType: SourcingTypeString) => {
        const { gameState, selectedActions } = get();
        if (!gameState) return;
        const arUsed = gameState.arOfficeSlotUsed ? 1 : 0;
        const totalUsed = selectedActions.length + arUsed;
        if (totalUsed >= (gameState.focusSlots || 0) || gameState.arOfficeSlotUsed) return;

        const updated: GameState = {
          ...gameState,
          arOfficeSlotUsed: true,
          arOfficeSourcingType: sourcingType,
          usedFocusSlots: selectedActions.length + 1,
        } as GameState;

        set({ gameState: updated });

        await syncSlotsPatch(gameState.id, {
          usedFocusSlots: updated.usedFocusSlots,
          arOfficeSlotUsed: updated.arOfficeSlotUsed ?? false,
          arOfficeSourcingType: updated.arOfficeSourcingType ?? null,
        });
      },

      releaseAROfficeSlot: async () => {
        const { gameState, selectedActions } = get();
        if (!gameState || !gameState.arOfficeSlotUsed) return;

        const updated: GameState = {
          ...gameState,
          arOfficeSlotUsed: false,
          arOfficeSourcingType: null,
          usedFocusSlots: selectedActions.length,
        } as GameState;

        set({ gameState: updated });

        await syncSlotsPatch(gameState.id, {
          usedFocusSlots: updated.usedFocusSlots,
          arOfficeSlotUsed: updated.arOfficeSlotUsed ?? false,
          arOfficeSourcingType: updated.arOfficeSourcingType ?? null,
        });
      },

      getAROfficeStatus: () => {
        const { gameState } = get();
        return {
          arOfficeSlotUsed: !!gameState?.arOfficeSlotUsed,
          arOfficeSourcingType: (gameState?.arOfficeSourcingType as SourcingTypeString | null) ?? null,
          arOfficeOperationStart: gameState?.arOfficeOperationStart ?? null,
        };
      },

      startAROfficeOperation: async (sourcingType: SourcingTypeString, primaryGenre?: string, secondaryGenre?: string) => {
        const { gameState, consumeAROfficeSlot } = get();
        if (!gameState) return;
        console.log('[A&R CLIENT] Starting A&R operation:', { sourcingType, primaryGenre, secondaryGenre });
        try {
          const { startAROfficeOperation } = await import('../services/arOfficeService');
          // Call server to start the operation
          await startAROfficeOperation(gameState.id, sourcingType, primaryGenre, secondaryGenre);
          console.log('[A&R CLIENT] API call successful');

          // Immediately reflect the active operation locally so the UI stays in sync
          // This also patches usedFocusSlots and A&R flags to the server (idempotent)
          await consumeAROfficeSlot(sourcingType);

          // NOTE: No longer clearing discovered artists - we want to accumulate them across operations
        } catch (e) {
          console.error('[A&R CLIENT] API call failed:', e);
          throw e; // Re-throw so the calling code can handle it
        }
      },


      cancelAROfficeOperation: async () => {
        const { gameState } = get();
        if (!gameState) return;
        try {
          const { cancelAROfficeOperation } = await import('../services/arOfficeService');
          await cancelAROfficeOperation(gameState.id);
          // NOTE: Keep discovered artists on cancel - they were earned from previous operations
        } catch (e) {
          console.error('[A&R] cancel operation API failed', e);
        } finally {
          await get().releaseAROfficeSlot();
        }
      },

      // Save game
      // Discovered artists lifecycle
      loadDiscoveredArtists: async () => {
        const { gameState } = get();
        console.log('[A&R DEBUG] Loading discovered artists for game:', gameState?.id);
        if (!gameState) {
          console.warn('[A&R] No game state available for loading discovered artists');
          return;
        }

        // Check if already loading to prevent concurrent requests
        const loadingFlag = get().loadingDiscoveredArtists;
        if (loadingFlag) {
          console.log('[A&R] Already loading discovered artists, skipping duplicate request');
          return;
        }

        try {
          // Set loading flag
          set({ loadingDiscoveredArtists: true });

          const res = await apiRequest('GET', `/api/game/${gameState.id}/ar-office/artists`);
          const data = await res.json();
          console.log('[A&R DEBUG] API response:', data);

          let artists = Array.isArray(data.artists) ? data.artists : [];

          // Enhanced fallback with better error messages
          if ((!artists || artists.length === 0) && (gameState as any)?.flags) {
            const flags: any = (gameState as any).flags;
            const discoveredId = flags?.ar_office_discovered_artist_id;
            const info = flags?.ar_office_discovered_artist_info || {};
            if (discoveredId) {
              console.log('[A&R DEBUG] No artists from API, synthesizing from flags:', { discoveredId, info });
              const synthesized = {
                id: discoveredId,
                name: info.name ?? 'Unknown Artist',
                archetype: info.archetype ?? 'Unknown',
                talent: info.talent ?? 0,
                popularity: info.popularity ?? 0,
                genre: info.genre ?? null,
                isSigned: false,
              } as any;
              artists = [synthesized];
              console.log('[A&R DEBUG] Synthesized discovered artist from flags:', synthesized);
            } else {
              console.log('[A&R DEBUG] No discovered artist ID in flags, returning empty list');
            }
          }

          console.log('[A&R DEBUG] Setting discovered artists:', artists.length, 'artists');
          set({ discoveredArtists: artists });
        } catch (error) {
          console.error('[A&R] Failed to load discovered artists:', error);

          // Provide more specific error information
          const status = (error as any)?.status;
          if (status === 404) {
            console.warn('[A&R] No discovered artists found (404) - treating as empty result');
            set({ discoveredArtists: [] });
            return;
          }

          if (error instanceof Error && error.message.includes('500')) {
            console.error('[A&R] Server error while loading discovered artists');
          }

          set({ discoveredArtists: [] });
          throw error; // Re-throw to allow retry logic to handle it
        } finally {
          // Clear loading flag
          set({ loadingDiscoveredArtists: false });
        }
      },
      clearDiscoveredArtists: () => {
        console.log('[A&R] Clearing discovered artists list');
        set({ discoveredArtists: [] });
      },
      removeDiscoveredArtist: (artistId: string) => {
        const { discoveredArtists } = get();
        set({ discoveredArtists: discoveredArtists.filter((a: any) => a.id !== artistId) });
      },

      saveGame: async (name: string) => {
        const { gameState, artists, projects, roles } = get();
        if (!gameState) return;

        try {
          const saveData = {
            // userId will be set by the server from authentication
            name,
            gameState: {
              gameState,
              musicLabel: gameState.musicLabel,
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
        discoveredArtists: state.discoveredArtists,
        selectedActions: state.selectedActions
      })
    }
  )
);
