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
      selectedActions: [],
      isAdvancingMonth: false,
      currentDialogue: null,
      monthlyOutcome: null,
      campaignResults: null,

      // Load existing game
      loadGame: async (gameId: string) => {
        try {
          const response = await apiRequest('GET', `/api/game/${gameId}`);
          const data = await response.json();
          
          set({
            gameState: data.gameState,
            artists: data.artists,
            projects: data.projects,
            roles: data.roles,
            monthlyActions: data.monthlyActions,
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
            money: 75000,
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
          
          // Clear campaign results
          set({
            gameState,
            artists: [],
            projects: [],
            roles: [],
            monthlyActions: [],
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
        const { selectedActions } = get();
        if (selectedActions.length < 3 && !selectedActions.includes(actionId)) {
          set({ selectedActions: [...selectedActions, actionId] });
        }
      },

      removeAction: (actionId: string) => {
        const { selectedActions } = get();
        set({ selectedActions: selectedActions.filter(id => id !== actionId) });
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
          
          // Reload game data to get updated projects
          const gameResponse = await apiRequest('GET', `/api/game/${gameState.id}`);
          const gameData = await gameResponse.json();
          
          set({
            gameState: result.gameState,
            projects: gameData.projects || [], // Update projects with current state
            monthlyOutcome: result.summary,
            campaignResults: result.campaignResults,
            selectedActions: [],
            isAdvancingMonth: false
          });
        } catch (error) {
          console.error('Failed to advance month:', error);
          set({ isAdvancingMonth: false });
          throw error;
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
        selectedActions: state.selectedActions
      })
    }
  )
);
