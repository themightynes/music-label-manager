import { z } from 'zod';
import { GameState, GameProject } from '../types/gameTypes';

// API Response schemas
const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
});

// Game endpoints
export const gameEndpoints = {
  // Game state
  getGame: '/api/games/:gameId',
  createGame: '/api/games',
  saveGame: '/api/games/:gameId',
  
  // Game actions
  advanceWeek: '/api/games/:gameId/advance-week',
  selectActions: '/api/games/:gameId/actions',
  
  // Game resources
  getArtists: '/api/games/:gameId/artists',
  getProjects: '/api/games/:gameId/projects',
  getRoles: '/api/games/:gameId/roles',
  
  // Dialogues
  getDialogue: '/api/games/:gameId/dialogues/:dialogueId',
  selectChoice: '/api/games/:gameId/dialogues/:dialogueId/choices/:choiceId',
};

// Action schema for consistency
export const ActionSchema = z.object({
  actionType: z.enum(['role_meeting', 'start_project', 'marketing', 'artist_dialogue']),
  targetId: z.string().nullable(), // Can be role type, project ID, or artist ID
  metadata: z.record(z.any()).optional()
});

// Game state request/response schemas
export const GetGameStateRequest = z.object({
  gameId: z.string().uuid().optional()
});

export const GetGameStateResponse = z.object({
  gameState: z.custom<GameState>(),
  artists: z.array(z.any()),
  projects: z.array(z.any()),
  roles: z.array(z.any()),
  weeklyActions: z.array(z.any())
});

// Week advancement schemas
export const AdvanceWeekRequest = z.object({
  gameId: z.string().uuid(),
  selectedActions: z.array(ActionSchema)
});

export const CampaignResultsSchema = z.object({
  campaignCompleted: z.boolean(),
  finalScore: z.number(),
  scoreBreakdown: z.object({
    money: z.number(),
    reputation: z.number(),
    artistsSuccessful: z.number(),
    projectsCompleted: z.number(),
    accessTierBonus: z.number(),
  }),
  victoryType: z.enum(['Commercial Success', 'Critical Acclaim', 'Balanced Growth', 'Survival', 'Failure']),
  summary: z.string(),
  achievements: z.array(z.string()),
});

export const AdvanceWeekResponse = z.object({
  gameState: z.custom<GameState>(),
  summary: z.object({
    week: z.number(),
    changes: z.array(z.any()),
    revenue: z.number(),
    expenses: z.number(),
    reputationChanges: z.record(z.number()),
    events: z.array(z.any()),
  }),
  campaignResults: CampaignResultsSchema.optional(),
});

// Action selection schemas
export const SelectActionsRequest = z.object({
  gameId: z.string().uuid(),
  selectedActions: z.array(ActionSchema).max(3)
});

export const SelectActionsResponse = z.object({
  success: z.boolean(),
  gameState: z.custom<GameState>()
});

// Artist management schemas
export const SignArtistRequest = z.object({
  gameId: z.string().uuid(),
  artistData: z.object({
    name: z.string().min(1).max(50),
    archetype: z.enum(['Visionary', 'Workhorse', 'Trendsetter']),
    metadata: z.record(z.any()).optional()
  })
});

export const SignArtistResponse = z.object({
  artist: z.object({
    id: z.string().uuid(),
    name: z.string(),
    archetype: z.string(),
    mood: z.number(),
    loyalty: z.number(),
    popularity: z.number(),
    signedWeek: z.number().nullable(),
    isSigned: z.boolean(),
    gameId: z.string().nullable()
  }),
  updatedGameState: z.custom<GameState>()
});

// Project management schemas
export const StartProjectRequest = z.object({
  gameId: z.string().uuid(),
  projectData: z.object({
    title: z.string().min(1).max(100),
    type: z.enum(['Single', 'EP', 'Mini-Tour']),
    artistId: z.string().uuid(),
    metadata: z.record(z.any()).optional()
  })
});

export const StartProjectResponse = z.object({
  project: z.custom<GameProject>(),
  updatedGameState: z.custom<GameState>()
});

// Error response schema
export const ErrorResponse = z.object({
  error: z.string(),
  message: z.string(),
  details: z.array(z.any()).optional()
});

// Export all types
export type ActionType = z.infer<typeof ActionSchema>;
export type GetGameStateRequest = z.infer<typeof GetGameStateRequest>;
export type GetGameStateResponse = z.infer<typeof GetGameStateResponse>;
export type AdvanceWeekRequest = z.infer<typeof AdvanceWeekRequest>;
export type AdvanceWeekResponse = z.infer<typeof AdvanceWeekResponse>;
export type SelectActionsRequest = z.infer<typeof SelectActionsRequest>;
export type SelectActionsResponse = z.infer<typeof SelectActionsResponse>;
export type SignArtistRequest = z.infer<typeof SignArtistRequest>;
export type SignArtistResponse = z.infer<typeof SignArtistResponse>;
export type StartProjectRequest = z.infer<typeof StartProjectRequest>;
export type StartProjectResponse = z.infer<typeof StartProjectResponse>;
export type ErrorResponse = z.infer<typeof ErrorResponse>;
export type GameEndpoints = typeof gameEndpoints;

// Backward compatibility - keep existing routes for now
export const API_ROUTES = {
  GAME_STATE: '/api/game-state',
  ADVANCE_WEEK: '/api/advance-week',
  SELECT_ACTIONS: '/api/select-actions',
  SIGN_ARTIST: '/api/game/:gameId/artists',
  START_PROJECT: '/api/game/:gameId/projects',
  GET_GAME: '/api/game/:id'
} as const;

// Validation helpers
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error.message}`);
  }
  return result.data;
}

export function createErrorResponse(error: string, message: string, details?: any[]): ErrorResponse {
  return { error, message, details };
}