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
          
          set({
            gameState: result.gameState,
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
          
          set({ artists: [...artists, newArtist] });
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
      openDialogue: async (roleType: string, sceneId?: string) => {
        try {
          const url = sceneId ? `/api/dialogue/${roleType}?sceneId=${sceneId}` : `/api/dialogue/${roleType}`;
          const response = await apiRequest('GET', url);
          const choices = await response.json();
          
          set({
            currentDialogue: {
              roleType,
              sceneId,
              choices
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
            targetId: currentDialogue.roleType,
            choiceId,
            results: effects
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
